import mongoose from 'mongoose';

const cardSchema = new mongoose.Schema(
  {
    code: { type: String, required: true, unique: true },
    category: {
      type: String,
      required: true,
      enum: ['Group', 'Action', 'Spicy', 'Creative', 'Meme'],
    },
    theme: { type: String, required: true },
    title: { type: String, required: true },
    mission: { type: String, required: true },
    difficulty: { type: Number, required: true, min: 1, max: 5 },
    xp: { type: Number, required: true, default: 20 },
    tags: [{ type: String }],
    arOverlay: { type: String },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

export const Card = mongoose.model('Card', cardSchema);
