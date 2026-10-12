import mongoose from 'mongoose';

const photoSchema = new mongoose.Schema({
  round: { type: Number, required: true },
  image: { type: String, required: true },
  cardTitle: { type: String, required: true },
  score: { type: Number, required: true },
  mission: { type: String, default: '' },
  createdAt: { type: Date, default: Date.now },
});

const galleryAlbumSchema = new mongoose.Schema(
  {
    roomCode: { type: String, required: true },
    themeName: { type: String, required: true },
    themeIcon: { type: String, default: '🎉' },
    date: { type: String, default: () => new Date().toLocaleDateString('vi-VN') },
    coverImage: { type: String, required: true },
    photos: [photoSchema],
  },
  { timestamps: true }
);

export const GalleryAlbum = mongoose.model('GalleryAlbum', galleryAlbumSchema);
