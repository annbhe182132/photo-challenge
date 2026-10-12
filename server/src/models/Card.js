import mongoose from 'mongoose';

const cardSchema = new mongoose.Schema({
  code: { type: String, required: true, unique: true, index: true },
  qrKey: { type: String, required: true, unique: true, index: true },
  themeId: { type: String, required: true, index: true },
  title: { type: String, required: true },
  mission: { type: String, required: true }, // Nội dung gốc in trên lá bài
  difficulty: { type: Number, required: true, min: 1, max: 5 },
  xp: { type: Number, required: true, default: 20 },
  mediaType: { type: String, enum: ['photo', 'video'], default: 'photo' },
  missionCount: { type: Number, default: 4 },
  isActive: { type: Boolean, default: true },
}, { timestamps: true });

export const Card = mongoose.model('Card', cardSchema);
