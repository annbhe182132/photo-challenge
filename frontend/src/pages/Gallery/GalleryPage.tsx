import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { ArrowLeft, ChevronRight, Copy, Download, Image as ImageIcon, Layers, Share2, Sparkles, X } from 'lucide-react';
import { useLocation, useNavigate } from 'react-router-dom';
import type { GalleryAlbum, GalleryPhoto } from '../../context/GameContext';
import { useGame } from '../../context/useGame';
import { apiRequest, playerApiRequest } from '../../services/api';
import { sound } from '../../utils/soundEngine';

// Authentic Vector SVG Brand Logos
const InstagramIcon = () => (
  <svg className="h-6 w-6 shrink-0" viewBox="0 0 24 24" fill="none">
    <defs>
      <radialGradient id="igGrad" cx="30%" cy="107%" r="150%">
        <stop offset="0%" stopColor="#fdf497" />
        <stop offset="5%" stopColor="#fdf497" />
        <stop offset="45%" stopColor="#fd5949" />
        <stop offset="60%" stopColor="#d6249f" />
        <stop offset="90%" stopColor="#285AEB" />
      </radialGradient>
    </defs>
    <rect x="2" y="2" width="20" height="20" rx="5" fill="url(#igGrad)" />
    <path d="M12 7a5 5 0 100 10 5 5 0 000-10zm0 8a3 3 0 110-6 3 3 0 010 6zm5.25-9.25a1.25 1.25 0 100 2.5 1.25 1.25 0 000-2.5z" fill="#fff" />
  </svg>
);

const ZaloIcon = () => (
  <svg className="h-6 w-6 shrink-0" viewBox="0 0 48 48" fill="none">
    <rect width="48" height="48" rx="10" fill="#0068FF" />
    <path d="M14 18h20v4L22.5 30H34v4H14v-4l11.5-8H14v-4z" fill="#FFFFFF" />
  </svg>
);

const FacebookIcon = () => (
  <svg className="h-6 w-6 shrink-0" viewBox="0 0 24 24" fill="none">
    <rect width="24" height="24" rx="5" fill="#1877F2" />
    <path d="M16.5 12h-3v8h-3.5v-8h-2v-3h2V7.2c0-2.5 1.4-3.7 3.5-3.7 1 0 2 .1 2 .1v2.5h-1.2c-1.2 0-1.8.7-1.8 1.6V9h3l-.5 3z" fill="#FFFFFF" />
  </svg>
);

const TikTokIcon = () => (
  <svg className="h-6 w-6 shrink-0" viewBox="0 0 24 24" fill="none">
    <rect width="24" height="24" rx="5" fill="#000000" />
    <path d="M16.6 8.2c-1.2-.8-2-2.1-2.2-3.6h-2.7v11.7c0 1.5-1.2 2.7-2.7 2.7s-2.7-1.2-2.7-2.7 1.2-2.7 2.7-2.7c.3 0 .6.1.9.2V11c-.3 0-.6-.1-.9-.1-2.9 0-5.3 2.4-5.3 5.3s2.4 5.3 5.3 5.3 5.3-2.4 5.3-5.3V9.8c1.3.9 2.9 1.4 4.6 1.4V8.5c-.7 0-1.4-.1-2-.3z" fill="#00F2FE" />
    <path d="M16.1 7.7c-1.2-.8-2-2.1-2.2-3.6h-2.7v11.7c0 1.5-1.2 2.7-2.7 2.7s-2.7-1.2-2.7-2.7 1.2-2.7 2.7-2.7c.3 0 .6.1.9.2V10.5c-.3 0-.6-.1-.9-.1-2.9 0-5.3 2.4-5.3 5.3s2.4 5.3 5.3 5.3 5.3-2.4 5.3-5.3V9.3c1.3.9 2.9 1.4 4.6 1.4V8c-.7 0-1.4-.1-2-.3z" fill="#FE2C55" />
    <path d="M16.6 8.2c-1.2-.8-2-2.1-2.2-3.6h-2.7v11.7c0 1.5-1.2 2.7-2.7 2.7s-2.7-1.2-2.7-2.7 1.2-2.7 2.7-2.7c.3 0 .6.1.9.2V11c-.3 0-.6-.1-.9-.1-2.9 0-5.3 2.4-5.3 5.3s2.4 5.3 5.3 5.3 5.3-2.4 5.3-5.3V9.8c1.3.9 2.9 1.4 4.6 1.4V8.5c-.7 0-1.4-.1-2-.3z" fill="#FFFFFF" />
  </svg>
);

