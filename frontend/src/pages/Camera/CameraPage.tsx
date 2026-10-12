import { useEffect, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import { ArrowLeft, Camera, Check, RotateCcw, SwitchCamera } from 'lucide-react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useGame } from '../../context/GameContext';
import { sound } from '../../utils/soundEngine';

type CameraStatus = 'idle' | 'requesting' | 'live' | 'error';

const getCaptureTimeByDifficulty = (diff: number) => {
  if (diff <= 2) return 10;
  if (diff <= 4) return 15;
  return 20;
};

const getCameraErrorMessage = (error: unknown) => {
  const name = error instanceof DOMException ? error.name : '';

  if (name === 'NotAllowedError' || name === 'PermissionDeniedError' || name === 'SecurityError') {
    return 'Bạn đã từ chối quyền camera. Hãy cho phép camera trong cài đặt trình duyệt rồi thử lại.';
  }
  if (name === 'NotFoundError' || name === 'DevicesNotFoundError') {
    return 'Không tìm thấy camera trên thiết bị này.';
  }
  if (name === 'NotReadableError' || name === 'TrackStartError' || name === 'AbortError') {
    return 'Camera đang được ứng dụng khác sử dụng hoặc không thể khởi động. Hãy đóng ứng dụng đó rồi thử lại.';
  }
  if (name === 'OverconstrainedError') {
    return 'Không tìm thấy camera phù hợp. Hãy thử chuyển camera hoặc kiểm tra thiết bị.';
  }
  return 'Không thể mở camera. Hãy kiểm tra thiết bị và quyền truy cập camera rồi thử lại.';
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
  const { activeCard, currentRound, getCurrentPlayer, addPhotoToCurrentAlbum } = useGame();

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
  const [timeLeft, setTimeLeft] = useState(captureTime);
  const [captured, setCaptured] = useState(false);
  const [previewImage, setPreviewImage] = useState<string | null>(null);
  const [flash, setFlash] = useState(false);
  const [isConfirming, setIsConfirming] = useState(false);

  const stopCamera = () => {
    const stream = streamRef.current;
    streamRef.current = null;
    if (stream) stopStream(stream);
    if (videoRef.current) videoRef.current.srcObject = null;
  };

  useEffect(() => () => {
    requestIdRef.current += 1;
    stopCamera();
  }, []);

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
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: false,
        video,
      });

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
      } catch (error) {
        videoElement.srcObject = previousStream;
        stopStream(stream);
        throw error;
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
    } catch (error) {
      if (requestId !== requestIdRef.current) return;
      setCameraStatus(fallbackStatus);
      setCameraError(error instanceof Error && !(error instanceof DOMException)
        ? error.message
        : getCameraErrorMessage(error));
    }
  };

  const handleOpenCamera = () => {
    void startCamera({ facingMode: { ideal: 'user' } }, 'error');
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
    if (cameraStatus !== 'live' || captured) return;
    if (timeLeft <= 0) {
      sound.playScanBeep();
      stopCamera();
      navigate('/result', { state: { round, passed: false, score: 0 } });
      return;
    }

    const timer = window.setInterval(() => {
      setTimeLeft((previous: number) => {
        if (previous <= 5 && previous > 1) sound.playTick();
        return previous - 1;
      });
    }, 1000);

    return () => window.clearInterval(timer);
  }, [cameraStatus, captured, timeLeft, navigate, round]);

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
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    context.drawImage(video, 0, 0, canvas.width, canvas.height);

    try {
      setPreviewImage(canvas.toDataURL('image/jpeg', 0.9));
      setCaptured(true);
      setCameraStatus('idle');
      setCameraError(null);
      stopCamera();
      setFlash(true);
      window.setTimeout(() => setFlash(false), 180);
    } catch {
      setCameraError('Không thể tạo ảnh xem trước. Hãy thử chụp lại.');
    }
  };

  const handleRetake = () => {
    sound.playClick();
    setCaptured(false);
    setPreviewImage(null);
    setCanSwitchCamera(false);
    setCameraStatus('idle');
    setCameraError(null);
  };

  const handleUsePhoto = () => {
    if (!previewImage || isConfirming) return;
    sound.playClick();
    setIsConfirming(true);
    stopCamera();
    const galleryPhotoId = addPhotoToCurrentAlbum({
      round,
      image: previewImage,
      cardTitle: activeCard.title,
      score: 0,
      mission: activeCard.mission,
    });
    navigate('/verify', {
      state: {
        round,
        image: previewImage,
        galleryPhotoId,
      },
    });
  };

  const handleBack = () => {
    sound.playClick();
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
                    Vòng {round}
                  </span>
                  <div className="min-w-16 text-right">
                    <span className="block text-[10px] font-bold uppercase text-slate-400">Thời Gian Chụp</span>
                    <span className={`text-2xl font-black ${timeLeft <= 5 ? 'text-red-400 animate-pulse' : 'text-cyan-300'}`}>
                      {timeLeft}s
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
                  <img src={previewImage} alt="Ảnh vừa chụp" className="h-full w-full object-contain" />
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
                      <p className="text-xs text-slate-400">Đồng hồ chỉ bắt đầu khi camera hoạt động.</p>
                    )}
                    {cameraStatus === 'error' && (
                      <button
                        onClick={handleOpenCamera}
                        className="rounded-xl border border-cyan-400/40 bg-cyan-500/15 px-4 py-2 text-sm font-bold text-cyan-200 transition hover:bg-cyan-500/25"
                      >
                        Thử mở camera lại
                      </button>
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

              {cameraError && (
                <p role="alert" className="rounded-xl border border-red-400/40 bg-red-500/10 px-4 py-3 text-center text-sm font-semibold text-red-200">
                  {cameraError}
                </p>
              )}

              {!captured ? (
                <div className="flex flex-wrap items-center justify-center gap-3">
                  {cameraStatus !== 'live' ? (
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
                    onClick={handleUsePhoto}
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
    </div>
  );
};

export default CameraPage;
