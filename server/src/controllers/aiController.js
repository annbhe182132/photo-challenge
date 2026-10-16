import { buildGeminiPrompt, SNAPDECK_SYSTEM_INSTRUCTION } from '../prompts/geminiChallengePrompt.js';
import { Room } from '../models/Room.js';
import { Submission } from '../models/Submission.js';
import { advanceTurn } from './roomController.js';

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
 * Gọi Gemini REST API với mô hình gemini-3.8-flash hoặc fallback gemini-3.7-flash / gemini-flash-latest
 */
async function callGeminiVision({ apiKey, promptText, imageBase64, mimeType }) {
  const models = ['gemini-3.8-flash', 'gemini-3.7-flash', 'gemini-flash-latest'];
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
 * Chuẩn hóa và áp dụng quy tắc kiểm định nghiêm ngặt cho kết quả AI:
 * - matchPercentage: số nguyên 0 - 100 (tỷ lệ hoàn thành thực tế do AI chấm)
 * - matchPercentage >= 50: passed = true (ĐẠT)
 * - matchPercentage < 50: passed = false (KHÔNG ĐẠT)
 */
export function validateAndNormalizeAiResult(rawResult) {
  let rawPercentage = rawResult?.matchPercentage ?? rawResult?.percentage;
  if (typeof rawPercentage !== 'number' || Number.isNaN(rawPercentage)) {
    if (typeof rawResult?.score === 'number' && !Number.isNaN(rawResult.score)) {
      rawPercentage = rawResult.score;
    } else if (typeof rawResult?.confidence === 'number') {
      rawPercentage = rawResult.confidence * 100;
    } else {
      rawPercentage = rawResult?.passed ? 75 : 35;
    }
  }

  // Giới hạn 0 - 100 và làm tròn số nguyên thực tế
  const matchPercentage = Math.max(0, Math.min(100, Math.round(rawPercentage)));

  // Ngưỡng phân định bắt buộc: >= 50% là ĐẠT, < 50% là KHÔNG ĐẠT
  const passed = matchPercentage >= 50;

  let verdict = rawResult?.verdict;
  if (!verdict || typeof verdict !== 'string') {
    verdict = passed ? 'HOÀN THÀNH XUẤT SẮC' : 'CHƯA ĐẠT YÊU CẦU';
  } else if (!passed && verdict.toLowerCase().includes('hoàn thành')) {
    verdict = 'CHƯA ĐẠT YÊU CẦU';
  }

  return {
    ...rawResult,
    matchPercentage,
    passed,
    verdict,
  };
}

/**
 * Controller xử lý yêu cầu chấm điểm ảnh bằng chứng qua AI
 * POST /api/ai/verify
 */
export const verifyPhoto = async (req, res) => {
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
    } = req.body;

    if (!evidence) {
      return res.status(400).json({
        success: false,
        message: 'Thiếu hình ảnh bằng chứng (evidence) để AI phân tích.',
      });
    }

    if (!cardTitle || !mission) {
      return res.status(400).json({
        success: false,
        message: 'Thiếu thông tin thử thách (cardTitle hoặc mission).',
      });
    }

    const parsedImage = parseBase64Image(evidence);
    if (!parsedImage) {
      return res.status(400).json({
        success: false,
        message: 'Định dạng ảnh không hợp lệ. Cần chuỗi base64 JPEG, PNG hoặc WebP.',
      });
    }

    const promptText = buildGeminiPrompt({
      cardTitle,
      mission,
      theme: theme || 'Chung',
      difficulty: Number(difficulty) || 2,
      xp: Number(xp) || 20,
    });

    console.log(`[AI Controller] Đang gửi ảnh cho Gemini chấm thử thách: "${cardTitle}"...`);
    const rawResult = await callGeminiVision({
      apiKey,
      promptText,
      imageBase64: parsedImage.data,
      mimeType: parsedImage.mimeType,
    });

    const result = validateAndNormalizeAiResult(rawResult);

    console.log(
      `[AI Controller] Hoàn tất chấm điểm: ${result.passed ? 'ĐẠT' : 'KHÔNG ĐẠT'} ` +
      `(${result.matchPercentage}% hoàn thành - ${result.score} pts)`
    );

    const { submissionId } = req.body;
    let syncedSubmission = null;
    if (submissionId) {
      try {
        const submission = await Submission.findById(submissionId);
        if (submission && submission.status === 'pending') {
          const room = await Room.findOne({ roomCode: submission.roomCode });
          if (room) {
            const status = result.passed ? 'approved' : 'rejected';
            const approvedScore = result.passed
              ? (result.scoreBreakdown || {
                  basePoints: Number(xp) || 20,
                  photoBonus: 10,
                  creativityBonus: 10,
                  total: (Number(xp) || 20) + 20,
                })
              : { basePoints: 0, photoBonus: 0, creativityBonus: 0, total: 0 };

            submission.status = status;
            submission.decisionAt = new Date();
            submission.scoreBreakdown = approvedScore;
            await submission.save();

            if (result.passed) {
              await Room.updateOne(
                { _id: room._id, 'players.id': submission.playerId },
                {
                  $inc: {
                    'players.$.score': approvedScore.total,
                    'players.$.approvedChallenges': 1,
                  },
                }
              );
            }
            await advanceTurn(room, status === 'approved' ? 'completed' : 'failed', approvedScore.total, null, submission._id);
            syncedSubmission = submission;
          }
        }
      } catch (dbError) {
        console.warn('[AI Controller] Lưu database submission lỗi:', dbError.message);
      }
    }

    return res.json({
      success: true,
      data: {
        ...result,
        submission: syncedSubmission,
      },
    });
  } catch (error) {
    console.error('[AI Controller] Lỗi khi xử lý chấm điểm AI:', error);
    return res.status(500).json({
      success: false,
      message: error instanceof Error ? error.message : 'Lỗi nội bộ máy chủ khi gọi AI.',
    });
  }
};
