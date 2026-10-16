import { useEffect, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import { AlertTriangle, ArrowLeft, Camera, Check, RotateCcw, SwitchCamera, Upload } from 'lucide-react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useGame } from '../../context/useGame';
import type { Player } from '../../data/gameData';
import { apiRequest, playerApiRequest, sendPlayerBeacon } from '../../services/api';
import { sound } from '../../utils/soundEngine';
import { isInAppBrowser } from '../../utils/browser';

type CameraStatus = 'idle' | 'requesting' | 'live' | 'error';

interface CurrentRoomResponse {
  success: boolean;
  data?: {
    players: Player[];
    currentRound: number;
    totalRounds: number;
    status: 'waiting' | 'active' | 'completed';
    currentTurnIndex: number;
    activePlayerId: string | null;
    turnStartedAt: string | null;
    turnDeadline: string | null;
    turnRemainingSeconds?: number | null;
    turnDurationSeconds: 0 | 15 | 30 | 60;
    turnHistory?: Array<{
      turnIndex: number;
      round: number;
      playerId: string;
      status: 'completed' | 'failed' | 'timed_out' | 'skipped';
      score: number;
    }>;
  };
}

const getCaptureTimeByDifficulty = (diff: number) => {
  if (diff <= 2) return 10;
  if (diff <= 4) return 15;
  return 20;
};

const getCameraErrorMessage = (error: unknown) => {
  const inApp = isInAppBrowser();
  if (inApp) {
    return 'Trình duyệt trong ứng dụng (Zalo/Facebook) đang chặn camera trực tiếp. Bạn hãy dùng nút "Chụp từ máy / Tải ảnh lên" bên dưới hoặc nhấn dấu "•••" ở góc trên bên phải để "Mở bằng trình duyệt" (Safari).';
  }

  const name = error instanceof DOMException ? error.name : '';

  if (name === 'NotAllowedError' || name === 'PermissionDeniedError' || name === 'SecurityError') {
    return 'Bạn đã từ chối quyền camera. Hãy cho phép camera trong cài đặt trình duyệt rồi thử lại.';
  }
  if (name === 'NotFoundError' || name === 'DevicesNotFoundError') {
    return 'Không tìm thấy camera trên thiết bị này. Hãy dùng nút "Chụp từ máy / Tải ảnh lên".';
  }
  if (name === 'NotReadableError' || name === 'TrackStartError' || name === 'AbortError') {
    return 'Camera đang được ứng dụng khác sử dụng hoặc không thể khởi động. Hãy đóng ứng dụng đó rồi thử lại.';
  }
  if (name === 'OverconstrainedError') {
    return 'Không tìm thấy camera phù hợp. Hãy thử chuyển camera hoặc kiểm tra thiết bị.';
  }
  return 'Không thể mở camera trực tiếp. Bạn có thể dùng nút "Chụp từ máy / Tải ảnh lên" bên dưới để hoàn thành thử thách.';
};

const stopStream = (stream: MediaStream) => {
  stream.getTracks().forEach((track) => {
    track.onended = null;
    track.stop();
  });
};

const CameraPage = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const {
    activeCard,
    currentRound,
    getCurrentPlayer,
    deviceMode,
    photoEvidence,
    roomCode,
    currentPlayerId,
    roomPlayerToken,
    addLocalSubmission,
    turnDeadline,
    pausedTurnRemainingSeconds,
    turnDurationSeconds,
    currentTurnIndex,
    syncRoom,
    startLocalTurn,
    pauseTurnClock,
  } = useGame();

  const round = location.state?.round ?? currentRound;
  const currentPlayer = getCurrentPlayer(round);
  const captureTime = location.state?.captureTime ?? getCaptureTimeByDifficulty(activeCard.difficulty);

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const requestIdRef = useRef(0);

  const [cameraStatus, setCameraStatus] = useState<CameraStatus>('idle');
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [canSwitchCamera, setCanSwitchCamera] = useState(false);
  const [currentDeviceId, setCurrentDeviceId] = useState<string | null>(null);
  const [timeLeft, setTimeLeft] = useState<number | null>(null);
  const [captureTimerStarted, setCaptureTimerStarted] = useState(false);
  const [turnTimeLeft, setTurnTimeLeft] = useState<number | null>(null);
  const [captured, setCaptured] = useState(false);
  const [previewImage, setPreviewImage] = useState<string | null>(null);
  const [previewImageError, setPreviewImageError] = useState(false);
  const [showPhotoPreview, setShowPhotoPreview] = useState(false);
  const [flash, setFlash] = useState(false);
  const [isConfirming, setIsConfirming] = useState(false);
  const timeoutHandledRef = useRef(false);
  const flashTimeoutRef = useRef<number | null>(null);

  const stopCamera = () => {
    const stream = streamRef.current;
    streamRef.current = null;
    if (stream) stopStream(stream);
    if (videoRef.current) videoRef.current.srcObject = null;
  };

  const lifecycleSnapshotRef = useRef({
    deviceMode, roomCode, currentPlayerId, roomPlayerToken, currentTurnIndex,
    turnDeadline, pauseTurnClock,
  });
  lifecycleSnapshotRef.current = {
    deviceMode, roomCode, currentPlayerId, roomPlayerToken, currentTurnIndex,
    turnDeadline, pauseTurnClock,
  };
  const departureHandledRef = useRef(false);

  const pauseTurnOnDeparture = () => {
    const current = lifecycleSnapshotRef.current;
    if (!current.turnDeadline || departureHandledRef.current) return;
    departureHandledRef.current = true;
    current.pauseTurnClock();
    if (current.deviceMode === 'multi_device' && current.currentPlayerId && current.roomPlayerToken) {
      sendPlayerBeacon(
        current.roomPlayerToken,
        `/api/rooms/${encodeURIComponent(current.roomCode)}/pause-turn`,
        { playerId: current.currentPlayerId, turnIndex: current.currentTurnIndex },
      );
    }
  };
  const pauseTurnOnDepartureRef = useRef(pauseTurnOnDeparture);
  pauseTurnOnDepartureRef.current = pauseTurnOnDeparture;

  const stopCameraForDeparture = () => {
    requestIdRef.current += 1;
    stopCamera();
    setCameraStatus('idle');
    setCaptureTimerStarted(false);
    setTimeLeft(null);
    pauseTurnOnDepartureRef.current();
  };
  const stopCameraForDepartureRef = useRef(stopCameraForDeparture);
  stopCameraForDepartureRef.current = stopCameraForDeparture;

  useEffect(() => {
    // If the app was restored from storage while a deadline was still active, freeze it
    // until the player opens a live camera feed again.
    if (lifecycleSnapshotRef.current.turnDeadline) {
      stopCameraForDepartureRef.current();
    }
    const handlePageHide = () => stopCameraForDepartureRef.current();
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'hidden') stopCameraForDepartureRef.current();
    };
    window.addEventListener('pagehide', handlePageHide);
    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => {
      window.removeEventListener('pagehide', handlePageHide);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      requestIdRef.current += 1;
      stopCamera();
      pauseTurnOnDepartureRef.current();
      if (flashTimeoutRef.current !== null) window.clearTimeout(flashTimeoutRef.current);
    };
  }, []);

  useEffect(() => {
    if (!turnDeadline || cameraStatus !== 'live') {
      setTurnTimeLeft(null);
      timeoutHandledRef.current = false;
      return undefined;
    }
    timeoutHandledRef.current = false;
    let cancelled = false;
    const updateTurnTimer = async () => {
      const remaining = Math.max(0, Math.ceil((new Date(turnDeadline).getTime() - Date.now()) / 1000));
      setTurnTimeLeft(remaining);
      if (remaining !== 0 || timeoutHandledRef.current) return;
      timeoutHandledRef.current = true;
      requestIdRef.current += 1;
      stopCamera();
      if (deviceMode === 'single_device') {
        navigate('/result', { replace: true, state: { round, passed: false, score: 0, timedOut: true } });
        return;
      }
      try {
        const response = await apiRequest<CurrentRoomResponse>(`/api/rooms/${encodeURIComponent(roomCode)}`);
        if (cancelled || !response.data) return;
        syncRoom(response.data);
        const resolvedTurn = response.data.turnHistory?.find((turn) => turn.turnIndex === currentTurnIndex);
        navigate('/result', {
          replace: true,
          state: {
            round: resolvedTurn?.round ?? round,
            playerId: resolvedTurn?.playerId ?? currentPlayer.id,
            passed: resolvedTurn?.status === 'completed',
            timedOut: resolvedTurn ? resolvedTurn.status === 'timed_out' : true,
            skipped: resolvedTurn?.status === 'skipped',
            score: resolvedTurn?.score ?? 0,
          },
        });
      } catch (error) {
        if (!cancelled) {
          setCameraError(error instanceof Error ? error.message : 'Không thể xác nhận lượt đã hết giờ với máy chủ.');
          timeoutHandledRef.current = false;
        }
      }
    };
    void updateTurnTimer();
    const interval = window.setInterval(() => { void updateTurnTimer(); }, 500);
    return () => {
      cancelled = true;
      window.clearInterval(interval);
    };
  }, [cameraStatus, currentPlayer.id, currentTurnIndex, deviceMode, navigate, roomCode, round, syncRoom, turnDeadline]);

  const startCamera = async (
    video: MediaTrackConstraints,
    fallbackStatus: CameraStatus,
    deviceId?: string,
  ) => {
    if (!navigator.mediaDevices?.getUserMedia) {
      setCameraError('Trình duyệt này không hỗ trợ camera. Hãy dùng phiên bản trình duyệt mới trên localhost hoặc HTTPS.');
      setCameraStatus('error');
      return;
    }

    const requestId = ++requestIdRef.current;
    setCameraError(null);
    setCameraStatus('requesting');

    try {
      let stream: MediaStream;
      try {
        stream = await navigator.mediaDevices.getUserMedia({
          audio: false,
          video,
        });
      } catch (initialError) {
        console.warn('[CameraPage] Primary getUserMedia failed, retrying with fallback { video: true }:', initialError);
        stream = await navigator.mediaDevices.getUserMedia({
          audio: false,
          video: true,
        });
      }

      if (requestId !== requestIdRef.current) {
        stopStream(stream);
        return;
      }

      const videoElement = videoRef.current;
      if (!videoElement) {
        stopStream(stream);
        throw new Error('Không thể hiển thị hình ảnh từ camera.');
      }

      const previousStream = streamRef.current;
      videoElement.srcObject = stream;
      try {
        await videoElement.play();
        if (videoElement.readyState < HTMLMediaElement.HAVE_CURRENT_DATA || !videoElement.videoWidth) {
          await new Promise<void>((resolve, reject) => {
            const timeout = window.setTimeout(() => {
              cleanup();
              reject(new Error('Không nhận được hình ảnh từ camera.'));
            }, 5000);
            const handleLoadedData = () => {
              cleanup();
              resolve();
            };
            const handleError = () => {
              cleanup();
              reject(new Error('Không thể hiển thị hình ảnh từ camera.'));
            };
            const cleanup = () => {
              window.clearTimeout(timeout);
              videoElement.removeEventListener('loadeddata', handleLoadedData);
              videoElement.removeEventListener('error', handleError);
            };
            videoElement.addEventListener('loadeddata', handleLoadedData, { once: true });
            videoElement.addEventListener('error', handleError, { once: true });
            if (videoElement.readyState >= HTMLMediaElement.HAVE_CURRENT_DATA && videoElement.videoWidth) {
              cleanup();
              resolve();
            }
          });
        }
      } catch (error) {
        videoElement.srcObject = previousStream;
        stopStream(stream);
        throw error;
      }

      if (!stream.getVideoTracks().some((track) => track.readyState === 'live') || !videoElement.videoWidth) {
        videoElement.srcObject = previousStream;
        stopStream(stream);
        throw new Error('Camera chưa phát hình ảnh. Hãy thử mở lại camera.');
      }

      if (requestId !== requestIdRef.current) {
        if (videoElement.srcObject === stream) videoElement.srcObject = null;
        stopStream(stream);
        return;
      }

      streamRef.current = stream;
      if (previousStream) stopStream(previousStream);

      stream.getVideoTracks().forEach((track) => {
        track.onended = () => {
          if (streamRef.current === stream) {
            streamRef.current = null;
            if (videoRef.current?.srcObject === stream) videoRef.current.srcObject = null;
            stopStream(stream);
            setCameraStatus('error');
            setCaptureTimerStarted(false);
            setCameraError('Kết nối camera đã bị ngắt. Hãy bật camera lại để tiếp tục.');
          }
        };
      });

      if (deviceId) {
        setCurrentDeviceId(deviceId);
      } else {
        setCurrentDeviceId(stream.getVideoTracks()[0]?.getSettings().deviceId ?? null);
      }
      try {
        const cameras = (await navigator.mediaDevices.enumerateDevices())
          .filter((device) => device.kind === 'videoinput');
        if (requestId !== requestIdRef.current) return;
        setCanSwitchCamera(cameras.length > 1);
      } catch {
        setCanSwitchCamera(false);
        setCameraError('Không thể kiểm tra các camera khác; bạn vẫn có thể dùng camera hiện tại.');
      }
      setCameraStatus('live');
      return true;
    } catch (error) {
      if (requestId !== requestIdRef.current) return;
      setCameraStatus(fallbackStatus);
      setCameraError(error instanceof Error && !(error instanceof DOMException)
        ? error.message
        : getCameraErrorMessage(error));
      return false;
    }
  };

  const handleOpenCamera = async () => {
    departureHandledRef.current = false;
    setCaptureTimerStarted(false);
    const opened = await startCamera({ facingMode: { ideal: 'user' } }, 'error');
    if (!opened) return;

    try {
      if (deviceMode === 'single_device') {
        startLocalTurn();
      } else {
        if (!currentPlayerId) throw new Error('Không xác định được người chơi đang có lượt.');
        const response = await playerApiRequest<CurrentRoomResponse>(
          roomPlayerToken,
          `/api/rooms/${encodeURIComponent(roomCode)}/start-turn`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ playerId: currentPlayerId, turnIndex: currentTurnIndex }),
          },
        );
        if (!response.success || !response.data) {
          throw new Error('Máy chủ không xác nhận được thời điểm bắt đầu lượt.');
        }
        syncRoom(response.data);
      }

      setTimeLeft(captureTime);
      setCaptureTimerStarted(true);
    } catch (error) {
      stopCamera();
      setCameraStatus('error');
      setCaptureTimerStarted(false);
      setCameraError(error instanceof Error ? error.message : 'Không thể bắt đầu tính giờ lượt. Hãy thử mở camera lại.');
    }
  };

  const handleSwitchCamera = async () => {
    if (cameraStatus !== 'live' || !navigator.mediaDevices?.enumerateDevices) return;

    try {
      const cameras = (await navigator.mediaDevices.enumerateDevices())
        .filter((device) => device.kind === 'videoinput');
      if (cameras.length < 2) {
        setCanSwitchCamera(false);
        return;
      }

      setCanSwitchCamera(true);
      const currentIndex = cameras.findIndex((device) => device.deviceId === currentDeviceId);
      const nextIndex = currentIndex < 0 ? 1 : (currentIndex + 1) % cameras.length;
      const nextCamera = cameras[nextIndex];
      await startCamera({ deviceId: { exact: nextCamera.deviceId } }, 'live', nextCamera.deviceId);
    } catch {
      setCameraError('Không thể chuyển camera. Camera hiện tại vẫn được giữ để bạn tiếp tục.');
    }
  };

  useEffect(() => {
    if (cameraStatus !== 'live' || !captureTimerStarted || captured || timeLeft === null) return;
    if (timeLeft <= 0) {
      const timeout = window.setTimeout(() => {
        setCaptureTimerStarted(false);
        sound.playScanBeep();
        stopCamera();
        setCameraStatus('idle');
        setCameraError('Thời gian chụp đã hết. Thử thách chưa bị từ chối; hãy mở camera lại hoặc tải ảnh lên.');
      }, 0);
      return () => window.clearTimeout(timeout);
    }

    const timer = window.setInterval(() => {
      setTimeLeft((previous) => {
        if (previous !== null && previous <= 5 && previous > 1) sound.playTick();
        return previous === null ? null : Math.max(0, previous - 1);
      });
    }, 1000);

    return () => window.clearInterval(timer);
  }, [cameraStatus, captureTimerStarted, captured, timeLeft]);

  const handleCapture = () => {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (cameraStatus !== 'live' || !video || !canvas || video.readyState < HTMLMediaElement.HAVE_CURRENT_DATA) {
      setCameraError('Camera chưa sẵn sàng để chụp. Hãy đợi hình ảnh xuất hiện rồi thử lại.');
      return;
    }

    const context = canvas.getContext('2d');
    if (!context || !video.videoWidth || !video.videoHeight) {
      setCameraError('Không thể đọc hình ảnh từ camera. Hãy thử tắt và bật lại camera.');
      return;
    }

    sound.playClick();
    const scale = Math.min(1, 1024 / video.videoWidth);
    canvas.width = Math.round(video.videoWidth * scale);
    canvas.height = Math.round(video.videoHeight * scale);
    context.drawImage(video, 0, 0, canvas.width, canvas.height);

    try {
      setPreviewImage(canvas.toDataURL('image/jpeg', 0.68));
      setPreviewImageError(false);
      setCaptured(true);
      setCaptureTimerStarted(false);
      setCameraStatus('idle');
      setCameraError(null);
      stopCamera();
      setFlash(true);
      if (flashTimeoutRef.current !== null) window.clearTimeout(flashTimeoutRef.current);
      flashTimeoutRef.current = window.setTimeout(() => {
        flashTimeoutRef.current = null;
        setFlash(false);
      }, 180);
    } catch {
      setCameraError('Không thể tạo ảnh xem trước. Hãy thử chụp lại.');
    }
  };

  const handleRetake = () => {
    sound.playClick();
    setCaptured(false);
    setPreviewImage(null);
    setPreviewImageError(false);
    setShowPhotoPreview(false);
    setCanSwitchCamera(false);
    setCameraStatus('idle');
    setCameraError(null);
  };

  const handlePhotoFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    event.target.value = '';
    try {
      const objectUrl = URL.createObjectURL(file);
      try {
        const image = new Image();
        image.src = objectUrl;
        await new Promise<void>((resolve, reject) => {
          image.onload = () => resolve();
          image.onerror = () => reject(new Error('Không thể đọc ảnh đã chọn.'));
        });
        const scale = Math.min(1, 1024 / image.naturalWidth);
        const canvas = document.createElement('canvas');
        canvas.width = Math.round(image.naturalWidth * scale);
        canvas.height = Math.round(image.naturalHeight * scale);
        const context = canvas.getContext('2d');
        if (!context) throw new Error('Không thể xử lý ảnh đã chọn.');
        context.drawImage(image, 0, 0, canvas.width, canvas.height);
        const evidence = canvas.toDataURL('image/jpeg', 0.68);
        if (evidence.length > 1_400_000) throw new Error('Ảnh sau khi nén vẫn quá lớn. Hãy chọn ảnh khác.');
        sound.playClick();
        setPreviewImage(evidence);
        setPreviewImageError(false);
        setCaptured(true);
        setCaptureTimerStarted(false);
        setCameraStatus('idle');
        setCameraError(null);
        stopCamera();
      } finally {
        URL.revokeObjectURL(objectUrl);
      }
    } catch (error) {
      setCameraError(error instanceof Error ? error.message : 'Không thể đọc ảnh đã chọn.');
    }
  };

  const handleUsePhoto = async (evidence = previewImage) => {
    if (isConfirming) return;
    if (deviceMode === 'multi_device' && currentPlayerId !== currentPlayer.id) {
      setCameraError(`Lượt này thuộc về ${currentPlayer.name}. Bạn không thể gửi thử thách thay người chơi đó.`);
      return;
    }
    if (photoEvidence === 'required' && !evidence) {
      setCameraError('Cần chụp hoặc tải ảnh lên trước khi gửi thử thách.');
      return;
    }
    if (deviceMode === 'multi_device' && !currentPlayerId) {
      setCameraError('Không xác định được người chơi trên thiết bị này. Hãy tham gia lại phòng.');
      return;
    }
    setIsConfirming(true);
    setCameraError(null);
    sound.playClick();
    stopCamera();
    try {
      let submissionId: string;
      if (deviceMode === 'single_device') {
        const local = addLocalSubmission({
          round,
          playerId: currentPlayer.id,
          cardCode: activeCard.code,
          cardTitle: activeCard.title,
          mission: activeCard.mission,
          evidence: photoEvidence === 'off' ? null : evidence,
        });
        submissionId = local.id;
      } else {
        const response = await playerApiRequest<{
          success: boolean;
          data?: { _id: string };
        }>(roomPlayerToken, `/api/rooms/${encodeURIComponent(roomCode)}/submissions`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            playerId: currentPlayerId,
            round,
            missionCode: activeCard.id,
            cardCode: activeCard.code,
            evidence: photoEvidence === 'off' ? null : evidence,
          }),
        });
        if (!response.success || !response.data?._id) throw new Error('Máy chủ không xác nhận được lượt gửi.');
        submissionId = response.data._id;
      }
      navigate(`/verify?round=${round}&submissionId=${encodeURIComponent(submissionId)}`, {
        state: { round, submissionId },
      });
    } catch (error) {
      setCameraError(error instanceof Error ? error.message : 'Không thể gửi thử thách. Hãy thử lại.');
      setIsConfirming(false);
    }
  };

  const handleContinueWithoutPhoto = () => {
    if (photoEvidence !== 'optional' && photoEvidence !== 'off') return;
    void handleUsePhoto(null);
  };

  const handleBack = () => {
    sound.playClick();
    stopCameraForDepartureRef.current();
    requestIdRef.current += 1;
    stopCamera();
    navigate(-1);
  };

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top_left,_rgba(7,89,133,0.3),_transparent_40%),linear-gradient(135deg,_#030712_0%,_#0f172a_45%,_#111827_100%)] text-slate-100">
      <div className="relative isolate min-h-screen overflow-hidden">
        <div className="relative z-10 mx-auto flex min-h-screen max-w-5xl flex-col px-4 py-5 sm:px-6 sm:py-8">
          <button
            onClick={handleBack}
            className="flex w-fit items-center gap-2 rounded-full border border-white/15 bg-white/10 px-4 py-2 text-sm font-semibold text-slate-200 backdrop-blur-xl transition hover:bg-white/20"
          >
            <ArrowLeft size={18} /> Quay lại
          </button>

          <div className="my-auto py-5 sm:py-6">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="space-y-5 rounded-[2rem] border border-cyan-500/30 bg-slate-900/60 p-4 shadow-2xl backdrop-blur-2xl sm:space-y-6 sm:rounded-[2.5rem] sm:p-8"
            >
              <div className="flex flex-col gap-4 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between">
                <div>
                  <h1 className="text-2xl font-black text-white sm:text-4xl">Ống Kính Camera Chụp Thử Thách</h1>
                  <p className="mt-1 text-sm font-semibold text-cyan-200">{activeCard.title}</p>
                </div>
                <div className="flex flex-wrap items-center gap-2 sm:gap-3">
                  <div className="flex items-center gap-2 rounded-full border border-fuchsia-400/30 bg-fuchsia-500/20 px-3 py-1.5 text-xs font-bold text-fuchsia-300">
                    <img src={currentPlayer.avatar} alt={currentPlayer.name} className="h-5 w-5 rounded-full object-cover" />
                    <span>Lượt của: {currentPlayer.name}</span>
                  </div>
                  <span className="rounded-full border border-cyan-400/30 bg-cyan-500/20 px-4 py-1.5 text-xs font-bold text-cyan-300">
                    Vòng {round} {turnDurationSeconds === 0 ? '· ∞' : turnTimeLeft !== null ? `· Lượt còn ${turnTimeLeft}s` : pausedTurnRemainingSeconds !== null ? `· Tạm dừng, còn ${pausedTurnRemainingSeconds}s` : ''}
                  </span>
                  <div className="min-w-16 text-right">
                    <span className="block text-[10px] font-bold uppercase text-slate-400">Thời Gian Chụp</span>
                    <span className={`text-2xl font-black ${timeLeft !== null && timeLeft <= 5 ? 'text-red-400 animate-pulse' : 'text-cyan-300'}`}>
                      {timeLeft === null ? '--' : `${timeLeft}s`}
                    </span>
                  </div>
                </div>
              </div>

              <div className="relative mx-auto aspect-[3/4] max-h-[65vh] min-h-[280px] w-full max-w-lg overflow-hidden rounded-[1.75rem] border-2 border-cyan-400/40 bg-slate-950 shadow-2xl sm:aspect-[4/3] sm:rounded-[2rem]">
                <video
                  ref={videoRef}
                  autoPlay
                  playsInline
                  muted
                  className={`h-full w-full object-cover ${cameraStatus === 'live' && !captured ? 'block' : 'hidden'}`}
                />
                {captured && previewImage && (
                  <button type="button" onClick={() => setShowPhotoPreview(true)} className="h-full w-full cursor-zoom-in">
                    <img
                      src={previewImage}
                      alt="Ảnh vừa chụp, chạm để xem lớn"
                      onError={() => setPreviewImageError(true)}
                      className="h-full w-full object-contain"
                    />
                  </button>
                )}
                {captured && previewImageError && (
                  <div role="alert" className="absolute inset-x-3 bottom-3 rounded-xl bg-red-950/90 p-3 text-center text-sm text-red-100">
                    Không thể hiển thị ảnh. Hãy tải ảnh khác hoặc chụp lại.
                  </div>
                )}
                {flash && <div className="pointer-events-none absolute inset-0 z-30 bg-white" />}

                {cameraStatus !== 'live' && !captured && (
                  <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-slate-900 px-6 text-center">
                    <Camera size={64} className="text-cyan-400/60" />
                    <p className="text-sm font-semibold text-slate-200">
                      {cameraStatus === 'requesting'
                        ? 'Đang kết nối camera...'
                        : 'Bấm “Mở camera” để cho phép truy cập và bắt đầu chụp.'}
                    </p>
                    {cameraStatus === 'idle' && (
                      <p className="text-xs text-slate-400">Giới hạn {captureTime} giây; đồng hồ bắt đầu khi camera phát hình.</p>
                    )}
                    {cameraStatus === 'error' && (
                      <div className="flex flex-wrap items-center justify-center gap-2">
                        <button
                          onClick={handleOpenCamera}
                          className="rounded-xl border border-cyan-400/40 bg-cyan-500/15 px-4 py-2 text-sm font-bold text-cyan-200 transition hover:bg-cyan-500/25"
                        >
                          Thử mở camera lại
                        </button>
                        <label
                          className="cursor-pointer rounded-xl border border-fuchsia-400/40 bg-fuchsia-500/15 px-4 py-2 text-sm font-bold text-fuchsia-200 transition hover:bg-fuchsia-500/25"
                        >
                          Tải ảnh từ máy
                          <input
                            type="file"
                            accept="image/*"
                            capture="user"
                            className="hidden"
                            onChange={handlePhotoFileUpload}
                          />
                        </label>
                      </div>
                    )}
                  </div>
                )}

                {cameraStatus === 'live' && !captured && (
                  <div className="pointer-events-none absolute inset-0 border-[10px] border-cyan-500/10 sm:border-[12px]">
                    <div className="absolute left-5 top-5 h-10 w-10 border-l-2 border-t-2 border-cyan-400 sm:left-8 sm:top-8 sm:h-12 sm:w-12" />
                    <div className="absolute right-5 top-5 h-10 w-10 border-r-2 border-t-2 border-cyan-400 sm:right-8 sm:top-8 sm:h-12 sm:w-12" />
                    <div className="absolute bottom-5 left-5 h-10 w-10 border-b-2 border-l-2 border-cyan-400 sm:bottom-8 sm:left-8 sm:h-12 sm:w-12" />
                    <div className="absolute bottom-5 right-5 h-10 w-10 border-b-2 border-r-2 border-cyan-400 sm:bottom-8 sm:right-8 sm:h-12 sm:w-12" />
                    <div className="absolute left-4 top-4 flex items-center gap-1.5 rounded-full bg-red-500/80 px-3 py-1 text-[10px] font-bold text-white">
                      <span className="h-2 w-2 animate-ping rounded-full bg-white" /> LIVE FEED
                    </div>
                    <div className="absolute bottom-4 left-1/2 -translate-x-1/2 rounded-full border border-cyan-500/30 bg-slate-950/70 px-4 py-1 text-xs font-bold text-cyan-300 backdrop-blur-xl">
                      CAMERA READY
                    </div>
                  </div>
                )}
                <canvas ref={canvasRef} className="hidden" />
              </div>

              {isInAppBrowser() && !captured && (
                <div className="mx-auto max-w-lg rounded-2xl border border-amber-500/40 bg-amber-500/10 p-4 text-left text-xs text-amber-200">
                  <div className="flex items-start gap-2.5">
                    <AlertTriangle size={18} className="mt-0.5 shrink-0 text-amber-400" />
                    <div>
                      <p className="font-bold text-amber-100">Đang mở trong ứng dụng (Zalo / Facebook)</p>
                      <p className="mt-1 leading-relaxed text-amber-200/90">
                        Nếu camera trực tiếp bị chặn, bạn có thể dùng nút <strong>"Chụp từ máy / Tải ảnh lên"</strong> bên dưới hoặc nhấn <strong className="text-white underline">•••</strong> ở góc trên bên phải để <strong>"Mở bằng trình duyệt"</strong> (Safari).
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {cameraError && (
                <p role="alert" className="rounded-xl border border-red-400/40 bg-red-500/10 px-4 py-3 text-center text-sm font-semibold text-red-200">
                  {cameraError}
                </p>
              )}

              {!captured ? (
                <div className="flex flex-wrap items-center justify-center gap-3">
                  {cameraStatus !== 'live' ? (
                    <>
                      <motion.button
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                        onClick={handleOpenCamera}
                        disabled={cameraStatus === 'requesting'}
                        className="flex min-h-12 items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-violet-600 via-fuchsia-500 to-cyan-500 px-6 py-3 font-bold text-white shadow-xl shadow-fuchsia-500/20 disabled:cursor-wait disabled:opacity-70"
                      >
                        <Camera size={19} />
                        {cameraStatus === 'requesting' ? 'Đang mở camera...' : 'Mở camera'}
                      </motion.button>

                      <label
                        className="flex min-h-12 cursor-pointer items-center justify-center gap-2 rounded-2xl border border-cyan-400/40 bg-cyan-500/15 px-6 py-3 font-bold text-cyan-200 shadow-lg backdrop-blur-md transition hover:bg-cyan-500/25"
                      >
                        <Upload size={18} />
                        <span>Chụp từ máy / Tải ảnh lên</span>
                        <input
                          type="file"
                          accept="image/*"
                          capture="user"
                          className="hidden"
                          onChange={handlePhotoFileUpload}
                        />
                      </label>
                    </>
                  ) : (
                    <>
                      {canSwitchCamera && (
                        <button
                          onClick={() => { void handleSwitchCamera(); }}
                          aria-label="Chuyển camera trước/sau"
                          className="flex h-12 w-12 items-center justify-center rounded-full border border-white/20 bg-white/10 text-white transition hover:bg-white/20 disabled:opacity-60"
                        >
                          <SwitchCamera size={21} />
                        </button>
                      )}
                      <motion.button
                        whileHover={{ scale: 1.06 }}
                        whileTap={{ scale: 0.94 }}
                        onClick={handleCapture}
                        aria-label="Chụp ảnh"
                        className="flex h-16 w-16 items-center justify-center rounded-full bg-gradient-to-r from-cyan-400 to-fuchsia-500 p-1 shadow-[0_0_30px_rgba(34,211,238,0.4)] sm:h-20 sm:w-20"
                      >
                        <span className="h-12 w-12 rounded-full border-4 border-slate-950 bg-white sm:h-16 sm:w-16" />
                      </motion.button>
                    </>
                  )}
                  {(photoEvidence === 'optional' || photoEvidence === 'off') && (
                    <button
                      type="button"
                      onClick={handleContinueWithoutPhoto}
                      disabled={isConfirming}
                      className="min-h-12 rounded-2xl border border-amber-400/35 bg-amber-500/10 px-5 py-3 text-sm font-bold text-amber-200 transition hover:bg-amber-500/20 disabled:opacity-60"
                    >
                      {isConfirming ? 'Đang gửi...' : photoEvidence === 'off' ? 'Tiếp tục (không lưu ảnh)' : 'Tiếp tục không ảnh'}
                    </button>
                  )}
                </div>
              ) : (
                <div className="grid gap-3 sm:grid-cols-2">
                  <motion.button
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={handleRetake}
                    className="flex min-h-12 items-center justify-center gap-2 rounded-2xl border border-white/15 bg-white/10 py-3 font-bold text-white transition hover:bg-white/20"
                  >
                    <RotateCcw size={18} /> Chụp lại ảnh khác
                  </motion.button>
                  <motion.button
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={() => { void handleUsePhoto(); }}
                    disabled={isConfirming}
                    className="flex min-h-12 items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-violet-600 via-fuchsia-500 to-cyan-500 py-3 font-bold text-white shadow-xl shadow-fuchsia-500/20 disabled:opacity-70"
                  >
                    <Check size={18} /> {isConfirming ? 'Đang xác nhận...' : 'Xác nhận ảnh & chấm điểm'}
                  </motion.button>
                </div>
              )}
            </motion.div>
          </div>
        </div>
      </div>
      {showPhotoPreview && previewImage && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 p-3 sm:p-8"
          role="dialog"
          aria-modal="true"
          aria-label="Xem ảnh vừa chụp"
          onClick={() => setShowPhotoPreview(false)}
        >
          <button
            type="button"
            onClick={() => setShowPhotoPreview(false)}
            className="absolute right-3 top-3 z-10 min-h-12 rounded-full bg-white/15 px-4 text-sm font-bold text-white"
          >
            Đóng
          </button>
          <img src={previewImage} alt="Ảnh vừa chụp kích thước lớn" className="max-h-full max-w-full object-contain" />
        </div>
      )}
    </div>
  );
};

export default CameraPage;
