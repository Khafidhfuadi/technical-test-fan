// Auth helper — generate JWT token dan dummy user untuk test
// Import di test file: import { generateTestToken, createTestUser } from '../helpers/authHelper';

import jwt from 'jsonwebtoken';
import bcrypt from 'bcrypt';

// Gunakan secret yang sama dengan auth.middleware.ts agar valid di integration test
const JWT_SECRET = process.env.JWT_SECRET || 'supersecret_jwt_key';

/**
 * Generate valid JWT access token for test requests.
 * Pass the token as: Authorization: `Bearer ${token}`
 */
export const generateTestToken = (userId: string, email: string): string => {
  return jwt.sign({ id: userId, email }, JWT_SECRET, { expiresIn: '1h' });
};

/**
 * Create a dummy user object for use in mock responses.
 * Password is hashed synchronously (bcryptSync not available, uses sync workaround).
 */
export const createTestUser = () => {
  // Pre-hashed "password123" with bcrypt salt 10
  const hashedPassword = bcrypt.hashSync('password123', 10);

  return {
    id: 'test-user-id-123',
    name: 'Test User',
    email: 'test@example.com',
    password: hashedPassword,
    isEmailVerified: true,
    createdAt: new Date('2024-01-01T00:00:00Z'),
    updatedAt: new Date('2024-01-01T00:00:00Z'),
  };
};

/**
 * Create auth header object ready to spread into supertest .set()
 * Usage: request.get('/api/...').set(authHeader(token))
 */
export const authHeader = (token: string): Record<string, string> => ({
  Authorization: `Bearer ${token}`,
});
