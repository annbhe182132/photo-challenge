# SNAPDECK — Phygital AI Board Game Platform (Formerly Photo Challenge)

Hệ thống trò chơi kết hợp giữa **Bộ bài vật lý 24 lá (Physical)** và **Ứng dụng Web nhận diện AI (Digital)**.

---

## 📁 Cấu Trúc Dự Án (Architecture)

```text
photo-challenge/
├── frontend/                  # [FRONTEND] Giao diện người dùng WebApp (React 19 + Tailwind v4 + Vite)
│   ├── src/
│   │   ├── pages/             # 10 màn hình (Home, Lobby, Scan, Challenge, Camera, Verify, Result, Leaderboard, Gallery, Admin)
│   │   ├── context/           # GameContext lưu trạng thái ván chơi
│   │   ├── data/              # 24 lá bài vật lý, 4 themes, 6 hình phạt
│   │   ├── utils/             # Web Audio API Synthesizer (soundEngine)
│   │   └── routes/            # AppRouter
│   └── package.json
│
├── server/                    # [BACKEND] Máy chủ API & Kết nối MongoDB (Node.js + Express + Mongoose)
│   ├── src/
│   │   ├── config/            # Kết nối Mongoose (db.js)
│   │   ├── models/            # Schema: Card, Theme, Punishment, Room, Gallery, Player
│   │   ├── controllers/       # Xử lý logic API
│   │   ├── routes/            # Routes: /api/cards, /api/rooms, /api/gallery, /api/ai, ...
│   │   └── scripts/seed.js    # Script tự động nạp dữ liệu từ file JSON vào MongoDB
│   ├── .env.example
│   └── package.json
│
├── mongo_database_temp.json   # [DATABASE TẠM THỜI] Dữ liệu khởi tạo (Cards, Themes, Punishments, Rooms, Albums) để nhúng vào MongoDB
└── README.md
```

---

## 📱 Tối Ưu Màn Hình Điện Thoại (Mobile First)

Frontend đã được tối ưu hóa đặc biệt cho các smartphone hiện đại (iPhone 13, 14, 15, 16 Pro Max, Android):
* Hỗ trợ chuẩn **Safe Area Insets** (`env(safe-area-inset-top)`, `env(safe-area-inset-bottom)`) cho cụm Notch tai thỏ và Dynamic Island.
* Bố cục co giãn linh hoạt (Responsive Grid): từ màn hình hẹp 375px–390px của điện thoại đến màn hình rộng Desktop/Laptop.
* Touch targets, font chữ và các thanh đếm giờ được tự động căn chỉnh để không bị tràn màn hình ngang.

---

## 🚀 Hướng Dẫn Cài Đặt & Chạy

### 1. Chạy Frontend:
```bash
cd frontend
npm install   # nếu cần
npm run dev
```
Ứng dụng chạy tại: `http://localhost:5173`

### 2. Chạy Backend Server:
```bash
cd server
npm install
npm run dev
```
API Server chạy tại: `http://localhost:5000` (Kiểm tra trạng thái: `http://localhost:5000/api/health`)

### 3. Nhập dữ liệu từ file `mongo_database_temp.json` vào MongoDB:
Khi đã bật dịch vụ MongoDB (qua MongoDB Compass, Docker hoặc service nội bộ):
```bash
cd server
npm run seed
```
> Lệnh này sẽ tự động đọc file `mongo_database_temp.json` ở thư mục gốc và nạp toàn bộ 24 thẻ bài, 4 chủ đề, 6 hình phạt và các album mẫu vào MongoDB.
