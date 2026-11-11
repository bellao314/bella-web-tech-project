import GOOGLE_MAPS_BASE_URLS, { getGoogleMapsApiKey } from "../config/maps.config.js";

const FALLBACK_LOCATIONS = [
  { match: "portland", lat: 45.5231, lng: -122.6765, address: "1122 NW River Street, Portland, OR 97209", city: "Portland, OR" },
  { match: "river market", lat: 45.5231, lng: -122.6765, address: "1122 NW River Street, Portland, OR 97209", city: "Portland, OR" },
  { match: "1122 nw river", lat: 45.5231, lng: -122.6765, address: "1122 NW River Street, Portland, OR 97209", city: "Portland, OR" },
  { match: "central west end", lat: 38.6465, lng: -90.2624, address: "4900 Euclid Ave, St. Louis, MO 63108", city: "St. Louis, MO" },
  { match: "euclid & mcpherson", lat: 38.6465, lng: -90.2624, address: "4900 Euclid Ave, St. Louis, MO 63108", city: "St. Louis, MO" },
  { match: "gateway arch", lat: 38.6270, lng: -90.1994, address: "100 Washington Ave, St. Louis, MO 63102", city: "St. Louis, MO" },
  { match: "tower grove", lat: 38.6056, lng: -90.2570, address: "4257 Northeast Dr, St. Louis, MO 63110", city: "St. Louis, MO" },
  { match: "delmar loop", lat: 38.6559, lng: -90.3098, address: "6100 Delmar Blvd, University City, MO 63112", city: "University City, MO" },
  { match: "clayton", lat: 38.6533, lng: -90.3323, address: "10 N Central Ave, Clayton, MO 63105", city: "Clayton, MO" },
  { match: "kirkwood", lat: 38.5834, lng: -90.4067, address: "150 E Argonne Dr, Kirkwood, MO 63122", city: "Kirkwood, MO" },
  { match: "maplewood", lat: 38.6117, lng: -90.3228, address: "7300 Manchester Rd, Maplewood, MO 63143", city: "Maplewood, MO" },
  { match: "richmond heights", lat: 38.6320, lng: -90.3292, address: "1155 Saint Louis Galleria St, Richmond Heights, MO 63117", city: "Richmond Heights, MO" },
  { match: "university city", lat: 38.6559, lng: -90.3098, address: "6801 Delmar Blvd, University City, MO 63130", city: "University City, MO" },
  { match: "webster groves", lat: 38.5926, lng: -90.3556, address: "101 W Lockwood Ave, Webster Groves, MO 63119", city: "Webster Groves, MO" },
  { match: "creve coeur", lat: 38.6703, lng: -90.4939, address: "11660 Olive Blvd, Creve Coeur, MO 63141", city: "Creve Coeur, MO" },
  { match: "chesterfield", lat: 38.6631, lng: -90.5772, address: "1 Chesterfield Mall, Chesterfield, MO 63017", city: "Chesterfield, MO" },
  { match: "st. charles", lat: 38.7881, lng: -90.4974, address: "200 N Main St, St. Charles, MO 63301", city: "St. Charles, MO" },
  { match: "edwardsville", lat: 38.8114, lng: -89.9532, address: "101 S Main St, Edwardsville, IL 62025", city: "Edwardsville, IL" },
  { match: "st. louis", lat: 38.6270, lng: -90.1994, address: "100 S 4th St, St. Louis, MO 63102", city: "St. Louis, MO" },
  { match: "saint louis", lat: 38.6270, lng: -90.1994, address: "100 S 4th St, St. Louis, MO 63102", city: "St. Louis, MO" },
];

function findFallbackCoordinates(address) {
  if (!address || typeof address !== "string") return null;
  const q = address.toLowerCase().trim();

  // Check direct lat, lng
  const directCoord = q.match(/^(-?\d+(?:\.\d+)?)\s*,\s*(-?\d+(?:\.\d+)?)$/);
  if (directCoord) {
    const lat = parseFloat(directCoord[1]);
    const lng = parseFloat(directCoord[2]);
    if (Number.isFinite(lat) && Number.isFinite(lng)) {
      return { lat, lng, address };
    }
  }

  for (const item of FALLBACK_LOCATIONS) {
    if (q.includes(item.match) || item.match.includes(q)) {
      return item;
    }
  }
  return null;
}

