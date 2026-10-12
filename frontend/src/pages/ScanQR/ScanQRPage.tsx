import { useCallback, useEffect, useId, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import { ArrowLeft, Camera, CheckCircle2, Layers, QrCode, Sparkles, StopCircle, SwitchCamera, Zap } from 'lucide-react';
import type { Html5Qrcode as Html5QrcodeType } from 'html5-qrcode';
import { useLocation, useNavigate } from 'react-router-dom';
import { useGame } from '../../context/GameContext';
import { DECK_CARDS, THEMES, type PhysicalCard, type Player } from '../../data/gameData';
import { apiRequest } from '../../services/api';
import { parseQRCodePayload } from '../../utils/qrPayload';
import { sound } from '../../utils/soundEngine';

interface MissionApiResponse {
  success: boolean;
  message?: string;
  card?: {
    code?: string;
    title?: string;
    themeId?: string;
  };
  mission?: {
    cardCode?: string;
    missionCode?: string;
    title?: string;
    instruction?: string;
    difficulty?: number;
    xp?: number;
  };
}

interface JoinedRoomResponse {
  success: boolean;
  message?: string;
  data?: {
    roomCode?: string;
    theme?: string;
    mode?: 'casual' | 'speedrun' | 'spicy';
    currentRound?: number;
    players?: Player[];
  };
  player?: Player;
}

type ScanStatus = 'idle' | 'starting' | 'scanning' | 'processing' | 'success' | 'stopping' | 'stopped' | 'error';

const getCameraErrorMessage = (error: unknown) => {
  const message = (error instanceof Error ? error.message : String(error)).toLowerCase();
  if (message.includes('media devices') || message.includes('getusermedia') || message.includes('not supported')) {
    return 'Trình duyệt này không hỗ trợ camera. Hãy dùng trình duyệt mới trên localhost hoặc HTTPS.';
  }
  if (message.includes('notallowed') || message.includes('permission') || message.includes('denied')) {
    return 'Bạn đã từ chối quyền camera. Hãy cho phép camera trong cài đặt trình duyệt rồi thử lại.';
  }
  if (message.includes('notfound') || message.includes('no camera') || message.includes('requested device not found')) {
    return 'Không tìm thấy camera trên thiết bị này.';
  }
  if (
    message.includes('notreadable')
    || message.includes('trackstart')
    || message.includes('in use')
    || message.includes('already in use')
    || message.includes('could not start video source')
  ) {
    return 'Camera đang được ứng dụng khác sử dụng. Hãy đóng ứng dụng đó rồi thử lại.';
  }
  if (message.includes('secure context') || message.includes('insecure')) {
    return 'Trình duyệt chỉ cho phép camera trên localhost hoặc HTTPS.';
  }
  return 'Không thể khởi động camera. Hãy kiểm tra quyền truy cập, thiết bị và thử lại.';
};

const ScanQRPage = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const componentId = useId().replace(/:/g, '');
  const {
    currentRound,
    setCurrentRound,
    setActiveCard,
    setRoomCode,
    setTheme,
    setMode: setGameMode,
    setPlayers,
  } = useGame();

  const isFromHomeScan = location.state?.fromHomeScan ?? false;
  const [mode, setScanMode] = useState<'camera' | 'deck'>(isFromHomeScan ? 'camera' : 'deck');
  const [scanStatus, setScanStatus] = useState<ScanStatus>('idle');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [selectedCardId, setSelectedCardId] = useState<string | null>(null);
  const [selectedCameraId, setSelectedCameraId] = useState<string | null>(null);
  const [availableCameras, setAvailableCameras] = useState<{ id: string; label: string }[]>([]);

  const scannerRef = useRef<Html5QrcodeType | null>(null);
  const sessionRef = useRef(0);
  const startLockRef = useRef(false);
  const startPromiseRef = useRef<Promise<void> | null>(null);
  const disposalPromisesRef = useRef(new WeakMap<Html5QrcodeType, Promise<boolean>>());
  const mountedRef = useRef(false);
  const handledQrRef = useRef(false);
  const seenQrRef = useRef(new Set<string>());
  const qrReaderId = `${isFromHomeScan ? 'room' : 'card'}-qr-reader-${componentId}`;

  const disposeScanner = useCallback((scanner: Html5QrcodeType, failedStart = false): Promise<boolean> => {
    const existingDisposal = disposalPromisesRef.current.get(scanner);
    if (existingDisposal) return existingDisposal;

    const disposal = (async () => {
      if (scanner.isScanning) {
        try {
          await scanner.stop();
        } catch (error) {
          console.warn('[QR Camera] Scanner stop failed:', error);
        }
      }

      if (scanner.isScanning) return false;

      if (failedStart) {
        const video = document.getElementById(qrReaderId)?.querySelector('video');
        if (video?.srcObject instanceof MediaStream) {
          video.srcObject.getTracks().forEach((track) => track.stop());
          video.srcObject = null;
        }
      }

      try {
        scanner.clear();
      } catch (error) {
        console.warn('[QR Camera] Scanner clear failed:', error);
      }
      if (scannerRef.current === scanner) scannerRef.current = null;
      return true;
    })();

    disposalPromisesRef.current.set(scanner, disposal);
    void disposal.then((disposed) => {
      if (!disposed) disposalPromisesRef.current.delete(scanner);
    });
    return disposal;
  }, [qrReaderId]);

  const stopScanner = useCallback(async (nextStatus: ScanStatus = 'stopped') => {
    sessionRef.current += 1;
    const stopSession = sessionRef.current;
    if (mountedRef.current) setScanStatus(nextStatus === 'stopped' ? 'stopping' : nextStatus);

    const pendingStart = startPromiseRef.current;
    if (pendingStart) await pendingStart;

    if (mountedRef.current && stopSession === sessionRef.current) {
      const scanner = scannerRef.current;
      if (scanner) {
        const disposed = await disposeScanner(scanner);
        if (!disposed) {
          setErrorMessage('Camera chưa thể dừng an toàn. Hãy đợi một chút rồi thử dừng lại.');
          setScanStatus('error');
          return;
        }
      }

      setScanStatus(nextStatus);
    }
  }, [disposeScanner]);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
      sessionRef.current += 1;
      const pendingStart = startPromiseRef.current;
      void (async () => {
        if (pendingStart) await pendingStart;
        const scanner = scannerRef.current;
        if (scanner) await disposeScanner(scanner);
      })();
    };
  }, [disposeScanner]);

  const loadCardMission = async (code: string, manualCard?: PhysicalCard, requestSession = sessionRef.current) => {
    setScanStatus('processing');
    setErrorMessage(null);

    try {
      const data = await apiRequest<MissionApiResponse>(`/api/missions/qr/${encodeURIComponent(code)}`);
      if (requestSession !== sessionRef.current) return;
      const mission = data.mission;
      if (data.success !== true) {
        throw new Error(data.message || 'Máy chủ không trả về thử thách hợp lệ.');
      }
      if (
        data.card?.code?.toUpperCase() !== code ||
        mission?.cardCode?.toUpperCase() !== code ||
        typeof mission.title !== 'string' ||
        typeof mission.instruction !== 'string' ||
        typeof mission.difficulty !== 'number' ||
        typeof mission.xp !== 'number'
      ) {
        throw new Error('Dữ liệu thử thách không khớp với mã lá bài vừa quét.');
      }

      const matchingDeckCard = manualCard ?? DECK_CARDS.find((card) => card.code === code);
      const activeCard: PhysicalCard = {
        id: matchingDeckCard?.id ?? mission.missionCode ?? `qr-${code}`,
        code,
        category: matchingDeckCard?.category ?? 'Creative',
        theme: data.card.themeId ?? matchingDeckCard?.theme ?? 'party',
        title: mission.title,
        mission: mission.instruction,
        difficulty: mission.difficulty,
        xp: mission.xp,
        tags: matchingDeckCard?.tags ?? [],
        ...(matchingDeckCard?.arOverlay ? { arOverlay: matchingDeckCard.arOverlay } : {}),
      };
      setActiveCard(activeCard);
      setScanStatus('success');
      sound.playScanBeep();
      window.setTimeout(() => {
        if (requestSession === sessionRef.current) {
          navigate('/challenge', { state: { round: currentRound } });
        }
      }, 500);
    } catch (error) {
      if (requestSession !== sessionRef.current) return;
      setErrorMessage(error instanceof Error
        ? error.message
        : `Không thể tải thử thách cho lá bài ${code}. Vui lòng thử lại.`);
      setScanStatus('error');
      handledQrRef.current = false;
    }
  };

  const joinRoom = async (roomCode: string, requestSession = sessionRef.current) => {
    setScanStatus('processing');
    setErrorMessage(null);
    try {
      const response = await apiRequest<JoinedRoomResponse>(
        `/api/rooms/${encodeURIComponent(roomCode)}/join`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({}),
        },
      );
      if (requestSession !== sessionRef.current) return;
      const room = response.data;
      if (
        response.success !== true ||
        room?.roomCode?.toUpperCase() !== roomCode ||
        !Array.isArray(room.players)
      ) {
        throw new Error(response.message || 'Máy chủ không xác nhận được phòng chơi này.');
      }

      setRoomCode(room.roomCode);
      setPlayers(room.players);
      const selectedTheme = THEMES.find((theme) => theme.id === room.theme);
      if (selectedTheme) setTheme(selectedTheme);
      if (room.mode === 'casual' || room.mode === 'speedrun' || room.mode === 'spicy') setGameMode(room.mode);
      if (typeof room.currentRound === 'number') setCurrentRound(room.currentRound);
      setScanStatus('success');
      sound.playScanBeep();
      navigate('/lobby', { state: { joinedFromQR: true, roomCode: room.roomCode } });
    } catch (error) {
      if (requestSession !== sessionRef.current) return;
      setErrorMessage(error instanceof Error
        ? error.message
        : `Không thể tham gia phòng ${roomCode}. Vui lòng thử lại.`);
      setScanStatus('error');
      handledQrRef.current = false;
    }
  };

  const handleDecodedQr = async (rawValue: string, session: number) => {
    if (session !== sessionRef.current || handledQrRef.current || seenQrRef.current.has(rawValue)) return;
    seenQrRef.current.add(rawValue);

    const payload = parseQRCodePayload(rawValue);
    if (!payload) {
      setErrorMessage('Mã QR không đúng định dạng. Hãy quét QR phòng hoặc QR lá bài hợp lệ.');
      return;
    }

    const expectedType = isFromHomeScan ? 'room' : 'card';
    if (payload.type !== expectedType) {
      setErrorMessage(expectedType === 'room'
        ? 'Đây là QR lá bài, không phải QR phòng. Hãy quét mã phòng để tham gia.'
        : 'Đây là QR phòng, không phải QR lá bài. Hãy quét mã trên lá bài thử thách.');
      return;
    }

    handledQrRef.current = true;
    const processingSession = ++sessionRef.current;
    setScanStatus('processing');
    const scanner = scannerRef.current;
    if (scanner && !(await disposeScanner(scanner))) {
      setErrorMessage('Không thể dừng camera an toàn sau khi đọc QR. Hãy thử dừng quét rồi quét lại.');
      setScanStatus('error');
      return;
    }
    if (processingSession !== sessionRef.current) return;

    if (payload.type === 'room') {
      await joinRoom(payload.code, processingSession);
    } else {
      await loadCardMission(payload.code, undefined, processingSession);
    }
  };

  const startScanner = (cameraId?: string) => {
    if (startLockRef.current || !mountedRef.current) return;
    startLockRef.current = true;

    const session = ++sessionRef.current;
    handledQrRef.current = false;
    seenQrRef.current.clear();
    setErrorMessage(null);
    setScanStatus('starting');

    const startTask = (async () => {
      let scanner: Html5QrcodeType | null = null;
      let startFailed = false;
      try {
        const previousScanner = scannerRef.current;
        if (previousScanner && !(await disposeScanner(previousScanner))) {
          throw new Error('Camera hiện tại chưa dừng hoàn toàn. Hãy thử dừng quét rồi bắt đầu lại.');
        }
        if (session !== sessionRef.current) return;

        const { Html5Qrcode } = await import('html5-qrcode');
        if (session !== sessionRef.current) return;

        scanner = new Html5Qrcode(qrReaderId, { verbose: false });
        scannerRef.current = scanner;
        const videoInputs = (await navigator.mediaDevices.enumerateDevices())
          .filter((device) => device.kind === 'videoinput');

        const preferredCamera =
          videoInputs.find((device) =>
            /back|rear|environment|sau/i.test(device.label)
          ) ?? videoInputs[0];

        const camera = cameraId ?? preferredCamera?.deviceId;

        if (!camera) {
          throw new Error(
            'Không tìm thấy camera. Hãy kiểm tra thiết bị và quyền truy cập camera.'
          );
        }
        try {
          await scanner.start(
            camera,
            {
              fps: 10,
              qrbox: (viewWidth, viewHeight) => {
                const size = Math.floor(Math.min(viewWidth, viewHeight, 280));
                return { width: size, height: size };
              },
            },
            (decodedText) => { void handleDecodedQr(decodedText, session); },
            () => { },
          );
        } catch (error) {
          startFailed = true;
          throw error;
        }

        if (session !== sessionRef.current) {
          await disposeScanner(scanner);
          return;
        }

        try {
          setSelectedCameraId(cameraId ?? scanner.getRunningTrackSettings().deviceId ?? null);
        } catch {
          setSelectedCameraId(cameraId ?? null);
        }
        setScanStatus('scanning');
        sound.playClick();

        try {
          const cameras = (await navigator.mediaDevices.enumerateDevices())
            .filter((device) => device.kind === 'videoinput');
          if (session !== sessionRef.current) {
            await disposeScanner(scanner);
            return;
          }
          setAvailableCameras(cameras.map((cameraDevice, index) => ({
            id: cameraDevice.deviceId,
            label: cameraDevice.label || `Camera ${index + 1}`,
          })));
        } catch (error) {
          console.warn('[QR Camera] Could not enumerate cameras:', error);
          if (session === sessionRef.current && mountedRef.current) setAvailableCameras([]);
        }
      } catch (error) {
        const originalError = error instanceof Error
          ? { name: error.name, message: error.message, error }
          : { name: typeof error, message: String(error), error };
        console.error('[QR Camera] Start failed:', originalError);

        if (scanner) {
          const disposed = await disposeScanner(scanner, startFailed);
          if (!disposed) {
            console.error('[QR Camera] Failed startup scanner is still active; leaving its tracks under library control.');
          }
        }

        if (session !== sessionRef.current || !mountedRef.current) return;
        setErrorMessage(getCameraErrorMessage(error));
        setScanStatus('error');
      }
    })();

    startPromiseRef.current = startTask;
    void startTask.finally(() => {
      if (startPromiseRef.current === startTask) {
        startPromiseRef.current = null;
        startLockRef.current = false;
      }
    });
  };

  const handleSelectCard = async (card: PhysicalCard) => {
    if (scanStatus === 'processing') return;
    const requestSession = ++sessionRef.current;
    sound.playCardFlip();
    setSelectedCardId(card.id);
    await loadCardMission(card.code, card, requestSession);
  };

  // QR in each printed card opens this page directly and loads that card's mission.
  useEffect(() => {
    if (isFromHomeScan) return;
    const params = new URLSearchParams(location.search);
    const cardCode = params.get('cardCode')?.trim().toUpperCase();
    if (!cardCode || !/^PC-CARD-\d{3}$/.test(cardCode)) return;
    const card = DECK_CARDS.find((item) => item.code === cardCode);
    if (!card || handledQrRef.current) return;
    handledQrRef.current = true;
    const requestSession = ++sessionRef.current;
    setSelectedCardId(card.id);
    void loadCardMission(card.code, card, requestSession);
  // Only handle the initial cardCode query when a printed-card URL is opened.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location.search, isFromHomeScan]);

  const scanButtonLabel = () => {
    switch (scanStatus) {
      case 'starting': return 'Đang khởi động camera...';
      case 'scanning': return 'Đang quét QR...';
      case 'processing': return isFromHomeScan ? 'Đang xác thực phòng...' : 'Đang tải thử thách...';
      case 'success': return 'Quét thành công';
      case 'stopping': return 'Đang dừng camera...';
      default: return isFromHomeScan ? 'Bắt đầu quét QR phòng' : 'Bắt đầu quét QR lá bài';
    }
  };

  const isScannerActive = ['starting', 'scanning', 'stopping'].includes(scanStatus);

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top_left,_rgba(7,89,133,0.3),_transparent_40%),linear-gradient(135deg,_#030712_0%,_#0f172a_45%,_#111827_100%)] text-slate-100">
      <div className="mx-auto flex min-h-screen max-w-5xl flex-col px-4 py-6 sm:px-6 sm:py-8">
        <button
          onClick={() => {
            sound.playClick();
            void stopScanner();
            navigate('/');
          }}
          className="flex w-fit items-center gap-2 rounded-full border border-white/15 bg-white/10 px-4 py-2 text-sm font-semibold text-slate-200 backdrop-blur-xl transition hover:bg-white/20"
        >
          <ArrowLeft size={18} /> Trang chủ
        </button>

        <div className="my-auto py-6 sm:py-8">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="w-full space-y-6 rounded-[2rem] border border-cyan-500/30 bg-slate-900/60 p-4 shadow-2xl backdrop-blur-2xl sm:rounded-[2.5rem] sm:p-8"
          >
            <div className="flex flex-wrap items-center justify-between gap-4 border-b border-white/10 pb-4">
              <div>
                <span className="inline-flex items-center gap-2 rounded-full border border-cyan-500/30 bg-cyan-500/10 px-3.5 py-1 text-xs font-bold text-cyan-300">
                  <Sparkles size={14} className="animate-spin text-cyan-400" />
                  Mô Hình Phygital: Lá Bài Thật + WebApp
                </span>
                <h1 className="mt-2 text-2xl font-black text-white sm:text-4xl">
                  {isFromHomeScan ? 'Quét QR Tham Gia Phòng' : 'Quét & Chọn Lá Bài Thử Thách'}
                </h1>
                <p className="mt-1 text-sm text-slate-300">
                  {isFromHomeScan
                    ? 'Quét mã phòng đang hoạt động để tham gia qua máy chủ.'
                    : `Vòng ${currentRound} — Quét mã QR trên lá bài hoặc chọn bài demo.`}
                </p>
              </div>

              {!isFromHomeScan && (
                <div className="flex rounded-2xl border border-white/15 bg-slate-950 p-1.5">
                  <button
                    onClick={() => {
                      sound.playClick();
                      void stopScanner();
                      setScanMode('deck');
                      setErrorMessage(null);
                    }}
                    className={`flex items-center gap-2 rounded-xl px-3 py-2 text-xs font-bold transition sm:px-4 ${mode === 'deck'
                      ? 'bg-gradient-to-r from-violet-600 to-fuchsia-500 text-white shadow-lg'
                      : 'text-slate-400 hover:text-white'}`}
                  >
                    <Layers size={16} /> Bộ Bài 3D (Demo)
                  </button>
                  <button
                    onClick={() => {
                      sound.playClick();
                      setScanMode('camera');
                      setErrorMessage(null);
                    }}
                    className={`flex items-center gap-2 rounded-xl px-3 py-2 text-xs font-bold transition sm:px-4 ${mode === 'camera'
                      ? 'bg-gradient-to-r from-cyan-500 to-blue-600 text-white shadow-lg'
                      : 'text-slate-400 hover:text-white'}`}
                  >
                    <Camera size={16} /> Quét QR thật
                  </button>
                </div>
              )}
            </div>

            {mode === 'camera' && (
              <div className="space-y-4 text-center">
                <div className="relative mx-auto min-h-[280px] w-full max-w-lg overflow-hidden rounded-3xl border-2 border-cyan-400/40 bg-slate-950 shadow-2xl sm:min-h-[360px]">
                  <div id={qrReaderId} className="min-h-[280px] w-full overflow-hidden sm:min-h-[360px]" />
                  {!isScannerActive && (
                    <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center gap-3 bg-slate-950/95 px-6">
                      {scanStatus === 'success'
                        ? <CheckCircle2 size={64} className="text-emerald-400" />
                        : <QrCode size={78} className="animate-pulse text-cyan-300" />}
                      <p className="text-sm font-semibold text-slate-300">
                        {scanStatus === 'success'
                          ? 'Đã nhận QR hợp lệ.'
                          : scanStatus === 'processing'
                            ? 'Đang xử lý mã QR...'
                            : 'Nhấn bắt đầu để cấp quyền camera và quét mã QR.'}
                      </p>
                    </div>
                  )}
                </div>

                {availableCameras.length > 1 && scanStatus === 'scanning' && (
                  <label className="mx-auto flex max-w-lg items-center gap-2 text-left text-sm text-slate-300">
                    <SwitchCamera size={18} className="shrink-0 text-cyan-300" />
                    <span className="shrink-0">Camera:</span>
                    <select
                      value={selectedCameraId ?? ''}
                      onChange={(event) => {
                        const cameraId = event.target.value;
                        setSelectedCameraId(cameraId);
                        void startScanner(cameraId);
                      }}
                      className="min-w-0 flex-1 rounded-xl border border-white/15 bg-slate-950 px-3 py-2 text-white"
                    >
                      {availableCameras.map((camera, index) => (
                        <option key={`${camera.id}-${index}`} value={camera.id}>{camera.label}</option>
                      ))}
                    </select>
                  </label>
                )}

                {isScannerActive ? (
                  <button
                    onClick={() => { void stopScanner(); }}
                    disabled={scanStatus === 'stopping'}
                    className="mx-auto flex min-h-12 items-center justify-center gap-2 rounded-2xl border border-red-400/40 bg-red-500/15 px-6 py-3 font-bold text-red-200 transition hover:bg-red-500/25"
                  >
                    <StopCircle size={19} /> Dừng quét
                  </button>
                ) : (
                  <button
                    onClick={() => { void startScanner(); }}
                    disabled={scanStatus === 'processing' || scanStatus === 'success'}
                    className="mx-auto flex min-h-12 w-full max-w-lg items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-violet-600 via-fuchsia-500 to-cyan-500 px-6 py-3 font-bold text-white shadow-xl shadow-fuchsia-500/20 disabled:cursor-wait disabled:opacity-70"
                  >
                    <Camera size={19} /> {scanButtonLabel()}
                  </button>
                )}

                {scanStatus === 'scanning' && (
                  <p className="flex items-center justify-center gap-2 text-sm font-bold text-cyan-200">
                    <Zap size={16} className="animate-pulse text-amber-400" /> Đưa mã QR vào khung hình để quét
                  </p>
                )}
                {errorMessage && (
                  <p role="alert" className="mx-auto max-w-lg rounded-xl border border-red-400/40 bg-red-500/10 px-4 py-3 text-sm font-semibold text-red-200">
                    {errorMessage}
                  </p>
                )}
              </div>
            )}

            {mode === 'deck' && !isFromHomeScan && (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <p className="text-xs font-bold uppercase tracking-wider text-slate-400">
                    Chọn bài thủ công — đây là luồng demo, không phải quét QR:
                  </p>
                </div>
                {errorMessage && (
                  <p role="alert" className="rounded-xl border border-red-400/40 bg-red-500/10 px-4 py-3 text-center text-sm font-semibold text-red-200">
                    {errorMessage}
                  </p>
                )}
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                  {DECK_CARDS.map((card) => {
                    const isSelected = selectedCardId === card.id;
                    return (
                      <motion.button
                        type="button"
                        key={card.id}
                        whileHover={{ scale: 1.03, y: -4 }}
                        whileTap={{ scale: 0.96 }}
                        onClick={() => { void handleSelectCard(card); }}
                        disabled={scanStatus === 'processing'}
                        className={`relative overflow-hidden rounded-2xl border p-5 text-left backdrop-blur-xl transition disabled:cursor-wait disabled:opacity-70 ${isSelected
                          ? 'border-cyan-400 bg-gradient-to-br from-cyan-950/80 to-slate-900 shadow-[0_0_30px_rgba(34,211,238,0.4)] ring-2 ring-cyan-400'
                          : 'border-white/15 bg-slate-950/60 hover:border-cyan-500/40 hover:bg-white/10'}`}
                      >
                        <div className="flex items-center justify-between">
                          <span className="font-mono text-xs font-bold text-cyan-400">{card.code}</span>
                          <span className="rounded-full border border-cyan-500/30 bg-cyan-500/20 px-2.5 py-0.5 text-[10px] font-bold text-cyan-300">
                            {card.category}
                          </span>
                        </div>
                        <div className="mt-3 text-lg font-bold text-white">{card.title}</div>
                        <p className="mt-1 line-clamp-2 text-xs text-slate-400">{card.mission}</p>
                        <div className="mt-4 flex items-center justify-between border-t border-white/10 pt-3 text-xs">
                          <span className="font-bold text-amber-400">{'⭐'.repeat(card.difficulty)}</span>
                          <span className="font-bold text-emerald-400">+{card.xp} XP</span>
                        </div>
                        <div className="mt-3 flex items-center justify-center gap-2 rounded-xl border border-cyan-400/30 bg-cyan-500/10 py-2 text-xs font-bold text-cyan-300">
                          <QrCode size={14} /> {scanStatus === 'processing' && isSelected ? 'ĐANG TẢI...' : 'CHỌN BÀI DEMO'}
                        </div>
                      </motion.button>
                    );
                  })}
                </div>
              </div>
            )}
          </motion.div>
        </div>
      </div>
    </div>
  );
};

export default ScanQRPage;
