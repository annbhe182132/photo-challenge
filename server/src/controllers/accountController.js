import { randomBytes, createHash, scrypt as scryptCallback, timingSafeEqual } from 'node:crypto';
import { promisify } from 'node:util';
import mongoose from 'mongoose';
import { Account } from '../models/Account.js';
import { AccountAlbum } from '../models/AccountAlbum.js';
import { deleteEvidence, readAccountImageDataUrl, storeEvidence } from '../utils/evidenceStore.js';

const scrypt = promisify(scryptCallback);
const SESSION_DURATION_MS = 30 * 24 * 60 * 60 * 1000;

const normalizeEmail = (value) => String(value ?? '').trim().toLowerCase();
const hashToken = (token) => createHash('sha256').update(token).digest('hex');
const safeUser = (account) => ({ id: String(account._id), email: account.email, displayName: account.displayName });

const hashPassword = async (password) => {
  const salt = randomBytes(16).toString('hex');
  const derived = await scrypt(password, salt, 64);
  return `${salt}:${Buffer.from(derived).toString('hex')}`;
};

const verifyPassword = async (password, stored) => {
  const [salt, expectedHex] = String(stored ?? '').split(':');
  if (!salt || !expectedHex) return false;
  const actual = Buffer.from(await scrypt(password, salt, 64));
  const expected = Buffer.from(expectedHex, 'hex');
  return expected.length === actual.length && timingSafeEqual(actual, expected);
};

const issueSession = async (account) => {
  const token = randomBytes(32).toString('hex');
  const now = new Date();
  account.sessions = (account.sessions ?? []).filter((session) => new Date(session.expiresAt) > now);
  account.sessions.push({ tokenHash: hashToken(token), expiresAt: new Date(now.getTime() + SESSION_DURATION_MS) });
  await account.save();
  return { token, user: safeUser(account) };
};

export const registerAccount = async (req, res) => {
  try {
    const email = normalizeEmail(req.body.email);
    const password = typeof req.body.password === 'string' ? req.body.password : '';
    const displayName = String(req.body.displayName ?? '').trim();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || email.length > 254) {
      return res.status(400).json({ success: false, message: 'Email chưa đúng định dạng.' });
    }
    if (password.length < 8 || password.length > 128) {
      return res.status(400).json({ success: false, message: 'Mật khẩu cần từ 8 đến 128 ký tự.' });
    }
    if (displayName.length < 2 || displayName.length > 60) {
      return res.status(400).json({ success: false, message: 'Tên hiển thị cần từ 2 đến 60 ký tự.' });
    }
    const exists = await Account.exists({ email });
    if (exists) return res.status(409).json({ success: false, message: 'Email này đã có tài khoản. Hãy đăng nhập.' });
    const account = await Account.create({ email, displayName, passwordHash: await hashPassword(password) });
    const session = await issueSession(account);
    return res.status(201).json({ success: true, data: session });
  } catch (error) {
    if (error?.code === 11000) return res.status(409).json({ success: false, message: 'Email này đã có tài khoản. Hãy đăng nhập.' });
    return res.status(500).json({ success: false, message: 'Không thể tạo tài khoản lúc này.' });
  }
};

export const loginAccount = async (req, res) => {
  try {
    const email = normalizeEmail(req.body.email);
    const password = typeof req.body.password === 'string' ? req.body.password : '';
    const account = await Account.findOne({ email }).select('+passwordHash +sessions');
    if (!account || !(await verifyPassword(password, account.passwordHash))) {
      return res.status(401).json({ success: false, message: 'Email hoặc mật khẩu không chính xác.' });
    }
    const session = await issueSession(account);
    return res.json({ success: true, data: session });
  } catch {
    return res.status(500).json({ success: false, message: 'Không thể đăng nhập lúc này.' });
  }
};

export const requireAccount = async (req, res, next) => {
  try {
    const authorization = req.get('authorization') || '';
    const token = authorization.startsWith('Bearer ') ? authorization.slice(7).trim() : '';
    if (!token) return res.status(401).json({ success: false, message: 'Hãy đăng nhập để truy cập album đã lưu.' });
    const tokenHash = hashToken(token);
    const account = await Account.findOne({
      sessions: { $elemMatch: { tokenHash, expiresAt: { $gt: new Date() } } },
    }).select('+sessions');
    if (!account) return res.status(401).json({ success: false, message: 'Phiên đăng nhập đã hết hạn. Hãy đăng nhập lại.' });
    req.account = account;
    return next();
  } catch {
    return res.status(500).json({ success: false, message: 'Không thể xác thực tài khoản.' });
  }
};

export const getAccountProfile = (req, res) => {
  res.json({ success: true, data: safeUser(req.account) });
};

