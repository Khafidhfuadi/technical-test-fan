/**
 * Unit Tests: book.service.ts
 *
 * Semua Prisma call di-mock — tidak ada koneksi DB sungguhan.
 * fs di-mock agar operasi file tidak menyentuh sistem nyata.
 *
 * Catatan hoisting: jest.mock() di-hoist ke atas file oleh Babel/ts-jest,
 * sehingga factory function tidak bisa mengakses variabel yang dideklarasikan
 * di luar dengan const/let. Semua jest.fn() dideklarasikan di dalam factory.
 */

// ─── Mock declarations (hoisted oleh Jest ke paling atas) ─────────────────────
jest.mock('../../utils/prisma', () => ({
  prisma: {
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
  },
}));

jest.mock('fs', () => ({
  existsSync: jest.fn().mockReturnValue(false),
  unlinkSync: jest.fn(),
}));

// ─── Imports (setelah mock declarations) ──────────────────────────────────────
import { AppError } from '../../utils/AppError';
import {
  validateRating,
  createBook,
  updateBook,
  deleteBook,
  getBooks,
} from '../../services/book.service';
import { prisma } from '../../utils/prisma';
import fs from 'fs';

// ─── Typed accessors untuk mock functions ─────────────────────────────────────
const book = prisma.book as jest.Mocked<typeof prisma.book>;
const mockFs = fs as jest.Mocked<typeof fs>;

// ─── Dummy data ────────────────────────────────────────────────────────────────
const OWNER_ID = 'owner-user-123';
const OTHER_ID = 'other-user-456';
const BOOK_ID = 'book-uuid-789';

const mockBook = {
  id: BOOK_ID,
  title: 'Test Book',
  author: 'Test Author',
  description: 'A description that is long enough',
  rating: 4,
  thumbnailUrl: null,
  uploadedById: OWNER_ID,
  createdAt: new Date('2024-01-01'),
  updatedAt: new Date('2024-01-01'),
};

// ══════════════════════════════════════════════════════════════════════════════
// validateRating
// ══════════════════════════════════════════════════════════════════════════════
describe('validateRating', () => {
  beforeEach(() => jest.clearAllMocks());

  test('should pass for rating = 1 (minimum valid)', () => {
    expect(() => validateRating(1)).not.toThrow();
    expect(validateRating(1)).toBe(1);
  });

  test('should pass for rating = 3 (middle value)', () => {
    expect(validateRating(3)).toBe(3);
  });

  test('should pass for rating = 5 (maximum valid)', () => {
    expect(validateRating(5)).toBe(5);
  });

  test('should throw AppError for rating = 0 (below minimum)', () => {
    expect(() => validateRating(0)).toThrow(AppError);
    expect(() => validateRating(0)).toThrow('Rating must be between 1 and 5');
  });

  test('should throw AppError for rating = 6 (above maximum)', () => {
    expect(() => validateRating(6)).toThrow(AppError);
    expect(() => validateRating(6)).toThrow('Rating must be between 1 and 5');
  });

  test('should throw AppError for rating = -1 (negative)', () => {
    expect(() => validateRating(-1)).toThrow(AppError);
  });

  test('should throw AppError for non-number input (string "abc")', () => {
    // NaN setelah Number("abc") harus dideteksi
    expect(() => validateRating('abc')).toThrow(AppError);
    expect(() => validateRating('abc')).toThrow('Rating must be a number');
  });
});

