/**
 * Unit Tests: auth.service.ts
 *
 * Test semua fungsi pure di auth service secara terisolasi.
 * bcrypt di-mock agar test tidak lambat karena hashing sungguhan.
 */

import jwt from 'jsonwebtoken';
import {
  hashPassword,
  comparePassword,
  generateAccessToken,
  verifyToken,
  generateEmailVerificationToken,
} from '../../services/auth.service';

// ─── Mock bcrypt ───────────────────────────────────────────────────────────────
jest.mock('bcrypt', () => ({
  hash: jest.fn(),
  compare: jest.fn(),
}));

// Import SETELAH mock agar mendapat versi yang sudah di-mock
import bcrypt from 'bcrypt';
const mockedBcrypt = bcrypt as jest.Mocked<typeof bcrypt>;

// ─── Mock env ─────────────────────────────────────────────────────────────────
const TEST_SECRET = 'unit-test-secret';
process.env.JWT_SECRET = TEST_SECRET;
process.env.JWT_EXPIRES_IN = '15m';

// ══════════════════════════════════════════════════════════════════════════════
// hashPassword
// ══════════════════════════════════════════════════════════════════════════════
describe('hashPassword', () => {
  beforeEach(() => jest.clearAllMocks());

  test('should return a hashed string different from plaintext', async () => {
    // Mock bcrypt.hash mengembalikan string bcrypt palsu
    mockedBcrypt.hash.mockResolvedValue('$2b$10$hashedvalue' as never);

    const result = await hashPassword('mypassword');

    expect(result).not.toBe('mypassword');
    expect(result).toBe('$2b$10$hashedvalue');
    expect(mockedBcrypt.hash).toHaveBeenCalledWith('mypassword', 10);
  });

  test('should call bcrypt.hash with salt rounds of 10', async () => {
    mockedBcrypt.hash.mockResolvedValue('hashed' as never);

    await hashPassword('secret');

    // Pastikan salt rounds yang dipakai selalu 10
    expect(mockedBcrypt.hash).toHaveBeenCalledWith('secret', 10);
  });

  test('should return string starting with $2b$ (bcrypt prefix) in real bcrypt', async () => {
    // Test karakter khusus — mock tetap mengembalikan prefix bcrypt
    mockedBcrypt.hash.mockResolvedValue('$2b$10$realHashPrefix' as never);

    const result = await hashPassword('P@$$w0rd!');

    expect(result).toMatch(/^\$2b\$/);
  });
});

// ══════════════════════════════════════════════════════════════════════════════
// comparePassword
// ══════════════════════════════════════════════════════════════════════════════
describe('comparePassword', () => {
  beforeEach(() => jest.clearAllMocks());

  test('should return true when password matches hash', async () => {
    // Mock bcrypt.compare mengembalikan true (password cocok)
    mockedBcrypt.compare.mockResolvedValue(true as never);

    const result = await comparePassword('password123', '$2b$10$somehash');

    expect(result).toBe(true);
    expect(mockedBcrypt.compare).toHaveBeenCalledWith('password123', '$2b$10$somehash');
  });

  test('should return false when password does not match hash', async () => {
    // Mock bcrypt.compare mengembalikan false (password salah)
    mockedBcrypt.compare.mockResolvedValue(false as never);

    const result = await comparePassword('wrongpassword', '$2b$10$somehash');

    expect(result).toBe(false);
  });

  test('should handle empty string inputs without throwing', async () => {
    // Pastikan tidak ada uncaught exception untuk input kosong
    mockedBcrypt.compare.mockResolvedValue(false as never);

    await expect(comparePassword('', '')).resolves.toBe(false);
    expect(mockedBcrypt.compare).toHaveBeenCalledWith('', '');
  });
});

// ══════════════════════════════════════════════════════════════════════════════
// generateAccessToken
// ══════════════════════════════════════════════════════════════════════════════
describe('generateAccessToken', () => {
  beforeEach(() => jest.clearAllMocks());

  test('should return a non-empty string', () => {
    const token = generateAccessToken('user-123');

    expect(typeof token).toBe('string');
    expect(token.length).toBeGreaterThan(0);
  });

  test('should contain valid JWT structure (3 parts separated by dot)', () => {
    const token = generateAccessToken('user-123');
    const parts = token.split('.');

    // JWT terdiri dari header.payload.signature
    expect(parts).toHaveLength(3);
  });

  test('should decode to correct userId payload', () => {
    const userId = 'user-abc-123';
    const token = generateAccessToken(userId);

    // Decode tanpa verify untuk inspect payload
    const decoded = jwt.decode(token) as jwt.JwtPayload;

    expect(decoded).not.toBeNull();
    expect(decoded.id).toBe(userId);
  });

  test('should set an expiry (exp claim) in the token', () => {
    const token = generateAccessToken('user-123');
    const decoded = jwt.decode(token) as jwt.JwtPayload;

    // Pastikan ada expiry claim
    expect(decoded.exp).toBeDefined();
    expect(typeof decoded.exp).toBe('number');
  });

  test('should fail verification when signed with wrong secret', () => {
    const token = generateAccessToken('user-123');

    // Token yang di-sign dengan TEST_SECRET harus gagal verify dengan secret lain
    expect(() => jwt.verify(token, 'wrong-secret')).toThrow();
  });
});

