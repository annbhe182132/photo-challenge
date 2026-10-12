import { GalleryAlbum } from '../models/Gallery.js';

// Lấy danh sách tất cả các Album phòng
export const getAlbums = async (req, res) => {
  try {
    const albums = await GalleryAlbum.find().sort({ createdAt: -1 });
    res.json({ success: true, count: albums.length, data: albums });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Thêm ảnh mới vào Album phòng
export const addPhotoToAlbum = async (req, res) => {
  try {
    const { roomCode, themeName, themeIcon, photo } = req.body;

    let album = await GalleryAlbum.findOne({ roomCode });
    if (!album) {
      album = new GalleryAlbum({
        roomCode,
        themeName: themeName || 'Party Đêm Đỉnh Cao',
        themeIcon: themeIcon || '🎉',
        coverImage: photo.image,
        photos: [photo],
      });
    } else {
      album.photos.unshift(photo);
      album.coverImage = photo.image;
    }

    await album.save();
    res.status(201).json({ success: true, data: album });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
};
