import { useEffect } from 'react'
import { HashRouter, Navigate, Route, Routes, useLocation, useNavigate } from 'react-router-dom'
import HomePage from '../pages/Home/HomePage'
import LobbyPage from '../pages/Lobby/LobbyPage'
import ChallengePage from '../pages/Challenge/ChallengePage'
import ResultPage from '../pages/Result/ResultPage'
import LeaderboardPage from '../pages/Leaderboard/LeaderboardPage'
import ScanQRPage from "../pages/ScanQR/ScanQRPage";
import CameraPage from '../pages/Camera/CameraPage';
import AIVerifyPage from '../pages/AIVerify/AIVerifyPage';
import GalleryPage from "../pages/Gallery/GalleryPage";
import AdminPage from '../pages/Admin/AdminPage';
import JoinRoomPage from '../pages/JoinRoom/JoinRoomPage';
import { useGame } from '../context/useGame'
import { apiRequest, playerApiRequest } from '../services/api'
import { THEMES } from '../data/gameData'
import BackgroundMusic from '../components/BackgroundMusic'

interface MultiplayerRoomResponse {
  success: boolean;
  data?: {
    players: Array<{ id: string; name: string; avatar: string; score: number; streak: number; badges: string[] }>;
    currentRound: number;
    totalRounds: number;
    status: 'waiting' | 'active' | 'completed';
    theme: string;
    mode: 'casual' | 'speedrun' | 'spicy';
    verificationMethod: 'ai' | 'group';
    photoEvidence: 'off' | 'optional' | 'required';
    photoBonusEnabled: boolean;
  };
}

interface MultiplayerSubmissionsResponse {
  success: boolean;
  data?: Array<{
    _id: string;
    round: number;
    playerId: string;
    eligibleVoterIds: string[];
    status: 'pending' | 'approved' | 'rejected';
  }>;
}

const MultiplayerSync = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const {
    deviceMode,
    roomCode,
    currentPlayerId,
    roomPlayerToken,
    syncRoom,
    setTheme,
    setMode,
    setVerificationMethod,
    setPhotoEvidence,
    setPhotoBonusEnabled,
  } = useGame();

  useEffect(() => {
    if (deviceMode !== 'multi_device' || !currentPlayerId) return undefined;
    let cancelled = false;
    let timer: number | undefined;

    const poll = async () => {
      try {
        const roomResponse = await apiRequest<MultiplayerRoomResponse>(`/api/rooms/${encodeURIComponent(roomCode)}`);
        if (!roomResponse.success || !roomResponse.data) throw new Error('Không nhận được trạng thái phòng.');
        if (cancelled) return;
        const room = roomResponse.data;
        syncRoom(room);
        const theme = THEMES.find((candidate) => candidate.id === room.theme);
        if (theme) setTheme(theme);
        setMode(room.mode);
        setVerificationMethod(room.verificationMethod);
        setPhotoEvidence(room.photoEvidence);
        setPhotoBonusEnabled(room.photoBonusEnabled);

        if (room.status === 'active') {
          const expectedPlayer = room.players.length
            ? room.players[(room.currentRound - 1) % room.players.length]
            : undefined;
          const resultRound = Number(new URLSearchParams(location.search).get('round'))
            || (location.state?.round as number | undefined)
            || room.currentRound;
          const currentPlayerTurn = expectedPlayer?.id === currentPlayerId;
          if (
            currentPlayerTurn
            && (
              location.pathname === '/lobby'
              || (location.pathname === '/result' && room.currentRound > resultRound)
              || (location.pathname === '/challenge' && room.currentRound > resultRound)
            )
          ) {
            navigate('/scan', { replace: true, state: { round: room.currentRound } });
            return;
          }
          const submissions = await playerApiRequest<MultiplayerSubmissionsResponse>(
            roomPlayerToken,
            `/api/rooms/${encodeURIComponent(roomCode)}/submissions?playerId=${encodeURIComponent(currentPlayerId)}&round=${room.currentRound}`
          );
          const pending = submissions.data?.find((submission) =>
            submission.status === 'pending'
            && submission.playerId !== currentPlayerId
            && submission.eligibleVoterIds.includes(currentPlayerId)
          );
          if (
            pending
            && location.pathname !== '/verify'
            && location.pathname !== '/result'
          ) {
            navigate('/verify', { state: { round: pending.round, submissionId: pending._id } });
          }
        }
      } catch (error) {
        console.warn('[MultiplayerSync] Room synchronization failed:', error);
      } finally {
        if (!cancelled) timer = window.setTimeout(() => { void poll(); }, 2500);
      }
    };
    void poll();
    return () => {
      cancelled = true;
      if (timer) window.clearTimeout(timer);
    };
  }, [
    currentPlayerId,
    deviceMode,
    location.pathname,
    location.search,
    location.state?.round,
    navigate,
    roomCode,
    roomPlayerToken,
    setMode,
    setPhotoEvidence,
    setPhotoBonusEnabled,
    setTheme,
    setVerificationMethod,
    syncRoom,
  ]);

  return null;
};

const AppRouter = () => {
  return (
    <HashRouter>
      <BackgroundMusic />
      <MultiplayerSync />
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/join" element={<JoinRoomPage />} />
        <Route path="/lobby" element={<LobbyPage />} />
        <Route path="/challenge" element={<ChallengePage />} />
        <Route path="/result" element={<ResultPage />} />
        <Route path="/leaderboard" element={<LeaderboardPage />} />
        <Route path="/scan" element={<ScanQRPage />} />
        <Route path="/camera" element={<CameraPage />} />
        <Route path="/verify" element={<AIVerifyPage />} />
        <Route path="/gallery" element={<GalleryPage />} />
        <Route path="/admin" element={<AdminPage />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </HashRouter>
  )
}

export default AppRouter
