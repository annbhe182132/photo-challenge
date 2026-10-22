# Photo Challenge – cập nhật multi-device, AI và Gallery

Bản này được chỉnh sửa local từ ZIP người dùng cung cấp. Không có thay đổi nào được đẩy lên GitHub.

## 1. Multi-device
- Máy chủ là nguồn trạng thái cho lượt chơi: người chơi hiện tại, vòng/lượt, thời gian bắt đầu, deadline và lịch sử lượt.
- Khi host bắt đầu phòng, thiết bị đang ở phòng chờ tự chuyển: người có lượt sang quét QR; các người còn lại sang màn hình chờ.
- Người không có lượt thấy tên người đang chơi, đồng hồ/dữ liệu thời gian đồng bộ và trạng thái chờ; không cần bấm nút phụ để tiếp tục luồng.
- Người chơi được đưa vào màn hình đánh giá nhóm khi có submission đang chờ và họ là người được quyền đánh giá.
- Deadline do server cấp và truyền `serverNow` để tính bù lệch đồng hồ thiết bị. Lượt mới chưa đếm giờ cho đến khi camera của người có lượt có video live.
- Khi submission được nhận, deadline của lượt được xóa để thời gian không tiếp tục chạy trong lúc xác thực.

## 2. AI và ảnh bằng chứng
- Cho phép chọn `ai` khi tạo phòng và bắt đầu phòng; vẫn giữ controller Gemini hiện có.
- AI yêu cầu ảnh bằng chứng ở cả frontend và backend; nút “Tiếp tục không ảnh” chỉ xuất hiện ở chế độ xác thực nhóm.
- Đã bỏ cấu hình `photoEvidence` (off/optional/required) khỏi frontend và backend. Dữ liệu ảnh bằng chứng vẫn được giữ vì AI cần ảnh để phân tích.
- Cần cấu hình `GEMINI_API_KEY` trên backend deploy; bản code không chứa API key.

## 3. Gallery cá nhân
- Khi ván kết thúc, người chơi được hỏi muốn lưu album vào tài khoản hay chỉ tải album về thiết bị.
- Thêm đăng ký/đăng nhập tài khoản và API album cá nhân trong MongoDB; ảnh trong album tài khoản được lưu bằng GridFS với metadata tài khoản.
- Chọn “Chỉ lưu thiết bị” tải file HTML tự chứa ảnh, không tạo album cá nhân mới trong database.
- Gallery đọc được album tài khoản và album/ván chơi hiện có. Đã bổ sung đường tải ảnh file thực tế và liên kết mở ảnh trong giao diện.

## Kiểm tra thực hiện trong môi trường tạo ZIP
- `node --check` trên các file JavaScript trong server/test: đạt.
- `node --test server/test/gameRules.test.js`: 16/16 bài đạt.
- Phân tích cú pháp 30 file frontend TS/TSX bằng TypeScript compiler API: 0 syntax diagnostics.
- `npm run build` frontend chưa hoàn tất vì dependencies trong môi trường không đầy đủ (`vite/client` và `@types/node` không có); registry npm không truy cập được trong phiên này.
- `node --test server/test/*.test.js`: 16/17 bài qua; `aiPrompt.test.js` không khởi chạy vì package `mongoose` chưa được cài trong môi trường. Đây là thiếu dependencies của môi trường test, không phải kết quả test assertion thất bại.
- Chưa có kiểm thử end-to-end trên hai thiết bị thật trong trình duyệt.

## Cách chạy thử trên máy của bạn
1. Giải nén gói và cài dependencies trong `frontend` và `server` bằng `npm ci`.
2. Cấu hình `server/.env` với `MONGODB_URI`, `GEMINI_API_KEY`, `CLIENT_URL` phù hợp. Không đưa file `.env` lên Git.
3. Chạy frontend và backend; mở cùng một phòng trên ít nhất hai thiết bị/trình duyệt.
4. Thử: host bắt đầu → player có lượt mở camera → player gửi ảnh → AI tự phân tích hoặc các người chơi khác bỏ phiếu → backend chuyển lượt → kết thúc ván → chọn lưu tài khoản hoặc tải local.
