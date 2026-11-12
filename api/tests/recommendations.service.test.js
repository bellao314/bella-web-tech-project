import { test } from "vitest";
import assert from "node:assert/strict";
import {
  calculateRecommendations,
  getVendorCategories,
  getCustomerLikedCategories,
} from "../services/recommendations.service.js";

test("getVendorCategories resolves correct keyword categories", () => {
  const crochetVendor = {
    name: "Loom & Knot Fiber Arts",
    type: "crafter",
    keywords: ["crochet", "yarn", "fiber"],
  };
  const crochetCats = getVendorCategories(crochetVendor);
  assert.ok(crochetCats.some((c) => c.id === "fiber_crochet"));

  const tacoVendor = {
    name: "Jr's Tacos",
    type: "food truck",
    city: "St. Charles, MO",
  };
  const tacoCats = getVendorCategories(tacoVendor);
  assert.ok(tacoCats.some((c) => c.id === "mexican_latin"));

  const coffeeVendor = {
    name: "Bri's Coffee Bar",
    type: "food truck",
    city: "Creve Coeur, MO",
  };
  const coffeeCats = getVendorCategories(coffeeVendor);
  assert.ok(coffeeCats.some((c) => c.id === "coffee_cafe"));
});

test("getCustomerLikedCategories aggregates category weights from liked vendors", () => {
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

  const catMap = getCustomerLikedCategories(favorites);
  assert.ok(catMap.has("fiber_crochet"), "Customer likes Fiber Arts & Crochet");
  assert.ok(catMap.has("mexican_latin"), "Customer likes Mexican & Latin Food");
  assert.ok(catMap.has("coffee_cafe"), "Customer likes Coffee & Cafe");
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

test("Ranking focuses on keyword categories rather than raw count of duplicate keywords", () => {
  const userCoords = { lat: 38.627, lng: -90.199 };

  // Customer likes two distinct categories: Coffee & Cafe AND Fiber Arts & Crochet
  const favorites = [
    {
      id: 1,
      name: "Favorite Coffee Shop",
      type: "food truck",
      keywords: ["coffee"],
    },
    {
      id: 2,
      name: "Favorite Yarn Shop",
      type: "crafter",
      keywords: ["crochet"],
    },
  ];

  const candidates = [
    {
      id: 10,
      name: "Hyper Coffee Specialist",
      // Has 10 synonym keywords in ONLY 1 category (coffee_cafe)
      keywords: ["coffee", "cafe", "espresso", "latte", "cappuccino", "roast", "brew", "pastries", "beans", "drip"],
      type: "food truck",
      latitude: 38.635,
      longitude: -90.20,
    },
    {
      id: 11,
      name: "Crochet & Coffee Combo Shop",
      // Has keywords matching BOTH categories (fiber_crochet AND coffee_cafe)
      keywords: ["crochet", "coffee"],
      type: "crafter",
      latitude: 38.635,
      longitude: -90.20,
    },
  ];

  const recommended = calculateRecommendations({
    vendors: candidates,
    userCoords,
    favorites,
    limit: 6,
  });

  // The vendor matching 2 keyword categories ranks HIGHER than the vendor matching 1 category,
  // even though the other vendor has 10 synonym keywords in that single category!
  assert.equal(recommended[0].id, 11, "Multi-category match ranks above single-category match");
  assert.ok(recommended[0].categoryMatchCount > recommended[1].categoryMatchCount);
  assert.ok(recommended[0].score > recommended[1].score);
});

test("Vendors with matching categories are boosted when customer likes 'crochet', 'mexican', 'coffee'", () => {
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
      latitude: 38.628,
      longitude: -90.199,
      keywords: ["repair", "tires"],
    },
    {
      id: 11,
      name: "Loom & Knot Fiber Arts",
      type: "crafter",
      latitude: 38.64,
      longitude: -90.21,
      keywords: ["crochet", "weaving", "macrame"],
    },
    {
      id: 12,
      name: "Cardamom Coffee Roasters",
      type: "food truck",
      latitude: 38.645,
      longitude: -90.22,
      keywords: ["coffee", "cafe", "espresso"],
    },
    {
      id: 13,
      name: "Antojitos Tacos",
      type: "food truck",
      latitude: 38.65,
      longitude: -90.23,
      keywords: ["mexican", "tacos", "burritos"],
    },
    {
      id: 14,
      name: "Plumbing Pro",
      type: "service",
      latitude: 38.6275,
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

  // Vendors belonging to Fiber Arts, Coffee & Cafe, and Mexican Food populate at the top
  const topIds = recommended.slice(0, 3).map((v) => v.id);
  assert.ok(topIds.includes(11), "Vendor in Fiber Arts & Crochet category should be in top 3");
  assert.ok(topIds.includes(12), "Vendor in Coffee & Cafe category should be in top 3");
  assert.ok(topIds.includes(13), "Vendor in Mexican & Latin Food category should be in top 3");

  // Notes reflect customer interest categories
  const crochetRec = recommended.find((v) => v.id === 11);
  assert.ok(crochetRec.note.includes("Fiber Arts"));
});

test("Recommendations are weighted by proximity in miles among vendors in the same category", () => {
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

  assert.equal(recommended[0].id, 102, "Closer coffee vendor ranks above far coffee vendor in the same category");
  assert.ok(recommended[0].distanceInMiles < recommended[1].distanceInMiles);
});
