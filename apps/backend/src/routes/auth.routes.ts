import { Router } from 'express';
import { register, verifyEmail } from '../controllers/auth.controller';
import { rateLimiter } from '../middlewares/rateLimit.middleware';

const router = Router();

// Apply a strict rate limit for authentication routes
const authRateLimiter = rateLimiter({ limit: 10, windowSecs: 60 * 15, prefix: 'auth' });

router.post('/register', authRateLimiter, register);
router.get('/verify-email', verifyEmail);

export default router;
