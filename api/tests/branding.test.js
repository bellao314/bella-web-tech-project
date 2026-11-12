import { test } from "vitest";
import assert from "node:assert/strict";
import { formatVendor, vendorBrandingStore } from "../routes/vendors.js";
import { validateImageFile } from "../util/image-validation.js";
import { calculateRecommendations } from "../services/recommendations.service.js";

test("formatVendor includes vendor logo and banner in formatted vendor response", () => {
  const vendor = {
    id: 99,
    name: "Mocha Magic Coffee",
    type: "coffee truck",
    city: "Clayton, MO",
    email: "contact@mochamagic.com",
    logo: "https://example.com/mocha-logo.png",
    banner: "https://example.com/mocha-banner.jpg",
  };

  const formatted = formatVendor(vendor);
  assert.equal(formatted.id, 99);
  assert.equal(formatted.name, "Mocha Magic Coffee");
  assert.equal(formatted.logo, "https://example.com/mocha-logo.png");
  assert.equal(formatted.banner, "https://example.com/mocha-banner.jpg");
});

test("vendorBrandingStore stores and retrieves vendor branding dynamically", () => {
  const vendorId = 101;
  vendorBrandingStore.set(vendorId, {
    logo: "data:image/png;base64,samplelogodata",
    banner: "data:image/jpeg;base64,samplebannerdata",
  });

  const vendorWithoutEmbeddedImages = {
    id: vendorId,
    name: "Crafty Clay Studio",
    type: "crafter",
    city: "St. Louis, MO",
  };

  const formatted = formatVendor(vendorWithoutEmbeddedImages);
  assert.equal(formatted.logo, "data:image/png;base64,samplelogodata");
  assert.equal(formatted.banner, "data:image/jpeg;base64,samplebannerdata");
});

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
