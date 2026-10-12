import { Punishment } from '../models/Punishment.js';

export const getPunishments = async (req, res) => {
  try {
    const punishments = await Punishment.find();
    res.json({ success: true, count: punishments.length, data: punishments });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};