// ══════════════════════════════════════════════════════════════════════════════
// createBook
// ══════════════════════════════════════════════════════════════════════════════
describe('createBook', () => {
  const validInput = {
    title: 'Test Book',
    author: 'Test Author',
    description: 'A description that is long enough',
    rating: 4,
  };

  beforeEach(() => {
    jest.clearAllMocks();
    // Default: create mengembalikan mockBook
    (book.create as jest.Mock).mockResolvedValue(mockBook);
  });

  test('should call prisma.book.create with correct data including uploadedById', async () => {
    await createBook(validInput, OWNER_ID);

    expect(book.create).toHaveBeenCalledWith({
      data: {
        title: validInput.title,
        author: validInput.author,
        description: validInput.description,
        rating: validInput.rating,
        thumbnailUrl: null,
        uploadedById: OWNER_ID,
      },
    });
  });

  test('should return the created book object from prisma', async () => {
    const result = await createBook(validInput, OWNER_ID);

    expect(result).toEqual(mockBook);
    expect(result.id).toBe(BOOK_ID);
  });

  test('should set uploadedById from provided userId param', async () => {
    await createBook(validInput, OWNER_ID);

    const callArg = (book.create as jest.Mock).mock.calls[0][0];
    expect(callArg.data.uploadedById).toBe(OWNER_ID);
  });

  test('should throw if prisma.book.create fails (DB error)', async () => {
    (book.create as jest.Mock).mockRejectedValue(new Error('DB connection failed'));

    await expect(createBook(validInput, OWNER_ID)).rejects.toThrow('DB connection failed');
  });

  test('should set thumbnailUrl to provided value when given', async () => {
    const inputWithThumb = { ...validInput, thumbnailUrl: '/uploads/img.jpg' };
    await createBook(inputWithThumb, OWNER_ID);

    const callArg = (book.create as jest.Mock).mock.calls[0][0];
    expect(callArg.data.thumbnailUrl).toBe('/uploads/img.jpg');
  });
});

// ══════════════════════════════════════════════════════════════════════════════
// updateBook
// ══════════════════════════════════════════════════════════════════════════════
describe('updateBook', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (book.findUnique as jest.Mock).mockResolvedValue(mockBook);
    (book.update as jest.Mock).mockResolvedValue({ ...mockBook, title: 'Updated Title' });
    (mockFs.existsSync as jest.Mock).mockReturnValue(false);
  });

  test('should call prisma.book.update with correct id and data', async () => {
    await updateBook(BOOK_ID, { title: 'Updated Title' }, OWNER_ID);

    expect(book.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: BOOK_ID },
        data: expect.objectContaining({ title: 'Updated Title' }),
      })
    );
  });

  test('should throw 404 AppError if book not found', async () => {
    (book.findUnique as jest.Mock).mockResolvedValue(null);

    await expect(updateBook(BOOK_ID, { title: 'x' }, OWNER_ID)).rejects.toThrow(AppError);
    await expect(updateBook(BOOK_ID, { title: 'x' }, OWNER_ID)).rejects.toThrow('Book not found');
  });

  test('should throw 403 AppError if uploadedById does not match userId', async () => {
    // OTHER_ID mencoba update buku milik OWNER_ID
    await expect(updateBook(BOOK_ID, { title: 'x' }, OTHER_ID)).rejects.toThrow(AppError);
    await expect(updateBook(BOOK_ID, { title: 'x' }, OTHER_ID)).rejects.toThrow(
      'not authorized to update'
    );
  });

  test('should return updated book on success', async () => {
    const result = await updateBook(BOOK_ID, { title: 'Updated Title' }, OWNER_ID);

    expect(result.title).toBe('Updated Title');
    expect(result.id).toBe(BOOK_ID);
  });

  test('should set new thumbnailUrl and delete old file when newThumbnailPath provided', async () => {
    // Book sudah punya thumbnail lama
    const bookWithThumb = { ...mockBook, thumbnailUrl: '/uploads/thumbnails/old.jpg' };
    (book.findUnique as jest.Mock).mockResolvedValue(bookWithThumb);
    (mockFs.existsSync as jest.Mock).mockReturnValue(true); // file lama ada

    await updateBook(BOOK_ID, { title: 'x' }, OWNER_ID, '/tmp/new-thumb.jpg');

    // Harus menghapus file lama
    expect(mockFs.unlinkSync).toHaveBeenCalled();
    // thumbnailUrl baru di-set dari basename newThumbnailPath
    const callArg = (book.update as jest.Mock).mock.calls[0][0];
    expect(callArg.data.thumbnailUrl).toBe('/uploads/thumbnails/new-thumb.jpg');
  });

  test('should cleanup new thumbnail if book not found (line 93)', async () => {
    // Book tidak ada, tapi ada file baru yang sudah terupload — harus dihapus
    (book.findUnique as jest.Mock).mockResolvedValue(null);
    (mockFs.existsSync as jest.Mock).mockReturnValue(true);

    await expect(
      updateBook(BOOK_ID, { title: 'x' }, OWNER_ID, '/tmp/new-thumb.jpg')
    ).rejects.toThrow('Book not found');

    expect(mockFs.unlinkSync).toHaveBeenCalledWith('/tmp/new-thumb.jpg');
  });

  test('should cleanup new thumbnail if user not authorized (line 100)', async () => {
    // User bukan owner, tapi ada file baru yang sudah terupload — harus dihapus
    (mockFs.existsSync as jest.Mock).mockReturnValue(true);

    await expect(
      updateBook(BOOK_ID, { title: 'x' }, OTHER_ID, '/tmp/new-thumb.jpg')
    ).rejects.toThrow('not authorized to update');

    expect(mockFs.unlinkSync).toHaveBeenCalledWith('/tmp/new-thumb.jpg');
  });

  test('should set new thumbnailUrl without deleting old file when book has no existing thumbnail', async () => {
    // book.thumbnailUrl = null → branch if (book.thumbnailUrl) di baris 109 tidak dimasuki
    (book.findUnique as jest.Mock).mockResolvedValue({ ...mockBook, thumbnailUrl: null });
    (book.update as jest.Mock).mockResolvedValue({ ...mockBook, thumbnailUrl: '/uploads/thumbnails/new-thumb.jpg' });

    await updateBook(BOOK_ID, { title: 'x' }, OWNER_ID, '/tmp/new-thumb.jpg');

    // Tidak ada file lama yang perlu dihapus
    expect(mockFs.unlinkSync).not.toHaveBeenCalled();
    // thumbnailUrl baru tetap di-set dari basename newThumbnailPath
    const callArg = (book.update as jest.Mock).mock.calls[0][0];
    expect(callArg.data.thumbnailUrl).toBe('/uploads/thumbnails/new-thumb.jpg');
  });
});


