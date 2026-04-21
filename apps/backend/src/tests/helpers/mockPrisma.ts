// Mock Prisma Client — digunakan di semua unit test
// Import di test file: import { mockPrismaClient } from '../helpers/mockPrisma';

const mockPrismaClient = {
  user: {
    findUnique: jest.fn(),
    findMany: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
    count: jest.fn(),
  },
  book: {
    findUnique: jest.fn(),
    findMany: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
    count: jest.fn(),
  },
  $connect: jest.fn(),
  $disconnect: jest.fn(),
};

// Otomatis mock modul prisma saat helper ini diimport
jest.mock('../../utils/prisma', () => ({
  prisma: mockPrismaClient,
}));

// Reset semua mock sebelum setiap test
beforeEach(() => {
  Object.values(mockPrismaClient.user).forEach((fn) => {
    if (typeof fn === 'function') (fn as jest.Mock).mockReset();
  });
  Object.values(mockPrismaClient.book).forEach((fn) => {
    if (typeof fn === 'function') (fn as jest.Mock).mockReset();
  });
});

export { mockPrismaClient };
