import mongoose from 'mongoose';

const savedPhotoSchema = new mongoose.Schema({
  sourcePhotoId: { type: String, required: true },
  imageFileId: { type: String, required: true },
  round: { type: Number, required: true, min: 1 },
  cardTitle: { type: String, required: true, maxlength: 160 },
  mission: { type: String, default: '', maxlength: 2000 },
  score: { type: Number, default: 0, min: 0 },
  passed: { type: Boolean, default: false },
  playerName: { type: String, default: 'Người chơi', maxlength: 60 },
  createdAt: { type: Date, default: Date.now },
});

const accountAlbumSchema = new mongoose.Schema({
  ownerId: { type: mongoose.Schema.Types.ObjectId, ref: 'Account', required: true, index: true },
  roomCode: { type: String, required: true, maxlength: 40 },
  title: { type: String, required: true, maxlength: 120 },
  themeName: { type: String, default: 'SNAPDECK', maxlength: 80 },
  themeIcon: { type: String, default: '📸', maxlength: 12 },
  playedAt: { type: Date, default: Date.now },
  photos: { type: [savedPhotoSchema], default: [] },
}, { timestamps: true });

accountAlbumSchema.index({ ownerId: 1, roomCode: 1 }, { unique: true });
export const AccountAlbum = mongoose.model('AccountAlbum', accountAlbumSchema);
