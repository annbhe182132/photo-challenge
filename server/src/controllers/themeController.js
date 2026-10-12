import { Theme } from '../models/Theme.js';

export const getThemes = async (req, res) => {
  try {
    const themes = await Theme.find();
    res.json({ success: true, count: themes.length, data: themes });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};
