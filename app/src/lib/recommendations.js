import { getVendorKeywords } from "./search.js";
import { calculateDistanceInMiles, formatDistance } from "./business.js";

/**
 * Master Keyword Category Definitions.
 * Recommendation ranking focuses on these keyword categories rather than raw counts of individual keywords.
 */
export const KEYWORD_CATEGORIES = {
  fiber_crochet: {
    id: "fiber_crochet",
    label: "Fiber Arts & Crochet",
    keywords: ["crochet", "fiber", "fiber arts", "yarn", "knitting", "knit", "macrame", "weaving", "textile"],
    match: /fiber|knot|knits|crochet|yarn|macrame|weaving/i,
  },
  mexican_latin: {
    id: "mexican_latin",
    label: "Mexican & Latin Food",
    keywords: ["mexican", "taco", "tacos", "latin", "burrito", "salsa", "antojitos", "hispanic", "churrasco", "empanadas"],
    match: /taco|antojito|guatemala|mexic|latin|burrito|salsa|hispanic|brazil|empanada/i,
  },
  coffee_cafe: {
    id: "coffee_cafe",
    label: "Coffee & Cafe",
    keywords: ["coffee", "cafe", "espresso", "latte", "cappuccino", "roaster", "tea", "brew", "pastries"],
    match: /coffee|cafe|cardamom|juniper|espresso|roast|latte|cappuccino|brew|tea/i,
  },
  bakery_sweets: {
    id: "bakery_sweets",
    label: "Bakery & Sweets",
    keywords: ["bakery", "bakehouse", "donut", "donuts", "doughnut", "pastry", "pastries", "sweet", "dessert", "sourdough", "bread", "cookies", "breakfast"],
    match: /donut|doughnut|bakery|bakehouse|bread|sourdough|pastry|pastries|cookie|dessert|sweet/i,
  },
  bbq_meats: {
    id: "bbq_meats",
    label: "BBQ & Meats",
    keywords: ["bbq", "barbecue", "smoked", "ribs", "pork", "brisket", "meat", "pulled pork"],
    match: /bbq|barbecue|smoked|ribs|pork|brisket|pulled pork/i,
  },
  jewelry_accessories: {
    id: "jewelry_accessories",
    label: "Jewelry & Accessories",
    keywords: ["jewelry", "jeweller", "jeweler", "accessories", "necklace", "ring", "rings", "bracelet", "bracelets", "earrings", "silver", "gold", "gem", "gems", "gemstone", "beads", "permanent jewelry"],
    match: /jewelry|jewel|gem|stone|metalsmith|bead|silver|gold|ring|necklace|bracelet/i,
  },
  pottery_ceramics: {
    id: "pottery_ceramics",
    label: "Pottery & Ceramics",
    keywords: ["pottery", "ceramics", "clay", "ceramic", "mugs", "vases", "bowls"],
    match: /pottery|clay|ceramic/i,
  },
  woodwork_crafts: {
    id: "woodwork_crafts",
    label: "Woodwork & Carpentry",
    keywords: ["wood", "woodwork", "woodcraft", "timber", "furniture", "carving", "cutting boards"],
    match: /timber|wood|carpentry/i,
  },
  candles_aromatherapy: {
    id: "candles_aromatherapy",
    label: "Candles & Scents",
    keywords: ["candle", "candles", "wax", "scented", "aromatherapy", "soy"],
    match: /candle|wax|aromatherapy/i,
  },
  farm_produce: {
    id: "farm_produce",
    label: "Farm & Produce",
    keywords: ["produce", "fruit", "fruits", "berry", "berries", "apples", "microgreens", "farm", "farm fresh", "organic", "vegetables", "veggies", "local", "grocery"],
    match: /berry|orchard|produce|pastures|microgreens|rooted|farm|orchard|organic|vegetable|fruit/i,
  },
  apparel_boutique: {
    id: "apparel_boutique",
    label: "Apparel & Boutique",
    keywords: ["boutique", "clothing", "clothes", "apparel", "fashion", "shopping", "vintage", "retail", "outfits", "wear"],
    match: /boutique|clothing|apparel|fashion|vintage|thread|wagon/i,
  },
  plants_florals: {
    id: "plants_florals",
    label: "Plants & Florals",
    keywords: ["flowers", "florals", "bouquet", "plants", "lavender", "botanicals", "succulents", "flora"],
    match: /flora|willow|lavender|flower|botanical|plant/i,
  },
  pizza_italian: {
    id: "pizza_italian",
    label: "Pizza & Italian",
    keywords: ["pizza", "pizzas", "pie", "slice", "slices", "italian"],
    match: /pizza|italian/i,
  },
  asian_korean: {
    id: "asian_korean",
    label: "Asian & Korean",
    keywords: ["korean", "asian", "k-bop", "rice", "bibimbap"],
    match: /korean|asian|k-bop|bibimbap/i,
  },
  soul_southern: {
    id: "soul_southern",
    label: "Southern & Soul Food",
    keywords: ["soul food", "southern", "comfort food", "cajun", "creole", "louisiana", "gumbo", "jambalaya"],
    match: /cajun|creole|boot|soulfull|soul food|southern|louisiana|gumbo/i,
  },
  mediterranean_greek: {
    id: "mediterranean_greek",
    label: "Mediterranean & Greek",
    keywords: ["gyro", "gyros", "greek", "mediterranean", "pita", "tzatziki", "balkan", "turkish", "somun", "cevapi"],
    match: /gyro|greek|mediterranean|balkan|turkish|pita/i,
  },
  honey_herbs: {
    id: "honey_herbs",
    label: "Honey & Herbs",
    keywords: ["honey", "bees", "herbs", "herbal", "raw honey"],
    match: /honey|bees|herb/i,
  },
  books_media: {
    id: "books_media",
    label: "Books & Literature",
    keywords: ["book", "books", "bookstore", "novels", "reading", "literature"],
    match: /book|books|novels|literature/i,
  },
  street_comfort_food: {
    id: "street_comfort_food",
    label: "Street & Comfort Food",
    keywords: ["hot dog", "hot dogs", "hotdog", "sausage", "franks", "deli", "sandwich", "sandwiches", "panini", "sub", "subs", "hawaiian", "poke", "island", "aloha", "grill"],
    match: /hot dog|dog|deli|sandwich|panini|sub|hawaiian|buzzs|poke/i,
  },
  artisan_crafts: {
    id: "artisan_crafts",
    label: "Handcrafted & Artisan Goods",
    keywords: ["handmade", "artisan", "handcrafted", "gifts", "decor", "leather", "wallets", "bags", "glass", "stained glass"],
    match: /leather|glass|artisan|handcrafted/i,
  },
};

