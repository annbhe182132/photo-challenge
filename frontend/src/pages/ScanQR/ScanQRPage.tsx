import { useCallback, useEffect, useId, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import { AlertTriangle, ArrowLeft, Camera, CheckCircle2, QrCode, Sparkles, StopCircle, SwitchCamera, Upload, Zap } from 'lucide-react';
import type { Html5Qrcode as Html5QrcodeType } from 'html5-qrcode';
import { useLocation, useNavigate } from 'react-router-dom';
import { useGame } from '../../context/useGame';
import { DECK_CARDS, THEMES, type PhysicalCard, type Player } from '../../data/gameData';
import { apiRequest } from '../../services/api';
import { parseQRCodePayload, normalizeCardCode } from '../../utils/qrPayload';
import { sound } from '../../utils/soundEngine';
import { isInAppBrowser } from '../../utils/browser';
import { scanVideoElementFrame, scanQrImageFile } from '../../utils/qrScanner';

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
    verificationMethod?: 'ai' | 'group';
    photoEvidence?: 'off' | 'optional' | 'required';
    photoBonusEnabled?: boolean;
    currentRound?: number;
    totalRounds?: number;
    currentTurnIndex?: number;
    activePlayerId?: string | null;
    turnStartedAt?: string | null;
    turnDeadline?: string | null;
    turnRemainingSeconds?: number | null;
    turnDurationSeconds?: 0 | 15 | 30 | 60;
    status?: 'waiting' | 'active' | 'completed';
    players?: Player[];
    turnHistory?: Array<{
      turnIndex: number;
      round: number;
      playerId: string;
      status: 'completed' | 'failed' | 'timed_out' | 'skipped';
      score: number;
    }>;
  };
  player?: Player;
  playerToken?: string;
}

type ScanStatus = 'idle' | 'starting' | 'scanning' | 'processing' | 'success' | 'stopping' | 'stopped' | 'error';

const getCameraErrorMessage = (error: unknown) => {
  const message = (error instanceof Error ? error.message : String(error)).toLowerCase();
  const inApp = isInAppBrowser();

  if (inApp) {
    return 'Trình duyệt trong ứng dụng (Zalo/Facebook) đang chặn camera trực tiếp. Hãy bấm nút "•••" ở góc trên bên phải màn hình để chọn "Mở bằng trình duyệt" (Safari/Chrome), hoặc dùng nút "Chụp / Tải ảnh mã QR" bên dưới.';
  }
  if (message.includes('media devices') || message.includes('getusermedia') || message.includes('not supported')) {
    return 'Trình duyệt này không hỗ trợ camera trực tiếp. Hãy mở bằng Safari (trên iPhone) hoặc Chrome (trên Android).';
  }
  if (message.includes('notallowed') || message.includes('permission') || message.includes('denied')) {
    return 'Bạn đã từ chối quyền camera. Hãy cho phép camera trong cài đặt trình duyệt (hoặc Cài đặt > Safari > Camera trên iPhone) rồi tải lại trang.';
  }
  if (message.includes('notfound') || message.includes('no camera') || message.includes('requested device not found')) {
    return 'Không tìm thấy camera trên thiết bị. Bạn có thể dùng nút "Chụp / Tải ảnh mã QR" bên dưới.';
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
    return 'Trình duyệt chỉ cho phép camera trên HTTPS.';
  }
  return 'Không thể khởi động camera trực tiếp. Hãy thử mở trang web bằng Safari/Chrome hoặc dùng nút "Chụp / Tải ảnh mã QR" bên dưới.';
};

