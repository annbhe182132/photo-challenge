export interface PhysicalCard {
  id: string;
  code: string;
  category: 'Group' | 'Action' | 'Spicy' | 'Creative' | 'Meme';
  theme: string;
  title: string;
  mission: string;
  difficulty: number;
  xp: number;
  tags: string[];
  arOverlay?: string;
}

export interface ThemeOption {
  id: string;
  name: string;
  icon: string;
  description: string;
  color: string;
}

export interface Punishment {
  id: string;
  title: string;
  description: string;
  icon: string;
}

export const THEMES: ThemeOption[] = [
  { id: 'party', name: 'Party Đêm Đỉnh Cao', icon: '🎉', description: 'Thử thách nhộn nhịp dành cho các buổi quẩy đêm', color: 'from-fuchsia-500 to-pink-600' },
  { id: 'teambuilding', name: 'Team Building Gắn Kết', icon: '🔥', description: 'Thử thách nâng cao tinh thần đồng đội & phối hợp', color: 'from-amber-500 to-orange-600' },
  { id: 'travel', name: 'Du Lịch Khám Phá', icon: '✈️', description: 'Tạo dáng ngoại cảnh & check-in cực chất', color: 'from-cyan-500 to-blue-600' },
  { id: 'birthday', name: 'Sinh Nhật Bùng Nổ', icon: '🎂', description: 'Khoảnh khắc vui vẻ cùng chủ nhân buổi tiệc', color: 'from-purple-500 to-indigo-600' },
];

export const PUNISHMENTS: Punishment[] = [
  { id: 'p1', title: 'Uống 1 Ly Nước 🍹', description: 'Nâng ly chúc mừng hoặc cạn 1 ly nước đầy!', icon: '🥤' },
  { id: 'p2', title: 'Làm Mặt Xấu 10s 😜', description: 'Giữ nguyên nét mặt hài hước nhất trong 10 giây!', icon: '🎭' },
  { id: 'p3', title: 'Hát / Rap 1 Đoạn 🎤', description: 'Trình diễn 1 câu hát hoặc bài rap bất kỳ!', icon: '🎵' },
  { id: 'p4', title: 'Đóng Vai Robot 🤖', description: 'Nói chuyện và di chuyển như robot đến hết lượt sau!', icon: '🤖' },
  { id: 'p5', title: 'Dán Sticker Lên Trán 🏷️', description: 'Nhận 1 huy hiệu hình phạt dán trực tiếp lên mặt!', icon: '✨' },
  { id: 'p6', title: 'Kể 1 Bí Mật Nhỏ 🤫', description: 'Tiết lộ 1 thói quen buồn cười mà ít ai biết!', icon: '💡' },
];

// Sample Physical Deck (24 cards sample dataset)
export const DECK_CARDS: PhysicalCard[] = [
  {
    id: 'card-01',
    code: 'PC-CARD-001',
    category: 'Group',
    theme: 'party',
    title: 'Cạn Ly Đồng Điệu',
    mission: 'Hãy tìm một chiếc cốc và cùng 3 người tạo dáng "23 Dzô! 23 Uống! Cạn ly!"',
    difficulty: 2,
    xp: 20,
    tags: ['📸 Group', '👥 4 Players', '⏱ 30s'],
  },
  {
    id: 'card-02',
    code: 'PC-CARD-002',
    category: 'Action',
    theme: 'party',
    title: 'Cú Bay Bất Tận',
    mission: 'Tạo một bức ảnh cả nhóm đang bay, chân không chạm đất cùng một lúc!',
    difficulty: 3,
    xp: 30,
    tags: ['🦸 Action', '😂 Funny', '⚡ Timing'],
  },
  {
    id: 'card-03',
    code: 'PC-CARD-003',
    category: 'Spicy',
    theme: 'party',
    title: 'Tình Mẫu Tử Thiêng Liêng',
    mission: 'Hai người chơi nhập vai Mẹ & Con ôm nhau đầy cảm xúc như phim điện ảnh!',
    difficulty: 4,
    xp: 45,
    tags: ['🎬 Drama', '❤️ Heartfelt', '🏆 Teamwork'],
  },
  {
    id: 'card-04',
    code: 'PC-CARD-004',
    category: 'Meme',
    theme: 'teambuilding',
    title: 'Poster Phim Siêu Cấp',
    mission: 'Xếp hàng hình chữ V, người đứng đầu tạo dáng ngầu như Biệt Đội Siêu Anh Hùng!',
    difficulty: 5,
    xp: 50,
    tags: ['🔥 Epic', '⭐ Final Round', '👑 Leader'],
  },
  {
    id: 'card-05',
    code: 'PC-CARD-005',
    category: 'Creative',
    theme: 'travel',
    title: 'Góc Nhìn Khổng Lồ',
    mission: 'Người chơi đứng gần camera tạo góc nhìn như đang nuốt trọn người chơi phía xa!',
    difficulty: 3,
    xp: 35,
    tags: ['📐 Perspective', '🎨 Creative', '📸 Photo Art'],
  },
  {
    id: 'card-06',
    code: 'PC-CARD-006',
    category: 'Spicy',
    theme: 'birthday',
    title: 'Tia Sét Biểu Cảm',
    mission: 'Cả nhóm làm 5 biểu cảm khác nhau hoàn toàn: Vui, Buồn, Tức giận, Ngạc nhiên, Giả ngầu!',
    difficulty: 4,
    xp: 40,
    tags: ['🎭 Expressions', '🤖 AI Detection', '⚡ Fast'],
  },
];

export interface Player {
  id: string;
  name: string;
  avatar: string;
  score: number;
  streak: number;
  badges: string[];
}

export const INITIAL_PLAYERS: Player[] = [
  { id: 'p1', name: 'Alex Nguyễn', avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80', score: 140, streak: 3, badges: ['👑 MVP', '📸 Photo Master'] },
  { id: 'p2', name: 'Minh Anh', avatar: 'https://images.unsplash.com/photo-1517841905240-472988babdf9?w=150&auto=format&fit=crop&q=80', score: 115, streak: 2, badges: ['⚡ Speedster'] },
  { id: 'p3', name: 'Trần Gia Bảo', avatar: 'https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?w=150&auto=format&fit=crop&q=80', score: 95, streak: 1, badges: ['😜 Meme God'] },
  { id: 'p4', name: 'Hoàng Yến', avatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150&auto=format&fit=crop&q=80', score: 80, streak: 0, badges: ['🔥 Party Animal'] },
];
