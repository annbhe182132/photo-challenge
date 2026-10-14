import { useEffect, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { ArrowLeft, CheckCircle2, Clock3, Copy, PlayCircle, Sparkles, UserPlus, Users, Volume2, VolumeX } from 'lucide-react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useGame } from '../../context/useGame';
import QRCodeImage from '../../components/QRCodeImage';
import { roomQrValue } from '../../utils/qrPayload';
import { sound } from '../../utils/soundEngine';
import { apiRequest, playerApiRequest } from '../../services/api';
import type { Player } from '../../data/gameData';

interface RoomResponse {
  success: boolean;
  data?: {
    players: Player[];
    currentRound: number;
    totalRounds: number;
    status: 'waiting' | 'active' | 'completed';
    currentTurnIndex?: number;
    activePlayerId?: string | null;
    turnStartedAt?: string | null;
    turnDeadline?: string | null;
    turnDurationSeconds?: 0 | 15 | 30 | 60;
  };
}

const LobbyPage = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const {
    roomCode,
    mode,
    setMode,
    deviceMode,
    verificationMethod,
    photoEvidence,
    photoBonusEnabled,
    currentPlayerId,
    roomPlayerToken,
    totalRounds,
    currentRound,
    setTotalRounds,
    turnDurationSeconds,
    setTurnDurationSeconds,
    soundEnabled,
    toggleSound,
    gameStatus,
    players,
    setPlayers,
    syncRoom,
    startLocalTurn,
  } = useGame();

  const [copied, setCopied] = useState(false);
  const [newPlayerName, setNewPlayerName] = useState('');
  const [roomStatus, setRoomStatus] = useState<'waiting' | 'active' | 'completed'>(gameStatus);
  const [roomError, setRoomError] = useState<string | null>(null);
  const [starting, setStarting] = useState(false);

  // Check if player came from Home -> Scan QR camera join
  const joinedFromQR = location.state?.joinedFromQR ?? false;
  const isSingleDevice = deviceMode === 'single_device';
  const isHost = currentPlayerId != null && currentPlayerId === players[0]?.id;

  useEffect(() => {
    if (isSingleDevice) return undefined;
    let cancelled = false;
    let timer: number | undefined;
    const pollRoom = async () => {
      try {
        const response = await apiRequest<RoomResponse>(`/api/rooms/${encodeURIComponent(roomCode)}`);
        if (!response.success || !response.data) throw new Error('Máy chủ chưa trả về trạng thái phòng.');
        if (!cancelled) {
          syncRoom(response.data);
          setRoomStatus(response.data.status);
          setRoomError(null);
        }
      } catch (error) {
        if (!cancelled) setRoomError(error instanceof Error ? error.message : 'Không thể đồng bộ phòng.');
      } finally {
        if (!cancelled) timer = window.setTimeout(() => { void pollRoom(); }, 3000);
      }
    };
    void pollRoom();
    return () => {
      cancelled = true;
      if (timer) window.clearTimeout(timer);
    };
  }, [isSingleDevice, roomCode, syncRoom]);

  const handleCopy = () => {
    sound.playClick();
    navigator.clipboard.writeText(roomCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleAddPlayer = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPlayerName.trim()) return;
    sound.playClick();
    if (players.some((player) => player.name.toLowerCase() === newPlayerName.trim().toLowerCase())) {
      setRoomError('Tên này đã được dùng trong nhóm.');
      return;
    }
    const newP = {
      id: `p-${Date.now()}`,
      name: newPlayerName.trim(),
      avatar: `https://api.dicebear.com/7.x/bottts/svg?seed=${newPlayerName}`,
      score: 0,
      streak: 0,
      badges: ['🔥 Newbie'],
    };
    setPlayers((prev) => [...prev, newP]);
    setNewPlayerName('');
    setRoomError(null);
  };

  const handleProceedToScanOrChallenge = async () => {
    if (isSingleDevice && players.length < 2) {
      setRoomError('Xác thực nhóm cần ít nhất hai người chơi. Hãy thêm người chơi trước khi bắt đầu.');
      return;
    }
    if (!isSingleDevice && roomStatus !== 'active' && !isHost) {
      setRoomError('Chỉ người tạo phòng mới có thể bắt đầu ván chơi.');
      return;
    }
    if (starting) return;
    sound.playSuccess();
    setRoomError(null);
    setStarting(true);
    try {
      if (!isSingleDevice && roomStatus !== 'active') {
        const response = await playerApiRequest<RoomResponse>(roomPlayerToken, `/api/rooms/${encodeURIComponent(roomCode)}/start`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            playerId: currentPlayerId,
            mode,
            verificationMethod,
            photoEvidence,
            photoBonusEnabled,
            turnDurationSeconds,
            totalRounds,
          }),
        });
        if (!response.success || !response.data) throw new Error('Máy chủ không xác nhận được trạng thái bắt đầu.');
        syncRoom(response.data);
        setRoomStatus(response.data.status);
      } else {
        if (roomStatus !== 'active') startLocalTurn();
        setRoomStatus('active');
      }
      navigate('/scan');
    } catch (error) {
      setRoomError(error instanceof Error ? error.message : 'Không thể bắt đầu ván chơi.');
    } finally {
      setStarting(false);
    }
  };

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top_left,_rgba(7,89,133,0.3),_transparent_40%),linear-gradient(135deg,_#030712_0%,_#0f172a_45%,_#111827_100%)] text-slate-100">
      <div className="relative isolate min-h-screen overflow-hidden">
        <div className="pointer-events-none absolute inset-0 overflow-hidden">
          <motion.div
            className="absolute left-0 top-0 h-72 w-72 rounded-full bg-fuchsia-500/20 blur-3xl"
            animate={{ y: [0, 18, 0], x: [0, 16, 0], scale: [1, 1.04, 1] }}
            transition={{ duration: 10, repeat: Infinity, ease: 'easeInOut' }}
          />
          <motion.div
            className="absolute bottom-0 right-0 h-80 w-80 rounded-full bg-cyan-500/20 blur-3xl"
            animate={{ y: [0, -22, 0], x: [0, -12, 0], scale: [1, 1.06, 1] }}
            transition={{ duration: 11, repeat: Infinity, ease: 'easeInOut' }}
          />
        </div>

        <div className="relative z-10 mx-auto flex min-h-screen max-w-6xl flex-col px-6 py-8 sm:px-8 lg:px-10">
          <button
            onClick={() => {
              sound.playClick();
              navigate('/');
            }}
            className="flex w-fit items-center gap-2 rounded-full border border-white/15 bg-white/10 px-4 py-2 text-sm font-semibold text-slate-200 backdrop-blur-xl transition hover:bg-white/20"
          >
            <ArrowLeft className="h-4 w-4" />
            Trang chủ
          </button>

          <div className="flex flex-1 items-center justify-center py-6">
            <motion.div
              initial={{ opacity: 0, y: 18, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              transition={{ duration: 0.45 }}
              className="w-full max-w-4xl rounded-[2.5rem] border border-cyan-500/30 bg-slate-900/60 p-6 shadow-2xl backdrop-blur-2xl sm:p-8 space-y-8"
            >
              {/* Joined from QR Status Banner */}
              {joinedFromQR && (
                <div className="rounded-2xl border border-emerald-500/40 bg-emerald-500/15 p-4 text-center space-y-1">
                  <span className="text-xs font-bold text-emerald-400 uppercase flex items-center justify-center gap-2">
                    <CheckCircle2 size={16} /> ĐÃ GIA NHẬP PHÒNG THÀNH CÔNG BẰNG QR!
                  </span>
                  <p className="text-sm font-bold text-white">Bạn đang có mặt trong phòng chờ {roomCode}</p>
                </div>
              )}

              {/* Header Info */}
              <div className="flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
                <div>
                  <div className="inline-flex items-center gap-2 rounded-full border border-cyan-500/30 bg-cyan-500/10 px-3.5 py-1.5 text-xs font-bold text-cyan-300">
                    <Sparkles className="h-4 w-4 text-cyan-400" />
                    Sảnh Phòng Chơi Phygital
                  </div>
                  <h1 className="mt-4 text-3xl font-black tracking-tight text-white sm:text-5xl">
                    Phòng Chờ & Cấu Hình
                  </h1>
                  <p className="mt-2 text-sm text-slate-300">
                    Thêm thành viên, chọn cấu hình phòng chơi trước khi chọn lá bài!
                  </p>
                </div>

                <div className="flex flex-col items-center gap-4 rounded-2xl border border-cyan-400/30 bg-slate-950/80 p-4 text-center sm:flex-row sm:justify-center">
                  {isSingleDevice ? (
                    <div className="rounded-2xl border border-emerald-400/30 bg-emerald-500/10 p-4 text-center">
                      <p className="text-xs font-bold uppercase tracking-wider text-emerald-200">Local session · Không cần mạng</p>
                      <p className="mt-1 text-2xl font-black text-white">{roomCode}</p>
                    </div>
                  ) : (
                    <>
                      <div>
                        <p className="text-xs font-bold uppercase tracking-wider text-slate-400">Mã Phòng Chơi</p>
                        <div className="flex items-center justify-center gap-3">
                          <span className="text-2xl font-black tracking-[0.25em] text-cyan-300">{roomCode}</span>
                          <button
                            onClick={handleCopy}
                            className="rounded-xl border border-cyan-400/30 bg-cyan-500/10 p-2 text-cyan-200 transition hover:bg-cyan-500/20"
                            title="Sao chép mã phòng"
                          >
                            {copied ? <CheckCircle2 className="h-4 w-4 text-emerald-400" /> : <Copy className="h-4 w-4" />}
                          </button>
                        </div>
                      </div>
                      <div className="flex flex-col items-center gap-2">
                        <QRCodeImage value={roomQrValue(roomCode)} size={112} alt={`Mã QR tham gia phòng ${roomCode}`} />
                        <span className="max-w-36 text-[10px] text-slate-400">Quét QR này để tham gia đúng phòng</span>
                      </div>
                    </>
                  )}
                </div>
              </div>

              {/* Game Mode Selection */}
              <div>
                <h3 className="text-base font-bold text-white mb-3">1. Chế Độ Chơi & Hình Phạt</h3>
                <div className="grid gap-3 md:grid-cols-3">
                  <button
                    onClick={() => {
                      sound.playClick();
                      if (isSingleDevice || (isHost && roomStatus === 'waiting')) setMode('casual');
                    }}
                    disabled={!isSingleDevice && (!isHost || roomStatus !== 'waiting')}
                    className={`rounded-2xl border p-4 text-left transition ${mode === 'casual'
                      ? 'border-emerald-400 bg-emerald-500/20'
                      : 'border-white/10 bg-white/5 hover:bg-white/10'
                      }`}
                  >
                    <div className="font-bold text-white text-sm flex items-center gap-2">
                      🟢 Casual Party
                    </div>
                    <p className="text-xs text-slate-400 mt-1">Chơi nhẹ nhàng, tập trung khoảnh khắc vui vẻ.</p>
                  </button>

                  <button
                    onClick={() => {
                      sound.playClick();
                      if (isSingleDevice || (isHost && roomStatus === 'waiting')) setMode('speedrun');
                    }}
                    disabled={!isSingleDevice && (!isHost || roomStatus !== 'waiting')}
                    className={`rounded-2xl border p-4 text-left transition ${mode === 'speedrun'
                      ? 'border-cyan-400 bg-cyan-500/20'
                      : 'border-white/10 bg-white/5 hover:bg-white/10'
                      }`}
                  >
                    <div className="font-bold text-white text-sm flex items-center gap-2">
                      ⚡ Speed Run 15s
                    </div>
                    <p className="text-xs text-slate-400 mt-1">15 giây chụp siêu nhanh, đòi hỏi phản xạ cực đỉnh!</p>
                  </button>

                  <button
                    onClick={() => {
                      sound.playClick();
                      if (isSingleDevice || (isHost && roomStatus === 'waiting')) setMode('spicy');
                    }}
                    disabled={!isSingleDevice && (!isHost || roomStatus !== 'waiting')}
                    className={`rounded-2xl border p-4 text-left transition ${mode === 'spicy'
                      ? 'border-fuchsia-400 bg-fuchsia-500/20 shadow-[0_0_20px_rgba(217,70,239,0.25)]'
                      : 'border-white/10 bg-white/5 hover:bg-white/10'
                      }`}
                  >
                    <div className="font-bold text-white text-sm flex items-center gap-2">
                      🌶️ Spicy & Penalty Spin
                    </div>
                    <p className="text-xs text-slate-400 mt-1">Có thể dùng Vòng Quay Hình Phạt khi nhóm không duyệt thử thách.</p>
                  </button>
                </div>
              </div>

              <section className="grid gap-4 rounded-2xl border border-white/10 bg-slate-950/60 p-4 sm:grid-cols-3">
                <label className="space-y-2 text-sm font-semibold text-slate-200">
                  <span className="flex items-center gap-2"><Clock3 size={16} className="text-cyan-300" /> Thời gian mỗi lượt</span>
                  <select
                    value={turnDurationSeconds}
                    onChange={(event) => setTurnDurationSeconds(Number(event.target.value) as 0 | 15 | 30 | 60)}
                    disabled={!isSingleDevice && (!isHost || roomStatus !== 'waiting')}
                    className="w-full rounded-xl border border-white/15 bg-slate-900 px-3 py-2 text-white disabled:opacity-50"
                  >
                    <option value={15}>15 giây</option>
                    <option value={30}>30 giây (mặc định)</option>
                    <option value={60}>60 giây</option>
                    <option value={0}>Không giới hạn</option>
                  </select>
                </label>
                <label className="space-y-2 text-sm font-semibold text-slate-200">
                  <span className="flex items-center gap-2"><Sparkles size={16} className="text-fuchsia-300" /> Số vòng chơi</span>
                  <select
                    value={totalRounds}
                    onChange={(event) => setTotalRounds(Number(event.target.value) as 0 | 3 | 5 | 10)}
                    disabled={!isSingleDevice && (!isHost || roomStatus !== 'waiting')}
                    className="w-full rounded-xl border border-white/15 bg-slate-900 px-3 py-2 text-white disabled:opacity-50"
                  >
                    <option value={3}>3 vòng</option>
                    <option value={5}>5 vòng (mặc định)</option>
                    <option value={10}>10 vòng</option>
                    <option value={0}>Không giới hạn</option>
                  </select>
                </label>
                <div className="flex items-end">
                  <button
                    type="button"
                    aria-pressed={soundEnabled}
                    onClick={toggleSound}
                    className="inline-flex min-h-10 w-full items-center justify-center gap-2 rounded-xl border border-white/15 bg-white/5 px-3 py-2 text-sm font-semibold text-white hover:bg-white/10"
                  >
                    {soundEnabled ? <Volume2 size={17} /> : <VolumeX size={17} />}
                    Âm thanh {soundEnabled ? 'bật' : 'tắt'}
                  </button>
                </div>
              </section>

              {/* Player Roster */}
              <div>
                <div className="mb-3 flex items-center justify-between">
                  <h3 className="text-base font-bold text-white flex items-center gap-2">
                    <Users size={18} className="text-cyan-300" />
                    2. Danh Sách Thành Viên Trong Phòng ({players.length} Thành Viên)
                  </h3>
                </div>

                <div className="grid gap-3 sm:grid-cols-2">
                  <AnimatePresence>
                    {players.map((player, index) => (
                      <motion.div
                        key={player.id}
                        initial={{ opacity: 0, y: 12 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="flex items-center gap-4 rounded-2xl border border-white/15 bg-white/10 p-3.5 backdrop-blur-xl"
                      >
                        <img
                          src={player.avatar}
                          alt={player.name}
                          className="h-12 w-12 rounded-full border border-cyan-400/40 bg-slate-800 object-cover"
                        />
                        <div className="flex-1">
                          <p className="font-bold text-white text-sm flex items-center gap-2">
                            {player.name}
                            {index === 0 && <span className="text-xs text-amber-400 font-bold">👑 Host</span>}
                          </p>
                          <div className="flex items-center gap-2 mt-1">
                            <span className="inline-flex items-center gap-1 text-xs text-emerald-400 font-semibold">
                              <CheckCircle2 size={12} /> Đã có mặt
                            </span>
                          </div>
                        </div>
                      </motion.div>
                    ))}
                  </AnimatePresence>
                </div>

                {/* Quick Add Player Form */}
                {isSingleDevice && roomStatus === 'waiting' && <form onSubmit={handleAddPlayer} className="mt-4 flex gap-3">
                  <input
                    type="text"
                    placeholder="Nhập tên thành viên mới gia nhập..."
                    value={newPlayerName}
                    onChange={(e) => setNewPlayerName(e.target.value)}
                    className="flex-1 rounded-2xl border border-white/15 bg-slate-950/60 px-4 py-2.5 text-sm text-white placeholder-slate-500 focus:border-cyan-400 focus:outline-none"
                  />
                  <button
                    type="submit"
                    className="flex items-center gap-2 rounded-2xl border border-cyan-500/40 bg-cyan-500/20 px-5 py-2.5 text-sm font-bold text-cyan-300 transition hover:bg-cyan-500/30"
                  >
                    <UserPlus size={16} /> Thêm thành viên
                  </button>
                </form>}
                {roomError && <p role="alert" className="mt-3 rounded-xl border border-red-400/40 bg-red-500/10 p-3 text-sm text-red-200">{roomError}</p>}
                {!isSingleDevice && <p className="mt-3 text-xs text-slate-400">
                  {roomStatus === 'active' ? `Ván đang chơi · vòng ${currentRound} / ${totalRounds}` : 'Danh sách và trạng thái đồng bộ tự động mỗi 3 giây.'}
                </p>}
              </div>

              {/* Start Button */}
              <motion.button
                whileHover={{ scale: 1.02, y: -2 }}
                whileTap={{ scale: 0.97 }}
                onClick={() => { void handleProceedToScanOrChallenge(); }}
                disabled={starting || roomStatus === 'completed' || (!isSingleDevice && roomStatus === 'waiting' && !isHost)}
                className="inline-flex w-full items-center justify-center gap-3 rounded-2xl bg-gradient-to-r from-violet-600 via-fuchsia-500 to-cyan-500 px-6 py-4 text-lg font-black text-white shadow-2xl shadow-fuchsia-500/30 transition hover:shadow-cyan-500/40"
              >
                <PlayCircle className="h-6 w-6" />
                {starting ? 'Đang bắt đầu...' : roomStatus === 'active' ? 'Tiếp tục ván chơi → Quét lá bài' : 'Bắt đầu ván chơi → Chọn & quét lá bài'}
              </motion.button>
            </motion.div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LobbyPage;
