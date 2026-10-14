import mongoose from 'mongoose';

const roomSchema = new mongoose.Schema(
  {
    roomCode: { type: String, required: true, unique: true },
    theme: { type: String, default: 'pose' },
    mode: { type: String, enum: ['casual', 'speedrun', 'spicy'], default: 'spicy' },
    deviceMode: { type: String, enum: ['single_device', 'multi_device'], default: 'multi_device' },
    verificationMethod: { type: String, enum: ['ai', 'group'], default: 'group' },
    photoEvidence: { type: String, enum: ['off', 'optional', 'required'], default: 'optional' },
    photoBonusEnabled: { type: Boolean, default: true },
    status: { type: String, enum: ['waiting', 'active', 'completed'], default: 'waiting' },
    currentRound: { type: Number, default: 1 },
    totalRounds: { type: Number, default: 5, enum: [0, 3, 5, 10] },
    turnDurationSeconds: { type: Number, default: 30, enum: [0, 15, 30, 60] },
    currentTurnIndex: { type: Number, default: 0, min: 0 },
    activePlayerId: { type: String, default: null },
    activeSubmissionId: { type: mongoose.Schema.Types.ObjectId, ref: 'Submission', default: null },
    turnStartedAt: { type: Date, default: null },
    turnDeadline: { type: Date, default: null },
    turnHistory: [{
      turnIndex: { type: Number, required: true },
      round: { type: Number, required: true },
      playerId: { type: String, required: true },
      status: { type: String, enum: ['completed', 'failed', 'timed_out', 'skipped'], required: true },
      score: { type: Number, default: 0 },
      resolvedAt: { type: Date, default: Date.now },
    }],
    hostName: { type: String, default: 'Host' },
    hostPlayerId: { type: String, required: true },
    usedCardCodes: { type: [String], default: [] },
    players: [
      {
        id: String,
        name: String,
        avatar: String,
        authTokenHash: { type: String, select: false },
        score: { type: Number, default: 0 },
        approvedChallenges: { type: Number, default: 0 },
        streak: { type: Number, default: 0 },
        badges: [String],
      },
    ],
    activeCard: { type: mongoose.Schema.Types.ObjectId, ref: 'Card' },
  },
  { timestamps: true }
);

export const Room = mongoose.model('Room', roomSchema);
