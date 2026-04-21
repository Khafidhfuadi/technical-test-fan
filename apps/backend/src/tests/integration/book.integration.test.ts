/**
 * Integration Tests: Book CRUD
 *
 * Supertest hits the real Express app.
 * Auth middleware membutuhkan: valid JWT + Redis session + Prisma user lookup.
 *
 * CATATAN PENTING:
 * - Book routes (POST/PUT) menggunakan multer middleware untuk file upload.
 *   Gunakan `.field()` supertest untuk mengirim data sebagai multipart/form-data
 *   agar multer tidak membuang req.body.
 * - Controller mengembalikan { data: ... } bukan { book: ... }.
 * - Error format: { error: { code, message } }
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
    get: jest.fn(),
    set: jest.fn().mockResolvedValue('OK'),
    del: jest.fn().mockResolvedValue(1),
    keys: jest.fn().mockResolvedValue([]),
    incr: jest.fn().mockResolvedValue(1),
    expire: jest.fn().mockResolvedValue(1),
  },
}));

jest.mock('../../utils/email', () => ({
  sendEmail: jest.fn().mockResolvedValue(undefined),
}));

// ─── Imports ──────────────────────────────────────────────────────────────────
import { request } from '../helpers/testApp';
import { generateTestToken, createTestUser } from '../helpers/authHelper';
import { prisma } from '../../utils/prisma';
import { redis } from '../../utils/redis';

// ─── Typed mocks ──────────────────────────────────────────────────────────────
const user = prisma.user as jest.Mocked<typeof prisma.user>;
const book = prisma.book as jest.Mocked<typeof prisma.book>;
const mockRedis = redis as jest.Mocked<typeof redis>;

// ─── Test data ────────────────────────────────────────────────────────────────
const OWNER_ID = 'owner-user-001';
const OTHER_USER_ID = 'other-user-002';
const BOOK_ID = 'book-uuid-001';

const testUser = {
  ...createTestUser(),
  id: OWNER_ID,
};

const mockBook = {
  id: BOOK_ID,
  title: 'Integration Test Book',
  author: 'Test Author',
  description: 'A description longer than 10 chars',
  rating: 4,
  thumbnailUrl: null,
  uploadedById: OWNER_ID,
  createdAt: new Date('2024-01-01'),
  updatedAt: new Date('2024-01-01'),
  uploadedBy: { name: testUser.name },
};

// ─── Auth setup helper ────────────────────────────────────────────────────────
const setupAuth = (userId = OWNER_ID) => {
  (mockRedis.get as jest.Mock).mockImplementation((key: string) => {
    if (key.startsWith('session:')) return Promise.resolve('valid-session-token');
    return Promise.resolve(null);
  });
  (user.findUnique as jest.Mock).mockResolvedValue(
    userId === OWNER_ID ? testUser : { ...testUser, id: OTHER_USER_ID }
  );
};

// ─── Tokens ───────────────────────────────────────────────────────────────────
let validToken: string;
let otherUserToken: string;

beforeAll(() => {
  validToken = generateTestToken(OWNER_ID, testUser.email);
  otherUserToken = generateTestToken(OTHER_USER_ID, 'other@example.com');
});

// ══════════════════════════════════════════════════════════════════════════════
// GET /api/books (public — tidak butuh auth)
// ══════════════════════════════════════════════════════════════════════════════
describe('GET /api/books (public)', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (book.findMany as jest.Mock).mockResolvedValue([mockBook]);
    (book.count as jest.Mock).mockResolvedValue(1);
    // Redis cache → null agar request langsung hit DB mock
    (mockRedis.get as jest.Mock).mockResolvedValue(null);
    (mockRedis.set as jest.Mock).mockResolvedValue('OK' as any);
  });

  test('200 — should return paginated book list without auth', async () => {
    const res = await request.get('/api/books');

    expect(res.status).toBe(200);
    expect(Array.isArray(res.body.data)).toBe(true);
    expect(res.body.meta).toBeDefined();
    expect(res.body.meta.total).toBe(1);
  });

  test('200 — should filter by author query param', async () => {
    const res = await request.get('/api/books?author=Test+Author');

    expect(res.status).toBe(200);
    expect(book.findMany).toHaveBeenCalled();
  });

  test('200 — should filter by rating query param', async () => {
    const res = await request.get('/api/books?rating=4');

    expect(res.status).toBe(200);
    expect(book.findMany).toHaveBeenCalled();
  });

  test('200 — should sort by rating when sortBy=rating&order=asc', async () => {
    const res = await request.get('/api/books?sortBy=rating&order=asc');

    expect(res.status).toBe(200);
    expect(book.findMany).toHaveBeenCalled();
  });

  test('200 — should return empty data array when no books', async () => {
    (book.findMany as jest.Mock).mockResolvedValue([]);
    (book.count as jest.Mock).mockResolvedValue(0);

    const res = await request.get('/api/books');

    expect(res.status).toBe(200);
    expect(res.body.data).toEqual([]);
    expect(res.body.meta.total).toBe(0);
  });
});

// ══════════════════════════════════════════════════════════════════════════════
// POST /api/books (authenticated) — menggunakan multer, kirim via .field()
// ══════════════════════════════════════════════════════════════════════════════
describe('POST /api/books (authenticated)', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    setupAuth();
    (book.create as jest.Mock).mockResolvedValue(mockBook);
    (mockRedis.keys as jest.Mock).mockResolvedValue([]);
    (mockRedis.del as jest.Mock).mockResolvedValue(1 as any);
  });

  test('201 — should create book with valid data and token', async () => {
    // Gunakan .field() karena route memakai multer (expects multipart/form-data)
    const res = await request
      .post('/api/books')
      .set('Authorization', `Bearer ${validToken}`)
      .field('title', 'My New Book')
      .field('author', 'Some Author')
      .field('description', 'Description with more than 10 chars')
      .field('rating', '4');

    expect(res.status).toBe(201);
    expect(res.body.data).toBeDefined();
    expect(book.create).toHaveBeenCalled();
  });

  test('401 — should return unauthorized without token', async () => {
    const res = await request
      .post('/api/books')
      .field('title', 'My New Book')
      .field('author', 'Some Author')
      .field('description', 'Description with more than 10 chars')
      .field('rating', '4');

    expect(res.status).toBe(401);
    expect(res.body.error.message).toContain('not logged in');
  });

  test('401 — should return unauthorized with invalid token', async () => {
    const res = await request
      .post('/api/books')
      .set('Authorization', 'Bearer totally.invalid.token')
      .field('title', 'My New Book')
      .field('author', 'x')
      .field('description', 'desc')
      .field('rating', '4');

    expect(res.status).toBe(401);
  });

  test('400 — should return validation error if title is missing (empty string)', async () => {
    const res = await request
      .post('/api/books')
      .set('Authorization', `Bearer ${validToken}`)
      .field('title', '')
      .field('author', 'Some Author')
      .field('description', 'Description with more than 10 chars')
      .field('rating', '4');

    expect(res.status).toBe(400);
    expect(res.body.error).toBeDefined();
  });

  test('400 — should return validation error if rating is out of range (0)', async () => {
    const res = await request
      .post('/api/books')
      .set('Authorization', `Bearer ${validToken}`)
      .field('title', 'My Book')
      .field('author', 'Some Author')
      .field('description', 'Description with more than 10 chars')
      .field('rating', '0');

    expect(res.status).toBe(400);
    expect(res.body.error).toBeDefined();
  });
});

// ══════════════════════════════════════════════════════════════════════════════
// PUT /api/books/:id (authenticated) — menggunakan multer
// ══════════════════════════════════════════════════════════════════════════════
describe('PUT /api/books/:id (authenticated)', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    setupAuth();
    (book.findUnique as jest.Mock).mockResolvedValue(mockBook);
    (book.update as jest.Mock).mockResolvedValue({ ...mockBook, title: 'Updated Title' });
    (mockRedis.keys as jest.Mock).mockResolvedValue([]);
    (mockRedis.del as jest.Mock).mockResolvedValue(1 as any);
  });

  test('200 — should update book if user is the owner', async () => {
    const res = await request
      .put(`/api/books/${BOOK_ID}`)
      .set('Authorization', `Bearer ${validToken}`)
      .field('title', 'Updated Title');

    expect(res.status).toBe(200);
    expect(res.body.data).toBeDefined();
  });

  test('403 — should return forbidden if user is not the owner', async () => {
    setupAuth(OTHER_USER_ID);

    const res = await request
      .put(`/api/books/${BOOK_ID}`)
      .set('Authorization', `Bearer ${otherUserToken}`)
      .field('title', 'Hacked Title');

    expect(res.status).toBe(403);
    expect(res.body.error.message).toContain('not authorized to update');
  });

  test('404 — should return not found if book does not exist', async () => {
    (book.findUnique as jest.Mock).mockResolvedValue(null);

    const res = await request
      .put('/api/books/nonexistent-id')
      .set('Authorization', `Bearer ${validToken}`)
      .field('title', 'Something');

    expect(res.status).toBe(404);
    expect(res.body.error.message).toContain('Book not found');
  });

  test('401 — should return unauthorized without token', async () => {
    const res = await request
      .put(`/api/books/${BOOK_ID}`)
      .field('title', 'No Auth');

    expect(res.status).toBe(401);
  });
});

// ══════════════════════════════════════════════════════════════════════════════
// DELETE /api/books/:id (authenticated)
// ══════════════════════════════════════════════════════════════════════════════
describe('DELETE /api/books/:id (authenticated)', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    setupAuth();
    (book.findUnique as jest.Mock).mockResolvedValue(mockBook);
    (book.delete as jest.Mock).mockResolvedValue(mockBook);
    (mockRedis.keys as jest.Mock).mockResolvedValue([]);
    (mockRedis.del as jest.Mock).mockResolvedValue(1 as any);
  });

  test('200 — should delete book if user is the owner', async () => {
    const res = await request
      .delete(`/api/books/${BOOK_ID}`)
      .set('Authorization', `Bearer ${validToken}`);

    expect(res.status).toBe(200);
    expect(res.body.message).toContain('deleted');
    expect(book.delete).toHaveBeenCalled();
  });

  test('403 — should return forbidden if user is not the owner', async () => {
    setupAuth(OTHER_USER_ID);

    const res = await request
      .delete(`/api/books/${BOOK_ID}`)
      .set('Authorization', `Bearer ${otherUserToken}`);

    expect(res.status).toBe(403);
    expect(res.body.error.message).toContain('not authorized to delete');
  });

  test('404 — should return not found for nonexistent book id', async () => {
    (book.findUnique as jest.Mock).mockResolvedValue(null);

    const res = await request
      .delete('/api/books/nonexistent-id')
      .set('Authorization', `Bearer ${validToken}`);

    expect(res.status).toBe(404);
    expect(res.body.error.message).toContain('Book not found');
  });

  test('401 — should return unauthorized without token', async () => {
    const res = await request.delete(`/api/books/${BOOK_ID}`);

    expect(res.status).toBe(401);
  });
});
