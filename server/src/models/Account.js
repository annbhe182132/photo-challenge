import mongoose from 'mongoose';

const accountSchema = new mongoose.Schema({
  email: { type: String, required: true, unique: true, lowercase: true, trim: true, maxlength: 254, index: true },
  displayName: { type: String, required: true, trim: true, maxlength: 60 },
  passwordHash: { type: String, required: true, select: false },
  sessions: {
    type: [{ tokenHash: { type: String, required: true }, expiresAt: { type: Date, required: true } }],
    default: [],
    select: false,
  },
}, { timestamps: true });

export const Account = mongoose.model('Account', accountSchema);
