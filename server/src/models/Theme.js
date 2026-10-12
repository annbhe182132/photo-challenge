import mongoose from 'mongoose';

const themeSchema = new mongoose.Schema(
  {
    id: { type: String, required: true, unique: true },
    name: { type: String, required: true },
    icon: { type: String, required: true },
    description: { type: String, required: true },
    color: { type: String, required: true },
  },
  { timestamps: true }
);

export const Theme = mongoose.model('Theme', themeSchema);
