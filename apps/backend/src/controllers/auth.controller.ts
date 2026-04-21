import { Request, Response } from 'express';
import bcrypt from 'bcrypt';
import crypto from 'crypto';
import { catchAsync } from '../utils/catchAsync';
import { prisma } from '../utils/prisma';
import { AppError } from '../utils/AppError';
import { sendEmail } from '../utils/email';
import {
  registerSchema,
  loginSchema,
  forgotPasswordSchema,
  resetPasswordSchema
} from '../validations/auth.validation';
import jwt from 'jsonwebtoken';
import { redis } from '../utils/redis';

export const register = catchAsync(async (req: Request, res: Response) => {
  const { name, email, password } = registerSchema.parse(req.body);

  const existingUser = await prisma.user.findUnique({ where: { email } });
  if (existingUser) {
    throw new AppError('Email is already in use', 400);
  }

  const hashedPassword = await bcrypt.hash(password, 10);
  const emailVerificationToken = crypto.randomBytes(32).toString('hex');

  const user = await prisma.user.create({
    data: {
      name,
      email,
      password: hashedPassword,
      emailVerificationToken,
    },
  });

  const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
  const verifyUrl = `${frontendUrl}/verify-email?token=${emailVerificationToken}`;
  const message = `Please verify your email by clicking the following link: \n\n ${verifyUrl}`;

  try {
    await sendEmail({
      to: user.email,
      subject: 'Email Verification',
      text: message,
    });
  } catch (error) {
    await prisma.user.delete({ where: { id: user.id } });
    console.log(error);
    throw new AppError('There was an error sending the email. Try again later.', 500);
  }

  res.status(201).json({ message: 'Verification email sent' });
});

export const verifyEmail = catchAsync(async (req: Request, res: Response) => {
  const { token } = req.query;

  if (!token || typeof token !== 'string') {
    throw new AppError('Invalid or missing token', 400);
  }

  const user = await prisma.user.findFirst({
    where: { emailVerificationToken: token },
  });

  if (!user) {
    throw new AppError('Token is invalid or has expired', 400);
  }

  await prisma.user.update({
    where: { id: user.id },
    data: {
      isEmailVerified: true,
      emailVerificationToken: null,
    },
  });

  res.status(200).json({ message: 'Email verified' });
});

export const login = catchAsync(async (req: Request, res: Response) => {
  const { email, password } = loginSchema.parse(req.body);

  const user = await prisma.user.findUnique({ where: { email } });

  if (!user || !(await bcrypt.compare(password, user.password))) {
    throw new AppError('Incorrect email or password', 401);
  }

  if (!user.isEmailVerified) {
    throw new AppError('Please verify your email to login', 403);
  }

  const accessToken = jwt.sign(
    { id: user.id },
    process.env.JWT_SECRET || 'supersecret_jwt_key',
    { expiresIn: (process.env.JWT_EXPIRES_IN as any) || '15m' }
  );

  const refreshToken = crypto.randomBytes(40).toString('hex');

  // Save refresh token to Redis (7 days expiration)
  const sessionKey = `session:${user.id}`;
  await redis.set(sessionKey, refreshToken, 'EX', 60 * 60 * 24 * 7);

  res.status(200).json({
    accessToken,
    user: {
      id: user.id,
      name: user.name,
      email: user.email,
      isEmailVerified: user.isEmailVerified,
    },
  });
});

export const logout = catchAsync(async (req: any, res: Response) => {
  const userId = req.user?.id;
  if (!userId) {
    throw new AppError('You are not logged in.', 401);
  }

  await redis.del(`session:${userId}`);

  res.status(200).json({ message: 'Logged out' });
});

export const forgotPassword = catchAsync(async (req: Request, res: Response) => {
  const { email } = forgotPasswordSchema.parse(req.body);

  const user = await prisma.user.findUnique({ where: { email } });
  if (!user) {
    throw new AppError('There is no user with that email address.', 404);
  }

  const resetToken = crypto.randomBytes(32).toString('hex');
  const passwordResetExpires = new Date(Date.now() + 60 * 60 * 1000); // 1 hour

  await prisma.user.update({
    where: { id: user.id },
    data: {
      passwordResetToken: resetToken,
      passwordResetExpires,
    },
  });

  const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
  const resetUrl = `${frontendUrl}/reset-password?token=${resetToken}`;
  const message = `You requested a password reset. Click the link below to reset your password: \n\n ${resetUrl}`;

  try {
    await sendEmail({
      to: user.email,
      subject: 'Password Reset',
      text: message,
    });
  } catch (error) {
    await prisma.user.update({
      where: { id: user.id },
      data: {
        passwordResetToken: null,
        passwordResetExpires: null,
      },
    });
    throw new AppError('There was an error sending the email. Try again later.', 500);
  }

  res.status(200).json({ message: 'Reset email sent' });
});

export const resetPassword = catchAsync(async (req: Request, res: Response) => {
  const { token, newPassword } = resetPasswordSchema.parse(req.body);

  const user = await prisma.user.findFirst({
    where: {
      passwordResetToken: token,
      passwordResetExpires: { gt: new Date() },
    },
  });

  if (!user) {
    throw new AppError('Token is invalid or has expired', 400);
  }

  const hashedPassword = await bcrypt.hash(newPassword, 10);

  await prisma.user.update({
    where: { id: user.id },
    data: {
      password: hashedPassword,
      passwordResetToken: null,
      passwordResetExpires: null,
    },
  });

  // Also clear their sessions so they have to login again
  await redis.del(`session:${user.id}`);

  res.status(200).json({ message: 'Password reset successful' });
});
