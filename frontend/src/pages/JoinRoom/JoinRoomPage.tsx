import { useEffect, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import { Camera, LoaderCircle, RotateCw } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useGame } from '../../context/useGame';
import type { Player } from '../../data/gameData';
import { apiRequest } from '../../services/api';
import { sound } from '../../utils/soundEngine';

interface CreatedRoomResponse {
  success: boolean;
  message?: string;
  data?: {
    roomCode?: string;
    players?: Player[];
  };
  playerToken?: string;
}

export default function JoinRoomPage() {
  const navigate = useNavigate();
  const {
    theme,
    mode,
    deviceMode,
    verificationMethod,
    photoBonusEnabled,
    setRoomCode,
    setPlayers,
    setCurrentPlayerId,
    setRoomPlayerToken,
    setCurrentRound,
  } = useGame();
  const startedRef = useRef(false);
  const [error, setError] = useState('');

  const createAndEnterRoom = async () => {
    setError('');
    try {
      const response = await apiRequest<CreatedRoomResponse>('/api/rooms', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          theme: theme.id,
          mode,
          deviceMode,
          verificationMethod,
                photoBonusEnabled,
          hostName: 'Host',
        }),
      });

      if (!response.success || !response.data?.roomCode || !Array.isArray(response.data.players) || typeof response.playerToken !== 'string') {
        throw new Error(response.message || 'Máy chủ chưa tạo được phòng mới.');
      }

      setRoomCode(response.data.roomCode);
      setPlayers(response.data.players);
      setCurrentPlayerId(response.data.players[0]?.id ?? null);
      setRoomPlayerToken(response.playerToken);
      setCurrentRound(1);
      sound.playSuccess();
      navigate('/lobby', { replace: true, state: { isHost: true, createdFromFixedQR: true } });
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Không thể tạo phòng. Vui lòng thử lại.');
    }
  };

  useEffect(() => {
    if (startedRef.current) return;
    startedRef.current = true;
    void createAndEnterRoom();
  // Only create one room per visit to this page.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <main className="flex min-h-screen items-center justify-center bg-[radial-gradient(circle_at_top_left,_rgba(7,89,133,0.3),_transparent_40%),linear-gradient(135deg,_#030712_0%,_#0f172a_45%,_#111827_100%)] px-4 text-slate-100">
      <motion.section initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="w-full max-w-md rounded-3xl border border-cyan-400/25 bg-slate-900/80 p-8 text-center shadow-2xl">
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl border border-cyan-400/30 bg-cyan-500/10 text-cyan-300">
          {error ? <Camera size={30} /> : <LoaderCircle size={30} className="animate-spin" />}
        </div>
        <p className="mt-5 text-xs font-bold uppercase tracking-[0.2em] text-cyan-300">SNAPDECK</p>
        <h1 className="mt-2 text-2xl font-black">{error ? 'Chưa thể vào phòng' : 'Đang tạo phòng chơi...'}</h1>
        <p className="mt-3 text-sm leading-6 text-slate-300">
          {error ? error : 'Vui lòng đợi trong giây lát. Bạn sẽ được chuyển thẳng vào Lobby khi phòng sẵn sàng.'}
        </p>
        {error && (
          <button onClick={() => { void createAndEnterRoom(); }} className="mt-6 inline-flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-violet-600 to-cyan-500 px-5 py-3 font-bold text-white">
            <RotateCw size={17} /> Thử lại
          </button>
        )}
        <button onClick={() => navigate('/')} className="mt-4 block w-full rounded-xl border border-white/15 px-5 py-3 text-sm font-semibold text-slate-300 hover:bg-white/5">
          Về trang chủ
        </button>
      </motion.section>
    </main>
  );
}
