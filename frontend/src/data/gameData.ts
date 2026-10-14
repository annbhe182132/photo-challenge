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

export type GameMode = 'casual' | 'speedrun' | 'spicy';
export type DeviceMode = 'single_device' | 'multi_device';
export type VerificationMethod = 'ai' | 'group';
export type PhotoEvidenceSetting = 'off' | 'optional' | 'required';
export type TurnDurationSeconds = 0 | 15 | 30 | 60;
export type RoundLimit = 0 | 3 | 5 | 10;

export interface GameSettings {
  deviceMode: DeviceMode;
  verificationMethod: VerificationMethod;
  photoEvidence: PhotoEvidenceSetting;
  photoBonusEnabled: boolean;
}

export interface Punishment {
  id: string;
  title: string;
  description: string;
  icon: string;
}

export const DEFAULT_DEVICE_MODE: DeviceMode = 'single_device';
export const DEFAULT_VERIFICATION_METHOD: VerificationMethod = 'group';
export const DEFAULT_PHOTO_EVIDENCE: PhotoEvidenceSetting = 'optional';
export const DEFAULT_TURN_DURATION: TurnDurationSeconds = 30;
export const DEFAULT_ROUND_LIMIT: RoundLimit = 5;

export const THEMES: ThemeOption[] = [
  { id: 'pose', name: 'Solo Pose & Style', icon: '📸', description: 'Thể hiện thần thái và tạo dáng trước ống kính', color: 'from-rose-500 to-pink-600' },
  { id: 'acting', name: 'Solo Acting & Drama', icon: '🎭', description: 'Diễn xuất qua những tình huống hài hước', color: 'from-amber-500 to-orange-600' },
  { id: 'interaction', name: 'One-on-One Interaction', icon: '🤝', description: 'Tương tác cùng một người bạn', color: 'from-sky-500 to-blue-600' },
  { id: 'creative', name: 'Creative Prop & Space', icon: '🎨', description: 'Sáng tạo với đồ vật quanh bàn chơi', color: 'from-emerald-500 to-teal-600' },
  { id: 'expression', name: 'Truth & Expression', icon: '😎', description: 'Biểu cảm cá nhân và chia sẻ vui vẻ', color: 'from-violet-500 to-purple-600' },
  { id: 'speed', name: 'Speed & Secret Mission', icon: '⚡', description: 'Thử thách tốc độ và nhiệm vụ bí mật', color: 'from-cyan-500 to-blue-600' },
];

export const PUNISHMENTS: Punishment[] = [
  { id: 'p1', title: 'Uống 1 Ly Nước 🍹', description: 'Nâng ly chúc mừng hoặc cạn 1 ly nước đầy!', icon: '🥤' },
  { id: 'p2', title: 'Làm Mặt Xấu 10s 😜', description: 'Giữ nguyên nét mặt hài hước nhất trong 10 giây!', icon: '🎭' },
  { id: 'p3', title: 'Hát / Rap 1 Đoạn 🎤', description: 'Trình diễn 1 câu hát hoặc bài rap bất kỳ!', icon: '🎵' },
  { id: 'p4', title: 'Đóng Vai Robot 🤖', description: 'Nói chuyện và di chuyển như robot đến hết lượt sau!', icon: '🤖' },
  { id: 'p5', title: 'Dán Sticker Lên Trán 🏷️', description: 'Nhận 1 huy hiệu hình phạt dán trực tiếp lên mặt!', icon: '✨' },
  { id: 'p6', title: 'Kể 1 Bí Mật Nhỏ 🤫', description: 'Tiết lộ 1 thói quen buồn cười mà ít ai biết!', icon: '💡' },
];

