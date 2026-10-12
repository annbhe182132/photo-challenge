import mongoose from 'mongoose';

const punishmentSchema = new mongoose.Schema(
  {
    id: { type: String, required: true, unique: true },
    title: { type: String, required: true },
    description: { type: String, required: true },
    icon: { type: String, required: true },
  },
  { timestamps: true }
);

export const Punishment = mongoose.model('Punishment', punishmentSchema);