export const BROAD_KEYWORDS = new Set([
  "food", "truck", "food truck", "foodtruck", "dining", "eats", "eat",
  "lunch", "dinner", "snack", "meal", "cuisine", "market", "local",
  "craft", "crafts", "crafter", "shopping", "retail", "diy",
]);

/**
 * Resolve the keyword categories that a vendor belongs to based on their keywords,
 * name, and business type.
 *
 * @param {Object} vendor
 * @returns {Array<{ id: string, label: string }>}
 */
export function getVendorCategories(vendor) {
  if (!vendor) return [];

  // Extract explicit profile keywords and tags
  const explicitKeywords = new Set();
  if (Array.isArray(vendor.keywords)) {
    vendor.keywords.forEach((k) => {
      const clean = String(k).toLowerCase().trim();
      if (clean) explicitKeywords.add(clean);
    });
  } else if (typeof vendor.keywords === "string" && vendor.keywords.trim()) {
    vendor.keywords.split(",").forEach((k) => {
      const clean = k.toLowerCase().trim();
      if (clean) explicitKeywords.add(clean);
    });
  }

  if (Array.isArray(vendor.tags)) {
    vendor.tags.forEach((t) => {
      const clean = String(t).toLowerCase().trim();
      if (clean) explicitKeywords.add(clean);
    });
  } else if (typeof vendor.tags === "string" && vendor.tags.trim()) {
    vendor.tags.split(",").forEach((t) => {
      const clean = t.toLowerCase().trim();
      if (clean) explicitKeywords.add(clean);
    });
  }

  const name = String(vendor.name || "").toLowerCase();
  const type = String(vendor.type || vendor.category || "").toLowerCase();

  const assignedCategories = [];

  for (const cat of Object.values(KEYWORD_CATEGORIES)) {
    let matched = false;

    // Check if any explicit profile keyword is in this category's keywords
    for (const kw of cat.keywords) {
      if (explicitKeywords.has(kw.toLowerCase())) {
        matched = true;
        break;
      }
    }

    // Check category regex match against vendor name or any explicit keyword
    if (!matched && cat.match) {
      if (cat.match.test(name)) {
        matched = true;
      } else {
        for (const ekw of explicitKeywords) {
          if (cat.match.test(ekw)) {
            matched = true;
            break;
          }
        }
      }
    }

    // Type specific matching for distinct types like jewelry
    if (!matched && cat.id === "jewelry_accessories" && type.includes("jewelry")) {
      matched = true;
    }

    if (matched) {
      assignedCategories.push({
        id: cat.id,
        label: cat.label,
      });
    }
  }

  return assignedCategories;
}

