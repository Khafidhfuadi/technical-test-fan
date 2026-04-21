/**
 * Integration Tests: Auth Flow
 *
 * Supertest hits the real Express app without starting a server.
 * Prisma, Redis, bcrypt (hashing), dan email di-mock agar test tidak
 * butuh koneksi nyata ke DB / Redis / SMTP.
 *
 * Error response format: { error: { code, message } }
 */

// ─── Set env vars sebelum modul apapun dimuat ────────────────────────────────
process.env.JWT_SECRET = 'test-integration-secret';
process.env.JWT_EXPIRES_IN = '15m';

// ─── Mock declarations (hoisted oleh Jest) ───────────────────────────────────
jest.mock('../../utils/prisma', () => ({
  prisma: {
    user: {
      findUnique: jest.fn(),
      findFirst: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    },
    book: {
      findUnique: jest.fn(),
      findMany: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
      count: jest.fn(),
    },
  },
}));

jest.mock('../../utils/redis', () => ({
  redis: {
    get: jest.fn().mockResolvedValue(null),
    set: jest.fn().mockResolvedValue('OK'),
    del: jest.fn().mockResolvedValue(1),
    keys: jest.fn().mockResolvedValue([]),
    incr: jest.fn().mockResolvedValue(1),    // rate limiter
    expire: jest.fn().mockResolvedValue(1),  // rate limiter
  },
}));

// Mock email agar tidak ada koneksi SMTP saat test
jest.mock('../../utils/email', () => ({
  sendEmail: jest.fn().mockResolvedValue(undefined),
}));

// Mock bcrypt agar test register/login tidak lambat karena real hashing
jest.mock('bcrypt', () => ({
  hash: jest.fn().mockResolvedValue('$2b$10$mockedHashValue'),
  compare: jest.fn(),
}));

// ─── Imports ──────────────────────────────────────────────────────────────────
import { request } from '../helpers/testApp';
import { prisma } from '../../utils/prisma';
import { redis } from '../../utils/redis';
import { sendEmail } from '../../utils/email';
import bcrypt from 'bcrypt';

// ─── Typed mocks ──────────────────────────────────────────────────────────────
const user = prisma.user as jest.Mocked<typeof prisma.user>;
const mockRedis = redis as jest.Mocked<typeof redis>;
const mockSendEmail = sendEmail as jest.Mock;
const mockBcrypt = bcrypt as jest.Mocked<typeof bcrypt>;

// ─── Dummy test user ──────────────────────────────────────────────────────────
const testUser = {
  id: 'user-id-001',
  name: 'Test User',
  email: 'test@example.com',
  password: '$2b$10$mockedHashValue',
  isEmailVerified: true,
  emailVerificationToken: null,
  passwordResetToken: null,
  passwordResetExpires: null,
  createdAt: new Date(),
  updatedAt: new Date(),
};

// ══════════════════════════════════════════════════════════════════════════════
// POST /api/auth/register
// ══════════════════════════════════════════════════════════════════════════════
describe('POST /api/auth/register', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockSendEmail.mockResolvedValue(undefined);
  });

  test('201 — should register user and return success message', async () => {
    // User belum ada → create berhasil → email terkirim
    (user.findUnique as jest.Mock).mockResolvedValue(null);
    (user.create as jest.Mock).mockResolvedValue(testUser);

    const res = await request
      .post('/api/auth/register')
      .send({ name: 'Test User', email: 'new@example.com', password: 'password123' });

    expect(res.status).toBe(201);
    expect(res.body.message).toBeDefined();
    expect(mockSendEmail).toHaveBeenCalledTimes(1);
  });

  test('400 — should return conflict if email already exists', async () => {
    // Prisma menemukan user dengan email yang sama
    (user.findUnique as jest.Mock).mockResolvedValue(testUser);

    const res = await request
      .post('/api/auth/register')
      .send({ name: 'Test User', email: 'test@example.com', password: 'password123' });

    expect(res.status).toBe(400);
    expect(res.body.error.message).toContain('already in use');
  });

  test('400 — should return validation error if email format invalid', async () => {
    const res = await request
      .post('/api/auth/register')
      .send({ name: 'Test User', email: 'not-an-email', password: 'password123' });

    expect(res.status).toBe(400);
    expect(res.body.error).toBeDefined();
  });

  test('400 — should return validation error if password less than 8 chars', async () => {
    const res = await request
      .post('/api/auth/register')
      .send({ name: 'Test User', email: 'test@example.com', password: 'short' });

    expect(res.status).toBe(400);
    expect(res.body.error.message).toContain('8 characters');
  });

  test('400 — should return validation error if name is empty', async () => {
    const res = await request
      .post('/api/auth/register')
      .send({ name: '', email: 'test@example.com', password: 'password123' });

    expect(res.status).toBe(400);
    expect(res.body.error).toBeDefined();
  });
});

