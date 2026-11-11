import GOOGLE_MAPS_BASE_URLS, { getGoogleMapsApiKey } from "../config/maps.config.js";

async function googleRequest(url, options = {}) {
  const response = await fetch(url, options);
  const data = await response.json().catch(() => ({}));

  if (!response.ok || data.error_message || (data.status && !["OK", "ZERO_RESULTS"].includes(data.status))) {
    const error = new Error(data.error_message || data.error?.message || `Google Maps request failed with status: ${data.status || response.status}`);
    error.statusCode = response.status && response.status >= 400 ? response.status : 502;
    error.details = data.error || { status: data.status };
    throw error;
  }
  return data;
}

export async function geocodeAddress(address) {
  const query = new URLSearchParams({ address: address.trim(), key: getGoogleMapsApiKey() });
  return await googleRequest(`${GOOGLE_MAPS_BASE_URLS.geocoding}?${query}`);
}

export async function reverseGeocode(latitude, longitude) {
  const query = new URLSearchParams({ latlng: `${latitude},${longitude}`, key: getGoogleMapsApiKey() });
  return await googleRequest(`${GOOGLE_MAPS_BASE_URLS.geocoding}?${query}`);
}

/**
 * Autocomplete address using Google Maps Places API (autocomplete).
 */
export async function autocompletePlaces(input, options = {}) {
  const params = {
    input: input.trim(),
    key: getGoogleMapsApiKey(),
    ...(options.types ? { types: options.types } : {}),
    ...(options.language ? { language: options.language } : {}),
    ...(options.components ? { components: options.components } : {}),
  };
  const query = new URLSearchParams(params);
  const data = await googleRequest(`${GOOGLE_MAPS_BASE_URLS.places}/autocomplete/json?${query}`);

  const predictions = Array.isArray(data.predictions) ? data.predictions : [];
  const suggestions = predictions.map((p, idx) => ({
    id: p.place_id || `place_${idx}`,
    description: p.description,
    mainText: p.structured_formatting?.main_text || p.description,
    secondaryText: p.structured_formatting?.secondary_text || "",
    types: p.types || [],
    placePrediction: {
      place: p.place_id,
      placeId: p.place_id,
      text: { text: p.description },
      structuredFormat: {
        mainText: { text: p.structured_formatting?.main_text || p.description },
        secondaryText: { text: p.structured_formatting?.secondary_text || "" },
      },
    },
  }));

  return {
    status: data.status,
    predictions,
    suggestions,
  };
}

/**
 * Search places using Google Maps Places API (textsearch).
 */
export async function searchPlaces(textQuery, options = {}) {
  const params = {
    query: textQuery.trim(),
    key: getGoogleMapsApiKey(),
    ...options,
  };
  const query = new URLSearchParams(params);
  return await googleRequest(`${GOOGLE_MAPS_BASE_URLS.places}/textsearch/json?${query}`);
}

/**
 * Calculate distance in miles between two coordinates using the Haversine formula.
 */
export function calculateDistanceInMiles(lat1, lon1, lat2, lon2) {
  const p1Lat = Number(lat1);
  const p1Lon = Number(lon1);
  const p2Lat = Number(lat2);
  const p2Lon = Number(lon2);

  if (
    !Number.isFinite(p1Lat) ||
    !Number.isFinite(p1Lon) ||
    !Number.isFinite(p2Lat) ||
    !Number.isFinite(p2Lon)
  ) {
    return null;
  }

  const R = 3958.8; // Earth radius in miles
  const toRad = (deg) => (deg * Math.PI) / 180;
  const dLat = toRad(p2Lat - p1Lat);
  const dLon = toRad(p2Lon - p1Lon);

  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(p1Lat)) * Math.cos(toRad(p2Lat)) * Math.sin(dLon / 2) ** 2;

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  const distance = R * c;

  return Number.isFinite(distance) ? distance : null;
}

/**
 * Format distance in miles for user display.
 */
export function formatDistance(miles) {
  if (miles == null || !Number.isFinite(miles)) return null;
  if (miles < 0.05) return "0.1 mi";
  return `${miles.toFixed(1)} mi`;
}