export const getAccountAlbums = async (req, res) => {
  try {
    const albums = await AccountAlbum.find({ ownerId: req.account._id }).sort({ playedAt: -1, createdAt: -1 }).lean();
    const data = await Promise.all(albums.map(async (album) => ({
      id: String(album._id),
      roomCode: album.roomCode,
      title: album.title,
      themeName: album.themeName,
      themeIcon: album.themeIcon,
      date: new Date(album.playedAt ?? album.createdAt).toLocaleDateString('vi-VN'),
      photos: await Promise.all((album.photos ?? []).map(async (photo) => ({
        id: String(photo._id),
        sourcePhotoId: photo.sourcePhotoId,
        round: photo.round,
        image: await readAccountImageDataUrl(photo.imageFileId, req.account._id),
        cardTitle: photo.cardTitle,
        score: photo.score,
        mission: photo.mission,
        passed: photo.passed,
        playerName: photo.playerName,
      }))),
    })));
    res.json({ success: true, data });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message || 'Không thể tải album đã lưu.' });
  }
};

export const createAccountAlbum = async (req, res) => {
  try {
    const roomCode = String(req.body.roomCode ?? '').trim().slice(0, 40);
    if (!roomCode) return res.status(400).json({ success: false, message: 'Thiếu mã ván chơi.' });
    const title = String(req.body.title ?? `Album ${roomCode}`).trim().slice(0, 120) || `Album ${roomCode}`;
    const existing = await AccountAlbum.findOne({ ownerId: req.account._id, roomCode });
    if (existing) return res.json({ success: true, data: { albumId: String(existing._id), existing: true } });
    const album = await AccountAlbum.create({
      ownerId: req.account._id,
      roomCode,
      title,
      themeName: String(req.body.themeName ?? 'SNAPDECK').slice(0, 80),
      themeIcon: String(req.body.themeIcon ?? '📸').slice(0, 12),
      playedAt: req.body.playedAt ? new Date(req.body.playedAt) : new Date(),
      photos: [],
    });
    res.status(201).json({ success: true, data: { albumId: String(album._id), existing: false } });
  } catch (error) {
    if (error?.code === 11000) {
      const album = await AccountAlbum.findOne({ ownerId: req.account._id, roomCode: String(req.body.roomCode ?? '').trim() });
      if (album) return res.json({ success: true, data: { albumId: String(album._id), existing: true } });
    }
    res.status(400).json({ success: false, message: error.message || 'Không thể tạo album.' });
  }
};

const parseImage = (value) => {
  if (typeof value !== 'string') return null;
  const match = /^data:image\/(jpeg|png|webp);base64,([A-Za-z0-9+/]+={0,2})$/.exec(value);
  if (!match) return null;
  const buffer = Buffer.from(match[2], 'base64');
  if (!buffer.length || buffer.length > 1024 * 1024) return null;
  const valid = match[1] === 'jpeg'
    ? buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff
    : match[1] === 'png'
      ? buffer.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]))
      : buffer.toString('ascii', 0, 4) === 'RIFF' && buffer.toString('ascii', 8, 12) === 'WEBP';
  return valid ? { buffer, contentType: `image/${match[1]}` } : null;
};

export const addPhotoToAccountAlbum = async (req, res) => {
  let fileId = null;
  try {
    if (!mongoose.isValidObjectId(req.params.albumId)) return res.status(404).json({ success: false, message: 'Album không tồn tại.' });
    const album = await AccountAlbum.findOne({ _id: req.params.albumId, ownerId: req.account._id });
    if (!album) return res.status(404).json({ success: false, message: 'Album không tồn tại trong tài khoản này.' });
    const sourcePhotoId = String(req.body.sourcePhotoId ?? '').trim().slice(0, 100);
    if (!sourcePhotoId) return res.status(400).json({ success: false, message: 'Thiếu mã ảnh nguồn.' });
    const existing = album.photos.find((photo) => photo.sourcePhotoId === sourcePhotoId);
    if (existing) return res.json({ success: true, data: { photoId: String(existing._id), duplicate: true } });
    const parsed = parseImage(req.body.image);
    if (!parsed) return res.status(400).json({ success: false, message: 'Ảnh không hợp lệ hoặc lớn hơn 1 MiB sau khi nén.' });
    const round = Number(req.body.round);
    const score = Number(req.body.score);
    if (!Number.isInteger(round) || round < 1 || !Number.isFinite(score) || score < 0) {
      return res.status(400).json({ success: false, message: 'Thông tin vòng hoặc điểm không hợp lệ.' });
    }
    fileId = await storeEvidence(parsed.buffer, parsed.contentType, {
      accountId: String(req.account._id),
      accountAlbumId: String(album._id),
      privateAlbumPhoto: true,
    });
    album.photos.push({
      sourcePhotoId,
      imageFileId: fileId,
      round,
      cardTitle: String(req.body.cardTitle ?? 'Thử thách').slice(0, 160),
      mission: String(req.body.mission ?? '').slice(0, 2000),
      score,
      passed: req.body.passed === true,
      playerName: String(req.body.playerName ?? 'Người chơi').slice(0, 60),
    });
    await album.save();
    res.status(201).json({ success: true, data: { photoId: String(album.photos.at(-1)._id), duplicate: false } });
  } catch (error) {
    if (fileId) await deleteEvidence(fileId).catch(() => undefined);
    res.status(400).json({ success: false, message: error.message || 'Không thể lưu ảnh vào album.' });
  }
};
