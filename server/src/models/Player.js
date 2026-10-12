import mongoose from 'mongoose';

const playerSchema = new mongoose.Schema(
  {
    id: { type: String, required: true },
    name: { type: String, required: true },
    avatar: { type: String, default: '' },
    score: { type: Number, default: 0 },
    streak: { type: Number, default: 0 },
    badges: [{ type: String }],
  },
  { timestamps: true }
);

export const Player = mongoose.model('Player', playerSchema);
