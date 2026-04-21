/**
 * Unit Tests: pagination.ts helpers
 *
 * Pure functions — tidak ada dependency external, tidak perlu mock.
 */

import { calculateSkip, buildMeta } from '../../utils/pagination';

// ══════════════════════════════════════════════════════════════════════════════
// calculateSkip
// ══════════════════════════════════════════════════════════════════════════════
describe('calculateSkip', () => {
  test('page 1, limit 10 → skip 0 (pertama selalu mulai dari record ke-0)', () => {
    expect(calculateSkip(1, 10)).toBe(0);
  });

  test('page 2, limit 10 → skip 10 (halaman kedua melewati 10 record)', () => {
    expect(calculateSkip(2, 10)).toBe(10);
  });

  test('page 3, limit 5 → skip 10 (halaman ketiga melewati 10 record)', () => {
    expect(calculateSkip(3, 5)).toBe(10);
  });

  test('page 1, limit 1 → skip 0', () => {
    expect(calculateSkip(1, 1)).toBe(0);
  });

  test('page 5, limit 20 → skip 80', () => {
    expect(calculateSkip(5, 20)).toBe(80);
  });

  test('should be consistent with formula (page - 1) * limit', () => {
    // Verifikasi formula matematika
    const pairs: Array<[number, number]> = [
      [1, 10], [2, 10], [3, 10],
      [1, 5], [2, 5], [4, 25],
    ];

    pairs.forEach(([page, limit]) => {
      expect(calculateSkip(page, limit)).toBe((page - 1) * limit);
    });
  });
});

// ══════════════════════════════════════════════════════════════════════════════
// buildMeta
// ══════════════════════════════════════════════════════════════════════════════
describe('buildMeta', () => {
  test('total 25, page 1, limit 10 → totalPages 3', () => {
    const meta = buildMeta(25, 1, 10);
    expect(meta.totalPages).toBe(3);
  });

  test('total 10, page 1, limit 10 → totalPages 1 (exact fit)', () => {
    const meta = buildMeta(10, 1, 10);
    expect(meta.totalPages).toBe(1);
  });

  test('total 0 → totalPages 0 (tidak ada data)', () => {
    const meta = buildMeta(0, 1, 10);
    expect(meta.totalPages).toBe(0);
  });

  test('meta object must contain all required fields: total, page, limit, totalPages', () => {
    const meta = buildMeta(50, 2, 15);

    expect(meta).toHaveProperty('total', 50);
    expect(meta).toHaveProperty('page', 2);
    expect(meta).toHaveProperty('limit', 15);
    expect(meta).toHaveProperty('totalPages');
  });

  test('total 11, limit 10 → totalPages 2 (ceil rounding up)', () => {
    // 11 / 10 = 1.1 → ceil → 2
    const meta = buildMeta(11, 1, 10);
    expect(meta.totalPages).toBe(2);
  });

  test('total 1, limit 10 → totalPages 1', () => {
    const meta = buildMeta(1, 1, 10);
    expect(meta.totalPages).toBe(1);
  });

  test('should reflect correct page in meta when page > 1', () => {
    const meta = buildMeta(100, 4, 10);
    expect(meta.page).toBe(4);
    expect(meta.totalPages).toBe(10);
  });
});
