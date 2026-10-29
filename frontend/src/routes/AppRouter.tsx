import { useEffect, useRef } from 'react';
import { HashRouter, Navigate, Route, Routes, useLocation, useNavigate } from 'react-router-dom';
import HomePage from '../pages/Home/HomePage';
import LobbyPage from '../pages/Lobby/LobbyPage';
import ChallengePage from '../pages/Challenge/ChallengePage';
import ResultPage from '../pages/Result/ResultPage';
import LeaderboardPage from '../pages/Leaderboard/LeaderboardPage';
import ScanQRPage from '../pages/ScanQR/ScanQRPage';
import CameraPage from '../pages/Camera/CameraPage';
import AIVerifyPage from '../pages/AIVerify/AIVerifyPage';
import GalleryPage from '../pages/Gallery/GalleryPage';
import AdminPage from '../pages/Admin/AdminPage';
import JoinRoomPage from '../pages/JoinRoom/JoinRoomPage';
import HowToPlayPage from '../pages/HowToPlay/HowToPlayPage';
import FloatingBackground from '../components/layout/FloatingBackground';
import { useGame } from '../context/useGame';
import { apiRequest, playerApiRequest } from '../services/api';
import { THEMES } from '../data/gameData';
import BackgroundMusic from '../components/BackgroundMusic';
import type { Player } from '../data/gameData';

interface MultiplayerRoomResponse {
  success: boolean;
  data?: {
    roomCode: string;
    players: Player[];
    currentRound: number;
    totalRounds: number;
    currentTurnIndex: number;
    activePlayerId: string | null;
    turnStartedAt: string | null;
    turnDeadline: string | null;
    turnRemainingSeconds: number | null;
    serverNow?: string;
    turnHistory?: Array<{ turnIndex: number; round: number; playerId: string; status: 'completed' | 'failed' | 'timed_out' | 'skipped'; score: number }>;
    status: 'waiting' | 'active' | 'completed';
    theme: string;
    mode: 'casual' | 'speedrun' | 'spicy';
    verificationMethod: 'ai' | 'group';
    photoBonusEnabled: boolean;
  };
}

interface MultiplayerSubmissionsResponse {
  success: boolean;
  data?: Array<{
    _id: string;
    round: number;
    turnIndex?: number;
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
    setPhotoBonusEnabled,
  } = useGame();
  const lastRoomState = useRef<{ roomCode: string; status: 'waiting' | 'active' | 'completed'; turnIndex: number } | null>(null);

