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
MONGODB_URI=mongodb://127.0.0.1:27017/photo_challenge_db?replicaSet=rs0
CLIENT_URL=http://localhost:5173
```

### 3. Nhập dữ liệu ban đầu từ file `snapdeck_seed_data.json` vào MongoDB:
Chỉ cần chạy lệnh seed sau khi máy bạn đã bật MongoDB:
```bash
npm run seed
```
> Lệnh này sẽ tự động đọc file `snapdeck_seed_data.json` ở thư mục gốc và nạp 24 thẻ bài SNAPDECK, 6 themes, 96 nhiệm vụ thử thách, 6 hình phạt và albums mẫu vào MongoDB!

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
| **GET** | `/api/cards/:code` | Lấy chi tiết thẻ bài qua mã QR (VD: `SD-CARD-001` hoặc `PC-CARD-001`) |
| **GET** | `/api/missions/qr/:qrKey` | Tải nhiệm vụ tương ứng với mã QR lá bài |
| **POST** | `/api/cards` | Thêm thẻ bài mới (Admin) |
| **GET** | `/api/themes` | Lấy danh sách 4 chủ đề |
| **GET** | `/api/punishments` | Lấy danh sách các hình phạt |
| **POST** | `/api/rooms` | Tạo phòng chơi mới (Host) |
| **GET** | `/api/rooms/:roomCode` | Lấy thông tin phòng qua mã phòng |
| **POST** | `/api/rooms/:roomCode/join` | Tham gia phòng chơi (Player) |
| **GET** | `/api/gallery` | Lấy danh sách album ảnh kỷ niệm |
| **POST** | `/api/gallery/photo` | Lưu ảnh chụp ván chơi vào album |
| **POST** | `/api/ai/verify` | Gửi ảnh lên chấm điểm AI |

## 🎮 Luồng chơi và dữ liệu

Phòng hỗ trợ xác thực nhóm hoặc AI. AI cần `GEMINI_API_KEY` trong cấu hình server; lỗi kết nối/timeout được trả về dưới dạng lỗi kỹ thuật, không tự duyệt hoặc từ chối lượt. Kết quả AI được lưu theo submission để yêu cầu gửi lại không gọi Gemini hay cộng XP thêm lần nữa.

| Phương thức | Endpoint | Mô tả |
| :--- | :--- | :--- |
| **POST** | `/api/rooms/:roomCode/start` | Host bắt đầu phòng đang chờ |
| **POST** | `/api/rooms/:roomCode/submissions` | Gửi thử thách và ảnh bằng chứng |
| **GET** | `/api/rooms/:roomCode/submissions?playerId=...` | Đồng bộ lượt gửi và trạng thái phiếu |
| **POST** | `/api/rooms/submissions/:submissionId/votes` | Gửi một đánh giá số (`{ "playerId": "...", "score": 0..100 }`) cho mỗi người trên mỗi lượt gửi |
| **POST** | `/api/rooms/:roomCode/advance` | Tiến vòng sau khi không còn lượt chờ |
| **GET** | `/api/rooms/:roomCode/gallery?playerId=...` | Lấy ảnh đã được duyệt |

Tạo phòng và tham gia phòng trả về `playerToken` một lần. Các yêu cầu người chơi trên những endpoint kể trên phải gửi mã này trong header `X-Player-Token`; máy chủ chỉ lưu SHA-256 của mã và không trả hash cho client. Hãy bảo vệ dữ liệu trình duyệt nơi token được lưu. Mã phòng và player ID không tự chúng xác thực người chơi.

Máy chủ kiểm tra bằng chứng ảnh JPEG/PNG/WebP tối đa 1 MiB, lưu ảnh trong MongoDB GridFS (`challengeEvidence`), và thực thi các tùy chọn `off`, `optional`, `required`. Người gửi không thể tự đánh giá bài của mình. Mỗi phiếu nhóm là một số nguyên 0–100; điểm nhóm cuối là trung bình các phiếu hợp lệ. Phiếu từ 50 trở lên được tính là phiếu thuận trong điều kiện duyệt hiện có là `ceil(số người đủ điều kiện * 2 / 3)` phiếu thuận. Điểm đánh giá nhóm không thay đổi XP: khi được duyệt, điểm XP vẫn do máy chủ tính (100 điểm cơ bản và thêm 20 điểm ảnh nếu bật thưởng, có ảnh, và ảnh bằng chứng không bị tắt). Không nhận tổng điểm hoặc trạng thái duyệt từ client.

Các submission cũ có `votes[].approve` vẫn đọc được: `true` tương ứng điểm 100, `false` tương ứng điểm 0 khi tính điểm nhóm trung bình. Thay đổi này không yêu cầu migration dữ liệu.

Việc đồng bộ phiếu, trạng thái lượt gửi và điểm dùng MongoDB transactions. Cần MongoDB Atlas hoặc MongoDB chạy dưới dạng replica set; MongoDB standalone không hỗ trợ transactions. URI local ở trên yêu cầu khởi chạy replica set `rs0` và khởi tạo nó một lần bằng `rs.initiate()`. Ảnh bằng chứng sử dụng GridFS trên cùng cơ sở dữ liệu.

Thiết lập `CLIENT_URL` thành origin frontend được phép; có thể khai báo nhiều origin, phân tách bằng dấu phẩy. Ví dụ: `CLIENT_URL=https://example.com,http://localhost:5173`.
Trên frontend production, đặt `VITE_API_BASE_URL` thành URL gốc của backend trước khi build.
