import { Room } from '../models/Room.js';

// Lấy thông tin phòng qua mã roomCode
export const getRoom = async (req, res) => {
  try {
    const { roomCode } = req.params;
    const room = await Room.findOne({ roomCode: roomCode.toUpperCase() }).populate('activeCard');
    if (!room) {
      return res.status(404).json({ success: false, message: 'Phòng chơi không tồn tại!' });
    }
    res.json({ success: true, data: room });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Khởi tạo phòng mới (Host)
export const createRoom = async (req, res) => {
  try {
    const { roomCode, theme, mode, hostName } = req.body;
    const code = roomCode || `ROOM-${Math.floor(1000 + Math.random() * 9000)}`;

    const newRoom = await Room.create({
      roomCode: code,
      theme: theme || 'party',
      mode: mode || 'spicy',
      hostName: hostName || 'Host',
      players: [
        {
          id: `p-${Date.now()}`,
          name: hostName || 'Host',
          avatar: `https://api.dicebear.com/7.x/bottts/svg?seed=${hostName || 'Host'}`,
          score: 0,
          streak: 0,
          badges: ['👑 Host'],
        },
      ],
    });

    res.status(201).json({ success: true, data: newRoom });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
};

// Người chơi tham gia phòng qua mã QR
export const joinRoom = async (req, res) => {
  try {
    const { roomCode } = req.params;
    const { playerName } = req.body;

    const room = await Room.findOne({ roomCode: roomCode.toUpperCase() });
    if (!room) {
      return res.status(404).json({ success: false, message: 'Phòng không tồn tại!' });
    }

    const newPlayer = {
      id: `p-${Date.now()}`,
      name: playerName || `Player ${room.players.length + 1}`,
      avatar: `https://api.dicebear.com/7.x/bottts/svg?seed=${playerName || Date.now()}`,
      score: 0,
      streak: 0,
      badges: ['⚡ Newbie'],
    };

    room.players.push(newPlayer);
    await room.save();

    res.json({ success: true, data: room, player: newPlayer });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
};
