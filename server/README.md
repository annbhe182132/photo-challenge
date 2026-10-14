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

Ván chơi hiện chỉ hỗ trợ xác thực nhóm. AI verification chưa có dịch vụ phân tích ảnh thật; `POST /api/ai/verify` trả về `503`, còn tạo/bắt đầu phòng với `verificationMethod: "ai"` bị từ chối. Các tham số AI trong trang quản trị chỉ là giao diện minh họa, không tác động đến ván chơi.

| Phương thức | Endpoint | Mô tả |
| :--- | :--- | :--- |
| **POST** | `/api/rooms/:roomCode/start` | Host bắt đầu phòng đang chờ |
| **POST** | `/api/rooms/:roomCode/submissions` | Gửi thử thách và ảnh bằng chứng |
| **GET** | `/api/rooms/:roomCode/submissions?playerId=...` | Đồng bộ lượt gửi và trạng thái phiếu |
| **POST** | `/api/rooms/submissions/:submissionId/votes` | Bỏ phiếu một lần cho lượt gửi |
| **POST** | `/api/rooms/:roomCode/advance` | Tiến vòng sau khi không còn lượt chờ |
| **GET** | `/api/rooms/:roomCode/gallery?playerId=...` | Lấy ảnh đã được duyệt |

Tạo phòng và tham gia phòng trả về `playerToken` một lần. Các yêu cầu người chơi trên những endpoint kể trên phải gửi mã này trong header `X-Player-Token`; máy chủ chỉ lưu SHA-256 của mã và không trả hash cho client. Hãy bảo vệ dữ liệu trình duyệt nơi token được lưu. Mã phòng và player ID không tự chúng xác thực người chơi.

Máy chủ kiểm tra bằng chứng ảnh JPEG/PNG/WebP tối đa 1 MiB, lưu ảnh trong MongoDB GridFS (`challengeEvidence`), và thực thi các tùy chọn `off`, `optional`, `required`. Phiếu nhóm loại người gửi khỏi danh sách người bỏ phiếu; cần `ceil(số người đủ điều kiện * 2 / 3)` phiếu thuận để duyệt. Điểm do máy chủ tính sau khi duyệt: 100 điểm cơ bản và thêm 20 điểm ảnh nếu bật thưởng, ảnh tồn tại, và ảnh bằng chứng không bị tắt. Không nhận tổng điểm hoặc trạng thái duyệt từ client.

Việc đồng bộ phiếu, trạng thái lượt gửi và điểm dùng MongoDB transactions. Cần MongoDB Atlas hoặc MongoDB chạy dưới dạng replica set; MongoDB standalone không hỗ trợ transactions. URI local ở trên yêu cầu khởi chạy replica set `rs0` và khởi tạo nó một lần bằng `rs.initiate()`. Ảnh bằng chứng sử dụng GridFS trên cùng cơ sở dữ liệu.

Thiết lập `CLIENT_URL` thành origin frontend được phép; có thể khai báo nhiều origin, phân tách bằng dấu phẩy. Ví dụ: `CLIENT_URL=https://example.com,http://localhost:5173`.
Trên frontend production, đặt `VITE_API_BASE_URL` thành URL gốc của backend trước khi build.
