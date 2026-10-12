import { useState, type FormEvent } from 'react';
import { motion } from 'framer-motion';
import { ArrowLeft, DoorOpen, PlusCircle, Users } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useGame } from '../../context/GameContext';
import { THEMES, type Player } from '../../data/gameData';
import { apiRequest } from '../../services/api';
import { sound } from '../../utils/soundEngine';

interface RoomResponse {
  success: boolean;
  message?: string;
  data?: {
    roomCode?: string;
    theme?: string;
    mode?: 'casual' | 'speedrun' | 'spicy';
    players?: Player[];
  };
}

const pageClass = 'min-h-screen bg-[radial-gradient(circle_at_top_left,_rgba(7,89,133,0.3),_transparent_40%),linear-gradient(135deg,_#030712_0%,_#0f172a_45%,_#111827_100%)] px-4 py-8 text-slate-100 sm:px-8';
const inputClass = 'w-full rounded-xl border border-white/15 bg-slate-950/70 px-4 py-3 text-white outline-none transition placeholder:text-slate-500 focus:border-cyan-400';

export default function JoinRoomPage() {
  const navigate = useNavigate();
  const { theme, mode, setRoomCode, setPlayers, setTheme, setMode } = useGame();
  const [playerName, setPlayerName] = useState('');
  const [roomCode, setRoomCodeInput] = useState('');
  const [creating, setCreating] = useState(false);
  const [joining, setJoining] = useState(false);
  const [error, setError] = useState('');

  const createRoom = async () => {
    setCreating(true);
    setError('');
    try {
      const response = await apiRequest<RoomResponse>('/api/rooms', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ theme: theme.id, mode, hostName: playerName.trim() || 'Host' }),
      });
      if (!response.success || !response.data?.roomCode || !Array.isArray(response.data.players)) {
        throw new Error(response.message || 'Máy chủ chưa tạo được phòng mới.');
      }
      setRoomCode(response.data.roomCode);
      setPlayers(response.data.players);
      navigate('/lobby', { state: { isHost: true } });
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Không thể tạo phòng. Vui lòng thử lại.');
    } finally {
      setCreating(false);
    }
  };

  const joinRoom = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const code = roomCode.trim().toUpperCase();
    if (!code) {
      setError('Vui lòng nhập mã phòng mà Host chia sẻ.');
      return;
    }
    setJoining(true);
    setError('');
    try {
      const response = await apiRequest<RoomResponse & { player?: Player }>(`/api/rooms/${encodeURIComponent(code)}/join`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ playerName: playerName.trim() || undefined }),
      });
      const room = response.data;
      if (!response.success || !room?.roomCode || !Array.isArray(room.players)) {
        throw new Error(response.message || 'Không thể tham gia phòng này.');
      }
      setRoomCode(room.roomCode);
      const foundTheme = THEMES.find((item) => item.id === room.theme || item.name === room.theme);
      if (foundTheme) setTheme(foundTheme);
      if (room.mode === 'casual' || room.mode === 'speedrun' || room.mode === 'spicy') setMode(room.mode);
      setPlayers(room.players);
      navigate('/lobby', { state: { joinedFromQR: true, roomCode: room.roomCode } });
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Không thể tham gia phòng. Vui lòng kiểm tra mã phòng.');
    } finally {
      setJoining(false);
    }
  };

  return (
    <main className={pageClass}>
      <div className="mx-auto flex min-h-[calc(100vh-4rem)] max-w-5xl flex-col">
        <button onClick={() => navigate('/')} className="flex w-fit items-center gap-2 rounded-full border border-white/15 bg-white/5 px-4 py-2 text-sm font-semibold text-slate-200 hover:bg-white/10">
          <ArrowLeft size={16} /> Trang chủ
        </button>
        <section className="flex flex-1 items-center justify-center py-8">
          <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} className="w-full max-w-3xl rounded-3xl border border-cyan-400/25 bg-slate-900/75 p-5 shadow-2xl backdrop-blur-xl sm:p-8">
            <div className="mx-auto mb-8 max-w-xl text-center">
              <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl border border-cyan-400/30 bg-cyan-500/10 text-cyan-300"><Users size={28} /></div>
              <p className="mt-4 text-xs font-bold uppercase tracking-[0.2em] text-cyan-300">Photo Challenge</p>
              <h1 className="mt-2 text-3xl font-black text-white sm:text-4xl">Tham Gia Phòng Chơi</h1>
              <p className="mt-3 text-sm leading-6 text-slate-300">Tạo phòng mới cho nhóm của bạn, hoặc nhập mã phòng do Host chia sẻ để vào đúng lobby.</p>
            </div>
            <div className="grid gap-5 md:grid-cols-2">
              <form onSubmit={(event) => { event.preventDefault(); sound.playClick(); void createRoom(); }} className="flex flex-col rounded-2xl border border-fuchsia-400/25 bg-fuchsia-500/5 p-5">
                <PlusCircle className="text-fuchsia-300" size={26} />
                <h2 className="mt-3 text-xl font-bold">Tạo phòng mới</h2>
                <p className="mt-2 flex-1 text-sm leading-6 text-slate-400">Dành cho người tổ chức nhóm. Một mã phòng riêng sẽ được tạo để bạn chia sẻ với bạn bè.</p>
                <label className="mb-2 mt-5 text-sm font-semibold text-slate-200" htmlFor="hostName">Tên của bạn (Host)</label>
                <input id="hostName" className={inputClass} maxLength={30} value={playerName} onChange={(event) => setPlayerName(event.target.value)} placeholder="Ví dụ: An" />
                <button disabled={creating || joining} className="mt-4 rounded-xl bg-gradient-to-r from-fuchsia-600 to-cyan-500 px-4 py-3 font-bold text-white disabled:opacity-60">{creating ? 'Đang tạo phòng...' : 'Tạo phòng và vào Lobby'}</button>
              </form>
              <form onSubmit={(event) => { sound.playClick(); void joinRoom(event); }} className="flex flex-col rounded-2xl border border-cyan-400/25 bg-cyan-500/5 p-5">
                <DoorOpen className="text-cyan-300" size={26} />
                <h2 className="mt-3 text-xl font-bold">Tham gia phòng có sẵn</h2>
                <p className="mt-2 flex-1 text-sm leading-6 text-slate-400">Nhập mã phòng đang hiển thị trên thiết bị của Host hoặc QR phòng được Host chia sẻ.</p>
                <label className="mb-2 mt-5 text-sm font-semibold text-slate-200" htmlFor="roomCode">Mã phòng</label>
                <input id="roomCode" className={inputClass} value={roomCode} onChange={(event) => setRoomCodeInput(event.target.value.toUpperCase())} placeholder="ROOM-1234" autoCapitalize="characters" />
                <label className="mb-2 mt-3 text-sm font-semibold text-slate-200" htmlFor="playerName">Tên người chơi</label>
                <input id="playerName" className={inputClass} maxLength={30} value={playerName} onChange={(event) => setPlayerName(event.target.value)} placeholder="Nhập tên hiển thị" />
                <button disabled={creating || joining} className="mt-4 rounded-xl border border-cyan-300/30 bg-cyan-500/15 px-4 py-3 font-bold text-cyan-100 hover:bg-cyan-500/25 disabled:opacity-60">{joining ? 'Đang tham gia...' : 'Tham gia Lobby'}</button>
              </form>
            </div>
            {error && <p role="alert" className="mt-5 rounded-xl border border-red-400/30 bg-red-500/10 p-3 text-sm text-red-200">{error}</p>}
            <p className="mt-6 text-center text-xs leading-5 text-slate-500">QR cố định trên bộ bài chỉ mở trang này. Mỗi nhóm cần dùng mã phòng riêng để vào cùng một lobby.</p>
          </motion.div>
        </section>
      </div>
    </main>
  );
}
