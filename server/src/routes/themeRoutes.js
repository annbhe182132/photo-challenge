import { Router } from 'express';
import { getThemes } from '../controllers/themeController.js';

const router = Router();
router.get('/', getThemes);

export default router;
