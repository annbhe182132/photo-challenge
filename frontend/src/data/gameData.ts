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

// Full Physical Deck (24 cards)
export const DECK_CARDS: PhysicalCard[] = [
  {
    id: 'card-01',
    code: 'PC-CARD-001',
    category: 'Group',
    theme: 'party',
    title: 'Cạn Ly Đồng Điệu',
    mission: 'Hãy tìm một chiếc cốc và cùng 3 người bạn tạo dáng "23 Dzô! 23 Uống! Cạn ly!"',
    difficulty: 2,
    xp: 20,
    tags: ['📸 Group', '👥 4 Players', '⏱ 10s'],
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
  {
    id: 'card-07',
    code: 'PC-CARD-007',
    category: 'Action',
    theme: 'teambuilding',
    title: 'Tháp Người Đoàn Kết',
    mission: '3 thành viên tạo dáng chồng người hình tam giác vững chãi trong 5 giây!',
    difficulty: 4,
    xp: 45,
    tags: ['💪 Strength', '👥 3 Players', '⏱ 15s'],
  },
  {
    id: 'card-08',
    code: 'PC-CARD-008',
    category: 'Meme',
    theme: 'party',
    title: 'Cái Nhìn Đánh Giá',
    mission: 'Cả nhóm đồng loạt quay sang nhìn chằm chằm vào 1 người với ánh mắt phán xét hài hước!',
    difficulty: 2,
    xp: 25,
    tags: ['👀 Side Eye', '🤣 Meme', '⏱ 10s'],
  },
  {
    id: 'card-09',
    code: 'PC-CARD-009',
    category: 'Creative',
    theme: 'birthday',
    title: 'Vương Miện Sinh Nhật',
    mission: 'Dùng bàn tay của các thành viên ghép lại thành chiếc vương miện lớn đội lên đầu chủ tiệc!',
    difficulty: 3,
    xp: 35,
    tags: ['🎂 Birthday', '👑 Crown', '❤️ Love'],
  },
  {
    id: 'card-10',
    code: 'PC-CARD-010',
    category: 'Action',
    theme: 'travel',
    title: 'Bước Chân Phiêu Lưu',
    mission: 'Cả nhóm tạo dáng bước sải chân dài như đang thám hiểm rừng sâu hoặc sa mạc!',
    difficulty: 3,
    xp: 30,
    tags: ['🏃 Explore', '🌍 Outdoor', '📸 Dynamic'],
  },
  {
    id: 'card-11',
    code: 'PC-CARD-011',
    category: 'Group',
    theme: 'teambuilding',
    title: 'Trái Tim Đồng Tâm',
    mission: 'Tất cả các thành viên cùng chụm tay lại tạo thành một hình trái tim khổng lồ ngay trước ngực!',
    difficulty: 2,
    xp: 20,
    tags: ['💖 Team Heart', '✨ Wholesome', '⏱ 10s'],
  },
  {
    id: 'card-12',
    code: 'PC-CARD-012',
    category: 'Spicy',
    theme: 'party',
    title: 'Nụ Hôn Bất Ngờ',
    mission: 'Hai người chơi đối diện chu môi sát vào má nhau như sắp trao nụ hôn thế kỷ!',
    difficulty: 5,
    xp: 50,
    tags: ['🔥 Spicy', '💋 Dare', '😱 Shocking'],
  },
  {
    id: 'card-13',
    code: 'PC-CARD-013',
    category: 'Meme',
    theme: 'party',
    title: 'Ngủ Gật Giữa Tiệc',
    mission: 'Tất cả mọi người giả vờ ngã gục xuống bàn ngủ say sưa, chỉ duy nhất 1 người cười tươi selfie!',
    difficulty: 3,
    xp: 35,
    tags: ['😴 Sleepy', '📸 Funny', '🎉 Party End'],
  },
  {
    id: 'card-14',
    code: 'PC-CARD-014',
    category: 'Creative',
    theme: 'travel',
    title: 'Bóng Đổ Nghệ Thuật',
    mission: 'Chụp dáng bóng của cả nhóm dưới sàn hoặc bờ tường sao cho tạo ra một hình khối kỳ lạ!',
    difficulty: 4,
    xp: 40,
    tags: ['👥 Shadow', '🎨 Art', '📐 Creative'],
  },
  {
    id: 'card-15',
    code: 'PC-CARD-015',
    category: 'Group',
    theme: 'birthday',
    title: 'Thổi Nến Siêu Tốc',
    mission: 'Cả nhóm cùng phồng má hết cỡ tạo dáng cùng thổi tắt nến trên chiếc bánh sinh nhật!',
    difficulty: 2,
    xp: 25,
    tags: ['🎂 Candle', '🌬 Blow', '👥 All Members'],
  },
  {
    id: 'card-16',
    code: 'PC-CARD-016',
    category: 'Action',
    theme: 'teambuilding',
    title: 'Kéo Co Vô Hình',
    mission: 'Hai đội nghiêng người dồn trọng tâm về sau như đang dốc toàn lực kéo sợi dây vô hình!',
    difficulty: 4,
    xp: 40,
    tags: ['🪢 Tug of War', '💪 Battle', '⚡ Action'],
  },
  {
    id: 'card-17',
    code: 'PC-CARD-017',
    category: 'Meme',
    theme: 'birthday',
    title: 'Gương Mặt Hoảng Hốt',
    mission: 'Cả nhóm làm biểu cảm "Hét" (The Scream) khi nhìn thấy tuổi mới!',
    difficulty: 3,
    xp: 30,
    tags: ['😱 Scream', '🎭 Drama', '🎂 Age Joke'],
  },
  {
    id: 'card-18',
    code: 'PC-CARD-018',
    category: 'Creative',
    theme: 'party',
    title: 'Kính Mắt Bằng Tay',
    mission: 'Tất cả mọi người dùng ngón tay làm thành cặp mắt kính đeo lên mắt với thần thái ngầu lòi!',
    difficulty: 2,
    xp: 20,
    tags: ['🕶 Finger Glasses', '😎 Cool', '⏱ 10s'],
  },
  {
    id: 'card-19',
    code: 'PC-CARD-019',
    category: 'Spicy',
    theme: 'teambuilding',
    title: 'Cõng Nhau Về Đích',
    mission: 'Hai thành viên cõng nhau trên lưng và giơ tay chữ V chiến thắng về phía ống kính!',
    difficulty: 4,
    xp: 45,
    tags: ['🏃 Piggyback', '🏆 Win', '🤝 Trust'],
  },
  {
    id: 'card-20',
    code: 'PC-CARD-020',
    category: 'Action',
    theme: 'travel',
    title: 'Cú Nhảy Đồng Loạt',
    mission: 'Cả nhóm nhảy bật cao lên không trung cùng một tích tắc, tay giơ cao đón gió!',
    difficulty: 3,
    xp: 35,
    tags: ['✈️ Jump', '📸 Timing', '⚡ Travel'],
  },
  {
    id: 'card-21',
    code: 'PC-CARD-021',
    category: 'Group',
    theme: 'party',
    title: 'Đoàn Tàu Lắc Lư',
    mission: 'Người sau đặt hai tay lên vai người trước tạo thành đoàn tàu nối đuôi nhau lắc lư!',
    difficulty: 2,
    xp: 25,
    tags: ['🚂 Conga Line', '🎉 Party', '👥 Group'],
  },
  {
    id: 'card-22',
    code: 'PC-CARD-022',
    category: 'Meme',
    theme: 'travel',
    title: 'Tượng Đài Bất Động',
    mission: 'Mỗi người đứng bất động thành một bức tượng kỳ quặc như trong viện bảo tàng!',
    difficulty: 3,
    xp: 30,
    tags: ['🗿 Statue', '😂 Mannequin', '⏱ 15s'],
  },
  {
    id: 'card-23',
    code: 'PC-CARD-023',
    category: 'Spicy',
    theme: 'birthday',
    title: 'Lời Chúc Thầm Kín',
    mission: 'Một người thì thầm vào tai chủ bữa tiệc điều gì đó khiến họ cười phá lên trong bức ảnh!',
    difficulty: 4,
    xp: 45,
    tags: ['🤫 Whisper', '🤣 Secret', '🎂 Birthday'],
  },
  {
    id: 'card-24',
    code: 'PC-CARD-024',
    category: 'Creative',
    theme: 'teambuilding',
    title: 'Bức Ảnh Tương Lai',
    mission: 'Tất cả cùng hướng mắt nhìn về một hướng xa xăm với ánh nhìn tràn đầy hy vọng và quyết tâm!',
    difficulty: 5,
    xp: 50,
    tags: ['🌟 Vision', '🚀 Future', '👑 Grand Finale'],
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
