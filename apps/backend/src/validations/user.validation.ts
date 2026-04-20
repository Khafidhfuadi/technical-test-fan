import { z } from 'zod';

export const getUsersQuerySchema = z.object({
  search: z.string().optional(),
  isEmailVerified: z.enum(['true', 'false']).optional(),
  page: z.preprocess((val) => (val ? Number(val) : 1), z.number().min(1).default(1)),
  limit: z.preprocess((val) => (val ? Number(val) : 10), z.number().min(1).max(100).default(10)),
});

export const updateProfileSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters').max(100, 'Name must be at most 100 characters'),
});

export const changePasswordSchema = z.object({
  currentPassword: z.string().min(1, 'Current password is required'),
  newPassword: z.string().min(8, 'New password must be at least 8 characters'),
  confirmNewPassword: z.string().min(1, 'Please confirm your new password'),
}).refine((data) => data.newPassword === data.confirmNewPassword, {
  message: "Passwords don't match",
  path: ["confirmNewPassword"],
});
