import { prisma } from '../utils/prisma';
import { AppError } from '../utils/AppError';
import { calculateSkip, buildMeta, PaginationMeta } from '../utils/pagination';
import fs from 'fs';
import path from 'path';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface CreateBookInput {
  title: string;
  author: string;
  description: string;
  rating: number;
  thumbnailUrl?: string | null;
}

export interface UpdateBookInput {
  title?: string;
  author?: string;
  description?: string;
  rating?: number;
  thumbnailUrl?: string | null;
}

export interface GetBooksInput {
  author?: string;
  rating?: number;
  sortBy?: string;
  order?: 'asc' | 'desc';
  page: number;
  limit: number;
}

export interface BookListResult {
  data: any[];
  meta: PaginationMeta;
}

// ─── Validation ───────────────────────────────────────────────────────────────

/**
 * Validate that rating is an integer between 1 and 5 (inclusive).
 * Throws AppError if invalid.
 */
export const validateRating = (rating: unknown): number => {
  const num = Number(rating);

  if (isNaN(num)) {
    throw new AppError('Rating must be a number', 400);
  }

  if (num < 1 || num > 5) {
    throw new AppError('Rating must be between 1 and 5', 400);
  }

  return num;
};

// ─── Book CRUD ────────────────────────────────────────────────────────────────

/**
 * Create a new book record in the database.
 */
export const createBook = async (
  data: CreateBookInput,
  userId: string
): Promise<any> => {
  return prisma.book.create({
    data: {
      title: data.title,
      author: data.author,
      description: data.description,
      rating: data.rating,
      thumbnailUrl: data.thumbnailUrl ?? null,
      uploadedById: userId,
    },
  });
};

/**
 * Update an existing book. Throws 404 if not found, 403 if not the owner.
 */
export const updateBook = async (
  id: string,
  data: UpdateBookInput,
  userId: string,
  newThumbnailPath?: string
): Promise<any> => {
  const book = await prisma.book.findUnique({ where: { id } });

  if (!book) {
    if (newThumbnailPath && fs.existsSync(newThumbnailPath)) {
      fs.unlinkSync(newThumbnailPath);
    }
    throw new AppError('Book not found', 404);
  }

  if ((book as any).uploadedById !== userId) {
    if (newThumbnailPath && fs.existsSync(newThumbnailPath)) {
      fs.unlinkSync(newThumbnailPath);
    }
    throw new AppError('You are not authorized to update this book', 403);
  }

  let thumbnailUrl = (book as any).thumbnailUrl;

  if (newThumbnailPath) {
    thumbnailUrl = `/uploads/thumbnails/${path.basename(newThumbnailPath)}`;
    if ((book as any).thumbnailUrl) {
      const oldPath = path.join(process.cwd(), (book as any).thumbnailUrl);
      if (fs.existsSync(oldPath)) fs.unlinkSync(oldPath);
    }
  }

  return prisma.book.update({
    where: { id },
    data: { ...data, thumbnailUrl },
  });
};

/**
 * Delete a book. Throws 404 if not found, 403 if not the owner.
 */
export const deleteBook = async (id: string, userId: string): Promise<void> => {
  const book = await prisma.book.findUnique({ where: { id } });

  if (!book) {
    throw new AppError('Book not found', 404);
  }

  if ((book as any).uploadedById !== userId) {
    throw new AppError('You are not authorized to delete this book', 403);
  }

  if ((book as any).thumbnailUrl) {
    const oldPath = path.join(process.cwd(), (book as any).thumbnailUrl);
    if (fs.existsSync(oldPath)) fs.unlinkSync(oldPath);
  }

  await prisma.book.delete({ where: { id } });
};

/**
 * Fetch a paginated, filtered list of books.
 */
export const getBooks = async (input: GetBooksInput): Promise<BookListResult> => {
  const { author, rating, sortBy = 'date', order = 'desc', page, limit } = input;

  const where: any = {};
  if (author) where.author = { contains: author, mode: 'insensitive' };
  if (rating !== undefined) where.rating = { gte: rating };

  const orderBy: any =
    sortBy === 'rating' ? { rating: order } : { createdAt: order };

  const skip = calculateSkip(page, limit);

  const [books, total] = await Promise.all([
    prisma.book.findMany({ where, skip, take: limit, orderBy }),
    prisma.book.count({ where }),
  ]);

  return { data: books, meta: buildMeta(total, page, limit) };
};
