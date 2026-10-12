import { Router } from 'express';
import { getCards, getCardByCode, createCard } from '../controllers/cardController.js';

const router = Router();

router.get('/', getCards);
router.get('/:code', getCardByCode);
router.post('/', createCard);

export default router;
