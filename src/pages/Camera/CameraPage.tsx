import { useEffect, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import { ArrowLeft, Camera, Check, RotateCcw } from 'lucide-react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useGame } from '../../context/GameContext';
import { sound } from '../../utils/soundEngine';

const demoPhotos = [
  'https://images.unsplash.com/photo-1511632765486-a01980e01a18?w=800&auto=format&fit=crop&q=80',
  'https://images.unsplash.com/photo-1528605248644-14dd04022da1?w=800&auto=format&fit=crop&q=80',
  'https://images.unsplash.com/photo-1543807535-eceef0bc6599?w=800&auto=format&fit=crop&q=80',
];

const getCaptureTimeByDifficulty = (diff: number) => {
  if (diff <= 2) return 10; // Dễ: 10 giây
  if (diff <= 4) return 15; // Trung bình: 15 giây
  return 20; // Khó: 20 giây
};

const CameraPage = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { activeCard, currentRound, getCurrentPlayer } = useGame();

  const round = location.state?.round ?? currentRound;
  const currentPlayer = getCurrentPlayer(round);
  // Capture Phase Timer based on Card Difficulty (Easy: 10s, Medium: 15s, Hard: 20s)
  const captureTime = location.state?.captureTime ?? getCaptureTimeByDifficulty(activeCard.difficulty);

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  const [hasWebcam, setHasWebcam] = useState(false);
  const [timeLeft, setTimeLeft] = useState(captureTime);
  const [captured, setCaptured] = useState(false);
  const [previewImage, setPreviewImage] = useState<string | null>(null);
  const [flash, setFlash] = useState(false);

  // Initialize WebCam
  useEffect(() => {
    let stream: MediaStream | null = null;
    async function startCamera() {
      try {
        stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'user' } });
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          setHasWebcam(true);
        }
      } catch (err) {
        console.log('Webcam not available or denied, using high-tech simulator feed.');
        setHasWebcam(false);
      }
    }
    startCamera();

    return () => {
      if (stream) {
        stream.getTracks().forEach((track) => track.stop());
      }
    };
  }, []);

  // Timer for Capture Phase
  useEffect(() => {
    if (captured) return;
    if (timeLeft <= 0) {
      sound.playScanBeep();
      // Time is up before photo captured -> Jump directly to Penalty screen!
      navigate('/result', { state: { round, passed: false, score: 0 } });
      return;
    }
    const timer = setInterval(() => {
      setTimeLeft((prev: number) => {
        if (prev <= 5 && prev > 1) {
          sound.playTick();
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, [captured, timeLeft, navigate, round]);

  const handleCapture = () => {
    sound.playClick();
    setFlash(true);

    setTimeout(() => {
      setFlash(false);

      if (hasWebcam && videoRef.current && canvasRef.current) {
        const video = videoRef.current;
        const canvas = canvasRef.current;
        canvas.width = video.videoWidth || 640;
        canvas.height = video.videoHeight || 480;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
          const dataUrl = canvas.toDataURL('image/jpeg');
          setPreviewImage(dataUrl);
        }
      } else {
        // Fallback demo photo
        const randomPhoto = demoPhotos[Math.floor(Math.random() * demoPhotos.length)];
        setPreviewImage(randomPhoto);
      }
      setCaptured(true);
    }, 200);
  };

  const handleUsePhoto = () => {
    sound.playClick();
    navigate('/verify', {
      state: {
        round,
        image: previewImage || demoPhotos[0],
      },
    });
  };

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top_left,_rgba(7,89,133,0.3),_transparent_40%),linear-gradient(135deg,_#030712_0%,_#0f172a_45%,_#111827_100%)] text-slate-100">
      <div className="relative isolate min-h-screen overflow-hidden">
        <div className="relative z-10 mx-auto flex min-h-screen max-w-5xl flex-col px-6 py-8">
          <button
            onClick={() => {
              sound.playClick();
              navigate(-1);
            }}
            className="flex w-fit items-center gap-2 rounded-full border border-white/15 bg-white/10 px-4 py-2 text-sm font-semibold text-slate-200 backdrop-blur-xl transition hover:bg-white/20"
          >
            <ArrowLeft size={18} /> Quay lại
          </button>

          <div className="my-auto py-6">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="rounded-[2.5rem] border border-cyan-500/30 bg-slate-900/60 p-6 shadow-2xl backdrop-blur-2xl sm:p-8 space-y-6"
            >
              <div className="flex flex-wrap items-center justify-between gap-4">
                <div>
                  <h1 className="text-3xl font-black text-white sm:text-4xl">Ống Kính Camera Chụp Thử Thách</h1>
                  <p className="mt-1 text-sm text-cyan-200 font-semibold">{activeCard.title}</p>
                </div>
                <div className="flex items-center gap-3">
                  <div className="flex items-center gap-2 rounded-full bg-fuchsia-500/20 px-3.5 py-1.5 text-xs font-bold text-fuchsia-300 border border-fuchsia-400/30">
                    <img src={currentPlayer.avatar} alt={currentPlayer.name} className="h-5 w-5 rounded-full object-cover" />
                    <span>Lượt của: {currentPlayer.name}</span>
                  </div>
                  <span className="rounded-full bg-cyan-500/20 px-4 py-1.5 text-xs font-bold text-cyan-300 border border-cyan-400/30">
                    Vòng {round}
                  </span>
                  <div className="text-right">
                    <span className="text-[10px] text-slate-400 font-bold uppercase block">Thời Gian Chụp:</span>
                    <span className={`text-2xl font-black ${timeLeft <= 5 ? 'text-red-400 animate-pulse' : 'text-cyan-300'}`}>
                      {timeLeft}s
                    </span>
                  </div>
                </div>
              </div>

              {/* Viewport Frame */}
              <div className="relative mx-auto h-[480px] w-full max-w-md overflow-hidden rounded-[2rem] border-2 border-cyan-400/40 bg-slate-950 shadow-2xl">
                {/* Flash Overlay */}
                {flash && <div className="absolute inset-0 z-30 bg-white" />}

                {/* Hidden canvas for capturing video frame */}
                <canvas ref={canvasRef} className="hidden" />

                {!captured ? (
                  <>
                    {hasWebcam ? (
                      <video ref={videoRef} autoPlay playsInline muted className="h-full w-full object-cover" />
                    ) : (
                      <div className="absolute inset-0 flex flex-col items-center justify-center bg-slate-900">
                        <Camera size={80} className="text-cyan-400/30 animate-pulse" />
                        <span className="mt-3 text-xs text-slate-400 font-semibold">Chế độ giả lập Camera AR Sci-Fi Ready</span>
                      </div>
                    )}

                    {/* Sci-Fi AR Target Grid Overlay */}
                    <div className="absolute inset-0 pointer-events-none border-[12px] border-cyan-500/10 rounded-[2rem]">
                      {/* Face Mesh Overlay Bounding Corners */}
                      <div className="absolute top-8 left-8 h-12 w-12 border-t-2 border-l-2 border-cyan-400" />
                      <div className="absolute top-8 right-8 h-12 w-12 border-t-2 border-r-2 border-cyan-400" />
                      <div className="absolute bottom-8 left-8 h-12 w-12 border-b-2 border-l-2 border-cyan-400" />
                      <div className="absolute bottom-8 right-8 h-12 w-12 border-b-2 border-r-2 border-cyan-400" />

                      <div className="absolute top-4 left-4 rounded-full bg-red-500/80 px-3 py-0.5 text-[10px] font-bold text-white flex items-center gap-1.5">
                        <span className="h-2 w-2 rounded-full bg-white animate-ping" /> ● LIVE FEED ({timeLeft}s)
                      </div>

                      <div className="absolute bottom-4 left-1/2 -translate-x-1/2 rounded-full bg-slate-950/70 border border-cyan-500/30 px-4 py-1 text-xs text-cyan-300 font-mono font-bold backdrop-blur-xl">
                        AI AR MESH: READY
                      </div>
                    </div>
                  </>
                ) : (
                  <img src={previewImage || demoPhotos[0]} alt="Captured" className="h-full w-full object-cover" />
                )}
              </div>

              {/* Controls */}
              {!captured ? (
                <div className="flex justify-center">
                  <motion.button
                    whileHover={{ scale: 1.08 }}
                    whileTap={{ scale: 0.92 }}
                    onClick={handleCapture}
                    className="flex h-20 w-20 items-center justify-center rounded-full bg-gradient-to-r from-cyan-400 to-fuchsia-500 p-1 shadow-[0_0_30px_rgba(34,211,238,0.4)]"
                  >
                    <div className="h-16 w-16 rounded-full border-4 border-slate-950 bg-white" />
                  </motion.button>
                </div>
              ) : (
                <div className="grid gap-4 sm:grid-cols-2">
                  <motion.button
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={() => {
                      sound.playClick();
                      setCaptured(false);
                      setPreviewImage(null);
                    }}
                    className="flex items-center justify-center gap-2 rounded-2xl border border-white/15 bg-white/10 py-4 font-bold text-white transition hover:bg-white/20"
                  >
                    <RotateCcw size={18} /> Chụp lại ảnh khác
                  </motion.button>

                  <motion.button
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={handleUsePhoto}
                    className="flex items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-violet-600 via-fuchsia-500 to-cyan-500 py-4 font-bold text-white shadow-xl shadow-fuchsia-500/20"
                  >
                    <Check size={18} /> Chuyển Sang AI Chấm Điểm
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