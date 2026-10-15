# 🎯 SNAPDECK AI Prompt Guide

Tài liệu hướng dẫn điều chỉnh và tùy biến Prompt chấm điểm AI cho hệ thống SNAPDECK.

---

## 📁 Vị Trí File
- Code cấu hình Prompt: `server/src/prompts/geminiChallengePrompt.js`
- Controller tích hợp: `server/src/controllers/aiController.js`

---

## 🧠 Cấu Trúc Prompt
Hệ thống sử dụng mô hình **Multimodal Vision (Gemini 2.5 Flash / Gemini 1.5 Flash)** nhận diện 2 thành phần:
1. **Hình ảnh (Image Base64/Buffer):** Bức ảnh chụp hoặc tải lên từ người chơi.
2. **Text Prompt:** 
   - **System Instruction:** Định vị vai trò *Trọng tài ảo SNAPDECK* (vui tính, công bằng, ngôn phong tiệc tùng).
   - **Thử thách cụ thể:** Tên thẻ bài, nội dung nhiệm vụ, chủ đề, độ khó, điểm XP gốc.
   - **JSON Schema:** Buộc Gemini trả về JSON chuẩn để Backend parse tự động.

---

## 📊 Cấu Trúc Dữ Liệu Trả Về (JSON Output)

```json
{
  "passed": true,
  "verdict": "HOÀN THÀNH XUẤT SẮC",
  "score": 85,
  "scoreBreakdown": {
    "basePoints": 20,
    "photoBonus": 12,
    "creativityBonus": 13,
    "total": 45
  },
  "feedback": "Thần thái rất chuẩn người mẫu bàn ăn! Phụ kiện kính râm kết hợp ly nước rất nghệ thuật.",
  "detectedElements": [
    "1 người đang tạo dáng",
    "kính râm thời trang",
    "ly nước trên bàn"
  ],
  "confidence": 0.95
}
```

---

## 🛠️ Cách Tùy Biến
- **Muốn AI chấm khắt khe hơn:** Thay đổi phần tiêu chí trong `SNAPDECK_SYSTEM_INSTRUCTION` (ví dụ: "yêu cầu bắt buộc phải thấy rõ mặt...").
- **Muốn AI nói chuyện hài hước hơn:** Thêm vào System Instruction: *"Sử dụng các từ ngữ thịnh hành của giới trẻ (slang, chill, out trình, cháy quá,...)"*.
- **Muốn cộng điểm đặc biệt:** Điều chỉnh logic tính `creativityBonus` trong prompt.