// ══════════════════════════════════════════════════════════════════════════════
// deleteBook
// ══════════════════════════════════════════════════════════════════════════════
describe('deleteBook', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (book.findUnique as jest.Mock).mockResolvedValue(mockBook);
    (book.delete as jest.Mock).mockResolvedValue(mockBook);
    (mockFs.existsSync as jest.Mock).mockReturnValue(false);
  });

  test('should call prisma.book.delete with correct id', async () => {
    await deleteBook(BOOK_ID, OWNER_ID);

    expect(book.delete).toHaveBeenCalledWith({ where: { id: BOOK_ID } });
  });

  test('should throw 404 AppError if book not found', async () => {
    (book.findUnique as jest.Mock).mockResolvedValue(null);

    await expect(deleteBook(BOOK_ID, OWNER_ID)).rejects.toThrow(AppError);
    await expect(deleteBook(BOOK_ID, OWNER_ID)).rejects.toThrow('Book not found');
  });

  test('should throw 403 AppError if user is not the owner', async () => {
    // OTHER_ID bukan pemilik buku
    await expect(deleteBook(BOOK_ID, OTHER_ID)).rejects.toThrow(AppError);
    await expect(deleteBook(BOOK_ID, OTHER_ID)).rejects.toThrow('not authorized to delete');
  });

  test('should not call prisma.book.delete if book is not found', async () => {
    (book.findUnique as jest.Mock).mockResolvedValue(null);

    await expect(deleteBook(BOOK_ID, OWNER_ID)).rejects.toThrow();
    expect(book.delete).not.toHaveBeenCalled();
  });

  test('should delete thumbnail file if it exists before deleting book (line 136-137)', async () => {
    // Book punya thumbnail — file harus dihapus sebelum record dihapus dari DB
    const bookWithThumb = { ...mockBook, thumbnailUrl: '/uploads/thumbnails/cover.jpg' };
    (book.findUnique as jest.Mock).mockResolvedValue(bookWithThumb);
    (mockFs.existsSync as jest.Mock).mockReturnValue(true);

    await deleteBook(BOOK_ID, OWNER_ID);

    expect(mockFs.existsSync).toHaveBeenCalled();
    expect(mockFs.unlinkSync).toHaveBeenCalled();
    expect(book.delete).toHaveBeenCalledWith({ where: { id: BOOK_ID } });
  });

  test('should not call unlinkSync if thumbnail file does not exist on disk', async () => {
    const bookWithThumb = { ...mockBook, thumbnailUrl: '/uploads/thumbnails/missing.jpg' };
    (book.findUnique as jest.Mock).mockResolvedValue(bookWithThumb);
    (mockFs.existsSync as jest.Mock).mockReturnValue(false); // file tidak ada di disk

    await deleteBook(BOOK_ID, OWNER_ID);

    expect(mockFs.unlinkSync).not.toHaveBeenCalled();
    expect(book.delete).toHaveBeenCalled();
  });
});

