// Mock Redis client — digunakan di semua unit test
// Import di test file: import { mockRedis } from '../helpers/mockRedis';

const mockRedis = {
  get: jest.fn(),
  set: jest.fn(),
  del: jest.fn(),
  keys: jest.fn(),
  expire: jest.fn(),
  quit: jest.fn(),
};

// Default behavior: keys() mengembalikan array kosong
mockRedis.keys.mockResolvedValue([]);
mockRedis.get.mockResolvedValue(null);
mockRedis.set.mockResolvedValue('OK');
mockRedis.del.mockResolvedValue(1);

// Otomatis mock modul redis saat helper ini diimport
jest.mock('../../utils/redis', () => ({
  redis: mockRedis,
}));

// Reset semua mock sebelum setiap test
beforeEach(() => {
  mockRedis.get.mockReset().mockResolvedValue(null);
  mockRedis.set.mockReset().mockResolvedValue('OK');
  mockRedis.del.mockReset().mockResolvedValue(1);
  mockRedis.keys.mockReset().mockResolvedValue([]);
  mockRedis.expire.mockReset().mockResolvedValue(1);
});

export { mockRedis };
