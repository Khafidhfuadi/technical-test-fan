import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';

const JWT_SECRET = process.env.JWT_SECRET || 'supersecret_jwt_key';
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '15m';

/**
 * Hash a plaintext password using bcrypt with salt rounds of 10.
 */
export const hashPassword = async (password: string): Promise<string> => {
  return bcrypt.hash(password, 10);
};

/**
 * Compare a plaintext password against a bcrypt hash.
 */
export const comparePassword = async (
  password: string,
  hash: string
): Promise<boolean> => {
  return bcrypt.compare(password, hash);
};

/**
 * Generate a signed JWT access token for the given user ID.
 */
export const generateAccessToken = (userId: string): string => {
  return jwt.sign({ id: userId }, JWT_SECRET, {
    expiresIn: JWT_EXPIRES_IN as any,
  });
};

/**
 * Verify and decode a JWT token. Throws if invalid or expired.
 */
export const verifyToken = (token: string): jwt.JwtPayload => {
  return jwt.verify(token, JWT_SECRET) as jwt.JwtPayload;
};

/**
 * Generate a cryptographically secure random hex token (64 chars = 32 bytes).
 */
export const generateEmailVerificationToken = (): string => {
  return crypto.randomBytes(32).toString('hex');
};
