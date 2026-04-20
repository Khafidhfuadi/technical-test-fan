import { Router } from 'express';
import { register, verifyEmail, login, logout, forgotPassword, resetPassword } from '../controllers/auth.controller';
import { rateLimiter } from '../middlewares/rateLimit.middleware';
import { authenticate } from '../middlewares/auth.middleware';

const router = Router();

// Apply a strict rate limit for authentication routes
const authRateLimiter = rateLimiter({ limit: 10, windowSecs: 60 * 15, prefix: 'auth' });

router.post('/register', authRateLimiter, register);
router.post('/login', authRateLimiter, login);
router.get('/verify-email', verifyEmail);
router.post('/forgot-password', authRateLimiter, forgotPassword);
router.post('/reset-password', authRateLimiter, resetPassword);
router.post('/logout', authenticate, logout);

export default router;
