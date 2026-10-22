import { type FormEvent, useEffect, useMemo, useState } from 'react';
import { Download, Images, LockKeyhole, Save, X } from 'lucide-react';
import { useGame } from '../../context/useGame';
import type { GalleryPhoto } from '../../context/GameContext';
import { apiRequest, playerApiRequest } from '../../services/api';

interface RoomGalleryResponse {
  success: boolean;
  data?: GalleryPhoto[];
}
interface AccountResponse {
  success: boolean;
  message?: string;
  data?: { token: string; user: { id: string; email: string; displayName: string } };
}
interface CreateAlbumResponse {
  success: boolean;
  message?: string;
  data?: { albumId: string; existing: boolean };
}
interface AccountProfileResponse {
  success: boolean;
  data?: { id: string; email: string; displayName: string };
}

const escapeHtml = (value: unknown) => String(value ?? '').replace(/[&<>"']/g, (char) => ({
  '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
}[char] ?? char));

const downloadAlbumHtml = (roomCode: string, themeName: string, photos: GalleryPhoto[]) => {
  const cards = photos.map((photo) => `
    <article class="photo">
      <img src="${photo.image}" alt="${escapeHtml(photo.cardTitle)}" />
      <div class="details"><p class="round">VÒNG ${photo.round} · ${escapeHtml(photo.playerName ?? 'Người chơi')}</p>
      <h2>${escapeHtml(photo.cardTitle)}</h2><p>${escapeHtml(photo.mission)}</p>
      <p class="result ${photo.passed === false ? 'failed' : 'passed'}">${photo.passed === false ? 'CHƯA ĐẠT' : 'ĐẠT'} · ${photo.score} điểm</p></div>
    </article>`).join('\n');
  const html = `<!doctype html><html lang="vi"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>SNAPDECK · Album ${escapeHtml(roomCode)}</title><style>
    :root{color-scheme:dark}*{box-sizing:border-box}body{margin:0;padding:24px;background:#080d1a;color:#eef5ff;font:16px/1.5 system-ui,sans-serif}.wrap{max-width:1050px;margin:auto}h1{margin:0;font-size:clamp(28px,5vw,44px)}.sub{color:#aab9d0;margin:8px 0 28px}.photo{display:grid;grid-template-columns:minmax(0,1.2fr) minmax(220px,.8fr);gap:20px;margin:18px 0;padding:16px;border:1px solid #28435b;border-radius:22px;background:#111b2c;break-inside:avoid}.photo img{width:100%;max-height:620px;object-fit:contain;border-radius:14px;background:#050913}.details{align-self:center}.round{font-size:12px;letter-spacing:.12em;color:#70e6f4;font-weight:800}.result{font-weight:900}.failed{color:#fda4af}.passed{color:#6ee7b7}footer{color:#8191a9;font-size:12px;margin-top:32px}@media(max-width:700px){body{padding:14px}.photo{grid-template-columns:1fr;padding:10px;gap:8px}.photo img{max-height:65vh}}@media print{body{background:white;color:#111;padding:0}.photo{background:white;border-color:#ccc;page-break-inside:avoid}.sub,footer{color:#444}}
    </style></head><body><main class="wrap"><h1>${escapeHtml(themeName)} · Album kỷ niệm</h1><p class="sub">Mã ván chơi: ${escapeHtml(roomCode)} · ${photos.length} ảnh. Tệp này chứa ảnh bên trong và có thể mở khi offline.</p>${cards}<footer>SNAPDECK · Album được tải về thiết bị</footer></main></body></html>`;
  const blob = new Blob([html], { type: 'text/html;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = `snapdeck-album-${roomCode || 'game'}.html`;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 30_000);
};

export default function EndGameAlbumPrompt() {
  const { gameStatus, deviceMode, roomCode, currentPlayerId, roomPlayerToken, albums, theme } = useGame();
  const [photos, setPhotos] = useState<GalleryPhoto[]>([]);
  const [loadingPhotos, setLoadingPhotos] = useState(false);
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState<'choice' | 'account' | 'download' | 'saved'>('choice');
  const [accountMode, setAccountMode] = useState<'login' | 'register'>('register');
  const [email, setEmail] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [saveResult, setSaveResult] = useState<'account' | 'download' | null>(null);

  const promptedKey = useMemo(() => `snapdeck-album-prompted:${roomCode}`, [roomCode]);
  let hasStoredAccountToken = false;
  try { hasStoredAccountToken = Boolean(localStorage.getItem('snapdeck-account-token')); } catch { /* credentials can be entered manually */ }

  useEffect(() => {
    if (gameStatus !== 'completed' || !roomCode) return;
    let cancelled = false;
    const loadPhotos = async () => {
      setLoadingPhotos(true);
      try {
        let result: GalleryPhoto[] = [];
        if (deviceMode === 'multi_device' && currentPlayerId && roomPlayerToken) {
          const response = await playerApiRequest<RoomGalleryResponse>(
            roomPlayerToken,
            `/api/rooms/${encodeURIComponent(roomCode)}/gallery?playerId=${encodeURIComponent(currentPlayerId)}`,
          );
          result = response.data ?? [];
        } else {
          result = albums.find((album) => album.roomCode === roomCode)?.photos ?? [];
        }
        if (cancelled) return;
        setPhotos(result.filter((photo) => Boolean(photo.image)));
        let alreadyPrompted = false;
        try { alreadyPrompted = Boolean(sessionStorage.getItem(promptedKey)); } catch { /* continue without session storage */ }
        if (result.some((photo) => Boolean(photo.image)) && !alreadyPrompted) {
          setOpen(true);
          setStep('choice');
          setSaveResult(null);
        }
      } catch (loadError) {
        if (!cancelled) console.warn('[EndGameAlbumPrompt] Could not prepare the room album:', loadError);
      } finally {
        if (!cancelled) setLoadingPhotos(false);
      }
    };
    void loadPhotos();
    return () => { cancelled = true; };
  }, [albums, currentPlayerId, deviceMode, gameStatus, promptedKey, roomCode, roomPlayerToken]);

  const finishWithoutSaving = () => {
    try { sessionStorage.setItem(promptedKey, 'dismissed'); } catch { /* ignore storage restrictions */ }
    setOpen(false);
  };

  const handleDownload = () => {
    downloadAlbumHtml(roomCode, theme.name, photos);
    try { sessionStorage.setItem(promptedKey, 'downloaded'); } catch { /* ignore storage restrictions */ }
    setSaveResult('download');
    setStep('saved');
  };

  const handleSave = async (event: FormEvent) => {
    event.preventDefault();
    if (busy) return;
    setBusy(true);
    setError('');
    try {
      let token = localStorage.getItem('snapdeck-account-token') || '';
      if (token) {
        try {
          await apiRequest<AccountProfileResponse>('/api/account/me', { headers: { Authorization: `Bearer ${token}` } });
        } catch {
          token = '';
          localStorage.removeItem('snapdeck-account-token');
          localStorage.removeItem('snapdeck-account-user');
        }
      }
      if (!token) {
        const auth = await apiRequest<AccountResponse>(`/api/account/${accountMode}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email, password, ...(accountMode === 'register' ? { displayName } : {}) }),
        });
        if (!auth.success || !auth.data?.token) throw new Error(auth.message || 'Không thể xác thực tài khoản.');
        token = auth.data.token;
        localStorage.setItem('snapdeck-account-token', token);
        localStorage.setItem('snapdeck-account-user', JSON.stringify(auth.data.user));
      }

      const album = await apiRequest<CreateAlbumResponse>('/api/account/albums', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          roomCode,
          title: `${theme.name} · ${roomCode}`,
          themeName: theme.name,
          themeIcon: theme.icon,
          playedAt: new Date().toISOString(),
        }),
      });
      if (!album.success || !album.data?.albumId) throw new Error(album.message || 'Không thể tạo album trong tài khoản.');

      for (const photo of photos) {
        await apiRequest(`/api/account/albums/${encodeURIComponent(album.data.albumId)}/photos`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
          body: JSON.stringify({
            sourcePhotoId: photo.id,
            round: photo.round,
            image: photo.image,
            cardTitle: photo.cardTitle,
            mission: photo.mission,
            score: photo.score,
            passed: photo.passed !== false,
            playerName: photo.playerName ?? 'Người chơi',
          }),
        });
      }
      try { sessionStorage.setItem(promptedKey, 'saved'); } catch { /* ignore storage restrictions */ }
      setSaveResult('account');
      setStep('saved');
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : 'Không thể lưu album. Hãy thử lại.');
    } finally {
      setBusy(false);
    }
  };

  if (!open || photos.length === 0) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/85 p-4 backdrop-blur-xl" role="dialog" aria-modal="true" aria-labelledby="album-save-title">
      <section className="w-full max-w-lg rounded-3xl border border-cyan-400/30 bg-slate-900 p-5 text-slate-100 shadow-2xl sm:p-7">
        <div className="mb-4 flex items-start justify-between gap-4">
          <div className="flex items-center gap-3">
            <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-cyan-400/10 text-cyan-300"><Images size={25} /></span>
            <div><h2 id="album-save-title" className="text-xl font-black sm:text-2xl">Lưu album kỷ niệm?</h2><p className="mt-1 text-xs text-slate-400">{photos.length} ảnh · Ván {roomCode}</p></div>
          </div>
          <button onClick={finishWithoutSaving} aria-label="Đóng" className="rounded-xl border border-white/10 p-2 text-slate-300 hover:bg-white/10"><X size={18} /></button>
        </div>

        {loadingPhotos && <p className="text-sm text-slate-300">Đang chuẩn bị album...</p>}
        {step === 'choice' && (
          <>
            <p className="mb-5 text-sm leading-6 text-slate-300">Bạn có thể lưu album vào tài khoản để xem lại trên thiết bị khác, hoặc tải một tệp album riêng về thiết bị mà không tạo album cá nhân trên cơ sở dữ liệu.</p>
            <div className="grid gap-3 sm:grid-cols-2">
              <button onClick={() => { setStep('account'); setError(''); setAccountMode(localStorage.getItem('snapdeck-account-token') ? 'login' : 'register'); }} className="flex min-h-14 items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-cyan-400 to-fuchsia-500 px-4 py-3 font-black text-slate-950"><Save size={18} /> Lưu vào tài khoản</button>
              <button onClick={() => setStep('download')} className="flex min-h-14 items-center justify-center gap-2 rounded-2xl border border-white/15 bg-white/5 px-4 py-3 font-bold text-white hover:bg-white/10"><Download size={18} /> Chỉ lưu thiết bị</button>
            </div>
            <p className="mt-4 text-[11px] text-slate-500">Ảnh bằng chứng của lượt chơi nhiều thiết bị vẫn được lưu theo dữ liệu ván chơi; lựa chọn này chỉ quyết định có tạo album cá nhân gắn với tài khoản hay không.</p>
          </>
        )}

        {step === 'account' && (
          <form onSubmit={(event) => { void handleSave(event); }} className="space-y-3">
            <div className="flex gap-2 rounded-xl bg-slate-950 p-1">
              <button type="button" onClick={() => setAccountMode('register')} className={`flex-1 rounded-lg px-3 py-2 text-sm font-bold ${accountMode === 'register' ? 'bg-cyan-400 text-slate-950' : 'text-slate-300'}`}>Tạo tài khoản</button>
              <button type="button" onClick={() => setAccountMode('login')} className={`flex-1 rounded-lg px-3 py-2 text-sm font-bold ${accountMode === 'login' ? 'bg-cyan-400 text-slate-950' : 'text-slate-300'}`}>Đăng nhập</button>
            </div>
            {hasStoredAccountToken && <p className="rounded-xl border border-cyan-400/25 bg-cyan-500/10 p-3 text-xs text-cyan-100">Sẽ dùng tài khoản đã đăng nhập trên thiết bị này. Nếu phiên đã hết hạn, hãy nhập thông tin để đăng nhập lại.</p>}
            {accountMode === 'register' && <input required={!hasStoredAccountToken} minLength={2} maxLength={60} value={displayName} onChange={(event) => setDisplayName(event.target.value)} placeholder="Tên hiển thị" className="w-full rounded-xl border border-white/15 bg-slate-950 px-4 py-3 text-sm outline-none focus:border-cyan-400" />}
            <input required={!hasStoredAccountToken} type="email" autoComplete="email" value={email} onChange={(event) => setEmail(event.target.value)} placeholder="Email" className="w-full rounded-xl border border-white/15 bg-slate-950 px-4 py-3 text-sm outline-none focus:border-cyan-400" />
            <input required={!hasStoredAccountToken} type="password" minLength={8} autoComplete={accountMode === 'register' ? 'new-password' : 'current-password'} value={password} onChange={(event) => setPassword(event.target.value)} placeholder="Mật khẩu (ít nhất 8 ký tự)" className="w-full rounded-xl border border-white/15 bg-slate-950 px-4 py-3 text-sm outline-none focus:border-cyan-400" />
            {error && <p role="alert" className="rounded-xl border border-rose-400/30 bg-rose-500/10 p-3 text-sm text-rose-200">{error}</p>}
            <div className="grid gap-2 sm:grid-cols-2">
              <button type="button" onClick={() => setStep('choice')} className="rounded-xl border border-white/15 px-4 py-3 text-sm font-bold text-slate-200">Quay lại</button>
              <button type="submit" disabled={busy} className="flex items-center justify-center gap-2 rounded-xl bg-cyan-400 px-4 py-3 text-sm font-black text-slate-950 disabled:opacity-60"><LockKeyhole size={16} /> {busy ? 'Đang lưu album...' : 'Đăng nhập & lưu'}</button>
            </div>
          </form>
        )}

        {step === 'download' && (
          <div className="space-y-4">
            <p className="text-sm leading-6 text-slate-300">Tệp HTML sẽ chứa các ảnh bên trong, có thể mở offline và không tạo album cá nhân mới trong database.</p>
            <div className="grid gap-2 sm:grid-cols-2">
              <button onClick={() => setStep('choice')} className="rounded-xl border border-white/15 px-4 py-3 text-sm font-bold text-slate-200">Quay lại</button>
              <button onClick={handleDownload} className="flex items-center justify-center gap-2 rounded-xl bg-cyan-400 px-4 py-3 text-sm font-black text-slate-950"><Download size={17} /> Tải album về máy</button>
            </div>
          </div>
        )}

        {step === 'saved' && (
          <div className="space-y-4">
            <p className="text-sm leading-6 text-emerald-200">{saveResult === 'account' ? 'Album và ảnh đã được lưu trong tài khoản của bạn.' : 'Tệp album HTML đã được tải về thiết bị, có thể mở khi offline và không tạo dữ liệu album cá nhân trên database.'}</p>
            <button onClick={() => setOpen(false)} className="w-full rounded-xl bg-cyan-400 px-4 py-3 font-black text-slate-950">Tiếp tục</button>
          </div>
        )}
      </section>
    </div>
  );
}
