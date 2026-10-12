import mongoose from 'mongoose';

const roomSchema = new mongoose.Schema(
  {
    roomCode: { type: String, required: true, unique: true },
    theme: { type: String, default: 'party' },
    mode: { type: String, enum: ['casual', 'speedrun', 'spicy'], default: 'spicy' },
    status: { type: String, enum: ['waiting', 'active', 'completed'], default: 'waiting' },
    currentRound: { type: Number, default: 1 },
    totalRounds: { type: Number, default: 3 },
    hostName: { type: String, default: 'Host' },
    players: [
      {
        id: String,
        name: String,
        avatar: String,
        score: { type: Number, default: 0 },
        streak: { type: Number, default: 0 },
        badges: [String],
      },
    ],
    activeCard: { type: mongoose.Schema.Types.ObjectId, ref: 'Card' },
  },
  { timestamps: true }
);

export const Room = mongoose.model('Room', roomSchema);
