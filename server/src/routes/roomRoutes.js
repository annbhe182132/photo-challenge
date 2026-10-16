import { Router } from 'express';
import {
  getRoom,
  createRoom,
  joinRoom,
  startRoom,
  startRoomTurn,
  pauseRoomTurn,
  createSubmission,
  voteOnSubmission,
  getRoomSubmissions,
  getRoomGallery,
  advanceRoom,
  skipRoomTurn,
} from '../controllers/roomController.js';

const router = Router();

router.post('/', createRoom);
router.get('/:roomCode', getRoom);
router.post('/:roomCode/join', joinRoom);
router.post('/:roomCode/start', startRoom);
router.post('/:roomCode/start-turn', startRoomTurn);
router.post('/:roomCode/pause-turn', pauseRoomTurn);
router.get('/:roomCode/submissions', getRoomSubmissions);
router.post('/:roomCode/submissions', createSubmission);
router.get('/:roomCode/gallery', getRoomGallery);
router.post('/:roomCode/advance', advanceRoom);
router.post('/:roomCode/skip', skipRoomTurn);
router.post('/submissions/:submissionId/votes', voteOnSubmission);

export default router;
