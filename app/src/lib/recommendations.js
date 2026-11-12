import { getVendorKeywords } from "./search.js";
import { calculateDistanceInMiles, formatDistance } from "./business.js";

export const BROAD_KEYWORDS = new Set([
  "food", "truck", "food truck", "foodtruck", "dining", "eats", "eat",
  "lunch", "dinner", "snack", "meal", "cuisine", "market", "local",
  "craft", "crafts", "crafter", "shopping", "retail", "diy",
]);

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
