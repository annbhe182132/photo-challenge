
import { Card } from '../models/Card.js';
import { Mission } from '../models/Mission.js';

export const getMissionByQR = async (req, res) => {
  try {
    const rawQrKey = req.params.qrKey.toUpperCase();
    const altQrKey = rawQrKey.startsWith('PC-')
      ? rawQrKey.replace('PC-', 'SD-')
      : rawQrKey.replace('SD-', 'PC-');

    const card = await Card.findOne({
      $or: [
        { qrKey: rawQrKey },
        { qrKey: altQrKey },
        { code: rawQrKey },
        { code: altQrKey },
      ],
      isActive: true,
    });

    if (!card) {
      return res.status(404).json({
        success: false,
        message: 'Không tìm thấy lá bài này.',
      });
    }

    const altCardCode = card.code.startsWith('PC-')
      ? card.code.replace('PC-', 'SD-')
      : card.code.replace('SD-', 'PC-');

    const missions = await Mission.find({
      $or: [
        { cardCode: card.code },
        { cardCode: altCardCode },
      ],
      isActive: true,
    });

    if (!missions.length) {
      return res.status(404).json({
        success: false,
        message: 'Lá bài chưa có nhiệm vụ.',
      });
    }

    const mission =
      missions[Math.floor(Math.random() * missions.length)];

    res.json({
      success: true,
      card: {
        code: card.code,
        title: card.title,
        themeId: card.themeId,
      },
      mission,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};
