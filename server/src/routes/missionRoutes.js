
import { Router } from 'express';
import { getMissionByQR } from '../controllers/missionController.js';

const router = Router();

router.get('/qr/:qrKey', getMissionByQR);

export default router;
