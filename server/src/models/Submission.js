import mongoose from 'mongoose';

const voteSchema = new mongoose.Schema(
  {
    playerId: { type: String, required: true },
    missionCode: { type: String, required: true },
    approve: { type: Boolean, required: true },
    createdAt: { type: Date, default: Date.now },
  },
  { _id: false }
);

const submissionSchema = new mongoose.Schema(
  {
    roomCode: { type: String, required: true, index: true },
    round: { type: Number, required: true, min: 1 },
    turnIndex: { type: Number, required: true, min: 0, default: 0 },
    playerId: { type: String, required: true },
    cardCode: { type: String, required: true },
    cardTitle: { type: String, required: true },
    mission: { type: String, required: true },
    evidenceFileId: { type: String, default: null, select: false },
    hasEvidence: { type: Boolean, default: false },
    eligibleVoterIds: { type: [String], default: [] },
    requiredVotes: { type: Number, required: true, min: 1 },
    votes: { type: [voteSchema], default: [] },
    status: { type: String, enum: ['pending', 'approved', 'rejected'], default: 'pending' },
    decisionAt: { type: Date, default: null },
    scoreBreakdown: {
      basePoints: { type: Number, default: 0 },
      photoBonus: { type: Number, default: 0 },
      creativityBonus: { type: Number, default: 0 },
      total: { type: Number, default: 0 },
    },
  },
  { timestamps: true }
);

submissionSchema.index(
  { roomCode: 1, round: 1, playerId: 1, cardCode: 1 },
  { unique: true }
);

export const Submission = mongoose.model('Submission', submissionSchema);
