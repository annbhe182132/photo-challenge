import { Router } from 'express';
import { getAlbums, addPhotoToAlbum } from '../controllers/galleryController.js';

const router = Router();

router.get('/', getAlbums);
router.post('/photo', addPhotoToAlbum);

export default router;
