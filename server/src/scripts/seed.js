import mongoose from 'mongoose';
import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

import { Card } from '../models/Card.js';
import { Theme } from '../models/Theme.js';
import { Punishment } from '../models/Punishment.js';
import { Room } from '../models/Room.js';
import { GalleryAlbum } from '../models/Gallery.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.resolve(__dirname, '../../.env') });

const seedDatabase = async () => {
  const mongoUri = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/photo_challenge_db';

  try {
    console.log('[Seed] Đang kết nối tới MongoDB:', mongoUri);
    await mongoose.connect(mongoUri);
    console.log('[Seed] Kết nối thành công!');

    // Đọc file mongo_database_temp.json ở thư mục gốc (cùng cấp với server và frontend)
    const jsonPath = path.resolve(__dirname, '../../../mongo_database_temp.json');
    if (!fs.existsSync(jsonPath)) {
      throw new Error(`Không tìm thấy file seed tại: ${jsonPath}`);
    }

    const rawData = fs.readFileSync(jsonPath, 'utf-8');
    const dbData = JSON.parse(rawData);

    console.log('[Seed] Đang làm sạch collections cũ...');
    await Promise.all([
      Card.deleteMany({}),
      Theme.deleteMany({}),
      Punishment.deleteMany({}),
      Room.deleteMany({}),
      GalleryAlbum.deleteMany({}),
    ]);

    console.log('[Seed] Đang nhập 24 thẻ bài...');
    if (dbData.collections?.cards) {
      await Card.insertMany(dbData.collections.cards);
      console.log(`✓ Đã nạp ${dbData.collections.cards.length} thẻ bài vật lý!`);
    }

    console.log('[Seed] Đang nhập Themes...');
    if (dbData.collections?.themes) {
      await Theme.insertMany(dbData.collections.themes);
      console.log(`✓ Đã nạp ${dbData.collections.themes.length} chủ đề!`);
    }

    console.log('[Seed] Đang nhập Hình phạt...');
    if (dbData.collections?.punishments) {
      await Punishment.insertMany(dbData.collections.punishments);
      console.log(`✓ Đã nạp ${dbData.collections.punishments.length} hình phạt!`);
    }

    console.log('[Seed] Đang nhập Phòng mẫu...');
    if (dbData.collections?.rooms) {
      await Room.insertMany(dbData.collections.rooms);
      console.log(`✓ Đã nạp ${dbData.collections.rooms.length} phòng mẫu!`);
    }

    console.log('[Seed] Đang nhập Gallery Albums...');
    if (dbData.collections?.gallery_albums) {
      await GalleryAlbum.insertMany(dbData.collections.gallery_albums);
      console.log(`✓ Đã nạp ${dbData.collections.gallery_albums.length} albums kỷ niệm!`);
    }

    console.log('\n🎉 [HOÀN TẤT] Toàn bộ dữ liệu từ mongo_database_temp.json đã được nạp thành công vào MongoDB!');
    process.exit(0);
  } catch (error) {
    console.error('❌ [Lỗi Seed]:', error.message);
    process.exit(1);
  }
};

seedDatabase();
