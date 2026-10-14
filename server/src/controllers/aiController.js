export const verifyPhoto = async (req, res) => {
  res.status(503).json({
    success: false,
    message: 'AI verification chưa khả dụng: chưa cấu hình dịch vụ phân tích ảnh thật. Hãy dùng xác thực nhóm.',
  });
};
