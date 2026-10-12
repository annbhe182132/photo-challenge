import { Router } from 'express';
import { getRoom, createRoom, joinRoom } from '../controllers/roomController.js';

const router = Router();

router.post('/', createRoom);
router.get('/:roomCode', getRoom);
router.post('/:roomCode/join', joinRoom);

export default router;
