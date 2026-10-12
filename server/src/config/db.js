import mongoose from 'mongoose';

export const connectDB = async () => {
  try {
    const conn = await mongoose.connect(process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/photo_challenge_db');
    console.log(`[MongoDB] Đã kết nối thành công tới máy chủ: ${conn.connection.host}`);
  } catch (error) {
    console.error(`[MongoDB] Lỗi kết nối cơ sở dữ liệu: ${error.message}`);
    console.log('[MongoDB] Gợi ý: Hãy đảm bảo dịch vụ MongoDB (mongod / MongoDB Compass / Docker) đang chạy!');
  }
};