  useEffect(() => {
    if (deviceMode !== 'multi_device' || !currentPlayerId || !roomCode) return undefined;
    let cancelled = false;
    let timer: number | undefined;
    if (lastRoomState.current?.roomCode !== roomCode) lastRoomState.current = null;

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
        setPhotoBonusEnabled(room.photoBonusEnabled);

        const previous = lastRoomState.current;
        const activeIndex = Number.isInteger(room.currentTurnIndex) ? room.currentTurnIndex : 0;
        const activePlayerId = room.activePlayerId || room.players[activeIndex % Math.max(1, room.players.length)]?.id || null;
        const isMyTurn = activePlayerId === currentPlayerId;
        const turnChanged = Boolean(previous && previous.roomCode === roomCode && previous.status === 'active'
          && room.status === 'active' && previous.turnIndex !== activeIndex);
        lastRoomState.current = { roomCode, status: room.status, turnIndex: activeIndex };

        const resolvedPreviousTurn = previous
          ? room.turnHistory?.find((turn) => turn.turnIndex === previous.turnIndex)
          : undefined;

        if (room.status === 'completed') {
          // If this device was the final active player and the turn ended by timeout/skip,
          // show their result before the leaderboard; peers can go straight to the final page.
          if (resolvedPreviousTurn?.playerId === currentPlayerId
            && ['/scan', '/camera', '/challenge'].includes(location.pathname)) {
            navigate('/result', {
              replace: true,
              state: {
                round: resolvedPreviousTurn.round,
                playerId: resolvedPreviousTurn.playerId,
                passed: resolvedPreviousTurn.status === 'completed',
                timedOut: resolvedPreviousTurn.status === 'timed_out',
                skipped: resolvedPreviousTurn.status === 'skipped',
                score: resolvedPreviousTurn.score,
              },
            });
            return;
          }
          if (!['/result', '/verify', '/leaderboard', '/gallery'].includes(location.pathname)) {
            navigate('/leaderboard', { replace: true });
            return;
          }
        } else if (room.status === 'active') {
          // A host starting the room is a server state change; every device leaves the lobby itself.
          if (location.pathname === '/lobby') {
            navigate(isMyTurn ? '/scan' : '/challenge', { replace: true, state: { round: room.currentRound } });
            return;
          }

          // A resolved turn is authoritative: the next active player is sent to scan;
          // everyone else returns to the waiting screen. Keep the submitter on /verify long
          // enough to see their own AI/group result, but do not strand reviewers there.
          if (turnChanged) {
            let viewingOwnSubmission = false;
            if (location.pathname === '/verify') {
              const viewingSubmissionId = new URLSearchParams(location.search).get('submissionId');
              if (viewingSubmissionId) {
                try {
                  const viewedSubmissions = await playerApiRequest<MultiplayerSubmissionsResponse>(
                    roomPlayerToken,
                    `/api/rooms/${encodeURIComponent(roomCode)}/submissions?playerId=${encodeURIComponent(currentPlayerId)}`
                  );
                  viewingOwnSubmission = Boolean(viewedSubmissions.data?.some((submission) => (
                    submission._id === viewingSubmissionId && submission.playerId === currentPlayerId
                  )));
                } catch (submissionError) {
                  console.warn('[MultiplayerSync] Could not identify viewed submission during turn change:', submissionError);
                }
              }
            }

            if (isMyTurn && !viewingOwnSubmission) {
              navigate('/scan', { replace: true, state: { round: room.currentRound } });
              return;
            }
            if (!isMyTurn && ['/scan', '/camera'].includes(location.pathname)) {
              if (resolvedPreviousTurn?.playerId === currentPlayerId) {
                navigate('/result', {
                  replace: true,
                  state: {
                    round: resolvedPreviousTurn.round,
                    playerId: resolvedPreviousTurn.playerId,
                    passed: resolvedPreviousTurn.status === 'completed',
                    timedOut: resolvedPreviousTurn.status === 'timed_out',
                    skipped: resolvedPreviousTurn.status === 'skipped',
                    score: resolvedPreviousTurn.score,
                  },
                });
              } else {
                navigate('/challenge', { replace: true, state: { round: room.currentRound } });
              }
              return;
            }
            if (!isMyTurn && location.pathname === '/verify' && !viewingOwnSubmission) {
              navigate('/challenge', { replace: true, state: { round: room.currentRound } });
              return;
            }
          }

          // Only the player who owns the turn may remain on scan/camera.
          if (!isMyTurn && ['/scan', '/camera'].includes(location.pathname)) {
            navigate('/challenge', { replace: true, state: { round: room.currentRound } });
            return;
          }

          // Group verification is a task for eligible peers, not for the submitter.
          // AI verification is started automatically on the submitter's own /verify page.
          if (room.verificationMethod === 'group') {
            const submissions = await playerApiRequest<MultiplayerSubmissionsResponse>(
              roomPlayerToken,
              `/api/rooms/${encodeURIComponent(roomCode)}/submissions?playerId=${encodeURIComponent(currentPlayerId)}&round=${room.currentRound}`
            );
            const pending = submissions.data?.find((submission) => (
              submission.status === 'pending'
              && submission.playerId !== currentPlayerId
              && submission.eligibleVoterIds.includes(currentPlayerId)
            ));
            if (pending && !['/verify', '/result', '/leaderboard'].includes(location.pathname)) {
              navigate('/verify', { replace: true, state: { round: pending.round, submissionId: pending._id } });
              return;
            }
          }
        }
      } catch (error) {
        console.warn('[MultiplayerSync] Room synchronization failed:', error);
      } finally {
        if (!cancelled) timer = window.setTimeout(() => { void poll(); }, 1400);
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
    setPhotoBonusEnabled,
    setTheme,
    setVerificationMethod,
    syncRoom,
  ]);

  return null;
};

const ScrollToTop = () => {
  const { pathname } = useLocation();
  useEffect(() => {
    window.scrollTo({ top: 0, left: 0, behavior: 'instant' });
  }, [pathname]);
  return null;
};

const AppRouter = () => (
  <HashRouter>
    <ScrollToTop />
    <FloatingBackground />
    <BackgroundMusic />
    <div className="relative z-10">
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
        <Route path="/how-to-play" element={<HowToPlayPage />} />
        <Route path="/admin" element={<AdminPage />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </div>
  </HashRouter>
);

export default AppRouter;