// ══════════════════════════════════════════════════════════════════════════════
// POST /api/auth/login
// ══════════════════════════════════════════════════════════════════════════════
describe('POST /api/auth/login', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockRedis.set.mockResolvedValue('OK' as any);
  });

  test('200 — should return accessToken and user data on valid credentials', async () => {
    (user.findUnique as jest.Mock).mockResolvedValue(testUser);
    (mockBcrypt.compare as jest.Mock).mockResolvedValue(true);

    const res = await request
      .post('/api/auth/login')
      .send({ email: 'test@example.com', password: 'password123' });

    expect(res.status).toBe(200);
    expect(res.body.accessToken).toBeDefined();
    expect(res.body.user).toBeDefined();
    expect(res.body.user.email).toBe('test@example.com');
  });

  test('403 — should return forbidden if email not yet verified', async () => {
    const unverifiedUser = { ...testUser, isEmailVerified: false };
    (user.findUnique as jest.Mock).mockResolvedValue(unverifiedUser);
    (mockBcrypt.compare as jest.Mock).mockResolvedValue(true);

    const res = await request
      .post('/api/auth/login')
      .send({ email: 'test@example.com', password: 'password123' });

    expect(res.status).toBe(403);
    expect(res.body.error.message).toContain('verify your email');
  });

  test('401 — should return unauthorized if password is wrong', async () => {
    (user.findUnique as jest.Mock).mockResolvedValue(testUser);
    (mockBcrypt.compare as jest.Mock).mockResolvedValue(false); // password salah

    const res = await request
      .post('/api/auth/login')
      .send({ email: 'test@example.com', password: 'wrongpassword' });

    expect(res.status).toBe(401);
    expect(res.body.error.message).toContain('Incorrect email or password');
  });

  test('401 — should return unauthorized if email not found', async () => {
    (user.findUnique as jest.Mock).mockResolvedValue(null); // user tidak ada

    const res = await request
      .post('/api/auth/login')
      .send({ email: 'nobody@example.com', password: 'password123' });

    expect(res.status).toBe(401);
    expect(res.body.error.message).toContain('Incorrect email or password');
  });

  test('400 — should return validation error if email format invalid', async () => {
    const res = await request
      .post('/api/auth/login')
      .send({ email: 'bademail', password: 'password123' });

    expect(res.status).toBe(400);
    expect(res.body.error).toBeDefined();
  });
});

// ══════════════════════════════════════════════════════════════════════════════
// GET /api/auth/verify-email
// ══════════════════════════════════════════════════════════════════════════════
describe('GET /api/auth/verify-email', () => {
  beforeEach(() => jest.clearAllMocks());

  test('200 — should verify email with valid token', async () => {
    const unverifiedUser = { ...testUser, isEmailVerified: false, emailVerificationToken: 'valid-token-abc' };
    (user.findFirst as jest.Mock).mockResolvedValue(unverifiedUser);
    (user.update as jest.Mock).mockResolvedValue({ ...unverifiedUser, isEmailVerified: true });

    const res = await request.get('/api/auth/verify-email?token=valid-token-abc');

    expect(res.status).toBe(200);
    expect(res.body.message).toContain('verified');
  });

  test('400 — should return error if token is invalid (not found in DB)', async () => {
    (user.findFirst as jest.Mock).mockResolvedValue(null); // token tidak dikenal

    const res = await request.get('/api/auth/verify-email?token=invalid-token-xyz');

    expect(res.status).toBe(400);
    expect(res.body.error.message).toContain('invalid or has expired');
  });

  test('400 — should return error if token query param is missing', async () => {
    const res = await request.get('/api/auth/verify-email');

    expect(res.status).toBe(400);
    expect(res.body.error).toBeDefined();
  });
});

// ══════════════════════════════════════════════════════════════════════════════
// POST /api/auth/forgot-password
// ══════════════════════════════════════════════════════════════════════════════
describe('POST /api/auth/forgot-password', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockSendEmail.mockResolvedValue(undefined);
  });

  test('200 — should send reset email for existing user', async () => {
    (user.findUnique as jest.Mock).mockResolvedValue(testUser);
    (user.update as jest.Mock).mockResolvedValue(testUser);

    const res = await request
      .post('/api/auth/forgot-password')
      .send({ email: 'test@example.com' });

    expect(res.status).toBe(200);
    expect(res.body.message).toContain('email sent');
    expect(mockSendEmail).toHaveBeenCalledTimes(1);
  });

  test('404 — should return not found for unknown email', async () => {
    (user.findUnique as jest.Mock).mockResolvedValue(null);

    const res = await request
      .post('/api/auth/forgot-password')
      .send({ email: 'unknown@example.com' });

    expect(res.status).toBe(404);
    expect(res.body.error.message).toContain('no user with that email');
  });

  test('400 — should return validation error for invalid email format', async () => {
    const res = await request
      .post('/api/auth/forgot-password')
      .send({ email: 'not-valid-email' });

    expect(res.status).toBe(400);
    expect(res.body.error).toBeDefined();
  });
});

// ══════════════════════════════════════════════════════════════════════════════
// POST /api/auth/reset-password
// ══════════════════════════════════════════════════════════════════════════════
describe('POST /api/auth/reset-password', () => {
  beforeEach(() => jest.clearAllMocks());

  test('200 — should reset password with valid token', async () => {
    const userWithReset = {
      ...testUser,
      passwordResetToken: 'valid-reset-token',
      passwordResetExpires: new Date(Date.now() + 3600000), // 1 jam ke depan
    };
    (user.findFirst as jest.Mock).mockResolvedValue(userWithReset);
    (user.update as jest.Mock).mockResolvedValue(userWithReset);
    mockRedis.del.mockResolvedValue(1 as any);

    const res = await request
      .post('/api/auth/reset-password')
      .send({ token: 'valid-reset-token', newPassword: 'newPassword123' });

    expect(res.status).toBe(200);
    expect(res.body.message).toContain('Password reset successful');
  });

  test('400 — should return error for expired or invalid token', async () => {
    (user.findFirst as jest.Mock).mockResolvedValue(null); // token tidak valid / sudah expire

    const res = await request
      .post('/api/auth/reset-password')
      .send({ token: 'expired-or-invalid', newPassword: 'newPassword123' });

    expect(res.status).toBe(400);
    expect(res.body.error.message).toContain('invalid or has expired');
  });

  test('400 — should return validation error if newPassword too short', async () => {
    const res = await request
      .post('/api/auth/reset-password')
      .send({ token: 'any-token', newPassword: 'short' });

    expect(res.status).toBe(400);
    expect(res.body.error.message).toContain('8 characters');
  });
});