// Full Physical Deck (24 cards) — nội dung theo tài liệu Chủ đề bộ bài.docx
export const DECK_CARDS: PhysicalCard[] = [
  {
    id: 'card-01',
    code: 'SD-CARD-001',
    category: 'Creative',
    theme: 'pose',
    title: 'Fashion Model Bàn Ăn',
    mission: 'Người bốc bài chọn 1 phụ kiện trên bàn (kính mắt, khăn hoặc ly nước) để tạo dáng chụp ảnh bìa tạp chí thời trang. Cách phối hợp: Nhờ 1 bạn căn góc chụp thật nghệ thuật. Bằng chứng: 01 bức ảnh chân dung thần thái.',
    difficulty: 2,
    xp: 20,
    tags: ["pose","style","photo"],
  },
  {
    id: 'card-02',
    code: 'SD-CARD-002',
    category: 'Creative',
    theme: 'pose',
    title: 'Góc Nghiêng Thần Thánh',
    mission: 'Người bốc bài tạo dáng khoe góc mặt đẹp nhất cùng nụ cười nhẹ nhàng hoặc sâu lắng. Cách phối hợp: Chỉ định 1 bạn chụp bắt khoảnh khắc xuất thần. Bằng chứng: 01 bức ảnh góc nghiêng cuốn hút.',
    difficulty: 2,
    xp: 20,
    tags: ["pose","portrait","photo"],
  },
  {
    id: 'card-03',
    code: 'SD-CARD-003',
    category: 'Creative',
    theme: 'pose',
    title: 'Trạng Thái “Bất Trọng Lực”',
    mission: 'Tạo dáng như đang ngả người hoặc giơ tay phiêu theo không gian ngay tại ghế ngồi. Bằng chứng: 01 bức ảnh chụp góc thấp hoặc đánh lừa thị giác.',
    difficulty: 3,
    xp: 30,
    tags: ["pose","creative","photo"],
  },
  {
    id: 'card-04',
    code: 'SD-CARD-004',
    category: 'Creative',
    theme: 'pose',
    title: 'MC Bản Tin Trực Tiếp',
    mission: 'Giữ nét mặt và tư thế nghiêm túc tuyệt đối như đang dẫn bản tin thời sự truyền hình. Bằng chứng: 01 bức ảnh dáng ngồi chuẩn mực hài hước.',
    difficulty: 2,
    xp: 20,
    tags: ["pose","acting","photo"],
  },
  {
    id: 'card-05',
    code: 'SD-CARD-005',
    category: 'Action',
    theme: 'acting',
    title: 'Lời Tỏ Tình Sến Súa',
    mission: 'Người rút thẻ chọn 1 bạn trong nhóm và diễn cảnh tỏ tình cực kỳ sến súa trong 10 giây. Cách phối hợp: Mời 1 bạn đóng vai người được tỏ tình. Bằng chứng: 01 video ngắn 5–10 giây ghi lại cảnh tỏ tình.',
    difficulty: 3,
    xp: 30,
    tags: ["acting","drama","video"],
  },
  {
    id: 'card-06',
    code: 'SD-CARD-006',
    category: 'Action',
    theme: 'acting',
    title: 'Bật Tông Cảm Xúc',
    mission: 'Trong vòng 6 giây, người rút bài diễn liên hoàn 3 trạng thái: hoang mang → tức giận → cười xòe hạnh phúc. Bằng chứng: 01 video ngắn ghi lại chuyển biến cơ mặt.',
    difficulty: 3,
    xp: 30,
    tags: ["acting","expression","video"],
  },
  {
    id: 'card-07',
    code: 'SD-CARD-007',
    category: 'Action',
    theme: 'acting',
    title: 'Phản Ứng Trúng Số',
    mission: 'Diễn lại biểu cảm ngỡ ngàng tột độ như vừa nhận thông báo trúng giải thưởng 10 tỷ đồng. Bằng chứng: 01 bức ảnh vỡ òa cảm xúc.',
    difficulty: 2,
    xp: 25,
    tags: ["acting","funny","photo"],
  },
  {
    id: 'card-08',
    code: 'SD-CARD-008',
    category: 'Action',
    theme: 'acting',
    title: 'Lồng Tiếng Phim Truyền Hình',
    mission: 'Nhìn một hành động bất kỳ của bạn đối diện và lồng tiếng drama trực tiếp cho hành động đó. Bằng chứng: 01 video ngắn ghi hình bạn đối diện kèm giọng lồng tiếng của người chơi.',
    difficulty: 4,
    xp: 40,
    tags: ["acting","voiceover","video"],
  },
  {
    id: 'card-09',
    code: 'SD-CARD-009',
    category: 'Group',
    theme: 'interaction',
    title: 'Bắt Cặp Bắn Tim',
    mission: 'Người rút bài chọn 1 bạn và cả hai cùng ghép tay tạo thành hình trái tim K-pop hoàn chỉnh. Bằng chứng: 01 bức ảnh chụp khoảnh khắc đan tay bắn tim.',
    difficulty: 2,
    xp: 20,
    tags: ["interaction","friends","photo"],
  },
  {
    id: 'card-10',
    code: 'SD-CARD-010',
    category: 'Group',
    theme: 'interaction',
    title: 'Nhìn Vào Mắt Nhau',
    mission: 'Chọn 1 bạn bất kỳ và nhìn thẳng vào mắt nhau trong 10 giây mà người rút bài không được bật cười. Bằng chứng: 01 video đếm ngược 10 giây nỗ lực nhịn cười.',
    difficulty: 3,
    xp: 30,
    tags: ["interaction","funny","video"],
  },
  {
    id: 'card-11',
    code: 'SD-CARD-011',
    category: 'Group',
    theme: 'interaction',
    title: 'Tựa Vai Thanh Xuân',
    mission: 'Người rút bài mượn vai của bạn ngồi kế bên tựa vào nhẹ nhàng để lưu lại khoảnh khắc ấm áp. Bằng chứng: 01 bức ảnh thanh xuân rực rỡ.',
    difficulty: 2,
    xp: 20,
    tags: ["interaction","friends","photo"],
  },
  {
    id: 'card-12',
    code: 'SD-CARD-012',
    category: 'Group',
    theme: 'interaction',
    title: 'Bắt Tay Phong Cách Hip-hop',
    mission: 'Người rút bài tự sáng tạo một kiểu bắt tay hoặc đập tay độc lạ với 1 bạn chơi và thực hiện lại mượt mà. Bằng chứng: 01 video ngắn ghi lại cú đập tay nghệ thuật.',
    difficulty: 3,
    xp: 30,
    tags: ["interaction","movement","video"],
  },
  {
    id: 'card-13',
    code: 'SD-CARD-013',
    category: 'Creative',
    theme: 'creative',
    title: 'Quán Quân Biến Hóa',
    mission: 'Người rút bài dùng 3 vật dụng có sẵn trên bàn (ống hút, đĩa, khăn giấy) xếp thành một biểu tượng hoặc khuôn mặt vui nhộn. Bằng chứng: 01 bức ảnh tác phẩm sáng tạo cá nhân.',
    difficulty: 3,
    xp: 30,
    tags: ["creative","props","photo"],
  },
  {
    id: 'card-14',
    code: 'SD-CARD-014',
    category: 'Creative',
    theme: 'creative',
    title: 'Góc Nhìn Đánh Lừa',
    mission: 'Tự căn góc chụp sao cho bàn tay người rút bài trông như đang cầm hoặc nắm chiếc ly của bạn ngồi xa hơn. Bằng chứng: 01 bức ảnh đánh lừa thị giác.',
    difficulty: 3,
    xp: 30,
    tags: ["creative","perspective","photo"],
  },
  {
    id: 'card-15',
    code: 'SD-CARD-015',
    category: 'Creative',
    theme: 'creative',
    title: 'Săn Đồ Vật Theo Màu',
    mission: 'Trong 30 giây, người rút bài phải tìm và gom đủ 3 món đồ có cùng màu sắc ngay tại không gian bàn chơi. Bằng chứng: 01 bức ảnh người chơi tạo dáng cùng 3 món đồ vừa gom được.',
    difficulty: 3,
    xp: 30,
    tags: ["creative","speed","photo"],
  },
  {
    id: 'card-16',
    code: 'SD-CARD-016',
    category: 'Creative',
    theme: 'creative',
    title: 'Đại Sứ Sản Phẩm',
    mission: 'Cầm 1 món đồ bất kỳ trên bàn (chai nước, hộp tăm...) và tạo dáng quảng cáo chuyên nghiệp cho sản phẩm đó. Bằng chứng: 01 bức ảnh dáng pose đại sứ thương hiệu.',
    difficulty: 2,
    xp: 25,
    tags: ["creative","advertising","photo"],
  },
  {
    id: 'card-17',
    code: 'SD-CARD-017',
    category: 'Spicy',
    theme: 'expression',
    title: 'Giữ Mặt “Lạnh Như Băng”',
    mission: 'Người rút bài phải giữ khuôn mặt lạnh lùng hoặc nghiêm túc trong 15 giây mặc cho cả nhóm tìm cách chọc cười. Bằng chứng: 01 video 15 giây thử thách bản lĩnh giữ cơ mặt.',
    difficulty: 3,
    xp: 30,
    tags: ["expression","funny","video"],
  },
  {
    id: 'card-18',
    code: 'SD-CARD-018',
    category: 'Spicy',
    theme: 'expression',
    title: 'Recreate Meme Cá Nhân',
    mission: 'Người rút bài chọn 1 meme nổi tiếng (như cụ ông cười trừ hoặc chú mèo hoang mang) và dùng chính khuôn mặt mình mô phỏng lại. Bằng chứng: 01 bức ảnh biểu cảm chuẩn meme.',
    difficulty: 3,
    xp: 30,
    tags: ["expression","meme","photo"],
  },
  {
    id: 'card-19',
    code: 'SD-CARD-019',
    category: 'Spicy',
    theme: 'expression',
    title: 'Lời Khen Chân Thành',
    mission: 'Chọn 1 người trong nhóm và nói ra 1 điểm mà bạn thấy quý mến hoặc ấn tượng nhất ở bạn đó. Bằng chứng: 01 bức ảnh người rút bài tạo dáng thả tim bên cạnh người được khen.',
    difficulty: 2,
    xp: 20,
    tags: ["expression","friends","photo"],
  },
  {
    id: 'card-20',
    code: 'SD-CARD-020',
    category: 'Spicy',
    theme: 'expression',
    title: 'Bí Mật Báo Báo',
    mission: 'Chia sẻ 1 thói quen hoặc sự thật vui ngộ nghĩnh của bản thân mà nhóm bạn chưa từng biết. Bằng chứng: 01 bức ảnh tạo dáng ngượng ngùng vui vẻ sau khi chia sẻ.',
    difficulty: 2,
    xp: 20,
    tags: ["expression","truth","photo"],
  },
  {
    id: 'card-21',
    code: 'SD-CARD-021',
    category: 'Action',
    theme: 'speed',
    title: 'Thần Thái 3 Giây',
    mission: 'Quét QR để kích hoạt đếm ngược 3 giây; người rút bài phải lập tức bắn dáng cực ngầu trước camera. Bằng chứng: 01 bức ảnh chụp nhanh khoảnh khắc tự động.',
    difficulty: 3,
    xp: 30,
    tags: ["speed","pose","photo"],
  },
  {
    id: 'card-22',
    code: 'SD-CARD-022',
    category: 'Action',
    theme: 'speed',
    title: 'Thám Tử Giấu Đồ',
    mission: 'Giấu 1 vật nhỏ (như đồng xu hoặc nắp chai) vào 1 trong 2 bàn tay, giơ ra chụp ảnh để các bạn khác đoán tay nào giữ đồ. Bằng chứng: 01 bức ảnh tạo dáng bí ẩn với 2 nắm tay.',
    difficulty: 3,
    xp: 30,
    tags: ["speed","mystery","photo"],
  },
  {
    id: 'card-23',
    code: 'SD-CARD-023',
    category: 'Action',
    theme: 'speed',
    title: 'Vũ Điệu 5 Giây',
    mission: 'Thực hiện một động tác nhảy hoặc quẩy ngẫu hứng ngắn 5 giây ngay tại chỗ ngồi. Bằng chứng: 01 video ngắn ghi lại điệu nhảy vui nhộn.',
    difficulty: 3,
    xp: 30,
    tags: ["speed","dance","video"],
  },
  {
    id: 'card-24',
    code: 'SD-CARD-024',
    category: 'Action',
    theme: 'speed',
    title: 'Đố Vui Chi Tiết',
    mission: 'Người rút bài chỉ ra 1 chi tiết nhỏ trên trang phục hoặc phụ kiện của 1 bạn chơi mà ít ai chú ý đến. Bằng chứng: 01 bức ảnh chỉ tay vào chi tiết độc đáo đó.',
    difficulty: 2,
    xp: 25,
    tags: ["speed","observation","photo"],
  }
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
