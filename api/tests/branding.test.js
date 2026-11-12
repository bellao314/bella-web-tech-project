import { test } from "vitest";
import assert from "node:assert/strict";
import { formatVendor, vendorBrandingStore } from "../routes/vendors.js";

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
