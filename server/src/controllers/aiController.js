import { buildGeminiPrompt, SNAPDECK_SYSTEM_INSTRUCTION } from '../prompts/geminiChallengePrompt.js';
import mongoose from 'mongoose';
import { Room } from '../models/Room.js';
import { Submission } from '../models/Submission.js';
import { advanceTurn } from './roomController.js';
import { readEvidenceDataUrl } from '../utils/evidenceStore.js';
import { verifyPlayerToken } from '../utils/playerAuth.js';

const localAiEvaluations = new Map();
const localEvaluationTtl = 30 * 60 * 1000;

/**
 * Trích xuất mimeType và dữ liệu base64 thô từ Data URL
 */
function parseBase64Image(dataUrlOrBase64) {
  if (typeof dataUrlOrBase64 !== 'string') return null;

  const match = /^data:(image\/(?:jpeg|png|webp));base64,([A-Za-z0-9+/=]+)$/i.exec(dataUrlOrBase64.trim());
  if (match) {
    return {
      mimeType: match[1].toLowerCase(),
      data: match[2],
    };
  }

  // Trường hợp truyền raw base64 không có tiền tố data:image
  if (/^[A-Za-z0-9+/=]+$/.test(dataUrlOrBase64.trim())) {
    return {
      mimeType: 'image/jpeg',
      data: dataUrlOrBase64.trim(),
    };
  }

  return null;
}

/**
 * Gọi Gemini REST API với mô hình gemini-2.5-flash hoặc fallback gemini-1.5-flash
 */
async function callGeminiVision({ apiKey, promptText, imageBase64, mimeType }) {
  const models = ['gemini-1.5-flash', 'gemini-2.0-flash', 'gemini-1.5-pro'];
  let lastError = null;

  for (const model of models) {
    try {
      const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;

      const payload = {
        systemInstruction: {
          parts: [{ text: SNAPDECK_SYSTEM_INSTRUCTION }],
        },
        contents: [
          {
            role: 'user',
            parts: [
              {
                inlineData: {
                  mimeType,
                  data: imageBase64,
                },
              },
              {
                text: promptText,
              },
            ],
          },
        ],
        generationConfig: {
          responseMimeType: 'application/json',
          temperature: 0.3,
        },
      };

      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
        signal: AbortSignal.timeout(30_000),
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.warn(`[AI Controller] Model ${model} returned ${response.status}:`, errorText);

        let detailMsg = '';
        let activationUrl = '';
        try {
          const errJson = JSON.parse(errorText);
          detailMsg = errJson.error?.message || '';
          const helpLink = errJson.error?.details?.find((d) => d['@type']?.includes('Help'))?.links?.[0]?.url;
          const metaUrl = errJson.error?.details?.find((d) => d['@type']?.includes('ErrorInfo'))?.metadata?.activationUrl;
          activationUrl = helpLink || metaUrl || '';
        } catch {
          detailMsg = errorText;
        }

        if (response.status === 403) {
          if (detailMsg.includes('SERVICE_DISABLED') || detailMsg.includes('has not been used in project')) {
            const projectMatch = detailMsg.match(/project[ =](\d+)/i);
            const projId = projectMatch ? projectMatch[1] : '489886710201';
            const urlToEnable = activationUrl || `https://console.developers.google.com/apis/api/generativelanguage.googleapis.com/overview?project=${projId}`;
            lastError = new Error(
              `Dịch vụ Gemini API chưa được BẬT trên Google Cloud Project [${projId}].\n` +
              `👉 Vui lòng mở link sau để bấm [Bật / Enable]: ${urlToEnable}\n` +
              `Hoặc tạo API Key mới từ Google AI Studio: https://aistudio.google.com/app/apikey`
            );
            break; // Không cần thử model khác vì toàn bộ service chưa bật trên project
          } else if (detailMsg.includes('API_KEY_SERVICE_BLOCKED')) {
            lastError = new Error(
              `API Key đang bị hạn chế dịch vụ (API restrictions). ` +
              `Vui lòng vào Google Cloud Console > Credentials > Chỉnh sửa API Key, tại mục API restrictions chọn "Don't restrict key" hoặc tick chọn "Generative Language API".`
            );
            break;
          } else {
            lastError = new Error(`Lỗi Gemini API (403 Forbidden): ${detailMsg || 'Quyền truy cập bị từ chối.'}`);
          }
        } else if (response.status === 429) {
          lastError = new Error(`Gemini API vượt hạn mức (429 Quota Exceeded): ${detailMsg || 'Vui lòng thử lại sau.'}`);
        } else {
          lastError = new Error(`Gemini API [${model}] error (${response.status}): ${detailMsg || response.statusText}`);
        }
        continue;
      }

      const resData = await response.json();
      const rawText = resData.candidates?.[0]?.content?.parts?.[0]?.text;

      if (!rawText) {
        throw new Error('Gemini không trả về nội dung đánh giá.');
      }

      const parsed = JSON.parse(rawText);
      return { ...parsed, modelUsed: model };
    } catch (err) {
      console.warn(`[AI Controller] Thử nghiệm model ${model} thất bại:`, err.message);
      lastError = err;
    }
  }

  throw lastError || new Error('Không thể kết nối đến dịch vụ Gemini API.');
}

