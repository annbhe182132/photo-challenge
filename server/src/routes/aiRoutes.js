import { Router } from 'express';
import { verifyPhoto } from '../controllers/aiController.js';

const router = Router();
router.post('/verify', verifyPhoto);

export default router;
