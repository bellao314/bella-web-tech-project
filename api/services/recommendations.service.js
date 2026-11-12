import { calculateDistanceInMiles, formatDistance } from "./google-maps.service.js";

export const CATEGORY_KEYWORDS = {
  "food truck": [
    "food", "truck", "food truck", "foodtruck", "dining", "eats", "eat",
    "lunch", "dinner", "snack", "meal", "beverage", "drinks", "cuisine",
  ],
  "farmer's market": [
    "farmer", "farmers", "market", "produce", "fresh", "farm", "organic",
    "vegetables", "veggies", "fruit", "fruits", "local", "flowers", "plants", "grocery",
  ],
  "crafter": [
    "craft", "crafts", "crafter", "handmade", "artisan", "art", "gifts",
    "decor", "home", "handcrafted", "diy",
  ],
  "jewelry": [
    "jewelry", "jeweller", "jeweler", "accessories", "necklace", "ring",
    "rings", "bracelet", "bracelets", "earrings", "silver", "gold", "gem",
    "gems", "gemstone", "beads", "permanent jewelry",
  ],
  "mobile boutique": [
    "boutique", "clothing", "clothes", "apparel", "fashion", "shopping",
    "vintage", "retail", "outfits", "wear", "accessories",
  ],
  "mobile food & beverage": [
    "food", "beverage", "drinks", "coffee", "eats", "dining",
  ],
};

export const SPECIALTY_RULES = [
  { match: /donut|doughnut/i, keywords: ["donut", "donuts", "doughnut", "doughnuts", "pastry", "bakery", "sweet", "dessert", "breakfast"] },
  { match: /bbq|barbecue/i, keywords: ["bbq", "barbecue", "smoked", "ribs", "pork", "brisket", "meat", "pulled pork"] },
  { match: /taco|antojito|guatemala|mexic/i, keywords: ["mexican", "taco", "tacos", "latin", "burrito", "salsa", "antojitos", "hispanic"] },
  { match: /hot dog|dog/i, keywords: ["hot dog", "hot dogs", "hotdog", "hotdogs", "sausage", "franks"] },
  { match: /pizza/i, keywords: ["pizza", "pizzas", "pie", "slice", "slices", "italian"] },
  { match: /gyro/i, keywords: ["gyro", "gyros", "greek", "mediterranean", "pita", "tzatziki"] },
  { match: /k-bop|korean/i, keywords: ["korean", "asian", "k-bop", "rice", "bibimbap"] },
  { match: /cajun|creole|boot/i, keywords: ["cajun", "creole", "southern", "louisiana", "soul food", "gumbo", "jambalaya"] },
  { match: /soulfull|soul/i, keywords: ["soul food", "southern", "comfort food"] },
  { match: /balkan/i, keywords: ["balkan", "turkish", "mediterranean", "somun", "cevapi", "eastern european"] },
  { match: /hawaiian|buzzs/i, keywords: ["hawaiian", "hawaii", "poke", "island", "aloha", "grill"] },
  { match: /deli/i, keywords: ["deli", "sandwich", "sandwiches", "panini", "sub", "subs"] },
  { match: /coffee|cafe|cardamom|juniper|espresso|roast/i, keywords: ["coffee", "cafe", "espresso", "latte", "cappuccino", "roaster", "tea", "brew", "pastries"] },
  { match: /brazil/i, keywords: ["brazil", "brazilian", "latin", "empanadas", "churrasco"] },
  { match: /pottery|clay/i, keywords: ["pottery", "ceramics", "clay", "ceramic", "mugs", "vases", "bowls"] },
  { match: /timber|wood/i, keywords: ["wood", "woodwork", "woodcraft", "timber", "furniture", "carving", "cutting boards"] },
  { match: /leather/i, keywords: ["leather", "leatherworks", "wallets", "bags", "belts"] },
  { match: /glass/i, keywords: ["glass", "glassworks", "stained glass", "blown glass"] },
  { match: /fiber|knot|knits|crochet/i, keywords: ["crochet", "fiber", "fiber arts", "yarn", "knitting", "knit", "macrame", "weaving", "textile"] },
  { match: /candle/i, keywords: ["candle", "candles", "wax", "scented", "aromatherapy", "soy"] },
  { match: /flora|willow|lavender|flower/i, keywords: ["flowers", "florals", "bouquet", "plants", "lavender", "botanicals", "succulents"] },
  { match: /honey|herb/i, keywords: ["honey", "bees", "herbs", "herbal", "raw honey", "tea"] },
  { match: /berry|orchard|produce|pastures|microgreens|rooted/i, keywords: ["produce", "fruit", "fruits", "berry", "berries", "apples", "microgreens", "farm fresh", "organic", "vegetables", "veggies"] },
  { match: /bakehouse|bake/i, keywords: ["bakehouse", "bakery", "bread", "sourdough", "pastry", "pastries", "baked goods", "cookies"] },
  { match: /book/i, keywords: ["book", "books", "bookstore", "novels", "reading", "literature"] },
];

export const BROAD_KEYWORDS = new Set([
  "food", "truck", "food truck", "foodtruck", "dining", "eats", "eat",
  "lunch", "dinner", "snack", "meal", "cuisine", "market", "local",
  "craft", "crafts", "crafter", "shopping", "retail", "diy",
]);

/**
 * Extract normalized keywords for a vendor from their explicit profile keywords, tags, category, and name.
 */