// ══════════════════════════════════════════════════════════════════════════════
// getBooks (dengan filter & pagination)
// ══════════════════════════════════════════════════════════════════════════════
describe('getBooks', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (book.findMany as jest.Mock).mockResolvedValue([mockBook]);
    (book.count as jest.Mock).mockResolvedValue(1);
  });

  test('should call findMany with author contains filter when author provided', async () => {
    await getBooks({ author: 'Tolkien', page: 1, limit: 10 });

    const callArg = (book.findMany as jest.Mock).mock.calls[0][0];
    expect(callArg.where.author).toEqual({ contains: 'Tolkien', mode: 'insensitive' });
  });

  test('should call findMany with rating gte filter when rating provided', async () => {
    await getBooks({ rating: 4, page: 1, limit: 10 });

    const callArg = (book.findMany as jest.Mock).mock.calls[0][0];
    expect(callArg.where.rating).toEqual({ gte: 4 });
  });

  test('should apply correct skip and take for pagination (page 2, limit 5)', async () => {
    // page 2, limit 5 → skip 5, take 5
    await getBooks({ page: 2, limit: 5 });

    const callArg = (book.findMany as jest.Mock).mock.calls[0][0];
    expect(callArg.skip).toBe(5);
    expect(callArg.take).toBe(5);
  });

  test('should apply skip = 0 for page 1', async () => {
    await getBooks({ page: 1, limit: 10 });

    const callArg = (book.findMany as jest.Mock).mock.calls[0][0];
    expect(callArg.skip).toBe(0);
  });

  test('should return data array and meta object with correct shape', async () => {
    (book.count as jest.Mock).mockResolvedValue(25);
    (book.findMany as jest.Mock).mockResolvedValue([mockBook, mockBook]);

    const result = await getBooks({ page: 1, limit: 10 });

    expect(result).toHaveProperty('data');
    expect(result).toHaveProperty('meta');
    expect(result.meta.total).toBe(25);
    expect(result.meta.page).toBe(1);
    expect(result.meta.limit).toBe(10);
    expect(result.meta.totalPages).toBe(3);
  });

  test('should use date desc as default sort when sortBy not provided', async () => {
    await getBooks({ page: 1, limit: 10 });

    const callArg = (book.findMany as jest.Mock).mock.calls[0][0];
    expect(callArg.orderBy).toEqual({ createdAt: 'desc' });
  });

  test('should use rating sort when sortBy = "rating"', async () => {
    await getBooks({ sortBy: 'rating', order: 'asc', page: 1, limit: 10 });

    const callArg = (book.findMany as jest.Mock).mock.calls[0][0];
    expect(callArg.orderBy).toEqual({ rating: 'asc' });
  });
});
