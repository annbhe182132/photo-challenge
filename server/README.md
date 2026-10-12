# Photo Challenge - Backend Server (Node.js & MongoDB)

Hệ thống máy chủ Backend xử lý dữ liệu ván chơi, thẻ bài, phòng chơi và kết nối MongoDB cho dự án **Photo Challenge**.

## 🚀 Hướng Dẫn Cài Đặt & Khởi Chạy

### 1. Cài đặt thư viện dependencies:
```bash
cd server
npm install
```

### 2. Cấu hình biến môi trường:
Tạo hoặc kiểm tra file `.env` (mặc định đã có sẵn):
```env
PORT=5000
MONGODB_URI=mongodb://127.0.0.1:27017/photo_challenge_db
CLIENT_URL=http://localhost:5173
```

### 3. Nhập dữ liệu ban đầu từ file `mongo_database_temp.json` vào MongoDB:
Chỉ cần chạy lệnh seed sau khi máy bạn đã bật MongoDB:
```bash
npm run seed
```
> Lệnh này sẽ tự động đọc file `mongo_database_temp.json` ở thư mục gốc và nạp 24 thẻ bài, 4 themes, 6 hình phạt, phòng mẫu và album vào MongoDB!

### 4. Khởi chạy máy chủ:
```bash
# Chế độ phát triển (tự reload khi sửa code)
npm run dev

# Hoặc chế độ chạy thông thường
npm start
```
Truy cập kiểm tra trạng thái tại: `http://localhost:5000/api/health`

## 📡 Danh Sách API Endpoints

| Phương thức | Endpoint | Mô tả |
| :--- | :--- | :--- |
| **GET** | `/api/cards` | Lấy danh sách toàn bộ 24 thẻ bài vật lý |
| **GET** | `/api/cards/:code` | Lấy chi tiết thẻ bài qua mã QR (VD: `PC-CARD-001`) |
| **POST** | `/api/cards` | Thêm thẻ bài mới (Admin) |
| **GET** | `/api/themes` | Lấy danh sách 4 chủ đề |
| **GET** | `/api/punishments` | Lấy danh sách các hình phạt |
| **POST** | `/api/rooms` | Tạo phòng chơi mới (Host) |
| **GET** | `/api/rooms/:roomCode` | Lấy thông tin phòng qua mã phòng |
| **POST** | `/api/rooms/:roomCode/join` | Tham gia phòng chơi (Player) |
| **GET** | `/api/gallery` | Lấy danh sách album ảnh kỷ niệm |
| **POST** | `/api/gallery/photo` | Lưu ảnh chụp ván chơi vào album |
| **POST** | `/api/ai/verify` | Gửi ảnh lên chấm điểm AI |
