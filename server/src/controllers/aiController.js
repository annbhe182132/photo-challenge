// Controller xử lý chấm điểm AI cho ảnh thử thách
export const verifyPhoto = async (req, res) => {
  try {
    const { image, mission, difficulty } = req.body;

    if (!image) {
      return res.status(400).json({ success: false, message: 'Thiếu dữ liệu hình ảnh (image data)!' });
    }

    // TODO: Ở giai đoạn tiếp theo, bạn có thể tích hợp Google Gemini Vision API / OpenCV / MediaPipe tại đây.
    // Hiện tại controller trả về cấu trúc chấm điểm chuẩn REST API để FE tiêu thụ
    const baseScore = 90 + Math.floor(Math.random() * 9);
    const expressionScore = Math.min(100, baseScore + Math.floor(Math.random() * 4));
    const poseScore = Math.min(100, baseScore - Math.floor(Math.random() * 4));
    const syncScore = Math.min(100, baseScore + 2);
    const totalScore = Math.round((expressionScore + poseScore + syncScore) / 3);

    res.json({
      success: true,
      data: {
        totalScore,
        passed: totalScore >= 75,
        breakdown: {
          expression: expressionScore,
          pose: poseScore,
          sync: syncScore,
        },
        feedback: totalScore >= 75 ? 'Tư thế và thần thái xuất sắc!' : 'Chưa đạt độ khớp yêu cầu, hãy thử thách vòng quay!',
      },
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};
