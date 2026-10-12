import { Router } from 'express';
import { getPunishments } from '../controllers/punishmentController.js';

const router = Router();
router.get('/', getPunishments);

export default router;
