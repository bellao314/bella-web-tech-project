import * as mapsService from "../services/google-maps.service.js";

function requireString(value, name) {
  if (typeof value !== "string" || !value.trim()) {
    const error = new Error(`${name} is required.`);
    error.statusCode = 400;
    throw error;
  }
  return value.trim();
}

export async function geocode(req, res, next) {
  try { res.json(await mapsService.geocodeAddress(requireString(req.query.address, "address"))); } catch (error) { next(error); }
}

export async function reverseGeocode(req, res, next) {
  try {
    const latitude = Number(req.query.latitude);
    const longitude = Number(req.query.longitude);
    if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) {
      const error = new Error("latitude and longitude must be valid numbers.");
      error.statusCode = 400;
      throw error;
    }
    res.json(await mapsService.reverseGeocode(latitude, longitude));
  } catch (error) { next(error); }
}

export async function autocomplete(req, res, next) {
  try {
    const { input, ...options } = req.body;
    res.json(await mapsService.autocompletePlaces(requireString(input, "input"), options));
  } catch (error) { next(error); }
}

export async function placeSearch(req, res, next) {
  try {
    const { textQuery, ...options } = req.body;
    res.json(await mapsService.searchPlaces(requireString(textQuery, "textQuery"), options));
  } catch (error) { next(error); }
}

export async function route(req, res, next) {
  try {
    if (!req.body.origin || !req.body.destination) {
      const error = new Error("origin and destination are required.");
      error.statusCode = 400;
      throw error;
    }
    res.json(await mapsService.computeRoute(req.body));
  } catch (error) { next(error); }
}
