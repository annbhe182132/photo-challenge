import React, { createContext, useContext, useState } from 'react';
import { DECK_CARDS, INITIAL_PLAYERS, type PhysicalCard, type Player, THEMES, type ThemeOption } from '../data/gameData';
import { sound } from '../utils/soundEngine';

export interface GalleryPhoto {
  id: string;
  round: number;
  image: string;
  cardTitle: string;
  score: number;
  mission: string;
}

export interface GalleryAlbum {
  id: string;
  roomCode: string;
  themeName: string;
  themeIcon: string;
  date: string;
  coverImage: string;
  photos: GalleryPhoto[];
}

export const INITIAL_ALBUMS: GalleryAlbum[] = [
  {
    id: 'album-1',
    roomCode: 'ROOM-8899',
    themeName: 'Party Đêm Đỉnh Cao',
    themeIcon: '🎉',
    date: new Date().toLocaleDateString('vi-VN'),
    coverImage: 'https://images.unsplash.com/photo-1511632765486-a01980e01a18?w=800&auto=format&fit=crop&q=80',
    photos: [
      {
        id: 'p-101',
        round: 1,
        image: 'https://images.unsplash.com/photo-1511632765486-a01980e01a18?w=800&auto=format&fit=crop&q=80',
        cardTitle: 'Cạn Ly Đồng Điệu',
        score: 96,
        mission: 'Cùng 3 người bạn nâng cốc và hô 23 Dzô!',
      },
      {
        id: 'p-102',
        round: 2,
        image: 'https://images.unsplash.com/photo-1528605248644-14dd04022da1?w=800&auto=format&fit=crop&q=80',
        cardTitle: 'Cú Bay Bất Tận',
        score: 91,
        mission: 'Tạo dáng cả nhóm đang bay chân không chạm đất!',
      },
      {
        id: 'p-103',
        round: 3,
        image: 'https://images.unsplash.com/photo-1543807535-eceef0bc6599?w=800&auto=format&fit=crop&q=80',
        cardTitle: 'Poster Phim Siêu Cấp',
        score: 98,
        mission: 'Tạo dáng Biệt Đội Siêu Anh Hùng như poster điện ảnh!',
      },
    ],
  },
  {
    id: 'album-2',
    roomCode: 'ROOM-7722',
    themeName: 'Team Building Gắn Kết',
    themeIcon: '🔥',
    date: new Date().toLocaleDateString('vi-VN'),
    coverImage: 'https://images.unsplash.com/photo-1529156069898-49953e39b3ac?w=800&auto=format&fit=crop&q=80',
    photos: [
      {
        id: 'p-201',
        round: 1,
        image: 'https://images.unsplash.com/photo-1529156069898-49953e39b3ac?w=800&auto=format&fit=crop&q=80',
        cardTitle: 'Tình Mẫu Tử Thiêng Liêng',
        score: 94,
        mission: 'Hai người chơi nhập vai Mẹ & Con ôm nhau ấm áp!',
      },
      {
        id: 'p-202',
        round: 2,
        image: 'https://images.unsplash.com/photo-1492684223066-81342ee5ff30?w=800&auto=format&fit=crop&q=80',
        cardTitle: 'Góc Nhìn Khổng Lồ',
        score: 89,
        mission: 'Tạo hiệu ứng góc nhìn như đang nuốt trọn đồng đội!',
      },
      {
        id: 'p-203',
        round: 3,
        image: 'https://images.unsplash.com/photo-1517457373958-b7bdd4587205?w=800&auto=format&fit=crop&q=80',
        cardTitle: 'Tia Sét Biểu Cảm',
        score: 95,
        mission: '5 người chơi làm 5 biểu cảm khác nhau hoàn toàn!',
      },
    ],
  },
  {
    id: 'album-3',
    roomCode: 'ROOM-5511',
    themeName: 'Du Lịch Khám Phá',
    themeIcon: '✈️',
    date: new Date().toLocaleDateString('vi-VN'),
    coverImage: 'https://images.unsplash.com/photo-1488646953014-85cb44e25828?w=800&auto=format&fit=crop&q=80',
    photos: [
      {
        id: 'p-301',
        round: 1,
        image: 'https://images.unsplash.com/photo-1488646953014-85cb44e25828?w=800&auto=format&fit=crop&q=80',
        cardTitle: 'Check-in Hoàng Hôn',
        score: 97,
        mission: 'Tạo dáng khoảnh khắc khung hình ngược sáng nghệ thuật!',
      },
      {
        id: 'p-302',
        round: 2,
        image: 'https://images.unsplash.com/photo-1539635273304-0e8723e07312?w=800&auto=format&fit=crop&q=80',
        cardTitle: 'Cú Nhảy Đồng Bộ',
        score: 92,
        mission: 'Nhảy cao cùng lúc bắt trọn khoảnh khắc giữa không trung!',
      },
      {
        id: 'p-303',
        round: 3,
        image: 'https://images.unsplash.com/photo-1469854523086-cc02fe5d8800?w=800&auto=format&fit=crop&q=80',
        cardTitle: 'Biểu Cảm Nhí Nhảnh',
        score: 90,
        mission: 'Tạo dáng hài hước trước cảnh thiên nhiên kỳ vĩ!',
      },
    ],
  },
];

