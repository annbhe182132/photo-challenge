import mongoose from 'mongoose';

let isConnecting = false;

export const isDBConnected = () => mongoose.connection.readyState === 1;

export const connectDB = async () => {
  if (isDBConnected() || isConnecting) return;
  isConnecting = true;
  try {
    const mongoUri = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/photo_challenge_db';
    const conn = await mongoose.connect(mongoUri, {
      serverSelectionTimeoutMS: 5000,
      connectTimeoutMS: 5000,
    });
    console.log(`[MongoDB] Đã kết nối thành công tới máy chủ: ${conn.connection.host}`);
  } catch (error) {
    console.error(`[MongoDB] Lỗi kết nối cơ sở dữ liệu: ${error.message}`);
    console.log('[MongoDB] Gợi ý: Hãy đảm bảo dịch vụ MongoDB (mongod / MongoDB Compass / Docker) đang chạy!');
    // Thử kết nối lại sau 5 giây nếu thất bại
    setTimeout(() => {
      isConnecting = false;
      connectDB().catch(() => {});
    }, 5000);
  } finally {
    isConnecting = false;
  }
};

mongoose.connection.on('disconnected', () => {
  console.warn('[MongoDB] Kết nối cơ sở dữ liệu bị ngắt. Đang tự động kết nối lại...');
  setTimeout(() => {
    connectDB().catch(() => {});
  }, 5000);
});

mongoose.connection.on('error', (err) => {
  console.error('[MongoDB] Lỗi trong quá trình kết nối:', err.message);
});

