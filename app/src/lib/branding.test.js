import test from "node:test";
import assert from "node:assert/strict";
import {
  validateImageFile,
  saveBusinessBranding,
  resetBusinessBranding,
  getBusinessData,
} from "./business.js";
import { vendorFrom } from "./api.js";
import { calculateRecommendations } from "./recommendations.js";

// Mock localStorage and window events for node environment
if (typeof globalThis.localStorage === "undefined") {
  const store = new Map();
  globalThis.localStorage = {
    getItem: (key) => store.get(key) ?? null,
    setItem: (key, val) => store.set(key, String(val)),
    removeItem: (key) => store.delete(key),
    clear: () => store.clear(),
  };
}

if (typeof globalThis.window === "undefined") {
  globalThis.window = {
    dispatchEvent: () => true,
    addEventListener: () => {},
    removeEventListener: () => {},
  };
}

test("validateImageFile validates file types and sizes properly", () => {
  assert.equal(validateImageFile(null).valid, false);
  assert.match(validateImageFile(null).error, /no file/i);

  const nonImage = { type: "text/plain", size: 1024 };
  assert.equal(validateImageFile(nonImage).valid, false);
  assert.match(validateImageFile(nonImage).error, /valid image file/i);

  const oversized = { type: "image/png", size: 6 * 1024 * 1024 };
  assert.equal(validateImageFile(oversized, 5).valid, false);
  assert.match(validateImageFile(oversized, 5).error, /too large/i);

  const validPng = { type: "image/png", size: 500 * 1024 };
  assert.equal(validateImageFile(validPng).valid, true);

  const validJpg = { type: "image/jpeg", size: 2 * 1024 * 1024 };
  assert.equal(validateImageFile(validJpg).valid, true);

  const validWebp = { type: "image/webp", size: 1 * 1024 * 1024 };
  assert.equal(validateImageFile(validWebp).valid, true);

  const validSvg = { type: "image/svg+xml", size: 50 * 1024 };
  assert.equal(validateImageFile(validSvg).valid, true);
});

test("saveBusinessBranding and resetBusinessBranding manage logo and banner images", () => {
  localStorage.clear();

  const mockLogo = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==";
  const mockBanner = "data:image/jpeg;base64,/9j/4AAQSkZJRgABAQEASABIAAD/2wBDAP//////////////////////////////////////////////////////////////////////////////////////wgALCAABAAEBAREA/8QAFBABAAAAAAAAAAAAAAAAAAAAAP/aAAgBAQABPxA=";

  saveBusinessBranding({
    logo: mockLogo,
    banner: mockBanner,
  }, "Sweet Treats Bakery");

  const data = getBusinessData("Sweet Treats Bakery");
  assert.equal(data.logo, mockLogo);
  assert.equal(data.banner, mockBanner);

  // Updating only logo preserves banner
  const newLogo = "https://example.com/new-logo.png";
  saveBusinessBranding({ logo: newLogo }, "Sweet Treats Bakery");
  const dataAfterLogo = getBusinessData("Sweet Treats Bakery");
  assert.equal(dataAfterLogo.logo, newLogo);
  assert.equal(dataAfterLogo.banner, mockBanner);

  // Resetting branding clears logo and banner
  resetBusinessBranding("Sweet Treats Bakery");
  const dataAfterReset = getBusinessData("Sweet Treats Bakery");
  assert.equal(dataAfterReset.logo, null);
  assert.equal(dataAfterReset.banner, null);
});

test("vendorFrom extracts and preserves vendor logo and banner", () => {
  const rawVendor = {
    id: 42,
    name: "Artisan Woodworks",
    type: "crafter",
    city: "St. Louis, MO",
    logo: "data:image/png;base64,abc123logo",
    banner: "data:image/jpeg;base64,def456banner",
  };

  const formatted = vendorFrom(rawVendor);
  assert.equal(formatted.id, 42);
  assert.equal(formatted.name, "Artisan Woodworks");
  assert.equal(formatted.logo, "data:image/png;base64,abc123logo");
  assert.equal(formatted.banner, "data:image/jpeg;base64,def456banner");
});

test("calculateRecommendations preserves vendor banner and logo on recommendation cards", () => {
  const vendors = [
    {
      id: 1,
      name: "Taco Express",
      type: "food truck",
      city: "St. Louis, MO",
      latitude: 38.627,
      longitude: -90.199,
      keywords: ["tacos", "mexican", "burritos"],
      logo: "https://example.com/taco-logo.png",
      banner: "https://example.com/taco-banner.jpg",
    },
    {
      id: 2,
      name: "Cozy Crochet & Knits",
      type: "crafter",
      city: "St. Louis, MO",
      latitude: 38.628,
      longitude: -90.200,
      keywords: ["crochet", "knitting", "fiber"],
      logo: "https://example.com/crochet-logo.png",
      banner: "https://example.com/crochet-banner.jpg",
    },
  ];

  const results = calculateRecommendations({
    vendors,
    userCoords: { lat: 38.627, lng: -90.199 },
    favorites: [],
    limit: 6,
  });

  assert.ok(results.length >= 2);
  const tacoVendor = results.find((v) => v.id === 1);
  assert.ok(tacoVendor);
  assert.equal(tacoVendor.logo, "https://example.com/taco-logo.png");
  assert.equal(tacoVendor.banner, "https://example.com/taco-banner.jpg");

  const crochetVendor = results.find((v) => v.id === 2);
  assert.ok(crochetVendor);
  assert.equal(crochetVendor.logo, "https://example.com/crochet-logo.png");
  assert.equal(crochetVendor.banner, "https://example.com/crochet-banner.jpg");
});
