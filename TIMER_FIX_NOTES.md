# Photo Challenge — bản sửa đồng hồ và chuyển lượt

## Đã sửa
- Đồng hồ lượt không chạy khi vừa bấm bắt đầu phòng hoặc lúc đang đọc hướng dẫn thử thách.
- Chế độ một thiết bị: đồng hồ bắt đầu sau khi CameraPage xác nhận video có hình ảnh trực tiếp và track camera đang hoạt động.
- Chế độ nhiều thiết bị: sau khi video trực tiếp sẵn sàng, frontend gọi `POST /api/rooms/:roomCode/start-turn`; backend chỉ đặt thời điểm bắt đầu một lần và đồng bộ deadline cho cả phòng.
- Khi lượt trước kết thúc, lượt kế tiếp có `turnStartedAt = null` và `turnDeadline = null`; đồng hồ chờ người chơi tiếp theo bật camera.
- Sửa lỗi không chuyển được lượt đầu tiên khi `gameStatus` còn là `waiting` nhưng lượt đã có kết quả hợp lệ (ví dụ người chơi tải ảnh lên hoặc tiếp tục không ảnh). Quyết định chuyển lượt dựa vào kết quả lượt đã duyệt/thất bại hoặc trạng thái hết giờ/bỏ lượt, không chỉ dựa vào cờ UI.
- Nếu `gameStatus` đang chờ nhưng còn timestamp cũ trong localStorage, khi bật camera cho lượt mới hệ thống sẽ khởi tạo lại đồng hồ; khi lượt đang active thì mở lại camera không reset thời gian.

## Áp dụng patch
Giải nén `photo-challenge-turn-transition-fix.zip` vào thư mục gốc dự án đang có (nơi chứa `frontend/` và `server/`) và cho phép ghi đè các tệp. Patch không chứa `.git`, `.env` riêng hoặc `node_modules`.

## Kiểm tra
- Backend: `node --test` đạt 18/18 bài test.
- Frontend: đã kiểm tra cú pháp TypeScript/TSX sau khi sửa. Chưa chạy được build production hoàn chỉnh trong môi trường này vì cài dependencies từ npm bị time out.
- `frontend/dist` là thư mục build sinh tự động và đã được bỏ khỏi gói full-source mới để tránh dùng nhầm bundle cũ. Sau khi cài dependencies, chạy `npm run build` trong `frontend/` để tạo lại.

## Lưu ý
Các thay đổi chỉ nằm trong bản local/ZIP này. Không có lệnh push, commit hoặc thao tác ghi nào lên GitHub.
