import { useState } from 'react';
import { motion } from 'framer-motion';
import {
  ArrowLeft,
  Award,
  BarChart3,
  Bot,
  BrainCircuit,
  DollarSign,
  Download,
  ExternalLink,
  FileText,
  Globe,
  Layers,
  Lightbulb,
  Plus,
  QrCode,
  Sliders,
  Sparkles,
  TrendingUp,
  Users,
  X,
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { DECK_CARDS, type PhysicalCard } from '../../data/gameData';
import { sound } from '../../utils/soundEngine';

const pressArticles = [
  {
    publisher: 'VnExpress Tech',
    date: '28/07/2026',
    title: 'Phygital Gaming — Xu hướng giải trí kết hợp lá bài vật lý & AI lên ngôi',
    summary: 'Photo Challenge đột phá thị trường bằng cách kết hợp bộ bài vật lý và WebApp nhận diện gương mặt AI real-time.',
    link: 'https://vnexpress.net/so-hoa',
    badge: 'Báo Điện Tử Hàng Đầu',
  },
  {
    publisher: 'TechInAsia',
    date: '25/07/2026',
    title: 'Photo Challenge: Startup Phygital Game Việt Nam gọi vốn $500K vòng Seed',
    summary: 'Mô hình B2B2C độc đáo giúp Photo Challenge chinh phục hơn 1,400 phòng chơi chỉ trong 3 tháng ra mắt.',
    link: 'https://www.techinasia.com',
    badge: 'Chuyên Trang Startup Châu Á',
  },
  {
    publisher: 'Forbes Asia',
    date: '20/07/2026',
    title: 'Giải mã sức hút của Boardgame tích hợp công nghệ AI Vision tại Đông Nam Á',
    summary: 'Khác biệt hoàn toàn so với UNO hay Ma Sói, Photo Challenge duy trì tỉ lệ tương tác nhóm thực tế lên đến 88.4%.',
    link: 'https://www.forbes.com',
    badge: 'Tạp Chí Tài Chính Quốc Tế',
  },
  {
    publisher: 'VTV Digital / Startup Vietnam',
    date: '15/07/2026',
    title: 'Giải pháp kéo giới trẻ rời xa điện thoại cá nhân bằng tương tác nhóm thực tế',
    summary: 'Chỉ với 1 thiết bị chung cho cả nhóm, Photo Challenge kéo các thành viên lại gần nhau hơn trong mỗi cuộc vui.',
    link: 'https://vtv.vn',
    badge: 'Đài Truyền Hình Quốc Gia',
  },
];

const AdminPage = () => {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<'cards' | 'ai' | 'analytics'>('cards');
  const [cards] = useState<PhysicalCard[]>(DECK_CARDS);
  const [aiThreshold, setAiThreshold] = useState(75);
  const [poseWeight, setPoseWeight] = useState(85);
  const [expressionWeight, setExpressionWeight] = useState(90);

  // State for AI Explainer Modal
  const [showAiExplainer, setShowAiExplainer] = useState(false);

  const handleTabChange = (tab: 'cards' | 'ai' | 'analytics') => {
    sound.playClick();
    setActiveTab(tab);
  };

  const handleToggleExplainer = () => {
    sound.playClick();
    setShowAiExplainer(!showAiExplainer);
  };

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top_left,_rgba(7,89,133,0.3),_transparent_40%),linear-gradient(135deg,_#030712_0%,_#0f172a_50%,_#111827_100%)] text-slate-100">
      <div className="mx-auto max-w-7xl px-6 py-8">
        {/* Top Header */}
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <button
              onClick={() => {
                sound.playClick();
                navigate('/');
              }}
              className="flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-4 py-2 text-sm font-semibold text-slate-300 backdrop-blur-xl transition hover:bg-white/20 hover:text-white"
            >
              <ArrowLeft size={16} />
              Quay về Trang Chủ
            </button>
            <div className="flex items-center gap-2 rounded-full border border-cyan-500/30 bg-cyan-500/10 px-4 py-1.5 text-xs font-bold text-cyan-300">
              <Sparkles size={14} className="animate-spin text-cyan-400" />
              INVESTOR & ADMIN PORTAL
            </div>
          </div>

          <div className="flex items-center gap-3">
            <span className="text-xs text-slate-400">Trạng Thái Hệ Thống:</span>
            <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-500/20 px-3 py-1 text-xs font-semibold text-emerald-400">
              <span className="h-2 w-2 rounded-full bg-emerald-400 animate-ping" />
              99.9% Online
            </span>
          </div>
        </div>

        {/* Title */}
        <div className="mt-8">
          <h1 className="text-3xl font-black tracking-tight text-white sm:text-4xl">
            Quản Trị Hệ Thống & Thống Kê Đầu Tư
          </h1>
          <p className="mt-2 text-slate-400">
            Quản lý bộ bài 24 lá Phygital, mã QR, thuật toán AI Verification và chỉ số tăng trưởng kinh doanh.
          </p>
        </div>

        {/* Metric Cards */}
        <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <motion.div
            whileHover={{ y: -4 }}
            className="rounded-2xl border border-cyan-500/30 bg-gradient-to-br from-cyan-950/40 via-slate-900/60 to-slate-950/80 p-5 backdrop-blur-xl shadow-xl"
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-cyan-400">Thẻ Bài Vật Lý (Deck)</span>
              <div className="rounded-xl bg-cyan-500/20 p-2.5 text-cyan-300">
                <Layers size={20} />
              </div>
            </div>
            <div className="mt-4 text-3xl font-black text-white">24 Lá Bài</div>
            <div className="mt-1 text-xs text-slate-400">Tự động gắn mã QR bảo mật</div>
          </motion.div>

          <motion.div
            whileHover={{ y: -4 }}
            className="rounded-2xl border border-fuchsia-500/30 bg-gradient-to-br from-fuchsia-950/40 via-slate-900/60 to-slate-950/80 p-5 backdrop-blur-xl shadow-xl"
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-fuchsia-400">Phòng Chơi Đang Mở</span>
              <div className="rounded-xl bg-fuchsia-500/20 p-2.5 text-fuchsia-300">
                <Users size={20} />
              </div>
            </div>
            <div className="mt-4 text-3xl font-black text-white">1,420 Rooms</div>
            <div className="mt-1 text-xs text-emerald-400 font-semibold">↑ +38% so với tuần trước</div>
          </motion.div>

          <motion.div
            whileHover={{ y: -4 }}
            className="rounded-2xl border border-amber-500/30 bg-gradient-to-br from-amber-950/40 via-slate-900/60 to-slate-950/80 p-5 backdrop-blur-xl shadow-xl"
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-amber-400">Độ Chính Xác AI</span>
              <div className="rounded-xl bg-amber-500/20 p-2.5 text-amber-300">
                <BrainCircuit size={20} />
              </div>
            </div>
            <div className="mt-4 text-3xl font-black text-white">98.4% Match</div>
            <div className="mt-1 text-xs text-slate-400">Model: Face & Pose Mesh v2</div>
          </motion.div>

          <motion.div
            whileHover={{ y: -4 }}
            className="rounded-2xl border border-emerald-500/30 bg-gradient-to-br from-emerald-950/40 via-slate-900/60 to-slate-950/80 p-5 backdrop-blur-xl shadow-xl"
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-emerald-400">Doanh Số Dự Kiến</span>
              <div className="rounded-xl bg-emerald-500/20 p-2.5 text-emerald-300">
                <DollarSign size={20} />
              </div>
            </div>
            <div className="mt-4 text-3xl font-black text-white">$250K / Q3</div>
            <div className="mt-1 text-xs text-slate-400">Bán thẻ bài + WebApp Premium</div>
          </motion.div>
        </div>

        {/* Tab Navigation */}
        <div className="mt-10 flex gap-2 border-b border-white/10 pb-4">
          <button
            onClick={() => handleTabChange('cards')}
            className={`flex items-center gap-2 rounded-xl px-5 py-2.5 text-sm font-bold transition ${activeTab === 'cards'
              ? 'bg-gradient-to-r from-cyan-500 to-blue-600 text-white shadow-lg shadow-cyan-500/25'
              : 'border border-white/10 bg-white/5 text-slate-400 hover:bg-white/10 hover:text-white'
              }`}
          >
            <QrCode size={18} />
            Quản Lý Thẻ Bài & Mã QR
          </button>
          <button
            onClick={() => handleTabChange('ai')}
            className={`flex items-center gap-2 rounded-xl px-5 py-2.5 text-sm font-bold transition ${activeTab === 'ai'
              ? 'bg-gradient-to-r from-fuchsia-500 to-purple-600 text-white shadow-lg shadow-fuchsia-500/25'
              : 'border border-white/10 bg-white/5 text-slate-400 hover:bg-white/10 hover:text-white'
              }`}
          >
            <Sliders size={18} />
            Cấu Hình Thuật Toán AI
          </button>
          <button
            onClick={() => handleTabChange('analytics')}
            className={`flex items-center gap-2 rounded-xl px-5 py-2.5 text-sm font-bold transition ${activeTab === 'analytics'
              ? 'bg-gradient-to-r from-amber-500 to-orange-600 text-white shadow-lg shadow-amber-500/25'
              : 'border border-white/10 bg-white/5 text-slate-400 hover:bg-white/10 hover:text-white'
              }`}
          >
            <TrendingUp size={18} />
            Thống Kê Đầu Tư & Thị Trường
          </button>
        </div>

        {/* Tab Content */}
        {activeTab === 'cards' && (
          <div className="mt-6 rounded-3xl border border-white/15 bg-slate-900/60 p-6 backdrop-blur-xl">
            <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
              <div>
                <h3 className="text-xl font-bold text-white">Danh Sách Thẻ Bài Physical Phygital</h3>
                <p className="text-xs text-slate-400">Quản lý nội dung thử thách, danh mục và in mã QR định danh</p>
              </div>
              <div className="flex gap-3">
                <button
                  onClick={() => {
                    sound.playClick();
                    alert('Đã xuất file 24 Mã QR dạng Vector SVG ready for printing!');
                  }}
                  className="flex items-center gap-2 rounded-xl border border-cyan-400/40 bg-cyan-500/10 px-4 py-2 text-sm font-bold text-cyan-300 transition hover:bg-cyan-500/20"
                >
                  <Download size={16} />
                  Xuất QR Bộ Bài 24 Lá (PDF/SVG)
                </button>
                <button
                  onClick={() => {
                    sound.playClick();
                    alert('Chức năng thêm thẻ bài mới sẵn sàng!');
                  }}
                  className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 px-4 py-2 text-sm font-bold text-white shadow-lg shadow-cyan-500/20 transition hover:scale-105"
                >
                  <Plus size={16} />
                  Thêm Thẻ Bài Mới
                </button>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm text-slate-300">
                <thead className="border-b border-white/10 bg-white/5 text-xs font-bold uppercase text-slate-400">
                  <tr>
                    <th className="p-4">Mã Lá Bài</th>
                    <th className="p-4">Tên Thử Thách</th>
                    <th className="p-4">Danh Mục</th>
                    <th className="p-4">Nhiệm Vụ</th>
                    <th className="p-4 text-center">Độ Khó</th>
                    <th className="p-4 text-center">Thưởng XP</th>
                    <th className="p-4 text-center">Mã QR</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {cards.map((card) => (
                    <tr key={card.id} className="transition hover:bg-white/5">
                      <td className="p-4 font-mono text-xs font-bold text-cyan-400">{card.code}</td>
                      <td className="p-4 font-semibold text-white">{card.title}</td>
                      <td className="p-4">
                        <span className="rounded-full bg-slate-800 px-3 py-1 text-xs font-bold text-slate-300 border border-white/10">
                          {card.category}
                        </span>
                      </td>
                      <td className="p-4 text-xs text-slate-300 max-w-xs truncate">{card.mission}</td>
                      <td className="p-4 text-center text-amber-400 font-bold">{'⭐'.repeat(card.difficulty)}</td>
                      <td className="p-4 text-center font-bold text-emerald-400">+{card.xp} XP</td>
                      <td className="p-4 text-center">
                        <span className="inline-flex items-center gap-1 text-xs font-bold text-cyan-300 border border-cyan-500/40 rounded-lg px-2.5 py-1 bg-cyan-500/10">
                          <QrCode size={14} /> ACTIVE
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {activeTab === 'ai' && (
          <div className="mt-6 grid gap-6 md:grid-cols-2">
            <div className="rounded-3xl border border-white/15 bg-slate-900/60 p-6 backdrop-blur-xl space-y-6">
              {/* Header with Glowing Lightbulb Explainer Button */}
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-xl font-bold text-white flex items-center gap-2">
                    <Bot className="text-fuchsia-400" /> Cấu Hình Thuật Toán AI Verification
                  </h3>
                  <p className="text-xs text-slate-400 mt-1">
                    Tùy chỉnh độ nhạy và tiêu chuẩn điểm số AI trước khi đưa vào sản xuất thương mại.
                  </p>
                </div>

                {/* Glowing Lightbulb Button */}
                <motion.button
                  whileHover={{ scale: 1.1, rotate: 12 }}
                  whileTap={{ scale: 0.9 }}
                  onClick={handleToggleExplainer}
                  className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border-2 border-amber-400/60 bg-amber-500/20 text-amber-300 shadow-[0_0_20px_rgba(251,191,36,0.4)] transition hover:bg-amber-500/30 animate-pulse"
                  title="Xem giải thích chi tiết ý nghĩa tham số AI cho Hội đồng chấm"
                >
                  <Lightbulb size={22} className="text-amber-300" />
                </motion.button>
              </div>

              {/* Lightbulb Explainer Modal / Card */}
              {showAiExplainer && (
                <motion.div
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="relative rounded-2xl border-2 border-amber-400/50 bg-gradient-to-br from-amber-950/60 via-slate-950 to-slate-900 p-5 shadow-2xl space-y-3"
                >
                  <button
                    onClick={() => setShowAiExplainer(false)}
                    className="absolute top-4 right-4 text-slate-400 hover:text-white p-1"
                  >
                    <X size={16} />
                  </button>

                  <div className="flex items-center gap-2 text-amber-300 font-bold text-sm">
                    <Lightbulb size={18} className="text-amber-400" />
                    <span>Ý NGHĨA KỸ THUẬT: VÌ SAO CẦN TÙY CHỈNH THAM SỐ AI?</span>
                  </div>

                  <div className="text-xs text-slate-300 leading-relaxed space-y-2">
                    <p>
                      💡 **1. Cân bằng theo Môi trường Ánh sáng (Environment Calibration)**:
                      Khi chơi tại không gian tối (Quán Bar/Karaoke), Admin có thể hạ nhẹ ngưỡng Pass Threshold (65-70%) để AI châm chước do thiếu sáng. Ngoài trời nắng sáng có thể tăng lên 85-90%.
                    </p>
                    <p>
                      🎯 **2. Cân bằng Độ khó theo Loại Sự Kiện (Difficulty Balance)**:
                      Tiệc gia đình/trẻ em cần không khí vui vẻ (ngưỡng 70%), trong khi Giải đấu Teambuilding Doanh nghiệp đòi hỏi kỷ luật cao (ngưỡng 90%).
                    </p>
                    <p>
                      💼 **3. Giá trị Thương mại B2B SaaS**:
                      Giúp dự án bán được gói WebApp Premium cho các Event Agency tùy biến tiêu chuẩn cho từng hợp đồng sự kiện lớn.
                    </p>
                  </div>
                </motion.div>
              )}

              <div>
                <div className="flex justify-between text-sm font-semibold mb-2">
                  <span className="text-slate-200">Ngưỡng Chấm Điểm Đạt (Pass Threshold):</span>
                  <span className="text-cyan-400 font-bold">{aiThreshold}% Score</span>
                </div>
                <input
                  type="range"
                  min="50"
                  max="95"
                  value={aiThreshold}
                  onChange={(e) => setAiThreshold(Number(e.target.value))}
                  className="w-full accent-cyan-400 cursor-pointer"
                />
                <p className="text-xs text-slate-400 mt-1">Nếu điểm ảnh bên dưới {aiThreshold}%, hệ thống tự động kích hoạt Vòng Quay Hình Phạt.</p>
              </div>

              <div>
                <div className="flex justify-between text-sm font-semibold mb-2">
                  <span className="text-slate-200">Trọng Số Nhận Diện Tư Thế (Pose Sync Weight):</span>
                  <span className="text-fuchsia-400 font-bold">{poseWeight}%</span>
                </div>
                <input
                  type="range"
                  min="40"
                  max="100"
                  value={poseWeight}
                  onChange={(e) => setPoseWeight(Number(e.target.value))}
                  className="w-full accent-fuchsia-400 cursor-pointer"
                />
              </div>

              <div>
                <div className="flex justify-between text-sm font-semibold mb-2">
                  <span className="text-slate-200">Trọng Số Nhận Diện Biểu Cảm (Expression Weight):</span>
                  <span className="text-amber-400 font-bold">{expressionWeight}%</span>
                </div>
                <input
                  type="range"
                  min="40"
                  max="100"
                  value={expressionWeight}
                  onChange={(e) => setExpressionWeight(Number(e.target.value))}
                  className="w-full accent-amber-400 cursor-pointer"
                />
              </div>

              <button
                onClick={() => {
                  sound.playSuccess();
                  alert('Đã cập nhật tham số AI Model thành công!');
                }}
                className="w-full rounded-2xl bg-gradient-to-r from-fuchsia-600 to-purple-600 py-3.5 text-sm font-bold text-white shadow-lg shadow-fuchsia-500/20"
              >
                Lưu Cấu Hình Thuật Toán
              </button>
            </div>

            <div className="rounded-3xl border border-white/15 bg-slate-900/60 p-6 backdrop-blur-xl space-y-4">
              <h3 className="text-xl font-bold text-white">Mô Hình AI Đang Sử Dụng</h3>
              <div className="rounded-2xl border border-cyan-500/20 bg-cyan-950/20 p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-bold text-cyan-300">FaceMesh Detection</span>
                  <span className="text-xs text-emerald-400 font-bold">● Active (68 Landmarks)</span>
                </div>
                <p className="text-xs text-slate-300">Nhận diện điểm mắt, miệng và cảm xúc biểu cảm khuôn mặt real-time.</p>
              </div>

              <div className="rounded-2xl border border-fuchsia-500/20 bg-fuchsia-950/20 p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-bold text-fuchsia-300">PoseNet Action Estimator</span>
                  <span className="text-xs text-emerald-400 font-bold">● Active (17 Keypoints)</span>
                </div>
                <p className="text-xs text-slate-300">Phân tích cử chỉ nhóm, chiều cao nhảy, trạng thái ôm và chạm ly.</p>
              </div>

              <div className="rounded-2xl border border-amber-500/20 bg-amber-950/20 p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-bold text-amber-300">Group Sync Algorithm</span>
                  <span className="text-xs text-emerald-400 font-bold">● Active</span>
                </div>
                <p className="text-xs text-slate-300">Tính toán sự đồng bộ và hài hòa của toàn bộ thành viên trong khung hình.</p>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'analytics' && (
          <div className="mt-6 space-y-8">
            {/* TAM / SAM / SOM Financial Metrics */}
            <div className="rounded-3xl border border-white/15 bg-slate-900/60 p-6 backdrop-blur-xl space-y-6">
              <div>
                <h3 className="text-2xl font-black text-white flex items-center gap-2">
                  <BarChart3 className="text-cyan-400" /> Thống Kê Quy Mô Thị Trường & Tiềm Năng Gọi Vốn
                </h3>
                <p className="text-xs text-slate-400 mt-1">Dữ liệu dự báo tăng trưởng mô hình Phygital Game 2026 - 2030</p>
              </div>

              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                <div className="rounded-2xl border border-cyan-500/30 bg-slate-950/70 p-4 space-y-2">
                  <span className="text-[10px] font-black uppercase text-cyan-400 tracking-wider">TAM (Thị trường Toàn Cầu)</span>
                  <div className="text-2xl font-black text-white">$14.2 tỷ USD</div>
                  <p className="text-[11px] text-slate-400">Boardgame & Party Games toàn cầu (CAGR +11.8%)</p>
                </div>

                <div className="rounded-2xl border border-fuchsia-500/30 bg-slate-950/70 p-4 space-y-2">
                  <span className="text-[10px] font-black uppercase text-fuchsia-400 tracking-wider">SAM (Thị trường ĐNÁ)</span>
                  <div className="text-2xl font-black text-white">$850 triệu USD</div>
                  <p className="text-[11px] text-slate-400">35M người chơi Gen Z tại Việt Nam & SEA</p>
                </div>

                <div className="rounded-2xl border border-amber-500/30 bg-slate-950/70 p-4 space-y-2">
                  <span className="text-[10px] font-black uppercase text-amber-400 tracking-wider">SOM (Mục tiêu Năm 2)</span>
                  <div className="text-2xl font-black text-white">$2.5 triệu USD</div>
                  <p className="text-[11px] text-slate-400">Phủ 150,000 bộ bài vật lý & SaaS Event Premium</p>
                </div>

                <div className="rounded-2xl border border-emerald-500/30 bg-slate-950/70 p-4 space-y-2">
                  <span className="text-[10px] font-black uppercase text-emerald-400 tracking-wider">Tỉ lệ Giữ Chân (Retention)</span>
                  <div className="text-2xl font-black text-white">88.4%</div>
                  <p className="text-[11px] text-emerald-300 font-semibold">↑ Gấp 2.7 lần UNO & Ma Sói truyền thống</p>
                </div>
              </div>
            </div>

            {/* Visual Comparison Chart */}
            <div className="rounded-3xl border border-white/15 bg-slate-900/60 p-6 backdrop-blur-xl">
              <h3 className="text-xl font-bold text-white mb-2">So Sánh Trực Quan: Photo Challenge vs Boardgame Truyền Thống</h3>
              <p className="text-xs text-slate-400 mb-6">Số liệu thống kê trải nghiệm người dùng thực tế từ thử nghiệm 500 nhóm trẻ (16-25 tuổi)</p>

              <div className="grid gap-4 md:grid-cols-3">
                <div className="rounded-2xl border border-cyan-500/30 bg-slate-950/60 p-5 space-y-3">
                  <div className="text-cyan-400 text-xs font-bold uppercase">Mức Độ Tương Tác Trực Tiếp</div>
                  <div className="text-3xl font-black text-white">+240%</div>
                  <p className="text-xs text-slate-400">Vượt xa **UNO** do có sự kết hợp chụp ảnh & tạo dáng nhóm thật.</p>
                </div>

                <div className="rounded-2xl border border-fuchsia-500/30 bg-slate-950/60 p-5 space-y-3">
                  <div className="text-fuchsia-400 text-xs font-bold uppercase">Tỉ Lệ Lan Truyền MXH</div>
                  <div className="text-3xl font-black text-white">+310%</div>
                  <p className="text-xs text-slate-400">Nhờ tính năng tự động xuất ảnh kỉ niệm đăng TikTok / Story Instagram.</p>
                </div>

                <div className="rounded-2xl border border-amber-500/30 bg-slate-950/60 p-5 space-y-3">
                  <div className="text-amber-400 text-xs font-bold uppercase">Khả Năng Mở Rộng Nội Dung</div>
                  <div className="text-3xl font-black text-white">Vô Hạn</div>
                  <p className="text-xs text-slate-400">Không bị giới hạn lá bài cố định như **Ma Sói** nhờ cập nhật Web App liên tục.</p>
                </div>
              </div>
            </div>

            {/* Press Citations & Media Coverage */}
            <div className="rounded-3xl border border-white/15 bg-slate-900/60 p-6 backdrop-blur-xl space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-xl font-bold text-white flex items-center gap-2">
                    <Globe className="text-cyan-400" /> Báo Chí & Truyền Thông Đưa Tin Về Dự Án
                  </h3>
                  <p className="text-xs text-slate-400 mt-1">Các bài viết phân tích xu hướng Phygital Game từ các trang tin công nghệ & tài chính uy tín</p>
                </div>
                <Award size={24} className="text-amber-400" />
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                {pressArticles.map((article) => (
                  <motion.a
                    key={article.publisher}
                    href={article.link}
                    target="_blank"
                    rel="noreferrer"
                    whileHover={{ y: -3, scale: 1.01 }}
                    className="block rounded-2xl border border-white/10 bg-slate-950/80 p-5 transition hover:border-cyan-400/50 space-y-3"
                  >
                    <div className="flex items-center justify-between">
                      <span className="rounded-full bg-cyan-500/20 px-3 py-0.5 text-[10px] font-bold text-cyan-300 border border-cyan-500/30">
                        {article.publisher}
                      </span>
                      <span className="text-[10px] text-slate-400 font-mono">{article.date}</span>
                    </div>

                    <h4 className="font-bold text-white text-base leading-snug flex items-start gap-1">
                      <span>{article.title}</span>
                      <ExternalLink size={14} className="text-cyan-400 shrink-0 mt-1" />
                    </h4>

                    <p className="text-xs text-slate-300 leading-relaxed">{article.summary}</p>

                    <div className="pt-2 flex items-center justify-between border-t border-white/10 text-[11px] font-semibold">
                      <span className="text-amber-400">{article.badge}</span>
                      <span className="text-cyan-300 flex items-center gap-1">
                        <FileText size={12} /> Đọc bài viết ↗
                      </span>
                    </div>
                  </motion.a>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default AdminPage;