export function getVendorKeywords(vendor) {
  if (!vendor) return [];
  const keywords = new Set();

  if (Array.isArray(vendor.keywords)) {
    vendor.keywords.forEach((k) => {
      const clean = String(k).toLowerCase().trim();
      if (clean) keywords.add(clean);
    });
  } else if (typeof vendor.keywords === "string" && vendor.keywords.trim()) {
    vendor.keywords.split(",").forEach((k) => {
      const clean = k.toLowerCase().trim();
      if (clean) keywords.add(clean);
    });
  }

  if (Array.isArray(vendor.tags)) {
    vendor.tags.forEach((t) => {
      const clean = String(t).toLowerCase().trim();
      if (clean) keywords.add(clean);
    });
  } else if (typeof vendor.tags === "string" && vendor.tags.trim()) {
    vendor.tags.split(",").forEach((t) => {
      const clean = t.toLowerCase().trim();
      if (clean) keywords.add(clean);
    });
  }

  const type = String(vendor.type || vendor.category || "").toLowerCase();
  for (const [cat, kws] of Object.entries(CATEGORY_KEYWORDS)) {
    if (type.includes(cat) || cat.includes(type)) {
      kws.forEach((kw) => keywords.add(kw));
    }
  }

  const name = String(vendor.name || "").toLowerCase();
  for (const rule of SPECIALTY_RULES) {
    if (rule.match.test(name) || rule.match.test(type)) {
      rule.keywords.forEach((kw) => keywords.add(kw));
    }
  }

  return Array.from(keywords);
}

/**
 * Build a frequency map of customer interest keywords based on their liked/favorited vendors
 * and any preferred keywords.
 */
export function getCustomerLikedKeywords(favorites = [], preferredKeywords = []) {
  const weights = new Map();

  for (const fav of favorites) {
    const kws = getVendorKeywords(fav);
    for (const kw of kws) {
      const isBroad = BROAD_KEYWORDS.has(kw);
      const inc = isBroad ? 0.3 : 1.0;
      weights.set(kw, (weights.get(kw) || 0) + inc);
    }
  }

  if (Array.isArray(preferredKeywords)) {
    for (const kw of preferredKeywords) {
      const clean = String(kw).toLowerCase().trim();
      if (clean) {
        weights.set(clean, (weights.get(clean) || 0) + 2.0);
      }
    }
  }

  return weights;
}

/**
 * Acceptance criteria: recommendations page displays up to 6 vendors the customer may like.
 * Those 6 are weighted by proximity to the customer in miles and by the number of relevant keywords.
 *
 * @param {Object} options
 * @param {Array} options.vendors - List of available vendors.
 * @param {Object|null} options.userCoords - Customer coordinates { lat, lng }.
 * @param {Array} [options.favorites=[]] - Vendors the customer already likes/saved.
 * @param {Array<string>} [options.preferredKeywords=[]] - Optional explicit customer interest keywords.
 * @param {number} [options.limit=6] - Max vendors to recommend (default 6 per acceptance criteria).
 * @returns {Array} List of up to 6 recommended vendors weighted by proximity in miles and relevant keywords.
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

  const customerKeywordWeights = getCustomerLikedKeywords(favorites, preferredKeywords);
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

    const vendorKeywords = getVendorKeywords(vendor);
    const matchingKeywords = [];
    let keywordWeightSum = 0;

    for (const kw of vendorKeywords) {
      if (customerKeywordWeights.has(kw)) {
        matchingKeywords.push(kw);
        const isBroad = BROAD_KEYWORDS.has(kw);
        const kwWeight = isBroad ? 0.25 : 1.0;
        keywordWeightSum += (customerKeywordWeights.get(kw) || 1) * kwWeight;
      }
    }

    const specificMatches = matchingKeywords.filter((k) => !BROAD_KEYWORDS.has(k));
    const matchCount = specificMatches.length > 0 ? specificMatches.length : (matchingKeywords.length > 0 ? 0.5 : 0);

    // Sort matching keywords so specific keywords come first
    const sortedMatchingKeywords = [
      ...specificMatches,
      ...matchingKeywords.filter((k) => BROAD_KEYWORDS.has(k)),
    ];

    // Proximity score in [0, 1] using distance decay (d0 = 10 miles).
    // If distance cannot be computed, neutral proximity 0.5 is assigned.
    let proximityScore = 0.5;
    if (distanceInMiles != null && Number.isFinite(distanceInMiles)) {
      proximityScore = 1 / (1 + distanceInMiles / 10);
    }

    // Keyword score:
    // When customer has liked keywords, each matching keyword provides strong relevance.
    const keywordBoost = matchCount > 0 ? (2.5 * matchCount + keywordWeightSum) : 0;

    // Combined weighted score:
    // Weights proximity in miles and the number of relevant keywords.
    const score = (1 + keywordBoost) * (0.35 + 0.65 * proximityScore);

    // Contextual note / reason
    let note = "Popular in your area";
    if (specificMatches.length > 0) {
      const topKeywords = specificMatches.slice(0, 2).join(" & ");
      note = `Matches your interest in ${topKeywords}${distanceText ? ` · ${distanceText}` : ""}`;
    } else if (matchingKeywords.length > 0) {
      const topKeywords = matchingKeywords.slice(0, 2).join(" & ");
      note = `Recommended for ${topKeywords}${distanceText ? ` · ${distanceText}` : ""}`;
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
      matchingKeywords: sortedMatchingKeywords,
      matchCount: specificMatches.length,
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
