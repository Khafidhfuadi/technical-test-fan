import { Request, Response } from 'express';
import bcrypt from 'bcrypt';
import crypto from 'crypto';
import { catchAsync } from '../utils/catchAsync';
import { prisma } from '../utils/prisma';
import { AppError } from '../utils/AppError';
import { sendEmail } from '../utils/email';
import { registerSchema } from '../validations/auth.validation';

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

  const verifyUrl = `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000'}/api/auth/verify-email?token=${emailVerificationToken}`;
  const message = `Please verify your email by clicking the following link: \n\n ${verifyUrl}`;

  try {
    await sendEmail({
      to: user.email,
      subject: 'Email Verification',
      text: message,
    });
  } catch (error) {
    await prisma.user.delete({ where: { id: user.id } });
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
