import test from "node:test";
import assert from "node:assert/strict";
import {
  calculateRecommendations,
  getCustomerLikedKeywords,
} from "./recommendations.js";

test("frontend calculateRecommendations weights proximity in miles and number of relevant keywords", () => {
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

  // Acceptance criteria 2: More vendors containing crochet, mexican, coffee populate at the top
  const topIds = results.slice(0, 4).map((r) => r.id);
  assert.ok(topIds.includes(15), "Vendor with crochet AND coffee should be in top results");
  assert.ok(topIds.includes(11), "Vendor with crochet should be in top results");
  assert.ok(topIds.includes(12), "Vendor with mexican should be in top results");
  assert.ok(topIds.includes(13), "Vendor with coffee should be in top results");

  // Every recommended vendor has distance, distanceInMiles, and note
  for (const rec of results) {
    assert.ok(rec.distanceInMiles != null);
    assert.ok(typeof rec.distance === "string");
    assert.ok(typeof rec.note === "string");
  }
});

test("getCustomerLikedKeywords extracts keywords properly", () => {
  const favorites = [
    { id: 1, keywords: ["crochet", "yarn"] },
    { id: 2, keywords: ["mexican"] },
    { id: 3, keywords: ["coffee"] },
  ];

  const weights = getCustomerLikedKeywords(favorites);
  assert.ok(weights.has("crochet"));
  assert.ok(weights.has("mexican"));
  assert.ok(weights.has("coffee"));
});
