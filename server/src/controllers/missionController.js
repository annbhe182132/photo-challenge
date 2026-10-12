
import { Card } from '../models/Card.js';
import { Mission } from '../models/Mission.js';

export const getMissionByQR = async (req, res) => {
  try {
    const qrKey = req.params.qrKey.toUpperCase();

    const card = await Card.findOne({
      qrKey,
      isActive: true,
    });

    if (!card) {
      return res.status(404).json({
        success: false,
        message: 'Không tìm thấy lá bài này.',
      });
    }

    const missions = await Mission.find({
      cardCode: card.code,
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
