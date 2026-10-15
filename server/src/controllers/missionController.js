import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { Card } from '../models/Card.js';
import { Mission } from '../models/Mission.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Đọc fallback dữ liệu từ snapdeck_seed_data.json khi MongoDB rỗng hoặc đang khởi tạo
let cachedSeedData = null;
function getSeedData() {
  if (cachedSeedData) return cachedSeedData;
  try {
    const seedPath = path.resolve(__dirname, '../../../snapdeck_seed_data.json');
    if (fs.existsSync(seedPath)) {
      cachedSeedData = JSON.parse(fs.readFileSync(seedPath, 'utf-8'));
    }
  } catch (err) {
    console.warn('[MissionController] Không thể đọc snapdeck_seed_data.json:', err.message);
  }
  return cachedSeedData;
}

/**
 * Chuẩn hóa các dạng mã QR lá bài:
 * SD-CARD-001, PC-CARD-001, SD-01, PC-01, SD-001, 1, 01,... -> { sdCode: 'SD-CARD-001', pcCode: 'PC-CARD-001' }
 */
function normalizeCardKeys(rawInput) {
  if (!rawInput) return { sdCode: '', pcCode: '', raw: '' };
  let raw = rawInput.trim();
  try {
    raw = decodeURIComponent(raw).trim();
  } catch {
    // giữ nguyên raw
  }
  raw = raw.toUpperCase();

  // Nếu input chứa URL hoặc query string dạng cardCode=... hoặc card=... hoặc c=...
  const queryMatch = raw.match(/[?&#]?(?:CARDCODE|CARD|C)=([^&#]+)/i);
  if (queryMatch) {
    raw = queryMatch[1].trim().toUpperCase();
  }

  // Tìm số thứ tự lá bài (1-24)
  const match = raw.match(/(?:(?:SD|PC)?-?(?:CARD)?-?)0*(\d{1,3})$/i);
  if (match) {
    const num = parseInt(match[1], 10);
    if (num >= 1 && num <= 24) {
      const padded = String(num).padStart(3, '0');
      return {
        sdCode: `SD-CARD-${padded}`,
        pcCode: `PC-CARD-${padded}`,
        raw,
      };
    }
  }

  return {
    sdCode: raw.replace(/^PC-/, 'SD-'),
    pcCode: raw.replace(/^SD-/, 'PC-'),
    raw,
  };
}

export const getMissionByQR = async (req, res) => {
  try {
    const { sdCode, pcCode, raw } = normalizeCardKeys(req.params.qrKey);

    let card = null;
    let missions = [];

    // 1. Thử tìm trong MongoDB (bọc try-catch để tránh treo khi DB chập chờn)
    try {
      card = await Card.findOne({
        $or: [
          { code: sdCode },
          { code: pcCode },
          { code: raw },
          { qrKey: sdCode },
          { qrKey: pcCode },
          { qrKey: raw },
        ],
        isActive: true,
      });

      if (card) {
        missions = await Mission.find({
          $or: [
            { cardCode: card.code },
            { cardCode: sdCode },
            { cardCode: pcCode },
          ],
          isActive: true,
        });
      }
    } catch (dbErr) {
      console.warn('[MissionController] Lỗi truy vấn MongoDB, kích hoạt fallback seed data:', dbErr.message);
    }

    // 2. Fallback sang file snapdeck_seed_data.json nếu MongoDB chưa có dữ liệu hoặc không tìm thấy
    if (!card || !missions.length) {
      const seed = getSeedData();
      if (seed && Array.isArray(seed.cards)) {
        const fallbackCard = seed.cards.find((c) =>
          c.code === sdCode || c.code === pcCode || c.qrKey === sdCode || c.qrKey === pcCode || c.code === raw
        );

        if (fallbackCard) {
          card = fallbackCard;
          const fallbackMissions = (seed.missions || []).filter((m) =>
            m.cardCode === fallbackCard.code || m.cardCode === sdCode || m.cardCode === pcCode
          );
          if (fallbackMissions.length > 0) {
            missions = fallbackMissions;
          } else {
            // Tự tạo mission từ nội dung gốc của card nếu thiếu
            missions = [{
              missionCode: `${fallbackCard.code}-M01`,
              cardCode: fallbackCard.code,
              themeId: fallbackCard.themeId,
              title: fallbackCard.title,
              instruction: fallbackCard.mission,
              difficulty: fallbackCard.difficulty || 2,
              xp: fallbackCard.xp || 20,
            }];
          }
        }
      }
    }

    if (!card) {
      return res.status(404).json({
        success: false,
        message: 'Không tìm thấy lá bài này.',
      });
    }

    if (!missions.length) {
      return res.status(404).json({
        success: false,
        message: 'Lá bài chưa có nhiệm vụ.',
      });
    }

    const mission = missions[Math.floor(Math.random() * missions.length)];

    return res.json({
      success: true,
      card: {
        code: card.code,
        title: card.title,
        themeId: card.themeId,
      },
      mission,
    });
  } catch (error) {
    console.error('[MissionController] Lỗi getMissionByQR:', error);
    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};
