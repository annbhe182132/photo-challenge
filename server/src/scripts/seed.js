import mongoose from 'mongoose';
import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

import { Card } from '../models/Card.js';
import { Theme } from '../models/Theme.js';
import { Mission } from '../models/Mission.js';
import { Punishment } from '../models/Punishment.js';
import { Player } from '../models/Player.js';
import { GalleryAlbum } from '../models/Gallery.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.resolve(__dirname, '../../.env') });

const seedDatabase = async () => {
  const mongoUri = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/photo_challenge_db';

  try {
    console.log('[SNAPDECK Seed] Đang kết nối tới MongoDB:', mongoUri);
    await mongoose.connect(mongoUri);
    console.log('[SNAPDECK Seed] Kết nối thành công!');

    // Đọc file dữ liệu khởi tạo thống nhất snapdeck_seed_data.json ở thư mục gốc
    const jsonPath = path.resolve(__dirname, '../../../snapdeck_seed_data.json');
    if (!fs.existsSync(jsonPath)) {
      throw new Error(`Không tìm thấy file seed thống nhất tại: ${jsonPath}`);
    }

    const rawData = fs.readFileSync(jsonPath, 'utf-8');
    const dbData = JSON.parse(rawData);

    console.log('[SNAPDECK Seed] Đang làm sạch và đồng bộ các collections...');
    await Promise.all([
      Card.deleteMany({}),
      Theme.deleteMany({}),
      Mission.deleteMany({}),
      Punishment.deleteMany({}),
      Player.deleteMany({}),
      GalleryAlbum.deleteMany({}),
    ]);

    // 1. Themes (6 chủ đề chuẩn)
    if (Array.isArray(dbData.themes) && dbData.themes.length > 0) {
      await Theme.insertMany(dbData.themes);
      console.log(`✓ Đã nạp ${dbData.themes.length} chủ đề chuẩn!`);
    }

    // 2. Cards (24 thẻ bài SD-CARD)
    if (Array.isArray(dbData.cards) && dbData.cards.length > 0) {
      await Card.insertMany(dbData.cards);
      console.log(`✓ Đã nạp ${dbData.cards.length} thẻ bài vật lý SNAPDECK!`);
    }

    // 3. Missions (96 nhiệm vụ biến thể)
    if (Array.isArray(dbData.missions) && dbData.missions.length > 0) {
      await Mission.insertMany(dbData.missions);
      console.log(`✓ Đã nạp ${dbData.missions.length} nhiệm vụ AI tương ứng!`);
    }

    // 4. Punishments (6 hình phạt vòng quay)
    if (Array.isArray(dbData.punishments) && dbData.punishments.length > 0) {
      await Punishment.insertMany(dbData.punishments);
      console.log(`✓ Đã nạp ${dbData.punishments.length} hình phạt Vòng Quay Phạt!`);
    }

    // 5. Players (4 người chơi MVP mẫu)
    if (Array.isArray(dbData.players) && dbData.players.length > 0) {
      await Player.insertMany(dbData.players);
      console.log(`✓ Đã nạp ${dbData.players.length} người chơi mẫu cho bảng xếp hạng!`);
    }

    // 6. Gallery Albums (2 albums mẫu)
    if (Array.isArray(dbData.gallery_albums) && dbData.gallery_albums.length > 0) {
      await GalleryAlbum.insertMany(dbData.gallery_albums);
      console.log(`✓ Đã nạp ${dbData.gallery_albums.length} albums kỷ niệm mẫu!`);
    }

    console.log('\n🎉 [HOÀN TẤT] Toàn bộ cơ sở dữ liệu SNAPDECK đã được đồng bộ và nạp thành công!');
    process.exit(0);
  } catch (error) {
    console.error('❌ [Lỗi Seed]:', error.message);
    process.exit(1);
  }
};

seedDatabase();
