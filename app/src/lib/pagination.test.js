import test from "node:test";
import assert from "node:assert/strict";
import {
  FAVORITES_PER_PAGE,
  paginateItems,
  getPaginationPageNumbers,
} from "./pagination.js";

test("FAVORITES_PER_PAGE constant is set to 5", () => {
  assert.equal(FAVORITES_PER_PAGE, 5);
});

test("paginateItems handles empty array", () => {
  const result = paginateItems([], 1, 5);
  assert.deepEqual(result.items, []);
  assert.equal(result.currentPage, 1);
  assert.equal(result.totalPages, 1);
  assert.equal(result.totalItems, 0);
  assert.equal(result.hasNextPage, false);
  assert.equal(result.hasPrevPage, false);
});

test("paginateItems correctly slices first 5 items when total items <= 5", () => {
  const vendors = [
    { id: 1, name: "Vendor 1" },
    { id: 2, name: "Vendor 2" },
    { id: 3, name: "Vendor 3" },
  ];
  const result = paginateItems(vendors, 1, 5);
  assert.equal(result.items.length, 3);
  assert.deepEqual(result.items, vendors);
  assert.equal(result.currentPage, 1);
  assert.equal(result.totalPages, 1);
  assert.equal(result.totalItems, 3);
  assert.equal(result.hasNextPage, false);
  assert.equal(result.hasPrevPage, false);
});

test("paginateItems handles multiple pages of 5 vendors per page", () => {
  const vendors = Array.from({ length: 12 }, (_, i) => ({
    id: i + 1,
    name: `Vendor ${i + 1}`,
  }));

  // Page 1
  const page1 = paginateItems(vendors, 1, 5);
  assert.equal(page1.items.length, 5);
  assert.equal(page1.items[0].id, 1);
  assert.equal(page1.items[4].id, 5);
  assert.equal(page1.currentPage, 1);
  assert.equal(page1.totalPages, 3);
  assert.equal(page1.totalItems, 12);
  assert.equal(page1.hasNextPage, true);
  assert.equal(page1.hasPrevPage, false);

  // Page 2
  const page2 = paginateItems(vendors, 2, 5);
  assert.equal(page2.items.length, 5);
  assert.equal(page2.items[0].id, 6);
  assert.equal(page2.items[4].id, 10);
  assert.equal(page2.currentPage, 2);
  assert.equal(page2.totalPages, 3);
  assert.equal(page2.hasNextPage, true);
  assert.equal(page2.hasPrevPage, true);

  // Page 3
  const page3 = paginateItems(vendors, 3, 5);
  assert.equal(page3.items.length, 2);
  assert.equal(page3.items[0].id, 11);
  assert.equal(page3.items[1].id, 12);
  assert.equal(page3.currentPage, 3);
  assert.equal(page3.totalPages, 3);
  assert.equal(page3.hasNextPage, false);
  assert.equal(page3.hasPrevPage, true);
});

test("paginateItems safely clamps page when requested page is out of bounds", () => {
  const vendors = [
    { id: 1, name: "Vendor 1" },
    { id: 2, name: "Vendor 2" },
    { id: 3, name: "Vendor 3" },
    { id: 4, name: "Vendor 4" },
    { id: 5, name: "Vendor 5" },
    { id: 6, name: "Vendor 6" },
  ]; // 2 pages total

  // Page requested: 99
  const clampedHigh = paginateItems(vendors, 99, 5);
  assert.equal(clampedHigh.currentPage, 2);
  assert.equal(clampedHigh.items.length, 1);
  assert.equal(clampedHigh.items[0].id, 6);

  // Page requested: 0 or negative
  const clampedLow = paginateItems(vendors, -2, 5);
  assert.equal(clampedLow.currentPage, 1);
  assert.equal(clampedLow.items.length, 5);
});

test("getPaginationPageNumbers returns all page numbers when totalPages <= 5", () => {
  assert.deepEqual(getPaginationPageNumbers(1, 1), [1]);
  assert.deepEqual(getPaginationPageNumbers(1, 3), [1, 2, 3]);
  assert.deepEqual(getPaginationPageNumbers(2, 5), [1, 2, 3, 4, 5]);
});

test("getPaginationPageNumbers returns pages with ellipsis when totalPages > 5", () => {
  // Near start
  assert.deepEqual(getPaginationPageNumbers(1, 8), [1, 2, 3, "...", 8]);
  assert.deepEqual(getPaginationPageNumbers(3, 8), [1, 2, 3, "...", 8]);

  // In middle
  assert.deepEqual(getPaginationPageNumbers(4, 8), [1, "...", 4, "...", 8]);

  // Near end
  assert.deepEqual(getPaginationPageNumbers(6, 8), [1, "...", 6, 7, 8]);
  assert.deepEqual(getPaginationPageNumbers(8, 8), [1, "...", 6, 7, 8]);
});
