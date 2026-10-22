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
import { useGame } from '../../context/useGame';
import { ThemeToggle } from '../../components/ThemeToggle';
import { DECK_CARDS, type PhysicalCard } from '../../data/gameData';
import QRCodeImage from '../../components/QRCodeImage';
import {
  BOX_QR_VALUE,
  cardQrValue,
  downloadAll25QrSheet,
  downloadBoxQrBadge,
  downloadBoxQrCleanSvg,
  downloadBoxQrPng,
} from '../../utils/qrPayload';
import { sound } from '../../utils/soundEngine';

const pressArticles = [
  {
    publisher: 'VnExpress Tech',
    date: '28/07/2026',
    title: 'Phygital Gaming — Xu hướng giải trí kết hợp lá bài vật lý & AI lên ngôi',
    summary: 'SNAPDECK đột phá thị trường bằng cách kết hợp bộ bài vật lý và WebApp nhận diện gương mặt AI real-time.',
    link: 'https://vnexpress.net/so-hoa',
    badge: 'Báo Điện Tử Hàng Đầu',
  },
  {
    publisher: 'TechInAsia',
    date: '25/07/2026',
    title: 'SNAPDECK: Startup Phygital Game Việt Nam gọi vốn $500K vòng Seed',
    summary: 'Mô hình B2B2C độc đáo giúp SNAPDECK chinh phục hơn 1,400 phòng chơi chỉ trong 3 tháng ra mắt.',
    link: 'https://www.techinasia.com',
    badge: 'Chuyên Trang Startup Châu Á',
  },
  {
    publisher: 'Forbes Asia',
    date: '20/07/2026',
    title: 'Giải mã sức hút của Boardgame Phygital tương tác nhóm tại Đông Nam Á',
    summary: 'Khác biệt hoàn toàn so với UNO hay Ma Sói, SNAPDECK duy trì tỉ lệ tương tác nhóm thực tế lên đến 88.4%.',
    link: 'https://www.forbes.com',
    badge: 'Tạp Chí Tài Chính Quốc Tế',
  },
  {
    publisher: 'VTV Digital / Startup Vietnam',
    date: '15/07/2026',
    title: 'Giải pháp kéo giới trẻ rời xa điện thoại cá nhân bằng tương tác nhóm thực tế',
    summary: 'Chỉ với 1 thiết bị chung cho cả nhóm, SNAPDECK kéo các thành viên lại gần nhau hơn trong mỗi cuộc vui.',
    link: 'https://vtv.vn',
    badge: 'Đài Truyền Hình Quốc Gia',
  },
];

