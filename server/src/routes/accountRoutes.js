import { Router } from 'express';
import {
  addPhotoToAccountAlbum,
  createAccountAlbum,
  getAccountAlbums,
  getAccountProfile,
  loginAccount,
  registerAccount,
  requireAccount,
} from '../controllers/accountController.js';

const router = Router();
router.post('/register', registerAccount);
router.post('/login', loginAccount);
router.get('/me', requireAccount, getAccountProfile);
router.get('/albums', requireAccount, getAccountAlbums);
router.post('/albums', requireAccount, createAccountAlbum);
router.post('/albums/:albumId/photos', requireAccount, addPhotoToAccountAlbum);
export default router;