const XTwitterIcon = () => (
  <svg className="h-6 w-6 shrink-0" viewBox="0 0 24 24" fill="none">
    <rect width="24" height="24" rx="5" fill="#000000" />
    <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" fill="#FFFFFF" />
  </svg>
);

const NativeShareIcon = () => (
  <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md bg-gradient-to-tr from-cyan-500 to-fuchsia-500 text-white font-bold shadow-md">
    <Share2 size={14} />
  </div>
);

const GalleryPage = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { albums, deviceMode, roomCode, currentPlayerId, roomPlayerToken, theme } = useGame();

  const [selectedAlbum, setSelectedAlbum] = useState<GalleryAlbum | null>(null);
  const [selectedPhoto, setSelectedPhoto] = useState<GalleryPhoto | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [galleryError, setGalleryError] = useState<string | null>(null);
  const [accountAlbums, setAccountAlbums] = useState<GalleryAlbum[]>([]);
  const [roomAlbum, setRoomAlbum] = useState<GalleryAlbum | null>(null);
  const displayAlbums = [...accountAlbums, ...(roomAlbum ? [roomAlbum] : []), ...albums];

  useEffect(() => {
    setRoomAlbum(null);
    if (deviceMode !== 'multi_device' || !currentPlayerId) return;
    let cancelled = false;
    void playerApiRequest<{ success: boolean; data?: GalleryPhoto[] }>(
      roomPlayerToken,
      `/api/rooms/${encodeURIComponent(roomCode)}/gallery?playerId=${encodeURIComponent(currentPlayerId)}`
    ).then((response) => {
      if (cancelled || !response.success || !response.data) return;
      const photos = response.data;
      const syncedAlbum: GalleryAlbum = {
        id: `room-${roomCode}`,
        roomCode,
        themeName: theme.name,
        themeIcon: theme.icon,
        date: new Date().toLocaleDateString('vi-VN'),
        coverImage: photos[0]?.image ?? '',
        photos,
      };
      setRoomAlbum(syncedAlbum);
      setGalleryError(null);
    }).catch((error: unknown) => {
      if (!cancelled) setGalleryError(error instanceof Error ? error.message : 'Không thể đồng bộ thư viện phòng.');
    });
    return () => { cancelled = true; };
  }, [currentPlayerId, deviceMode, roomCode, roomPlayerToken, theme.icon, theme.name]);

  useEffect(() => {
    const token = localStorage.getItem('snapdeck-account-token');
    if (!token) {
      setAccountAlbums([]);
      return undefined;
    }
    let cancelled = false;
    void apiRequest<{ success: boolean; data?: Array<{
      id: string; roomCode: string; title: string; themeName: string; themeIcon: string; date: string;
      photos: GalleryPhoto[];
    }> }>('/api/account/albums', {
      headers: { Authorization: `Bearer ${token}` },
    }).then((response) => {
      if (cancelled || !response.success || !response.data) return;
      setAccountAlbums(response.data.map((album) => ({
        id: `account-${album.id}`,
        roomCode: album.roomCode,
        themeName: album.title || album.themeName,
        themeIcon: album.themeIcon,
        date: album.date,
        coverImage: album.photos[0]?.image ?? '',
        photos: album.photos.filter((photo) => Boolean(photo.image)),
      })));
    }).catch((error: unknown) => {
      if (!cancelled) setGalleryError(error instanceof Error ? error.message : 'Không thể tải album tài khoản.');
    });
    return () => { cancelled = true; };
  }, []);

  useEffect(() => {
    const photoId = new URLSearchParams(location.search).get('photo');
    if (!photoId) return;
    const allAlbums = displayAlbums;
    const matchAlbum = allAlbums.find((album) => album.photos.some((photo) => photo.id === photoId));
    const matchPhoto = matchAlbum?.photos.find((photo) => photo.id === photoId);
    if (matchAlbum && matchPhoto) {
      setSelectedAlbum(matchAlbum);
      setSelectedPhoto(matchPhoto);
    }
  }, [accountAlbums, albums, roomAlbum, location.search]);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  };

  const handleOpenAlbum = (album: GalleryAlbum) => {
    sound.playClick();
    setSelectedAlbum(album);
  };

  const handleOpenShareModal = (photo: GalleryPhoto) => {
    sound.playSuccess();
    setSelectedPhoto(photo);
  };

  const handleDownloadPhoto = async (photo: GalleryPhoto) => {
    sound.playClick();
    try {
      const response = await fetch(photo.image);
      if (!response.ok) throw new Error('Không thể đọc dữ liệu ảnh.');
      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement('a');
      anchor.href = url;
      anchor.download = `snapdeck-${photo.cardTitle.trim().replace(/[^a-z0-9À-ỹ-]+/gi, '-').slice(0, 50) || 'anh-ky-niem'}.jpg`;
      document.body.appendChild(anchor);
      anchor.click();
      anchor.remove();
      window.setTimeout(() => URL.revokeObjectURL(url), 30_000);
      showToast('Đã tải ảnh về thiết bị.');
    } catch {
      showToast('Không thể tải ảnh này. Hãy thử lại.');
    }
  };

  // Social Share Handlers
  const handleShareFacebook = (photo: GalleryPhoto) => {
    sound.playClick();
    const photoUrl = `${window.location.origin}${window.location.pathname}#/gallery?photo=${encodeURIComponent(photo.id)}`;
    const shareUrl = `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(photoUrl)}&quote=${encodeURIComponent(`Khoảnh khắc ván chơi SNAPDECK - "${photo.cardTitle}" nhận ${photo.score} điểm!`)}`;
    window.open(shareUrl, '_blank', 'width=600,height=400');
    showToast('Đã mở cửa sổ chia sẻ lên Facebook!');
  };

  const handleShareTwitter = (photo: GalleryPhoto) => {
    sound.playClick();
    const photoUrl = `${window.location.origin}${window.location.pathname}#/gallery?photo=${encodeURIComponent(photo.id)}`;
    const shareUrl = `https://twitter.com/intent/tweet?text=${encodeURIComponent(`📸 Khoảnh khắc đỉnh cao tại SNAPDECK! Bài thử thách: "${photo.cardTitle}" nhận ${photo.score} điểm! #SNAPDECK #Phygital`)}&url=${encodeURIComponent(photoUrl)}`;
    window.open(shareUrl, '_blank', 'width=600,height=400');
    showToast('Đã mở cửa sổ chia sẻ lên Twitter / X!');
  };

  const handleShareInstagram = (photo: GalleryPhoto) => {
    sound.playClick();
    handleCopyLink(photo);
    showToast('📸 Đã sao chép liên kết. Hãy tải ảnh về máy trước khi đăng lên Instagram.');
  };

  const handleShareZalo = (photo: GalleryPhoto) => {
    sound.playClick();
    handleCopyLink(photo);
    showToast('💬 Đã sao chép liên kết! Dán vào hội thoại Zalo để chia sẻ với bạn bè.');
  };

  const handleShareTikTok = (photo: GalleryPhoto) => {
    sound.playClick();
    handleCopyLink(photo);
    showToast('🎵 Đã sao chép liên kết. Hãy tải ảnh về máy trước khi đăng lên TikTok.');
  };

  const handleCopyLink = (photo: GalleryPhoto) => {
    sound.playClick();
    const link = `${window.location.origin}${window.location.pathname}#/gallery?photo=${encodeURIComponent(photo.id)}`;
    void navigator.clipboard.writeText(link).then(() => showToast('✓ Đã sao chép liên kết ảnh kỉ niệm!')).catch(() => showToast('Trình duyệt không cho sao chép tự động. Hãy thử lại trong trình duyệt chính.'));
  };

  const handleNativeShare = async (photo: GalleryPhoto) => {
    sound.playClick();
    if (navigator.share) {
      try {
        await navigator.share({
          title: `SNAPDECK - ${photo.cardTitle}`,
          text: `Khoảnh khắc kỉ niệm ván chơi SNAPDECK! Điểm thử thách: ${photo.score}`,
          url: `${window.location.origin}${window.location.pathname}#/gallery?photo=${encodeURIComponent(photo.id)}`,
        });
        showToast('Chia sẻ hệ thống thành công!');
      } catch (err) {
        console.log('Share canceled:', err);
      }
    } else {
      handleCopyLink(photo);
    }
  };

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top_left,_rgba(7,89,133,0.3),_transparent_40%),linear-gradient(135deg,_#030712_0%,_#0f172a_45%,_#111827_100%)] text-slate-100">
      {/* Toast Notification */}
      {toastMessage && (
        <motion.div
          initial={{ y: -50, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: -50, opacity: 0 }}
          className="fixed top-6 left-1/2 -translate-x-1/2 z-50 rounded-2xl border border-cyan-400/40 bg-slate-900/95 px-6 py-3 text-sm font-bold text-cyan-300 shadow-2xl backdrop-blur-xl flex items-center gap-2 max-w-md text-center"
        >
          <Sparkles size={16} className="text-cyan-400 animate-spin shrink-0" />
          <span>{toastMessage}</span>
        </motion.div>
      )}

      <div className="relative isolate min-h-screen overflow-hidden">
        <div className="relative z-10 mx-auto flex min-h-screen max-w-6xl flex-col px-6 py-8">
          {galleryError && (
            <p role="alert" className="mb-4 rounded-xl border border-amber-400/40 bg-amber-500/10 p-3 text-sm text-amber-200">
              {galleryError}
            </p>
          )}
          {/* Header */}
          <div className="flex items-center justify-between">
            <button
              onClick={() => {
                sound.playClick();
                navigate('/');
              }}
              className="flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-4 py-2 text-sm font-semibold text-slate-200 backdrop-blur-xl transition hover:bg-white/20"
            >
              <ArrowLeft size={18} /> Trang chủ
            </button>

            <div className="flex items-center gap-2 rounded-full border border-fuchsia-500/30 bg-fuchsia-500/10 px-4 py-1.5 text-xs font-bold text-fuchsia-300">
              <ImageIcon size={14} className="text-fuchsia-400" /> BỘ SƯU TẬP & ALBUM VÁN CHƠI
            </div>
          </div>

          <div className="my-auto py-8 space-y-8">
            <div>
              <h1 className="text-3xl font-black text-white sm:text-4xl">Bộ Sưu Tập Album Ván Chơi</h1>
              <p className="mt-1 text-sm text-slate-300">
                Chọn album ván chơi để xem lại ảnh kỷ niệm, tải ảnh hoặc chia sẻ.
              </p>
            </div>

            {/* Local albums plus albums saved to the signed-in account */}
            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {displayAlbums.filter((album) => album.coverImage).map((album) => (
                <motion.div
                  key={album.id}
                  whileHover={{ y: -6, scale: 1.02 }}
                  onClick={() => handleOpenAlbum(album)}
                  className="cursor-pointer rounded-[2rem] border border-cyan-500/30 bg-slate-900/60 p-5 shadow-2xl backdrop-blur-xl space-y-4 hover:border-cyan-400 transition"
                >
                  <div className="relative h-60 w-full overflow-hidden rounded-2xl border border-white/10">
                    <img src={album.coverImage} alt={album.themeName} className="h-full w-full object-cover" />

                    {/* Badge Overlay */}
                    <div className="absolute top-3 left-3 rounded-full bg-slate-950/85 border border-cyan-400/30 px-3.5 py-1 text-xs font-bold text-cyan-300 backdrop-blur-xl flex items-center gap-1.5">
                      <span>{album.themeIcon}</span> {album.themeName}
                    </div>

                    <div className="absolute bottom-3 right-3 rounded-full bg-fuchsia-500/90 px-3.5 py-1 text-xs font-black text-white shadow-lg flex items-center gap-1">
                      <Layers size={14} /> {album.photos.length} Ảnh Lưu
                    </div>
                  </div>

                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="font-black text-white text-lg">{album.themeName}</h3>
                      <p className="text-xs text-slate-400 mt-0.5">{album.date} • Mã phòng: {album.roomCode}</p>
                    </div>

                    <div className="flex h-10 w-10 items-center justify-center rounded-2xl border border-cyan-400/30 bg-cyan-500/20 text-cyan-300">
                      <ChevronRight size={20} />
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>

            {/* Album Detail Modal (View All Photos Inside Selected Album) */}
            {selectedAlbum && (
              <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/90 p-4 backdrop-blur-2xl overflow-y-auto">
                <motion.div
                  initial={{ scale: 0.9, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  className="relative w-full max-w-4xl max-h-[90vh] overflow-y-auto rounded-[2.5rem] border-2 border-cyan-500/40 bg-slate-900/95 p-6 sm:p-8 text-slate-100 shadow-2xl space-y-6"
                >
                  <button
                    onClick={() => setSelectedAlbum(null)}
                    className="absolute top-6 right-6 text-slate-400 hover:text-white p-2 rounded-full border border-white/10 bg-white/5"
                  >
                    <X size={20} />
                  </button>

                  <div className="space-y-1">
                    <span className="text-xs font-bold uppercase tracking-widest text-cyan-400 flex items-center gap-2">
                      <span>{selectedAlbum.themeIcon}</span> {selectedAlbum.themeName} • Room {selectedAlbum.roomCode}
                    </span>
                    <h2 className="text-3xl font-black text-white">Album Ảnh Ván Chơi ({selectedAlbum.photos.length} Ảnh)</h2>
                    <p className="text-xs text-slate-300">Bấm vào bất kỳ bức ảnh nào bên dưới để mở giao diện Chia Sẻ & Tải Thẻ HD:</p>
                  </div>

                  {/* Grid of Multiple Photos in the Album */}
                  <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                    {selectedAlbum.photos.map((photo) => (
                      <motion.div
                        key={photo.id}
                        whileHover={{ scale: 1.03, y: -4 }}
                        onClick={() => handleOpenShareModal(photo)}
                        className="cursor-pointer rounded-2xl border border-white/15 bg-slate-950/80 p-3 shadow-xl hover:border-cyan-400 transition space-y-3"
                      >
                        <div className="relative h-48 w-full overflow-hidden rounded-xl">
                          <img src={photo.image} alt={photo.cardTitle} className="h-full w-full object-cover" />
                          <div className="absolute top-2 left-2 rounded-full bg-slate-950/80 px-2.5 py-0.5 text-[10px] font-bold text-cyan-300 border border-cyan-400/30">
                            Vòng {photo.round}
                          </div>
                          <div className={`absolute top-2 right-2 rounded-full px-2.5 py-0.5 text-[10px] font-black text-slate-950 ${photo.passed === false ? 'bg-rose-400/90' : 'bg-emerald-500/80'}`}>
                            {photo.passed === false ? 'Chưa đạt' : 'Đạt'} · {photo.score} điểm
                          </div>
                        </div>

                        <div className="space-y-1">
                          <div className="font-bold text-white text-sm truncate">{photo.cardTitle}</div>
                          <div className="text-[11px] text-slate-400 line-clamp-1">{photo.mission}</div>
                        </div>

                        <button className="w-full flex items-center justify-center gap-1.5 rounded-xl border border-cyan-400/30 bg-cyan-500/10 py-2 text-xs font-bold text-cyan-300 hover:bg-cyan-500/20">
                          <Share2 size={14} /> Chia Sẻ & Tải HD
                        </button>
                      </motion.div>
                    ))}
                  </div>
                </motion.div>
              </div>
            )}

            {/* Social Share Sheet Modal (For Selected Photo) */}
            {selectedPhoto && (
              <div className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-950/80 p-4 backdrop-blur-xl">
                <motion.div
                  initial={{ scale: 0.9, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  className="relative w-full max-w-md overflow-hidden rounded-[2.5rem] border-2 border-fuchsia-500/50 bg-gradient-to-b from-slate-950 via-slate-900 to-fuchsia-950/90 p-6 text-slate-100 shadow-2xl space-y-5"
                >
                  <button
                    onClick={() => setSelectedPhoto(null)}
                    className="absolute top-5 right-5 text-slate-400 hover:text-white p-1 rounded-full border border-white/10 bg-white/5"
                  >
                    <X size={18} />
                  </button>

                  <div className="text-center space-y-1">
                    <span className="text-[10px] font-black uppercase tracking-widest text-fuchsia-400">SNAPDECK PHYGITAL</span>
                    <h3 className="text-2xl font-black text-white">Chia Sẻ & Tải Thẻ HD</h3>
                    <p className="text-xs text-slate-300">Thử thách: <strong className="text-cyan-300">{selectedPhoto.cardTitle}</strong></p>
                  </div>

                  {/* Photo Preview Card */}
                  <div className="relative h-52 w-full overflow-hidden rounded-2xl border border-white/20 shadow-2xl">
                    <img src={selectedPhoto.image} alt="Story" className="h-full w-full object-cover" />
                    <div className="absolute bottom-3 left-3 right-3 rounded-xl bg-slate-950/85 border border-white/10 p-2.5 backdrop-blur-xl text-center">
                      <div className="text-xs font-bold text-cyan-300">{selectedPhoto.cardTitle}</div>
                      <div className="text-xs text-emerald-400 font-black mt-0.5">ĐIỂM THỬ THÁCH: {selectedPhoto.score}</div>
                    </div>
                  </div>

                  {/* Vector SVG Brand Logos */}
                  <div className="grid grid-cols-2 gap-3 pt-1">
                    <button
                      onClick={() => handleShareInstagram(selectedPhoto)}
                      className="flex items-center gap-3 rounded-2xl border border-pink-500/30 bg-gradient-to-r from-purple-900/40 via-pink-900/40 to-amber-900/40 p-3 text-left transition hover:scale-102 hover:border-pink-400"
                    >
                      <InstagramIcon />
                      <div>
                        <div className="text-xs font-bold text-white">Instagram</div>
                        <div className="text-[10px] text-pink-300">Story & Post</div>
                      </div>
                    </button>

                    <button
                      onClick={() => handleShareZalo(selectedPhoto)}
                      className="flex items-center gap-3 rounded-2xl border border-blue-500/30 bg-blue-950/40 p-3 text-left transition hover:scale-102 hover:border-blue-400"
                    >
                      <ZaloIcon />
                      <div>
                        <div className="text-xs font-bold text-white">Zalo Chat</div>
                        <div className="text-[10px] text-blue-300">Gửi bạn bè / Nhật ký</div>
                      </div>
                    </button>

                    <button
                      onClick={() => handleShareFacebook(selectedPhoto)}
                      className="flex items-center gap-3 rounded-2xl border border-blue-600/30 bg-blue-900/40 p-3 text-left transition hover:scale-102 hover:border-blue-500"
                    >
                      <FacebookIcon />
                      <div>
                        <div className="text-xs font-bold text-white">Facebook</div>
                        <div className="text-[10px] text-blue-200">Đăng bài / Story</div>
                      </div>
                    </button>

                    <button
                      onClick={() => handleShareTikTok(selectedPhoto)}
                      className="flex items-center gap-3 rounded-2xl border border-cyan-500/30 bg-slate-950/60 p-3 text-left transition hover:scale-102 hover:border-cyan-400"
                    >
                      <TikTokIcon />
                      <div>
                        <div className="text-xs font-bold text-white">TikTok</div>
                        <div className="text-[10px] text-cyan-300">Xuất Story / Video</div>
                      </div>
                    </button>

                    <button
                      onClick={() => handleShareTwitter(selectedPhoto)}
                      className="flex items-center gap-3 rounded-2xl border border-slate-700 bg-slate-900/60 p-3 text-left transition hover:scale-102 hover:border-slate-500"
                    >
                      <XTwitterIcon />
                      <div>
                        <div className="text-xs font-bold text-white">X / Twitter</div>
                        <div className="text-[10px] text-slate-400">Tweet hashtag</div>
                      </div>
                    </button>

                    <button
                      onClick={() => handleNativeShare(selectedPhoto)}
                      className="flex items-center gap-3 rounded-2xl border border-fuchsia-500/30 bg-fuchsia-950/40 p-3 text-left transition hover:scale-102 hover:border-fuchsia-400"
                    >
                      <NativeShareIcon />
                      <div>
                        <div className="text-xs font-bold text-white">Chia Sẻ Khác</div>
                        <div className="text-[10px] text-fuchsia-300">Mobile Native Share</div>
                      </div>
                    </button>
                  </div>

                  {/* Direct Copy Link & Download HD Card Buttons */}
                  <div className="grid grid-cols-2 gap-2 pt-1">
                    <button
                      onClick={() => handleCopyLink(selectedPhoto)}
                      className="flex items-center justify-center gap-2 rounded-2xl border border-white/15 bg-white/10 py-3 text-xs font-bold text-white transition hover:bg-white/20"
                    >
                      <Copy size={14} /> Sao Chép Link
                    </button>

                    <button
                      onClick={() => { void handleDownloadPhoto(selectedPhoto); }}
                      className="flex items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-fuchsia-600 to-pink-600 py-3 text-xs font-bold text-white shadow-xl shadow-fuchsia-500/30 transition hover:scale-102"
                    >
                      <Download size={14} /> Tải Thẻ HD
                    </button>
                  </div>
                </motion.div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default GalleryPage;