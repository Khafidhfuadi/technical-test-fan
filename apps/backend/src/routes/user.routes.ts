import { Router } from 'express';
import { getUsers, updateProfile, changePassword } from '../controllers/user.controller';
import { authenticate } from '../middlewares/auth.middleware';

const router = Router();

router.get('/', authenticate, getUsers);
router.put('/profile', authenticate, updateProfile);
router.put('/change-password', authenticate, changePassword);

export default router;
