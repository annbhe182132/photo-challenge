import { Card } from '../models/Card.js';

// Lấy danh sách tất cả các thẻ bài
export const getCards = async (req, res) => {
  try {
    const { category, theme } = req.query;
    const filter = { isActive: true };
    if (category) filter.category = category;
    if (theme) filter.theme = theme;

    const cards = await Card.find(filter).sort({ difficulty: 1 });
    res.json({ success: true, count: cards.length, data: cards });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Lấy chi tiết thẻ bài qua mã QR (code) hoặc ID
export const getCardByCode = async (req, res) => {
  try {
    const { code } = req.params;
    const card = await Card.findOne({ code: code.toUpperCase() });
    if (!card) {
      return res.status(404).json({ success: false, message: 'Không tìm thấy thẻ bài với mã QR này!' });
    }
    res.json({ success: true, data: card });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Tạo thêm thẻ bài mới (Admin)
export const createCard = async (req, res) => {
  try {
    const newCard = await Card.create(req.body);
    res.status(201).json({ success: true, data: newCard });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
};