interface GameContextType {
  roomCode: string;
  setRoomCode: (code: string) => void;
  theme: ThemeOption;
  setTheme: (theme: ThemeOption) => void;
  mode: 'casual' | 'speedrun' | 'spicy';
  setMode: (mode: 'casual' | 'speedrun' | 'spicy') => void;
  players: Player[];
  setPlayers: React.Dispatch<React.SetStateAction<Player[]>>;
  getCurrentPlayer: (r?: number) => Player;
  addScoreToPlayer: (playerId: string, xp: number) => void;
  soundEnabled: boolean;
  toggleSound: () => void;
  investorMode: boolean;
  toggleInvestorMode: () => void;
  currentRound: number;
  setCurrentRound: (r: number) => void;
  activeCard: PhysicalCard;
  setActiveCard: (card: PhysicalCard) => void;
  albums: GalleryAlbum[];
  addPhotoToCurrentAlbum: (photo: Omit<GalleryPhoto, 'id'>) => void;
  resetGame: () => void;
}

const GameContext = createContext<GameContextType | undefined>(undefined);

export const GameProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [roomCode, setRoomCode] = useState('ROOM-8899');
  const [theme, setTheme] = useState<ThemeOption>(THEMES[0]);
  const [mode, setMode] = useState<'casual' | 'speedrun' | 'spicy'>('spicy');
  const [players, setPlayers] = useState<Player[]>(INITIAL_PLAYERS);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [investorMode, setInvestorMode] = useState(true);
  const [currentRound, setCurrentRound] = useState(1);
  const [activeCard, setActiveCard] = useState<PhysicalCard>(DECK_CARDS[0]);
  const [albums, setAlbums] = useState<GalleryAlbum[]>(INITIAL_ALBUMS);

  const getCurrentPlayer = (r?: number): Player => {
    const targetRound = r ?? currentRound;
    const index = (targetRound - 1) % (players.length || 1);
    return players[index] || INITIAL_PLAYERS[0];
  };

  const addScoreToPlayer = (playerId: string, xp: number) => {
    setPlayers((prev) =>
      prev.map((p) => (p.id === playerId ? { ...p, score: p.score + xp } : p))
    );
  };

  const toggleSound = () => {
    const nextState = !soundEnabled;
    sound.enabled = nextState;
    setSoundEnabled(nextState);
    if (nextState) sound.playClick();
  };

  const toggleInvestorMode = () => {
    setInvestorMode((prev) => !prev);
    sound.playClick();
  };

  const addPhotoToCurrentAlbum = (photoData: Omit<GalleryPhoto, 'id'>) => {
    const newPhoto: GalleryPhoto = {
      id: `p-${Date.now()}`,
      ...photoData,
    };

    setAlbums((prev) => {
      // Find active room album or prepend to the first album
      const targetAlbumIndex = prev.findIndex((a) => a.roomCode === roomCode);
      if (targetAlbumIndex >= 0) {
        const updated = [...prev];
        updated[targetAlbumIndex] = {
          ...updated[targetAlbumIndex],
          photos: [newPhoto, ...updated[targetAlbumIndex].photos],
        };
        return updated;
      } else {
        // Create new album for current room
        const newAlbum: GalleryAlbum = {
          id: `album-${Date.now()}`,
          roomCode,
          themeName: theme.name,
          themeIcon: theme.icon,
          date: new Date().toLocaleDateString('vi-VN'),
          coverImage: newPhoto.image,
          photos: [newPhoto],
        };
        return [newAlbum, ...prev];
      }
    });
  };

  const resetGame = () => {
    setCurrentRound(1);
    setActiveCard(DECK_CARDS[0]);
    setPlayers(INITIAL_PLAYERS);
  };

  return (
    <GameContext.Provider
      value={{
        roomCode,
        setRoomCode,
        theme,
        setTheme,
        mode,
        setMode,
        players,
        setPlayers,
        getCurrentPlayer,
        addScoreToPlayer,
        soundEnabled,
        toggleSound,
        investorMode,
        toggleInvestorMode,
        currentRound,
        setCurrentRound,
        activeCard,
        setActiveCard,
        albums,
        addPhotoToCurrentAlbum,
        resetGame,
      }}
    >
      {children}
    </GameContext.Provider>
  );
};

export const useGame = () => {
  const context = useContext(GameContext);
  if (!context) {
    throw new Error('useGame must be used within a GameProvider');
  }
  return context;
};