/**
 * Build a frequency map of customer liked keyword categories based on their liked/favorited vendors
 * and any preferred keywords/categories.
 *
 * @param {Array} favorites - Customer favorited vendors.
 * @param {Array<string>} preferredKeywords - Optional explicit keywords or category IDs.
 * @returns {Map<string, { id: string, label: string, weight: number }>} Map of categoryId -> category data
 */
export function getCustomerLikedCategories(favorites = [], preferredKeywords = []) {
  const categoryMap = new Map();

  for (const fav of favorites) {
    const cats = getVendorCategories(fav);
    for (const cat of cats) {
      const existing = categoryMap.get(cat.id);
      if (existing) {
        existing.weight += 1;
      } else {
        categoryMap.set(cat.id, {
          id: cat.id,
          label: cat.label,
          weight: 1,
        });
      }
    }
  }

  if (Array.isArray(preferredKeywords)) {
    for (const item of preferredKeywords) {
      const clean = String(item).toLowerCase().trim();
      if (!clean) continue;

      let matchedCat = Object.values(KEYWORD_CATEGORIES).find(
        (c) => c.id === clean || c.label.toLowerCase() === clean
      );

      if (!matchedCat) {
        matchedCat = Object.values(KEYWORD_CATEGORIES).find((c) =>
          c.keywords.some((k) => k.toLowerCase() === clean)
        );
      }

      if (matchedCat) {
        const existing = categoryMap.get(matchedCat.id);
        if (existing) {
          existing.weight += 2;
        } else {
          categoryMap.set(matchedCat.id, {
            id: matchedCat.id,
            label: matchedCat.label,
            weight: 2,
          });
        }
      }
    }
  }

  return categoryMap;
}

/**
 * Acceptance criteria: recommendations page displays up to 6 vendors the customer may like.
 * Focuses on KEYWORD CATEGORIES for recommendation ranking, weighted by proximity to the
 * customer in miles and by the relevant keyword categories.
 *
 * @param {Object} options
 * @param {Array} options.vendors - List of available vendors.
 * @param {Object|null} options.userCoords - Customer coordinates { lat, lng }.
 * @param {Array} [options.favorites=[]] - Vendors the customer already likes/saved.
 * @param {Array<string>} [options.preferredKeywords=[]] - Optional explicit customer interest keywords or categories.
 * @param {number} [options.limit=6] - Max vendors to recommend (default 6 per acceptance criteria).
 * @returns {Array} List of up to 6 recommended vendors weighted by proximity in miles and keyword categories.
 */