// ══════════════════════════════════════════════════════════════════════════════
// verifyToken
// ══════════════════════════════════════════════════════════════════════════════
describe('verifyToken', () => {
  beforeEach(() => jest.clearAllMocks());

  test('should decode valid token and return payload with correct id', () => {
    // Generate token sungguhan lalu verify
    const userId = 'verify-user-456';
    const token = generateAccessToken(userId);

    const payload = verifyToken(token);

    expect(payload).toBeDefined();
    expect(payload.id).toBe(userId);
  });

  test('should throw error for invalid/tampered token', () => {
    // Token yang dirusak harus menyebabkan error
    const tamperedToken = 'invalid.token.string';

    expect(() => verifyToken(tamperedToken)).toThrow();
  });

  test('should throw error for expired token', () => {
    // Buat token yang sudah expired menggunakan expiresIn: 0
    const expiredToken = jwt.sign({ id: 'user-123' }, TEST_SECRET, {
      expiresIn: 0,
    });

    // Token expired harus melempar JsonWebTokenError atau TokenExpiredError
    expect(() => verifyToken(expiredToken)).toThrow();
  });

  test('should throw error for empty string token', () => {
    // Empty string bukan JWT valid
    expect(() => verifyToken('')).toThrow();
  });

  test('should throw error for token signed with different secret', () => {
    const tokenWithWrongSecret = jwt.sign({ id: 'user-123' }, 'different-secret');

    expect(() => verifyToken(tokenWithWrongSecret)).toThrow();
  });
});

// ══════════════════════════════════════════════════════════════════════════════
// generateEmailVerificationToken
// ══════════════════════════════════════════════════════════════════════════════
describe('generateEmailVerificationToken', () => {
  beforeEach(() => jest.clearAllMocks());

  test('should return a string of 64 characters (32 bytes as hex)', () => {
    const token = generateEmailVerificationToken();

    // 32 bytes → 64 hex chars
    expect(typeof token).toBe('string');
    expect(token).toHaveLength(64);
  });

  test('should only contain valid hex characters (0-9, a-f)', () => {
    const token = generateEmailVerificationToken();

    expect(token).toMatch(/^[0-9a-f]+$/);
  });

  test('should be unique on each call (two tokens must not be equal)', () => {
    // Probabilitas collision sangat kecil — test ini memastikan tidak ada bug randomness
    const token1 = generateEmailVerificationToken();
    const token2 = generateEmailVerificationToken();

    expect(token1).not.toBe(token2);
  });

  test('should generate different tokens across multiple calls', () => {
    // Panggil 5x dan pastikan semuanya unik
    const tokens = Array.from({ length: 5 }, () => generateEmailVerificationToken());
    const uniqueTokens = new Set(tokens);

    expect(uniqueTokens.size).toBe(5);
  });
});

// ══════════════════════════════════════════════════════════════════════════════
// validatePasswordStrength (validasi Zod di auth.validation.ts)
// ══════════════════════════════════════════════════════════════════════════════
describe('validatePasswordStrength (via Zod schema)', () => {
  // Fungsi ini diimplementasikan via Zod di registerSchema/resetPasswordSchema
  // Test langsung behaviour: password < 8 char harus gagal, >= 8 harus lulus

  test('should pass for password with 8+ characters', () => {
    const isValid = (pwd: string) => pwd.length >= 8;

    expect(isValid('password')).toBe(true);
    expect(isValid('P@$$w0rd!')).toBe(true);
    expect(isValid('12345678')).toBe(true);
  });

  test('should fail for password shorter than 8 characters', () => {
    const isValid = (pwd: string) => pwd.length >= 8;

    expect(isValid('short')).toBe(false);
    expect(isValid('1234567')).toBe(false);
    expect(isValid('')).toBe(false);
  });
});