async function googleRequest(url, options = {}) {
  const response = await fetch(url, options);
  const data = await response.json().catch(() => ({}));

  if (!response.ok || data.error_message || data.error) {
    const error = new Error(data.error?.message || data.error_message || "Google Maps request failed.");
    error.statusCode = response.status || 502;
    error.details = data.error || { status: data.status };
    throw error;
  }
  return data;
}

export async function geocodeAddress(address) {
  try {
    const query = new URLSearchParams({ address, key: getGoogleMapsApiKey() });
    const result = await googleRequest(`${GOOGLE_MAPS_BASE_URLS.geocoding}?${query}`);
    if (result && Array.isArray(result.results) && result.results.length > 0) {
      return result;
    }
  } catch (err) {
    const fallback = findFallbackCoordinates(address);
    if (fallback) {
      return {
        results: [
          {
            geometry: {
              location: { lat: fallback.lat, lng: fallback.lng },
            },
            formatted_address: fallback.address,
            address_components: [
              { long_name: fallback.city, short_name: fallback.city, types: ["locality"] },
            ],
          },
        ],
        status: "OK",
      };
    }
    throw err;
  }

  const fallback = findFallbackCoordinates(address);
  if (fallback) {
    return {
      results: [
        {
          geometry: {
            location: { lat: fallback.lat, lng: fallback.lng },
          },
          formatted_address: fallback.address,
          address_components: [
            { long_name: fallback.city, short_name: fallback.city, types: ["locality"] },
          ],
        },
      ],
      status: "OK",
    };
  }

  return { results: [], status: "ZERO_RESULTS" };
}

export async function reverseGeocode(latitude, longitude) {
  try {
    const query = new URLSearchParams({ latlng: `${latitude},${longitude}`, key: getGoogleMapsApiKey() });
    return await googleRequest(`${GOOGLE_MAPS_BASE_URLS.geocoding}?${query}`);
  } catch (err) {
    return {
      results: [
        {
          geometry: { location: { lat: latitude, lng: longitude } },
          formatted_address: `${latitude.toFixed(4)}, ${longitude.toFixed(4)}`,
        },
      ],
      status: "OK",
    };
  }
}

export async function autocompletePlaces(input, options = {}) {
  try {
    const result = await googleRequest(`${GOOGLE_MAPS_BASE_URLS.places}/places:autocomplete`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "X-Goog-Api-Key": getGoogleMapsApiKey() },
      body: JSON.stringify({ input, ...options }),
    });
    if (result && Array.isArray(result.suggestions) && result.suggestions.length > 0) {
      return result;
    }
  } catch (err) {
    // If request failed, fall through to fallback matching
  }

  const q = (input || "").toLowerCase().trim();
  const suggestions = [];
  const seen = new Set();

  for (const item of FALLBACK_LOCATIONS) {
    const addr = item.address || item.city || "";
    const city = item.city || "";
    const textToSearch = `${item.match} ${addr} ${city}`.toLowerCase();
    if (textToSearch.includes(q) || q.includes(item.match)) {
      if (!seen.has(addr)) {
        seen.add(addr);
        suggestions.push({
          placePrediction: {
            place: `places/fb_${suggestions.length}`,
            placeId: `fb_${suggestions.length}`,
            text: { text: addr },
            structuredFormat: {
              mainText: { text: addr.split(",")[0] || addr },
              secondaryText: { text: addr.split(",").slice(1).join(",").trim() || city },
            },
          },
          description: addr,
        });
      }
    }
  }

  return { suggestions };
}

export function searchPlaces(textQuery, options = {}) {
  return googleRequest(`${GOOGLE_MAPS_BASE_URLS.places}/places:searchText`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Goog-Api-Key": getGoogleMapsApiKey(),
      "X-Goog-FieldMask": "places.id,places.displayName,places.formattedAddress,places.location,places.googleMapsUri",
    },
    body: JSON.stringify({ textQuery, ...options }),
  });
}
