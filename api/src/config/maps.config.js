const GOOGLE_MAPS_BASE_URLS = {
  geocoding: "https://maps.googleapis.com/maps/api/geocode/json",
  places: "https://places.googleapis.com/v1",
  routes: "https://routes.googleapis.com/directions/v2:computeRoutes",
};

export function getGoogleMapsApiKey() {
  const apiKey = process.env.GOOGLE_MAPS_API_KEY;
  if (!apiKey) {
    const error = new Error("GOOGLE_MAPS_API_KEY is not configured.");
    error.statusCode = 500;
    throw error;
  }
  return apiKey;
}

export default GOOGLE_MAPS_BASE_URLS;
