export const FAVORITES_PER_PAGE = 5;

/**
 * Paginates an array of items for a given page and page size.
 *
 * @param {Array} items - The full array of items to paginate.
 * @param {number} [page=1] - Requested 1-based page number.
 * @param {number} [pageSize=FAVORITES_PER_PAGE] - Number of items per page.
 * @returns {object} Pagination result containing paginated items and metadata.
 */
export function paginateItems(items = [], page = 1, pageSize = FAVORITES_PER_PAGE) {
  const safeItems = Array.isArray(items) ? items : [];
  const safePageSize = Math.max(1, Number(pageSize) || FAVORITES_PER_PAGE);
  const totalItems = safeItems.length;
  const totalPages = Math.max(1, Math.ceil(totalItems / safePageSize));
  const currentPage = Math.min(Math.max(1, Number(page) || 1), totalPages);

  const startIndex = (currentPage - 1) * safePageSize;
  const endIndex = startIndex + safePageSize;
  const paginatedItems = safeItems.slice(startIndex, endIndex);

  return {
    items: paginatedItems,
    currentPage,
    totalPages,
    totalItems,
    pageSize: safePageSize,
    hasNextPage: currentPage < totalPages,
    hasPrevPage: currentPage > 1,
    startIndex,
    endIndex: Math.min(endIndex, totalItems),
  };
}

/**
 * Returns an array of page numbers and ellipsis strings for pagination controls.
 *
 * @param {number} currentPage - Current active page number.
 * @param {number} totalPages - Total number of pages.
 * @param {number} [maxVisible=5] - Maximum visible page number buttons before collapsing.
 * @returns {Array<number|string>}
 */
export function getPaginationPageNumbers(currentPage, totalPages, maxVisible = 5) {
  if (totalPages <= maxVisible) {
    return Array.from({ length: totalPages }, (_, i) => i + 1);
  }

  if (currentPage <= 3) {
    return [1, 2, 3, "...", totalPages];
  }

  if (currentPage >= totalPages - 2) {
    return [1, "...", totalPages - 2, totalPages - 1, totalPages];
  }

  return [1, "...", currentPage, "...", totalPages];
}
