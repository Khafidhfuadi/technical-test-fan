/**
 * Pagination helper utilities.
 * Pure functions — mudah di-unit test tanpa dependency apapun.
 */

/**
 * Calculate the number of records to skip for a given page and limit.
 */
export const calculateSkip = (page: number, limit: number): number => {
  return (page - 1) * limit;
};

export interface PaginationMeta {
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

/**
 * Build a pagination meta object from total count, current page, and limit.
 */
export const buildMeta = (total: number, page: number, limit: number): PaginationMeta => {
  const totalPages = total === 0 ? 0 : Math.ceil(total / limit);
  return { total, page, limit, totalPages };
};
