import test from "node:test";
import assert from "node:assert/strict";
import {
  calculateRecommendations,
  getVendorKeywords,
  getCustomerLikedKeywords,
} from "./recommendations.service.js";

test("getVendorKeywords extracts keywords from category, specialty rules, and explicit keywords", () => {
  const vendorWithExplicit = {
    name: "Custom Yarn Studio",
    type: "crafter",
    keywords: ["crochet", "amigurumi", "handmade"],
  };
  const kws = getVendorKeywords(vendorWithExplicit);
  assert.ok(kws.includes("crochet"));
  assert.ok(kws.includes("handmade"));
  assert.ok(kws.includes("craft"));
  assert.ok(kws.includes("amigurumi"));

  const tacoVendor = {
    name: "Jr's Tacos",
    type: "food truck",
    city: "St. Charles, MO",
  };
  const tacoKws = getVendorKeywords(tacoVendor);
  assert.ok(tacoKws.includes("mexican"));
  assert.ok(tacoKws.includes("tacos"));
  assert.ok(tacoKws.includes("food"));

  const coffeeVendor = {
    name: "Bri's Coffee Bar",
    type: "food truck",
    city: "Creve Coeur, MO",
  };
  const coffeeKws = getVendorKeywords(coffeeVendor);
  assert.ok(coffeeKws.includes("coffee"));
  assert.ok(coffeeKws.includes("espresso"));
  assert.ok(coffeeKws.includes("beverage"));
});

test("getCustomerLikedKeywords aggregates keywords from all liked vendors", () => {
  const favorites = [
    {
      id: 1,
      name: "Earthy Expressions Knits",
      type: "crafter",
      keywords: ["crochet", "knitting", "yarn"],
    },
    {
      id: 2,
      name: "Jr's Tacos",
      type: "food truck",
      keywords: ["mexican", "tacos"],
    },
    {
      id: 3,
      name: "Bri's Coffee Bar",
      type: "food truck",
      keywords: ["coffee", "espresso"],
    },
  ];

  const weights = getCustomerLikedKeywords(favorites);
  assert.ok(weights.has("crochet"));
  assert.ok(weights.has("mexican"));
  assert.ok(weights.has("coffee"));
});

test("Acceptance criteria: displays up to 6 vendors", () => {
  const vendors = Array.from({ length: 20 }, (_, idx) => ({
    id: idx + 1,
    name: `Vendor ${idx + 1}`,
    type: "crafter",
    city: "St. Louis, MO",
    latitude: 38.627 + idx * 0.01,
    longitude: -90.199,
  }));

  const recommended = calculateRecommendations({
    vendors,
    userCoords: { lat: 38.627, lng: -90.199 },
    favorites: [],
    limit: 6,
  });

  assert.equal(recommended.length, 6);
});

test("Vendors with matching keywords are boosted when customer likes 'crochet', 'mexican', 'coffee'", () => {
  const userCoords = { lat: 38.627, lng: -90.199 }; // St. Louis center

  const likedVendors = [
    {
      id: 1,
      name: "Crochet Haven",
      type: "crafter",
      keywords: ["crochet", "yarn"],
    },
    {
      id: 2,
      name: "Taqueria Mexicana",
      type: "food truck",
      keywords: ["mexican", "tacos"],
    },
    {
      id: 3,
      name: "Downtown Coffee",
      type: "food truck",
      keywords: ["coffee", "espresso"],
    },
  ];

  const candidateVendors = [
    {
      id: 10,
      name: "Generic Auto Repair",
      type: "auto",
      latitude: 38.628, // ~0.1 mi away
      longitude: -90.199,
      keywords: ["repair", "tires"],
    },
    {
      id: 11,
      name: "Loom & Knot Fiber Arts",
      type: "crafter",
      latitude: 38.64, // ~1.5 mi away
      longitude: -90.21,
      keywords: ["crochet", "weaving", "macrame"],
    },
    {
      id: 12,
      name: "Cardamom Coffee Roasters",
      type: "food truck",
      latitude: 38.645, // ~1.8 mi away
      longitude: -90.22,
      keywords: ["coffee", "cafe", "espresso"],
    },
    {
      id: 13,
      name: "Antojitos Tacos",
      type: "food truck",
      latitude: 38.65, // ~2.0 mi away
      longitude: -90.23,
      keywords: ["mexican", "tacos", "burritos"],
    },
    {
      id: 14,
      name: "Plumbing Pro",
      type: "service",
      latitude: 38.6275, // ~0.05 mi away
      longitude: -90.199,
      keywords: ["pipes", "plumbing"],
    },
  ];

  const recommended = calculateRecommendations({
    vendors: candidateVendors,
    userCoords,
    favorites: likedVendors,
    limit: 6,
  });

  // Vendors containing the keywords 'crochet', 'coffee', 'mexican' must populate at top
  const topIds = recommended.slice(0, 3).map((v) => v.id);
  assert.ok(topIds.includes(11), "Vendor with crochet should be in top 3");
  assert.ok(topIds.includes(12), "Vendor with coffee should be in top 3");
  assert.ok(topIds.includes(13), "Vendor with mexican should be in top 3");

  // Notes reflect customer interests
  const crochetRec = recommended.find((v) => v.id === 11);
  assert.ok(crochetRec.note.includes("crochet"));
});

test("Recommendations are weighted by proximity in miles among vendors with similar keywords", () => {
  const userCoords = { lat: 38.627, lng: -90.199 };

  const favorites = [
    {
      id: 1,
      name: "Favorites Coffee",
      type: "food truck",
      keywords: ["coffee"],
    },
  ];

  const candidates = [
    {
      id: 101,
      name: "Far Coffee Shop",
      type: "food truck",
      latitude: 38.95, // ~25 miles away
      longitude: -90.20,
      keywords: ["coffee"],
    },
    {
      id: 102,
      name: "Near Coffee Shop",
      type: "food truck",
      latitude: 38.635, // ~0.8 miles away
      longitude: -90.20,
      keywords: ["coffee"],
    },
  ];

  const recommended = calculateRecommendations({
    vendors: candidates,
    userCoords,
    favorites,
    limit: 6,
  });

  assert.equal(recommended[0].id, 102, "Closer coffee vendor ranks above far coffee vendor");
  assert.ok(recommended[0].distanceInMiles < recommended[1].distanceInMiles);
});

test("Vendor with more relevant keywords ranks above vendor with fewer when distance is similar", () => {
  const userCoords = { lat: 38.627, lng: -90.199 };

  const favorites = [
    {
      id: 1,
      name: "Crochet & Coffee Truck",
      type: "food truck",
      keywords: ["crochet", "coffee"],
    },
  ];

  const candidates = [
    {
      id: 201,
      name: "Only Coffee",
      type: "food truck",
      latitude: 38.64,
      longitude: -90.20,
      keywords: ["coffee"],
    },
    {
      id: 202,
      name: "Crochet & Coffee Combo",
      type: "food truck",
      latitude: 38.64,
      longitude: -90.20,
      keywords: ["crochet", "coffee"],
    },
  ];

  const recommended = calculateRecommendations({
    vendors: candidates,
    userCoords,
    favorites,
    limit: 6,
  });

  assert.equal(recommended[0].id, 202, "Vendor with 2 matching keywords ranks above 1 matching keyword");
  assert.ok(recommended[0].matchCount > recommended[1].matchCount);
  assert.ok(recommended[0].score > recommended[1].score);
});