export function calculateRecommendations({
  vendors = [],
  userCoords = null,
  favorites = [],
  preferredKeywords = [],
  limit = 6,
}) {
  if (!Array.isArray(vendors) || vendors.length === 0) {
    return [];
  }

  const customerCategoryMap = getCustomerLikedCategories(favorites, preferredKeywords);
  const favoriteIds = new Set(favorites.map((f) => String(f.id ?? f.vendorId ?? "")));

  // Filter out vendors the customer has already liked/saved so they discover new vendors.
  // If filtering leaves too few candidates, fall back to including all vendors.
  let candidatePool = vendors.filter((v) => !favoriteIds.has(String(v.id)));
  if (candidatePool.length < limit) {
    candidatePool = [...vendors];
  }

  const scoredList = candidatePool.map((vendor) => {
    const vLat = vendor.location?.latitude != null
      ? Number(vendor.location.latitude)
      : (vendor.latitude != null ? Number(vendor.latitude) : null);
    const vLng = vendor.location?.longitude != null
      ? Number(vendor.location.longitude)
      : (vendor.longitude != null ? Number(vendor.longitude) : null);

    let distanceInMiles = null;
    let distanceText = null;

    if (
      userCoords &&
      Number.isFinite(Number(userCoords.lat)) &&
      Number.isFinite(Number(userCoords.lng)) &&
      Number.isFinite(vLat) &&
      Number.isFinite(vLng)
    ) {
      distanceInMiles = calculateDistanceInMiles(userCoords.lat, userCoords.lng, vLat, vLng);
      distanceText = formatDistance(distanceInMiles);
    } else if (vendor.distanceInMiles != null && Number.isFinite(Number(vendor.distanceInMiles))) {
      distanceInMiles = Number(vendor.distanceInMiles);
      distanceText = vendor.distance || formatDistance(distanceInMiles);
    }

    // Resolve vendor's keyword categories
    const vendorCategories = getVendorCategories(vendor);
    const vendorKeywords = getVendorKeywords(vendor);

    // Identify which keyword categories match the customer's liked categories
    const matchingCategories = [];
    let categoryWeightSum = 0;

    for (const cat of vendorCategories) {
      if (customerCategoryMap.has(cat.id)) {
        matchingCategories.push(cat);
        categoryWeightSum += customerCategoryMap.get(cat.id).weight;
      }
    }

    const categoryMatchCount = matchingCategories.length;

    // Proximity score in [0, 1] using distance decay (d0 = 10 miles).
    // If distance cannot be computed, neutral proximity 0.5 is assigned.
    let proximityScore = 0.5;
    if (distanceInMiles != null && Number.isFinite(distanceInMiles)) {
      proximityScore = 1 / (1 + distanceInMiles / 10);
    }

    // Category relevance score:
    // Focus is on the number and strength of relevant keyword categories.
    // Each matched category gives strong relevance (+3.0 base + customer affinity weight).
    const categoryBoost = categoryMatchCount > 0 ? (3.0 * categoryMatchCount + categoryWeightSum) : 0;

    // Combined score:
    // Weighted by proximity in miles and by the relevant keyword categories.
    const score = (1 + categoryBoost) * (0.35 + 0.65 * proximityScore);

    // Generate contextual note focusing on the matching keyword categories
    let note = "Popular in your area";
    if (categoryMatchCount > 0) {
      const topCategories = matchingCategories.slice(0, 2).map((c) => c.label).join(" & ");
      note = `Matches your interest in ${topCategories}${distanceText ? ` · ${distanceText}` : ""}`;
    } else if (distanceText) {
      note = `Nearby in ${vendor.city || "your area"} · ${distanceText}`;
    }

    return {
      ...vendor,
      latitude: vLat,
      longitude: vLng,
      distance: distanceText || vendor.distance || null,
      distanceInMiles,
      keywords: vendorKeywords,
      categories: vendorCategories.map((c) => c.label),
      categoryIds: vendorCategories.map((c) => c.id),
      matchingCategories: matchingCategories.map((c) => c.label),
      matchingCategoryIds: matchingCategories.map((c) => c.id),
      categoryMatchCount,
      score,
      note,
    };
  });

  // Sort by composite score descending (and tie-break by proximity)
  scoredList.sort((a, b) => {
    if (Math.abs(b.score - a.score) > 0.0001) {
      return b.score - a.score;
    }
    const distA = a.distanceInMiles != null ? a.distanceInMiles : Infinity;
    const distB = b.distanceInMiles != null ? b.distanceInMiles : Infinity;
    return distA - distB;
  });

  // Up to 6 vendors per acceptance criteria
  return scoredList.slice(0, Math.max(1, limit));
}