/**
 * Controller xử lý yêu cầu chấm điểm ảnh bằng chứng qua AI
 * POST /api/ai/verify
 */
export const verifyPhoto = async (req, res) => {
  let claimedSubmissionId = null;
  let claimedLocalId = null;
  let resultPersisted = false;
  try {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey || apiKey === 'your_gemini_api_key_here') {
      return res.status(503).json({
        success: false,
        message: 'Chưa cấu hình GEMINI_API_KEY trong file server/.env. Vui lòng thêm API Key để kích hoạt AI Judge.',
      });
    }

    const {
      evidence,
      cardTitle,
      mission,
      theme,
      difficulty,
      xp,
      submissionId,
      playerId,
    } = req.body;

    if (typeof submissionId !== 'string' || !submissionId) {
      return res.status(400).json({
        success: false,
        message: 'Thiếu mã lượt gửi để xác minh.',
      });
    }

    if (!evidence) {
      return res.status(400).json({
        success: false,
        message: 'Thiếu hình ảnh bằng chứng (evidence) để AI phân tích.',
      });
    }

    if (typeof cardTitle !== 'string' || !cardTitle.trim() || typeof mission !== 'string' || !mission.trim()) {
      return res.status(400).json({
        success: false,
        message: 'Thiếu thông tin thử thách (cardTitle hoặc mission).',
      });
    }

    let evaluationEvidence = evidence;
    let evaluationCardTitle = cardTitle;
    let evaluationMission = mission;
    let evaluationTheme = theme || 'Chung';
    let room = null;
    let submission = null;
    let parsedImage;
    const isLocalSubmission = /^local-[A-Za-z0-9-]{1,100}$/.test(submissionId);

    if (isLocalSubmission) {
      parsedImage = parseBase64Image(evaluationEvidence);
      if (!parsedImage) {
        return res.status(400).json({
          success: false,
          message: 'Định dạng ảnh không hợp lệ. Cần chuỗi base64 JPEG, PNG hoặc WebP.',
        });
      }
      const now = Date.now();
      for (const [id, cached] of localAiEvaluations) {
        if (now - cached.updatedAt > localEvaluationTtl) localAiEvaluations.delete(id);
      }
      const cached = localAiEvaluations.get(submissionId);
      if (cached?.status === 'completed' || cached?.status === 'ready') {
        return res.json({ success: true, data: cached.result });
      }
      if (cached?.status === 'processing') {
        return res.status(409).json({ success: false, message: 'AI đang xác minh lượt gửi này. Vui lòng đợi.' });
      }
      claimedLocalId = submissionId;
      localAiEvaluations.set(submissionId, { status: 'processing', updatedAt: now });
    } else {
      if (!/^[a-f\d]{24}$/i.test(submissionId) || typeof playerId !== 'string') {
        return res.status(400).json({ success: false, message: 'Mã lượt gửi không hợp lệ.' });
      }
      submission = await Submission.findById(submissionId).select('+evidenceFileId');
      if (!submission) {
        return res.status(404).json({ success: false, message: 'Không tìm thấy lượt gửi thử thách.' });
      }
      room = await Room.findOne({ roomCode: submission.roomCode }).select('+players.authTokenHash');
      const player = room?.players.find((candidate) => candidate.id === playerId);
      if (!room || !player || !verifyPlayerToken(req.get('x-player-token'), player.authTokenHash)) {
        return res.status(403).json({ success: false, message: 'Phiên người chơi không hợp lệ. Hãy tham gia lại phòng.' });
      }
      if (room.verificationMethod !== 'ai') {
        return res.status(409).json({ success: false, message: 'Phòng này không sử dụng AI để xác minh.' });
      }
      if (submission.aiEvaluationStatus === 'completed' && submission.aiResult) {
        return res.json({ success: true, data: submission.aiResult });
      }
      if (submission.status !== 'pending') {
        return res.status(409).json({ success: false, message: 'Lượt gửi này đã được xử lý.' });
      }
      if (!submission.evidenceFileId) {
        return res.status(400).json({ success: false, message: 'Không tìm thấy ảnh bằng chứng đã lưu cho lượt gửi này.' });
      }
      evaluationEvidence = await readEvidenceDataUrl(submission.evidenceFileId, submission.roomCode);
      if (!evaluationEvidence) {
        return res.status(404).json({ success: false, message: 'Không tìm thấy ảnh bằng chứng đã lưu.' });
      }
      parsedImage = parseBase64Image(evaluationEvidence);
      if (!parsedImage) {
        return res.status(400).json({
          success: false,
          message: 'Định dạng ảnh bằng chứng đã lưu không hợp lệ.',
        });
      }
      evaluationCardTitle = submission.cardTitle;
      evaluationMission = submission.mission;
      evaluationTheme = room.theme || 'Chung';

      if (submission.aiEvaluationStatus !== 'ready') {
        const staleProcessingBefore = new Date(Date.now() - 120_000);
        const claimed = await Submission.findOneAndUpdate(
          {
            _id: submission._id,
            status: 'pending',
            $or: [
              { aiEvaluationStatus: { $ne: 'processing' } },
              { aiEvaluationStartedAt: { $lt: staleProcessingBefore } },
            ],
          },
          {
            $set: {
              aiEvaluationStatus: 'processing',
              aiEvaluationStartedAt: new Date(),
            },
          },
          { new: true }
        );
        if (!claimed) {
          const latest = await Submission.findById(submission._id);
          if (latest?.aiEvaluationStatus === 'completed' && latest.aiResult) {
            return res.json({ success: true, data: latest.aiResult });
          }
          if (latest?.aiEvaluationStatus === 'ready' && latest.aiResult) {
            submission.aiResult = latest.aiResult;
            submission.aiEvaluationStatus = 'ready';
          } else {
            return res.status(409).json({ success: false, message: 'AI đang xác minh lượt gửi này. Vui lòng đợi.' });
          }
        } else {
          claimedSubmissionId = String(submission._id);
        }
      }
    }

    const promptText = buildGeminiPrompt({
      cardTitle: evaluationCardTitle,
      mission: evaluationMission,
      theme: evaluationTheme,
      difficulty: Number(difficulty) || 2,
      xp: Number(xp) || 20,
    });

    let result = submission?.aiEvaluationStatus === 'ready' ? submission.aiResult : null;
    if (!result) {
      console.log(`[AI Controller] Đang gửi ảnh cho Gemini chấm thử thách: "${evaluationCardTitle}"...`);
      result = await callGeminiVision({
        apiKey,
        promptText,
        imageBase64: parsedImage.data,
        mimeType: parsedImage.mimeType,
      });
    }

    if (typeof result.passed !== 'boolean') {
      throw new Error('Gemini returned an invalid verification result.');
    }
    const scoreBreakdown = result.scoreBreakdown;
    if (
      !scoreBreakdown
      || !['basePoints', 'photoBonus', 'creativityBonus', 'total'].every((key) => Number.isFinite(scoreBreakdown[key]))
    ) {
      throw new Error('Gemini returned an invalid score breakdown.');
    }
    result = { ...result, scoreBreakdown };

    if (claimedLocalId) {
      localAiEvaluations.set(claimedLocalId, { status: 'ready', result, updatedAt: Date.now() });
      localAiEvaluations.set(claimedLocalId, { status: 'completed', result, updatedAt: Date.now() });
    } else if (claimedSubmissionId) {
      const savedResult = await Submission.updateOne(
        { _id: claimedSubmissionId, status: 'pending', aiEvaluationStatus: 'processing' },
        {
          $set: {
            aiEvaluationStatus: 'ready',
            aiResult: result,
          },
        }
      );
      if (savedResult.matchedCount !== 1) {
        const latest = await Submission.findById(claimedSubmissionId);
        if (latest?.aiEvaluationStatus === 'completed' && latest.aiResult) {
          return res.json({ success: true, data: latest.aiResult });
        }
        throw new Error('Submission changed before AI result could be saved.');
      }
      resultPersisted = true;
    }

    if (submission && room) {
      const session = await mongoose.startSession();
      try {
        await session.withTransaction(async () => {
          const [latestSubmission, latestRoom] = await Promise.all([
            Submission.findById(submission._id).session(session),
            Room.findOne({ roomCode: submission.roomCode }).select('+players.authTokenHash').session(session),
          ]);
          if (!latestSubmission || !latestRoom) {
            const error = new Error('Không tìm thấy lượt gửi hoặc phòng chơi.');
            error.status = 404;
            throw error;
          }
          if (latestSubmission.status !== 'pending') {
            if (latestSubmission.aiEvaluationStatus === 'completed' && latestSubmission.aiResult) {
              result = latestSubmission.aiResult;
              return;
            }
            const error = new Error('Lượt gửi này đã được xử lý.');
            error.status = 409;
            throw error;
          }
          if (
            latestSubmission.aiEvaluationStatus !== 'ready'
            || latestRoom.status !== 'active'
            || latestRoom.verificationMethod !== 'ai'
            || latestRoom.activeSubmissionId?.toString() !== latestSubmission._id.toString()
            || latestRoom.currentTurnIndex !== latestSubmission.turnIndex
            || latestRoom.activePlayerId !== latestSubmission.playerId
          ) {
            const error = new Error('Lượt chơi đã thay đổi. Hãy đồng bộ lại phòng.');
            error.status = 409;
            throw error;
          }

          const status = result.passed ? 'approved' : 'rejected';
          const approvedScore = result.passed
            ? scoreBreakdown
            : { basePoints: 0, photoBonus: 0, creativityBonus: 0, total: 0 };
          const resolved = await Submission.findOneAndUpdate(
            {
              _id: latestSubmission._id,
              status: 'pending',
              aiEvaluationStatus: 'ready',
            },
            {
              $set: {
                status,
                decisionAt: new Date(),
                scoreBreakdown: approvedScore,
                aiEvaluationStatus: 'completed',
              },
            },
            { new: true, session }
          );
          if (!resolved) {
            const error = new Error('Lượt gửi đã được xử lý đồng thời.');
            error.status = 409;
            throw error;
          }
          if (result.passed) {
            const updatedRoom = await Room.updateOne(
              { _id: latestRoom._id, 'players.id': resolved.playerId },
              {
                $inc: {
                  'players.$.score': approvedScore.total,
                  'players.$.approvedChallenges': 1,
                },
              },
              { session }
            );
            if (updatedRoom.matchedCount !== 1) {
              const error = new Error('Không thể cập nhật điểm người chơi trong phòng.');
              error.status = 409;
              throw error;
            }
          }
          const moved = await advanceTurn(
            latestRoom,
            status === 'approved' ? 'completed' : 'failed',
            approvedScore.total,
            session,
            resolved._id
          );
          if (!moved) {
            const error = new Error('Lượt đã được cập nhật đồng thời. Hãy đồng bộ trạng thái phòng.');
            error.status = 409;
            throw error;
          }
        });
      } finally {
        await session.endSession();
      }
      const latestSubmission = await Submission.findById(submission._id);
      if (latestSubmission?.aiResult) result = latestSubmission.aiResult;
    }

    console.log(`[AI Controller] Hoàn tất chấm điểm: ${result.passed ? 'ĐẠT' : 'KHÔNG ĐẠT'} (${result.score} pts)`);
    return res.json({
      success: true,
      data: result,
    });
  } catch (error) {
    console.error('[AI Controller] Lỗi khi xử lý chấm điểm AI:', error);
    if (claimedSubmissionId && !resultPersisted) {
      await Submission.updateOne(
        { _id: claimedSubmissionId, status: 'pending', aiEvaluationStatus: 'processing' },
        { $set: { aiEvaluationStatus: 'idle', aiEvaluationStartedAt: null } }
      ).catch((releaseError) => {
        console.error('[AI Controller] Không thể mở khóa lượt gửi AI sau lỗi:', releaseError);
      });
    }
    if (claimedLocalId && !resultPersisted) localAiEvaluations.delete(claimedLocalId);
    return res.status(error.status || 500).json({
      success: false,
      message: error.status
        ? error.message
        : 'Chưa thể xác minh thử thách do lỗi kỹ thuật. Vui lòng thử lại.',
    });
  }
};
