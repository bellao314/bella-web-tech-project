import GOOGLE_MAPS_BASE_URLS, { getGoogleMapsApiKey } from "../config/maps.config.js";

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

export function geocodeAddress(address) {
  const query = new URLSearchParams({ address, key: getGoogleMapsApiKey() });
  return googleRequest(`${GOOGLE_MAPS_BASE_URLS.geocoding}?${query}`);
}

export function reverseGeocode(latitude, longitude) {
  const query = new URLSearchParams({ latlng: `${latitude},${longitude}`, key: getGoogleMapsApiKey() });
  return googleRequest(`${GOOGLE_MAPS_BASE_URLS.geocoding}?${query}`);
}

export function autocompletePlaces(input, options = {}) {
  return googleRequest(`${GOOGLE_MAPS_BASE_URLS.places}/places:autocomplete`, {
    method: "POST",
    headers: { "Content-Type": "application/json", "X-Goog-Api-Key": getGoogleMapsApiKey() },
    body: JSON.stringify({ input, ...options }),
  });
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