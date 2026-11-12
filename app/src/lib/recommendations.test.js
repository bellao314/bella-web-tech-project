import test from "node:test";
import assert from "node:assert/strict";
import {
  calculateRecommendations,
  getCustomerLikedCategories,
  getVendorCategories,
} from "./recommendations.js";

test("frontend calculateRecommendations weights proximity in miles and keyword categories", () => {
  const userCoords = { lat: 38.627, lng: -90.199 };

  // Customer likes vendors with crochet, mexican, coffee
  const favorites = [
    { id: 1, name: "Knit & Knot Studio", type: "crafter", keywords: ["crochet"] },
    { id: 2, name: "Tacos El Rey", type: "food truck", keywords: ["mexican", "tacos"] },
    { id: 3, name: "Artisan Coffee", type: "food truck", keywords: ["coffee"] },
  ];

  const candidateVendors = [
    { id: 10, name: "Hardware Store", type: "crafter", latitude: 38.628, longitude: -90.199 },
    { id: 11, name: "Crochet Haven", type: "crafter", keywords: ["crochet", "yarn"], latitude: 38.64, longitude: -90.21 },
    { id: 12, name: "Mexican Street Food", type: "food truck", keywords: ["mexican", "burritos"], latitude: 38.65, longitude: -90.22 },
    { id: 13, name: "Espresso Mobile Bar", type: "food truck", keywords: ["coffee", "latte"], latitude: 38.63, longitude: -90.20 },
    { id: 14, name: "Flower Market", type: "farmer's market", latitude: 38.6275, longitude: -90.199 },
    { id: 15, name: "Crochet & Coffee Pop-up", type: "crafter", keywords: ["crochet", "coffee"], latitude: 38.635, longitude: -90.205 },
    { id: 16, name: "Books on Wheels", type: "mobile boutique", latitude: 38.66, longitude: -90.25 },
    { id: 17, name: "Pizza Mobile", type: "food truck", latitude: 38.67, longitude: -90.26 },
  ];

  const results = calculateRecommendations({
    vendors: candidateVendors,
    userCoords,
    favorites,
    limit: 6,
  });

  // Acceptance criteria 1: Displays up to 6 vendors
  assert.equal(results.length, 6);

  // Acceptance criteria 2: More vendors containing crochet, mexican, coffee categories populate at the top
  const topIds = results.slice(0, 4).map((r) => r.id);
  assert.ok(topIds.includes(15), "Vendor in Fiber Arts AND Coffee categories should be in top results");
  assert.ok(topIds.includes(11), "Vendor in Fiber Arts category should be in top results");
  assert.ok(topIds.includes(12), "Vendor in Mexican food category should be in top results");
  assert.ok(topIds.includes(13), "Vendor in Coffee & Cafe category should be in top results");

  // Every recommended vendor has distance, distanceInMiles, categories, and note
  for (const rec of results) {
    assert.ok(rec.distanceInMiles != null);
    assert.ok(typeof rec.distance === "string");
    assert.ok(typeof rec.note === "string");
    assert.ok(Array.isArray(rec.categories));
  }
});

test("getCustomerLikedCategories extracts keyword categories properly", () => {
  const favorites = [
    { id: 1, name: "Yarn Haven", type: "crafter", keywords: ["crochet", "yarn"] },
    { id: 2, name: "Taco Truck", type: "food truck", keywords: ["mexican"] },
    { id: 3, name: "Roasters", type: "food truck", keywords: ["coffee"] },
  ];

  const catMap = getCustomerLikedCategories(favorites);
  assert.ok(catMap.has("fiber_crochet"), "Customer likes Fiber Arts & Crochet");
  assert.ok(catMap.has("mexican_latin"), "Customer likes Mexican & Latin Food");
  assert.ok(catMap.has("coffee_cafe"), "Customer likes Coffee & Cafe");
});

test("getVendorCategories resolves categories for individual vendors", () => {
  const vendor = {
    name: "Espresso & Pastry Cart",
    type: "food truck",
    keywords: ["coffee", "bakery"],
  };
  const cats = getVendorCategories(vendor);
  const ids = cats.map((c) => c.id);
  assert.ok(ids.includes("coffee_cafe"));
  assert.ok(ids.includes("bakery_sweets"));
});