const ScanQRPage = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const componentId = useId().replace(/:/g, '');
  const {
    currentRound,
    roomCode,
    setCurrentRound,
    setActiveCard,
    setRoomCode,
    setTheme,
    setMode: setGameMode,
    setPlayers,
    setCurrentPlayerId,
    setRoomPlayerToken,
    setDeviceMode,
    setVerificationMethod,
    setPhotoEvidence,
    setPhotoBonusEnabled,
    deviceMode,
    currentPlayerId,
    activePlayerId,
    currentTurnIndex,
    turnDurationSeconds,
    players,
    syncRoom,
  } = useGame();

  const isFromHomeScan = location.state?.fromHomeScan ?? false;
  const searchParams = new URLSearchParams(location.search);
  const rawDirectCard = searchParams.get('cardCode') ?? searchParams.get('card') ?? searchParams.get('c');
  const directCardCode = normalizeCardCode(rawDirectCard);
  const isDirectCardQr = !isFromHomeScan && Boolean(directCardCode);
  const [scanStatus, setScanStatus] = useState<ScanStatus>('idle');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [selectedCameraId, setSelectedCameraId] = useState<string | null>(null);
  const [availableCameras, setAvailableCameras] = useState<{ id: string; label: string }[]>([]);
  const [turnTimeLeft, setTurnTimeLeft] = useState<number | null>(null);

  const scannerRef = useRef<Html5QrcodeType | null>(null);
  const sessionRef = useRef(0);
  const startLockRef = useRef(false);
  const startPromiseRef = useRef<Promise<void> | null>(null);
  const disposalPromisesRef = useRef(new WeakMap<Html5QrcodeType, Promise<boolean>>());
  const mountedRef = useRef(false);
  const handledQrRef = useRef(false);
  const seenQrRef = useRef(new Set<string>());
  const qrReaderId = `${isFromHomeScan ? 'room' : 'card'}-qr-reader-${componentId}`;
  const entryTurnIndexRef = useRef(currentTurnIndex);
  const frameIntervalRef = useRef<number | null>(null);

  const stopFrameSampling = useCallback(() => {
    if (frameIntervalRef.current !== null) {
      window.clearInterval(frameIntervalRef.current);
      frameIntervalRef.current = null;
    }
  }, []);

  const disposeScanner = useCallback((scanner: Html5QrcodeType, failedStart = false): Promise<boolean> => {
    stopFrameSampling();
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
    stopFrameSampling();
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
    if (isFromHomeScan || deviceMode !== 'multi_device') return undefined;
    let cancelled = false;
    let timer: number | undefined;
    const pollRoom = async () => {
      try {
        const response = await apiRequest<{
          success: boolean;
          message?: string;
          data?: NonNullable<JoinedRoomResponse['data']>;
        }>(`/api/rooms/${encodeURIComponent(roomCode)}`);
        if (cancelled) return;
        const room = response.data;
        if (!response.success || !room?.players || !room.status) {
          throw new Error(response.message || 'Không thể đồng bộ lượt chơi.');
        }
        syncRoom({
          players: room.players,
          currentRound: room.currentRound ?? currentRound,
          totalRounds: room.totalRounds ?? 5,
          status: room.status,
          currentTurnIndex: room.currentTurnIndex,
          activePlayerId: room.activePlayerId,
          turnStartedAt: room.turnStartedAt,
          turnDeadline: room.turnDeadline,
          turnDurationSeconds: room.turnDurationSeconds,
        });
        setTurnTimeLeft(room.turnDeadline
          ? Math.max(0, Math.ceil((new Date(room.turnDeadline).getTime() - Date.now()) / 1000))
          : null);
        if (room.status === 'completed') {
          const resolvedTurn = room.turnHistory?.find((turn) => turn.turnIndex === entryTurnIndexRef.current);
          if (resolvedTurn) {
            await stopScanner('stopped');
            navigate('/result', {
              replace: true,
              state: {
                round: resolvedTurn.round,
                playerId: resolvedTurn.playerId,
                passed: resolvedTurn.status === 'completed',
                timedOut: resolvedTurn.status === 'timed_out',
                skipped: resolvedTurn.status === 'skipped',
                score: resolvedTurn.score,
              },
            });
          } else {
            navigate('/leaderboard', { replace: true });
          }
        } else if (room.currentTurnIndex !== undefined && room.currentTurnIndex !== entryTurnIndexRef.current) {
          const resolvedTurn = room.turnHistory?.find((turn) => turn.turnIndex === entryTurnIndexRef.current);
          await stopScanner('stopped');
          if (resolvedTurn) {
            navigate('/result', {
              replace: true,
              state: {
                round: resolvedTurn.round,
                playerId: resolvedTurn.playerId,
                passed: resolvedTurn.status === 'completed',
                timedOut: resolvedTurn.status === 'timed_out',
                skipped: resolvedTurn.status === 'skipped',
                score: resolvedTurn.score,
              },
            });
          } else {
            setErrorMessage('Lượt chơi vừa được chuyển tiếp. Hãy quét khi đến lượt của bạn.');
            setScanStatus('error');
          }
        }
      } catch (error) {
        if (!cancelled) console.error('[ScanQRPage] Failed to synchronize room turn:', error);
      } finally {
        if (!cancelled) timer = window.setTimeout(() => { void pollRoom(); }, 2000);
      }
    };
    void pollRoom();
    return () => {
      cancelled = true;
      if (timer) window.clearTimeout(timer);
    };
  }, [currentRound, deviceMode, isFromHomeScan, navigate, roomCode, stopScanner, syncRoom]);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
      stopFrameSampling();
      sessionRef.current += 1;
      const pendingStart = startPromiseRef.current;
      void (async () => {
        if (pendingStart) await pendingStart;
        const scanner = scannerRef.current;
        if (scanner) await disposeScanner(scanner);
      })();
    };
  }, [disposeScanner, stopFrameSampling]);

  const loadCardMission = async (code: string, manualCard?: PhysicalCard, requestSession = sessionRef.current) => {
    setScanStatus('processing');
    setErrorMessage(null);

    // Chuẩn hóa mã thẻ sang định dạng chuẩn SD-CARD-xxx
    const canonicalCode = normalizeCardCode(code) ?? code.toUpperCase().replace(/^PC-/, 'SD-');
    const legacyCode = canonicalCode.replace(/^SD-/, 'PC-');
    let verifiedTurnIndex: number | null = null;
    const matchingDeckCard = manualCard ?? DECK_CARDS.find((card) =>
      card.code === canonicalCode || card.code === legacyCode || card.code === code.toUpperCase()
    );

    try {
      if (deviceMode === 'multi_device') {
        if (!currentPlayerId) throw new Error('Không xác định được người chơi trong phòng. Hãy tham gia lại.');
        const roomResponse = await apiRequest<{
          success: boolean;
          message?: string;
          data?: NonNullable<JoinedRoomResponse['data']>;
        }>(`/api/rooms/${encodeURIComponent(roomCode)}`);
        if (requestSession !== sessionRef.current) return;
        const room = roomResponse.data;
        if (!roomResponse.success || !room?.players || !room.status) {
          throw new Error(roomResponse.message || 'Không thể kiểm tra lượt chơi hiện tại.');
        }
        syncRoom({
          players: room.players,
          currentRound: room.currentRound ?? currentRound,
          totalRounds: room.totalRounds ?? 5,
          status: room.status,
          currentTurnIndex: room.currentTurnIndex,
          activePlayerId: room.activePlayerId,
          turnStartedAt: room.turnStartedAt,
          turnDeadline: room.turnDeadline,
          turnDurationSeconds: room.turnDurationSeconds,
        });
        verifiedTurnIndex = room.currentTurnIndex ?? null;
        if (room.activePlayerId !== currentPlayerId) {
          const activePlayer = room.players.find((player) => player.id === room.activePlayerId);
          throw new Error(`Đây chưa phải lượt của bạn${activePlayer ? ` — đang chơi ${activePlayer.name}` : ''}.`);
        }
      }

      // Thử lấy thử thách từ API máy chủ (chứa các biến thể thử thách AI)
      let missionData: {
        missionCode: string;
        title: string;
        instruction: string;
        difficulty: number;
        xp: number;
        themeId?: string;
      } | null = null;

      const data = await apiRequest<MissionApiResponse>(`/api/missions/qr/${encodeURIComponent(canonicalCode)}`);
      if (requestSession !== sessionRef.current) return;
      if (!data.success || !data.mission || typeof data.mission.instruction !== 'string' || !data.mission.instruction.trim()) {
        throw new Error(data.message || 'Máy chủ không trả về nhiệm vụ hợp lệ cho mã QR này.');
      }
      missionData = {
        missionCode: data.mission.missionCode || `${canonicalCode}-M01`,
        title: data.mission.title || matchingDeckCard?.title || 'Thử thách lá bài',
        instruction: data.mission.instruction,
        difficulty: typeof data.mission.difficulty === 'number' ? data.mission.difficulty : (matchingDeckCard?.difficulty ?? 2),
        xp: typeof data.mission.xp === 'number' ? data.mission.xp : (matchingDeckCard?.xp ?? 20),
        themeId: data.card?.themeId || matchingDeckCard?.theme,
      };

      if (deviceMode === 'multi_device') {
        const latestResponse = await apiRequest<{
          success: boolean;
          message?: string;
          data?: NonNullable<JoinedRoomResponse['data']>;
        }>(`/api/rooms/${encodeURIComponent(roomCode)}`);
        if (requestSession !== sessionRef.current) return;
        const latestRoom = latestResponse.data;
        if (
          !latestResponse.success
          || !latestRoom
          || latestRoom.status !== 'active'
          || latestRoom.activePlayerId !== currentPlayerId
          || latestRoom.currentTurnIndex !== verifiedTurnIndex
        ) {
          throw new Error('Lượt chơi đã hết hoặc được chuyển tiếp trong khi tải thử thách. Hãy đồng bộ và quét lại đúng lượt.');
        }
        if (!latestRoom.players) throw new Error('Máy chủ chưa trả về danh sách người chơi của phòng.');
        syncRoom({
          players: latestRoom.players,
          currentRound: latestRoom.currentRound ?? currentRound,
          totalRounds: latestRoom.totalRounds ?? 5,
          status: latestRoom.status,
          currentTurnIndex: latestRoom.currentTurnIndex,
          activePlayerId: latestRoom.activePlayerId,
          turnStartedAt: latestRoom.turnStartedAt,
          turnDeadline: latestRoom.turnDeadline,
          turnDurationSeconds: latestRoom.turnDurationSeconds,
        });
      }

      const activeCard: PhysicalCard = {
        id: missionData.missionCode,
        code: canonicalCode,
        category: matchingDeckCard?.category ?? 'Creative',
        theme: missionData.themeId ?? matchingDeckCard?.theme ?? 'pose',
        title: missionData.title,
        mission: missionData.instruction,
        difficulty: missionData.difficulty,
        xp: missionData.xp,
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
      setCurrentPlayerId(response.player?.id ?? room.players.at(-1)?.id ?? null);
      if (typeof response.playerToken !== 'string') throw new Error('Máy chủ không cấp phiên đăng nhập người chơi.');
      setRoomPlayerToken(response.playerToken);
      setDeviceMode('multi_device');
      syncRoom({
        players: room.players,
        currentRound: room.currentRound ?? 1,
        totalRounds: room.totalRounds ?? 5,
        status: room.status ?? 'waiting',
        currentTurnIndex: room.currentTurnIndex ?? 0,
        activePlayerId: room.activePlayerId ?? null,
        turnStartedAt: room.turnStartedAt ?? null,
        turnDeadline: room.turnDeadline ?? null,
        turnDurationSeconds: room.turnDurationSeconds,
      });
      const selectedTheme = THEMES.find((theme) => theme.id === room.theme);
      if (selectedTheme) setTheme(selectedTheme);
      if (room.mode === 'casual' || room.mode === 'speedrun' || room.mode === 'spicy') setGameMode(room.mode);
      if (room.verificationMethod === 'group' || room.verificationMethod === 'ai') setVerificationMethod(room.verificationMethod);
      if (room.photoEvidence === 'off' || room.photoEvidence === 'optional' || room.photoEvidence === 'required') {
        setPhotoEvidence(room.photoEvidence);
      }
      if (typeof room.photoBonusEnabled === 'boolean') setPhotoBonusEnabled(room.photoBonusEnabled);
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

    const payload = parseQRCodePayload(rawValue);
    if (!payload) {
      setErrorMessage('Mã QR không đúng định dạng. Hãy quét QR phòng hoặc QR lá bài hợp lệ.');
      return;
    }

    // Nếu đang trong lượt chơi nhiều thiết bị (multi_device) thì bắt buộc phải là QR lá bài
    if (!isFromHomeScan && deviceMode === 'multi_device' && payload.type !== 'card') {
      setErrorMessage('Đây là QR phòng, không phải QR lá bài. Hãy quét mã trên lá bài thử thách của bạn.');
      return;
    }

    seenQrRef.current.add(rawValue);
    handledQrRef.current = true;
    stopFrameSampling();
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

        scanner = new Html5Qrcode(qrReaderId, {
          verbose: false,
          experimentalFeatures: {
            useBarCodeDetectorIfSupported: true,
          },
        });
        scannerRef.current = scanner;

        const videoConfig = {
          fps: 15,
          qrbox: (viewWidth: number, viewHeight: number) => {
            const minDim = Math.min(viewWidth, viewHeight);
            const size = Math.max(260, Math.floor(minDim * 0.8));
            return { width: size, height: size };
          },
        };
        const onDecoded = (decodedText: string) => {
          stopFrameSampling();
          void handleDecodedQr(decodedText, session);
        };
        const onDecodeError = () => {};

        try {
          if (cameraId) {
            await scanner.start(cameraId, videoConfig, onDecoded, onDecodeError);
          } else {
            // Trên điện thoại, ưu tiên camera sau (facingMode: environment) trực tiếp để kích hoạt cấp quyền
            try {
              await scanner.start({ facingMode: 'environment' }, videoConfig, onDecoded, onDecodeError);
            } catch (envError) {
              console.warn('[QR Camera] facingMode environment failed, trying user camera:', envError);
              try {
                await scanner.start({ facingMode: 'user' }, videoConfig, onDecoded, onDecodeError);
              } catch (userError) {
                console.warn('[QR Camera] facingMode user failed, checking enumerated devices:', userError);
                if (navigator.mediaDevices?.enumerateDevices) {
                  const videoInputs = (await navigator.mediaDevices.enumerateDevices())
                    .filter((device) => device.kind === 'videoinput');
                  const preferredCamera = videoInputs.find((device) =>
                    /back|rear|environment|sau/i.test(device.label)
                  ) ?? videoInputs[0];
                  if (preferredCamera?.deviceId) {
                    await scanner.start(preferredCamera.deviceId, videoConfig, onDecoded, onDecodeError);
                  } else {
                    throw envError;
                  }
                } else {
                  throw envError;
                }
              }
            }
          }
        } catch (error) {
          startFailed = true;
          throw error;
        }

        if (session !== sessionRef.current) {
          await disposeScanner(scanner);
          return;
        }

        // Bắt đầu chu kỳ quét frame hỗ trợ QR đảo màu và BarcodeDetector song song
        stopFrameSampling();
        let isScanningFrame = false;
        const pollVideoFrame = async () => {
          if (session !== sessionRef.current || handledQrRef.current) {
            stopFrameSampling();
            return;
          }
          if (isScanningFrame) return;
          const video = document.getElementById(qrReaderId)?.querySelector('video');
          if (!video || video.readyState < 2 || video.paused || video.ended) return;

          isScanningFrame = true;
          try {
            const decoded = await scanVideoElementFrame(video);
            if (decoded && session === sessionRef.current && !handledQrRef.current) {
              stopFrameSampling();
              void handleDecodedQr(decoded, session);
            }
          } catch {
            // bỏ qua lỗi đọc frame tạm thời
          } finally {
            isScanningFrame = false;
          }
        };

        frameIntervalRef.current = window.setInterval(() => {
          void pollVideoFrame();
        }, 120);

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

  const handleFileScan = async (file: File) => {
    if (scanStatus === 'processing') return;
    const session = ++sessionRef.current;
    handledQrRef.current = false;
    setErrorMessage(null);
    setScanStatus('processing');
    stopFrameSampling();

    try {
      const currentScanner = scannerRef.current;
      if (currentScanner) {
        await disposeScanner(currentScanner);
      }

      const { Html5Qrcode } = await import('html5-qrcode');
      const fileScanner = new Html5Qrcode(qrReaderId, {
        verbose: false,
        experimentalFeatures: {
          useBarCodeDetectorIfSupported: true,
        },
      });
      let decodedText: string;
      try {
        decodedText = await scanQrImageFile(file, (f) => fileScanner.scanFile(f, false));
      } finally {
        try {
          fileScanner.clear();
        } catch {
          // ignore cleanup error
        }
      }

      if (session !== sessionRef.current) return;
      await handleDecodedQr(decodedText, session);
    } catch (error) {
      if (session !== sessionRef.current) return;
      console.warn('[QR File Scan] Failed:', error);
      setErrorMessage('Không nhận diện được mã QR trong ảnh. Hãy chụp ảnh cận cảnh, vuông góc và đủ sáng rồi thử lại.');
      setScanStatus('error');
    }
  };

  // QR in each printed card opens this page directly and loads that card's mission.
  useEffect(() => {
    if (isFromHomeScan) return;
    const params = new URLSearchParams(location.search);
    const rawCardParam = params.get('cardCode') ?? params.get('card') ?? params.get('c');
    const normalized = normalizeCardCode(rawCardParam);
    if (!normalized) return;
    if (handledQrRef.current) return;
    handledQrRef.current = true;
    const requestSession = ++sessionRef.current;
    void loadCardMission(normalized, undefined, requestSession);
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
                  Mô Hình Phygital
                </span>
                <h1 className="mt-2 text-2xl font-black text-white sm:text-4xl">
                  {isFromHomeScan ? 'Quét QR Tham Gia Phòng' : isDirectCardQr ? `Đang mở lá bài ${directCardCode}` : 'Quét Lá Bài Thử Thách'}
                </h1>
                <p className="mt-1 text-sm text-slate-300">
                  {isFromHomeScan
                    ? 'Quét mã phòng đang hoạt động để tham gia qua máy chủ.'
                    : isDirectCardQr
                      ? 'Đang tải đúng nhiệm vụ được liên kết với mã QR này.'
                      : `Vòng ${currentRound} — Quét mã QR trên lá bài.`}
                </p>
                {!isFromHomeScan && deviceMode === 'multi_device' && (
                  <div className="mt-3 flex flex-wrap items-center gap-3 text-xs">
                    <span className={`rounded-full border px-3 py-1.5 font-bold ${activePlayerId === currentPlayerId
                      ? 'border-emerald-400/30 bg-emerald-500/10 text-emerald-200'
                      : 'border-amber-400/30 bg-amber-500/10 text-amber-200'
                    }`}>
                      {activePlayerId === currentPlayerId
                        ? 'Lượt của bạn'
                        : `Đang chơi: ${players.find((player) => player.id === activePlayerId)?.name ?? 'người chơi khác'}`}
                    </span>
                    <span className="text-slate-300">
                      Thời gian lượt: {turnDurationSeconds === 0 ? 'không giới hạn' : turnTimeLeft === null ? 'đang đồng bộ…' : `${turnTimeLeft} giây`}
                    </span>
                  </div>
                )}
              </div>

            </div>

            {isDirectCardQr ? (
              <div className="space-y-4 py-10 text-center">
                <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full border border-cyan-400/30 bg-cyan-400/10">
                  {scanStatus === 'success' ? <CheckCircle2 size={42} className="text-emerald-400" /> : <QrCode size={42} className="animate-pulse text-cyan-300" />}
                </div>
                <h2 className="text-xl font-bold text-white">{scanStatus === 'error' ? 'Không tải được nhiệm vụ' : scanStatus === 'success' ? 'Đã tải nhiệm vụ' : 'Đang tải nhiệm vụ...'}</h2>
                <p className="text-sm text-slate-300">{scanStatus === 'error' ? (errorMessage ?? 'Vui lòng thử lại sau.') : `Mã lá bài: ${directCardCode}`}</p>
                {scanStatus === 'error' && <button onClick={() => { if (directCardCode) { handledQrRef.current = true; void loadCardMission(directCardCode, undefined, ++sessionRef.current); } }} className="min-h-12 rounded-xl bg-cyan-600 px-5 py-3 font-bold text-white hover:bg-cyan-500">Thử tải lại</button>}
              </div>
            ) : (
              <div className="space-y-4 text-center">
                {isInAppBrowser() && (
                  <div className="mx-auto max-w-lg rounded-2xl border border-amber-500/40 bg-amber-500/10 p-4 text-left text-xs text-amber-200">
                    <div className="flex items-start gap-2.5">
                      <AlertTriangle size={18} className="mt-0.5 shrink-0 text-amber-400" />
                      <div>
                        <p className="font-bold text-amber-100">Đang mở trong ứng dụng (Zalo / Facebook)</p>
                        <p className="mt-1 leading-relaxed text-amber-200/90">
                          Trình duyệt trong ứng dụng có thể chặn camera trực tiếp. Để quét mượt nhất, hãy nhấn nút <strong className="text-white underline">•••</strong> ở góc trên bên phải màn hình rồi chọn <strong>"Mở bằng trình duyệt"</strong> (Safari), hoặc dùng nút <strong>"Chụp / Tải ảnh QR"</strong> bên dưới.
                        </p>
                      </div>
                    </div>
                  </div>
                )}

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
                            : 'Nhấn bắt đầu để cấp quyền camera hoặc tải ảnh QR.'}
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

                <div className="mx-auto flex w-full max-w-lg flex-col gap-3 sm:flex-row sm:items-center">
                  {isScannerActive ? (
                    <button
                      onClick={() => { void stopScanner(); }}
                      disabled={scanStatus === 'stopping'}
                      className="flex min-h-12 flex-1 items-center justify-center gap-2 rounded-2xl border border-red-400/40 bg-red-500/15 px-6 py-3 font-bold text-red-200 transition hover:bg-red-500/25"
                    >
                      <StopCircle size={19} /> Dừng quét
                    </button>
                  ) : (
                    <button
                      onClick={() => { void startScanner(); }}
                      disabled={scanStatus === 'processing' || scanStatus === 'success'}
                      className="flex min-h-12 flex-1 items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-violet-600 via-fuchsia-500 to-cyan-500 px-6 py-3 font-bold text-white shadow-xl shadow-fuchsia-500/20 disabled:cursor-wait disabled:opacity-70"
                    >
                      <Camera size={19} /> {scanButtonLabel()}
                    </button>
                  )}
                </div>

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
          </motion.div>
        </div>
      </div>
    </div>
  );
};

export default ScanQRPage;
