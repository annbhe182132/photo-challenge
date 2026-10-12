import mongoose from 'mongoose';
import dotenv from 'dotenv';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { Card } from '../models/Card.js';
import { Theme } from '../models/Theme.js';
import { Mission } from '../models/Mission.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

async function seed() {
  const uri = process.env.MONGODB_URI;
  if (!uri) throw new Error('Thiếu MONGODB_URI trong server/.env');
  const dataPath = path.resolve(__dirname, '../../../photo_challenge_data_v2.json');
  if (!fs.existsSync(dataPath)) throw new Error(`Không tìm thấy file dữ liệu: ${dataPath}`);
  const data = JSON.parse(fs.readFileSync(dataPath, 'utf8'));

  await mongoose.connect(uri);
  try {
    // Upsert theo mã ổn định; không xóa collection và không đụng tới rooms/gallery.
    for (const theme of data.themes) {
      await Theme.updateOne({ id: theme.id }, { $set: {
        id: theme.id, name: theme.nameVi, icon: theme.icon,
        description: theme.description, color: theme.color
      } }, { upsert: true, runValidators: true });
    }
    for (const card of data.cards) {
      await Card.updateOne({ code: card.code }, { $set: {
        code: card.code, qrKey: card.qrKey, themeId: card.themeId,
        title: card.title, mission: card.mission, difficulty: card.difficulty,
        xp: card.xp, mediaType: card.mediaType, missionCount: card.missionCount,
        isActive: card.isActive
      } }, { upsert: true, runValidators: true });
    }
    for (const mission of data.missions) {
      await Mission.updateOne({ missionCode: mission.missionCode }, { $set: mission }, { upsert: true, runValidators: true });
    }
    console.log(`Seed hoàn tất: ${data.themes.length} chủ đề, ${data.cards.length} lá bài, ${data.missions.length} nhiệm vụ.`);
  } finally {
    await mongoose.disconnect();
  }
}
seed().catch(error => { console.error('Seed thất bại:', error.message); process.exitCode = 1; });
