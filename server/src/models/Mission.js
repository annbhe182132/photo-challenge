import mongoose from 'mongoose';

const missionSchema = new mongoose.Schema({
  missionCode: { type: String, required: true, unique: true, index: true },
  cardCode: { type: String, required: true, index: true },
  themeId: { type: String, required: true, index: true },
  title: { type: String, required: true },
  instruction: { type: String, required: true },
  mediaType: { type: String, enum: ['photo', 'video'], default: 'photo' },
  difficulty: { type: Number, min: 1, max: 5, default: 2 },
  xp: { type: Number, default: 20 },
  isOriginal: { type: Boolean, default: false },
  isActive: { type: Boolean, default: true },
}, { timestamps: true });

missionSchema.index({ cardCode: 1, isActive: 1 });
export const Mission = mongoose.model('Mission', missionSchema);