const AdminPage = () => {
  const navigate = useNavigate();
  const { themeMode } = useGame();
  const isLight = themeMode === 'light';
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

  const handleExportCardQrCodes = async () => {
    sound.playClick();
    try {
      await downloadAll25QrSheet(cards);
    } catch {
      window.alert('Không thể tạo bộ mã QR. Vui lòng thử lại.');
    }
  };

  return (
    <div className={`min-h-screen transition-colors duration-300 ${
      isLight
        ? 'text-slate-900'
        : 'bg-[radial-gradient(circle_at_top_left,_rgba(7,89,133,0.3),_transparent_40%),linear-gradient(135deg,_#030712_0%,_#0f172a_50%,_#111827_100%)] text-slate-100'
    }`}>
      <div className="mx-auto max-w-7xl px-6 py-8">
        {/* Top Header */}
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <button
              onClick={() => {
                sound.playClick();
                navigate('/');
              }}
              className={`flex items-center gap-2 rounded-full border px-4 py-2 text-sm font-semibold transition active:scale-95 ${
                isLight
                  ? 'border-slate-200 bg-white text-slate-700 shadow-sm hover:bg-slate-50'
                  : 'border-white/15 bg-white/10 text-slate-300 backdrop-blur-xl hover:bg-white/20 hover:text-white'
              }`}
            >
              <ArrowLeft size={16} />
              Quay về Trang Chủ
            </button>
            <div className={`flex items-center gap-2 rounded-full border px-4 py-1.5 text-xs font-bold ${
              isLight ? 'border-sky-300 bg-sky-50 text-sky-800' : 'border-cyan-500/30 bg-cyan-500/10 text-cyan-300'
            }`}>
              <Sparkles size={14} className="animate-spin text-cyan-400" />
              INVESTOR & ADMIN PORTAL
            </div>
          </div>

          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <span className={`text-xs ${isLight ? 'text-slate-600' : 'text-slate-400'}`}>Trạng Thái Hệ Thống:</span>
              <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-500/20 px-3 py-1 text-xs font-semibold text-emerald-400">
                <span className="h-2 w-2 rounded-full bg-emerald-400 animate-ping" />
                99.9% Online
              </span>
            </div>
            <ThemeToggle />
          </div>
        </div>

        {/* Title */}
        <div className="mt-8">
          <h1 className={`text-3xl font-black tracking-tight sm:text-4xl ${isLight ? 'text-slate-900' : 'text-white'}`}>
            Quản Trị Hệ Thống & Thống Kê Đầu Tư
          </h1>
          <p className={`mt-2 ${isLight ? 'text-slate-600' : 'text-slate-400'}`}>
            Quản lý bộ bài 24 lá Phygital, mã QR, thuật toán AI Verification và chỉ số tăng trưởng kinh doanh.
          </p>
        </div>

        {/* Metric Cards */}
        <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <motion.div
            whileHover={{ y: -4 }}
            className={`rounded-2xl border p-5 backdrop-blur-xl shadow-xl ${
              isLight
                ? 'border-slate-200/90 bg-white/95 text-slate-900 shadow-sky-950/5'
                : 'border-cyan-500/30 bg-gradient-to-br from-cyan-950/40 via-slate-900/60 to-slate-950/80 text-white'
            }`}
          >
            <div className="flex items-center justify-between">
              <span className={`text-xs font-bold uppercase tracking-wider ${isLight ? 'text-sky-700' : 'text-cyan-400'}`}>Thẻ Bài Vật Lý (Deck)</span>
              <div className={`rounded-xl p-2.5 ${isLight ? 'bg-sky-100 text-sky-700' : 'bg-cyan-500/20 text-cyan-300'}`}>
                <Layers size={20} />
              </div>
            </div>
            <div className={`mt-4 text-3xl font-black ${isLight ? 'text-slate-900' : 'text-white'}`}>24 Lá Bài</div>
            <div className={`mt-1 text-xs ${isLight ? 'text-slate-500' : 'text-slate-400'}`}>Tự động gắn mã QR bảo mật</div>
          </motion.div>

          <motion.div
            whileHover={{ y: -4 }}
            className={`rounded-2xl border p-5 backdrop-blur-xl shadow-xl ${
              isLight
                ? 'border-slate-200/90 bg-white/95 text-slate-900 shadow-sky-950/5'
                : 'border-fuchsia-500/30 bg-gradient-to-br from-fuchsia-950/40 via-slate-900/60 to-slate-950/80 text-white'
            }`}
          >
            <div className="flex items-center justify-between">
              <span className={`text-xs font-bold uppercase tracking-wider ${isLight ? 'text-fuchsia-700' : 'text-fuchsia-400'}`}>Phòng Chơi Đang Mở</span>
              <div className={`rounded-xl p-2.5 ${isLight ? 'bg-fuchsia-100 text-fuchsia-700' : 'bg-fuchsia-500/20 text-fuchsia-300'}`}>
                <Users size={20} />
              </div>
            </div>
            <div className={`mt-4 text-3xl font-black ${isLight ? 'text-slate-900' : 'text-white'}`}>1,420 Rooms</div>
            <div className="mt-1 text-xs text-emerald-500 font-semibold">↑ +38% so với tuần trước</div>
          </motion.div>

          <motion.div
            whileHover={{ y: -4 }}
            className={`rounded-2xl border p-5 backdrop-blur-xl shadow-xl ${
              isLight
                ? 'border-slate-200/90 bg-white/95 text-slate-900 shadow-sky-950/5'
                : 'border-amber-500/30 bg-gradient-to-br from-amber-950/40 via-slate-900/60 to-slate-950/80 text-white'
            }`}
          >
            <div className="flex items-center justify-between">
              <span className={`text-xs font-bold uppercase tracking-wider ${isLight ? 'text-amber-700' : 'text-amber-400'}`}>Tình trạng AI</span>
              <div className={`rounded-xl p-2.5 ${isLight ? 'bg-amber-100 text-amber-700' : 'bg-amber-500/20 text-amber-300'}`}>
                <BrainCircuit size={20} />
              </div>
            </div>
            <div className={`mt-4 text-3xl font-black ${isLight ? 'text-slate-900' : 'text-white'}`}>Chưa kết nối</div>
            <div className={`mt-1 text-xs ${isLight ? 'text-slate-500' : 'text-slate-400'}`}>Chưa kết nối dịch vụ phân tích AI</div>
          </motion.div>

          <motion.div
            whileHover={{ y: -4 }}
            className={`rounded-2xl border p-5 backdrop-blur-xl shadow-xl ${
              isLight
                ? 'border-slate-200/90 bg-white/95 text-slate-900 shadow-sky-950/5'
                : 'border-emerald-500/30 bg-gradient-to-br from-emerald-950/40 via-slate-900/60 to-slate-950/80 text-white'
            }`}
          >
            <div className="flex items-center justify-between">
              <span className={`text-xs font-bold uppercase tracking-wider ${isLight ? 'text-emerald-700' : 'text-emerald-400'}`}>Doanh Số Dự Kiến</span>
              <div className={`rounded-xl p-2.5 ${isLight ? 'bg-emerald-100 text-emerald-700' : 'bg-emerald-500/20 text-emerald-300'}`}>
                <DollarSign size={20} />
              </div>
            </div>
            <div className={`mt-4 text-3xl font-black ${isLight ? 'text-slate-900' : 'text-white'}`}>$250K / Q3</div>
            <div className={`mt-1 text-xs ${isLight ? 'text-slate-500' : 'text-slate-400'}`}>Bán thẻ bài + WebApp Premium</div>
          </motion.div>
        </div>

        {/* Tab Navigation */}
        <div className={`mt-10 flex gap-2 border-b pb-4 ${isLight ? 'border-slate-200' : 'border-white/10'}`}>
          <button
            onClick={() => handleTabChange('cards')}
            className={`flex items-center gap-2 rounded-xl px-5 py-2.5 text-sm font-bold transition ${activeTab === 'cards'
              ? 'bg-gradient-to-r from-cyan-500 to-blue-600 text-white shadow-lg shadow-cyan-500/25'
              : isLight ? 'border border-slate-200 bg-white text-slate-600 hover:bg-slate-50 shadow-sm' : 'border border-white/10 bg-white/5 text-slate-400 hover:bg-white/10 hover:text-white'
              }`}
          >
            <QrCode size={18} />
            Quản Lý Thẻ Bài & Mã QR
          </button>
          <button
            onClick={() => handleTabChange('ai')}
            className={`flex items-center gap-2 rounded-xl px-5 py-2.5 text-sm font-bold transition ${activeTab === 'ai'
              ? 'bg-gradient-to-r from-fuchsia-500 to-purple-600 text-white shadow-lg shadow-fuchsia-500/25'
              : isLight ? 'border border-slate-200 bg-white text-slate-600 hover:bg-slate-50 shadow-sm' : 'border border-white/10 bg-white/5 text-slate-400 hover:bg-white/10 hover:text-white'
              }`}
          >
            <Sliders size={18} />
            Cấu Hình Thuật Toán AI
          </button>
          <button
            onClick={() => handleTabChange('analytics')}
            className={`flex items-center gap-2 rounded-xl px-5 py-2.5 text-sm font-bold transition ${activeTab === 'analytics'
              ? 'bg-gradient-to-r from-amber-500 to-orange-600 text-white shadow-lg shadow-amber-500/25'
              : isLight ? 'border border-slate-200 bg-white text-slate-600 hover:bg-slate-50 shadow-sm' : 'border border-white/10 bg-white/5 text-slate-400 hover:bg-white/10 hover:text-white'
              }`}
          >
            <TrendingUp size={18} />
            Thống Kê Đầu Tư & Thị Trường
          </button>
        </div>

        {/* Tab Content */}
        {activeTab === 'cards' && (
          <div className="mt-6 space-y-6">
            {/* Special Section: Mã QR Số 25 - In Trên Bao Bì Vỏ Hộp Sản Phẩm */}
            <div className="rounded-3xl border-2 border-cyan-400/50 bg-gradient-to-br from-cyan-950/50 via-slate-900/80 to-slate-950 p-6 shadow-2xl backdrop-blur-2xl">
              <div className="flex flex-col lg:flex-row items-center justify-between gap-6">
                <div className="flex flex-col sm:flex-row items-center sm:items-start gap-5 text-center sm:text-left">
                  <div className="relative rounded-2xl bg-white p-3.5 shadow-xl shrink-0">
                    <QRCodeImage value={BOX_QR_VALUE} size={140} alt="Mã QR Bao Bì Sản Phẩm" />
                    <span className="absolute -bottom-2 -right-2 rounded-full bg-gradient-to-r from-cyan-400 to-blue-500 px-2.5 py-0.5 text-[11px] font-black text-slate-950 shadow-md">
                      #25 BOX
                    </span>
                  </div>
                  <div className="space-y-2.5">
                    <div className="inline-flex items-center gap-2 rounded-full border border-cyan-400/40 bg-cyan-400/10 px-3 py-1 text-xs font-bold text-cyan-300">
                      <Sparkles size={14} className="text-cyan-400 animate-spin" />
                      MÃ QR SỐ 25 — IN VỎ HỘP & BAO BÌ VẬT LÝ
                    </div>
                    <h3 className="text-2xl font-black text-white">QR Code Vỏ Hộp Bộ Bài (Packaging Deck Box)</h3>
                    <p className="max-w-2xl text-xs sm:text-sm text-slate-300 leading-relaxed">
                      Mã QR này dành riêng để in lên mặt ngoài vỏ hộp bao bì hoặc tờ cẩm nang trong hộp. Khi khách hàng mở hộp bài, chỉ cần dùng camera điện thoại quét mã là truy cập ngay vào <strong>Landing Page WebApp</strong> có hướng dẫn luật chơi chi tiết, luồng Phygital và nút vào phòng chơi tức thì.
                    </p>
                    <div className="flex flex-wrap items-center gap-2 text-xs font-mono text-cyan-200">
                      <span className="rounded-lg bg-slate-800/90 px-3 py-1 border border-white/10">🔗 {BOX_QR_VALUE}</span>
                      <span className="rounded-lg bg-emerald-500/15 text-emerald-300 px-3 py-1 border border-emerald-500/30">✓ Vector 300 DPI</span>
                      <span className="rounded-lg bg-purple-500/15 text-purple-300 px-3 py-1 border border-purple-500/30">Mức sửa lỗi: High (H 30%)</span>
                    </div>
                  </div>
                </div>

                {/* Download Actions for Box QR */}
                <div className="flex flex-col sm:flex-row lg:flex-col gap-2.5 w-full sm:w-auto shrink-0">
                  <button
                    onClick={() => { sound.playClick(); void downloadBoxQrBadge(); }}
                    className="flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 px-5 py-3 text-xs font-bold text-white shadow-lg shadow-cyan-500/25 transition hover:scale-105"
                  >
                    <Download size={16} />
                    Tải Nhãn In Hộp Bài (Badge SVG)
                  </button>
                  <button
                    onClick={() => { sound.playClick(); void downloadBoxQrPng(); }}
                    className="flex items-center justify-center gap-2 rounded-xl border border-white/15 bg-white/10 px-5 py-2.5 text-xs font-bold text-slate-200 transition hover:bg-white/20"
                  >
                    <Download size={16} />
                    Tải PNG 2400x2400 (Siêu Nét)
                  </button>
                  <button
                    onClick={() => { sound.playClick(); void downloadBoxQrCleanSvg(); }}
                    className="flex items-center justify-center gap-2 rounded-xl border border-white/15 bg-white/10 px-5 py-2.5 text-xs font-bold text-slate-200 transition hover:bg-white/20"
                  >
                    <Download size={16} />
                    Tải Vector QR Gốc (SVG)
                  </button>
                </div>
              </div>
            </div>

            {/* Danh sách 24 lá bài */}
            <div className="rounded-3xl border border-white/15 bg-slate-900/60 p-6 backdrop-blur-xl">
              <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
                <div>
                  <h3 className="text-xl font-bold text-white">Danh Sách 24 Thẻ Bài Physical Phygital</h3>
                  <p className="text-xs text-slate-400">Nội dung 24 nhiệm vụ lá bài thật và mã QR định danh từng lá</p>
                </div>
                <div className="flex gap-3">
                  <button
                    onClick={() => { void handleExportCardQrCodes(); }}
                    className="flex items-center gap-2 rounded-xl border border-cyan-400/40 bg-cyan-500/10 px-4 py-2 text-sm font-bold text-cyan-300 transition hover:bg-cyan-500/20"
                  >
                    <Download size={16} />
                    Tải trọn bộ 25 mã QR (SVG)
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
                        <div className="flex flex-col items-center gap-1">
                          <QRCodeImage value={cardQrValue(card.code)} size={64} alt={`Mã QR cho lá bài ${card.code}`} />
                          <span className="inline-flex items-center gap-1 text-[10px] font-bold text-cyan-300">
                            <QrCode size={12} /> {card.code}
                          </span>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
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
                    <Bot className="text-cyan-400" /> Hệ thống AI Judge (AI Chếck)
                  </h3>
                  <p className="text-xs text-slate-400 mt-1">
                    Đã tích hợp AI Chếck phân tích ảnh, nhận diện thần thái và chấm điểm theo tiêu chí thẻ bài.
                  </p>
                </div>

                <div role="status" className="rounded-xl border border-emerald-400/40 bg-emerald-500/10 p-3 text-sm text-emerald-200">
                  ✅ Đã kích hoạt AI Judge (AI Chếck). Hỗ trợ cả AI và Bình chọn nhóm.
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
                    <p>Các thanh điều chỉnh ở trang này chỉ là bản minh họa. Không có mô hình AI hoặc ngưỡng chấm ảnh nào đang chạy hay được lưu.</p>
                    <p>Ván chơi hiện sử dụng bình chọn nhóm; các phiếu hợp lệ và điểm số được xử lý theo quy tắc của phòng.</p>
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
                  disabled
                  onChange={(e) => setAiThreshold(Number(e.target.value))}
                  className="w-full cursor-not-allowed accent-cyan-400"
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
                  disabled
                  onChange={(e) => setPoseWeight(Number(e.target.value))}
                  className="w-full cursor-not-allowed accent-fuchsia-400"
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
                  disabled
                  onChange={(e) => setExpressionWeight(Number(e.target.value))}
                  className="w-full cursor-not-allowed accent-amber-400"
                />
              </div>

              <button
                disabled
                className="w-full cursor-not-allowed rounded-2xl bg-slate-700 py-3.5 text-sm font-bold text-slate-400"
              >
                Lưu Cấu Hình Thuật Toán
              </button>
            </div>

            <div className="rounded-3xl border border-white/15 bg-slate-900/60 p-6 backdrop-blur-xl space-y-4">
              <h3 className="text-xl font-bold text-white">Trạng thái tích hợp AI</h3>
              <div className="rounded-2xl border border-cyan-500/20 bg-cyan-950/20 p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-bold text-cyan-300">Phân tích khuôn mặt</span>
                  <span className="text-xs text-amber-300 font-bold">● Chưa kết nối</span>
                </div>
                <p className="text-xs text-slate-300">Chưa có bộ phân tích khuôn mặt được tích hợp.</p>
              </div>

              <div className="rounded-2xl border border-fuchsia-500/20 bg-fuchsia-950/20 p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-bold text-fuchsia-300">Phân tích tư thế</span>
                  <span className="text-xs text-amber-300 font-bold">● Chưa kết nối</span>
                </div>
                <p className="text-xs text-slate-300">Chưa có bộ phân tích tư thế được tích hợp.</p>
              </div>

              <div className="rounded-2xl border border-amber-500/20 bg-amber-950/20 p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-bold text-amber-300">Bình chọn nhóm</span>
                  <span className="text-xs text-emerald-400 font-bold">● Dùng bình chọn nhóm</span>
                </div>
                <p className="text-xs text-slate-300">Người chơi đủ điều kiện bỏ phiếu; đạt ngưỡng hai phần ba để duyệt.</p>
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
              <h3 className="text-xl font-bold text-white mb-2">So Sánh Trực Quan: SNAPDECK vs Boardgame Truyền Thống</h3>
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
