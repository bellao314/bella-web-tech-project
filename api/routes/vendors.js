import { Router } from "express";
import { db } from "../prisma/db.ts";
import { calculateDistanceInMiles, formatDistance } from "../services/google-maps.service.js";

const router = Router();

const CITY_COORDINATES = {
  "St. Louis, MO": { lat: 38.6270, lng: -90.1994 },
  "Clayton, MO": { lat: 38.6533, lng: -90.3323 },
  "Richmond Heights, MO": { lat: 38.6320, lng: -90.3292 },
  "University City, MO": { lat: 38.6559, lng: -90.3098 },
  "Maplewood, MO": { lat: 38.6117, lng: -90.3228 },
  "Webster Groves, MO": { lat: 38.5926, lng: -90.3556 },
  "Kirkwood, MO": { lat: 38.5834, lng: -90.4067 },
  "Affton, MO": { lat: 38.5528, lng: -90.3242 },
  "Creve Coeur, MO": { lat: 38.6703, lng: -90.4939 },
  "Ballwin, MO": { lat: 38.5953, lng: -90.5467 },
  "Ellisville, MO": { lat: 38.5937, lng: -90.5898 },
  "Chesterfield, MO": { lat: 38.6631, lng: -90.5772 },
  "Florissant, MO": { lat: 38.7992, lng: -90.3237 },
  "Fenton, MO": { lat: 38.5445, lng: -90.4456 },
  "Arnold, MO": { lat: 38.4328, lng: -90.3776 },
  "St. Charles, MO": { lat: 38.7881, lng: -90.4974 },
  "St. Peters, MO": { lat: 38.7992, lng: -90.6264 },
  "O'Fallon, MO": { lat: 38.7509, lng: -90.6998 },
  "Lake St. Louis, MO": { lat: 38.7962, lng: -90.7853 },
  "Wentzville, MO": { lat: 38.8109, lng: -90.8540 },
  "High Ridge, MO": { lat: 38.4656, lng: -90.5282 },
  "Edwardsville, IL": { lat: 38.8114, lng: -89.9532 },
  "Collinsville, IL": { lat: 38.6703, lng: -89.9845 },
  "Belleville, IL": { lat: 38.5201, lng: -89.9840 },
  "Alton, IL": { lat: 38.8906, lng: -90.1843 },
  "Troy, MO": { lat: 38.9792, lng: -90.9818 },
  "Columbia, MO": { lat: 38.9517, lng: -92.3341 },
  "Farmington, MO": { lat: 37.7801, lng: -90.4218 },
};

export function formatVendor(vendor, userCoords = null) {
  const id = Number(vendor.id);
  const base = CITY_COORDINATES[vendor.city] || { lat: 38.6270, lng: -90.1994 };
  const latOffset = (((id * 17) % 40) - 20) * 0.0012;
  const lngOffset = (((id * 31) % 40) - 20) * 0.0012;

  const lat = vendor.location?.latitude != null
    ? Number(vendor.location.latitude)
    : Number((base.lat + latOffset).toFixed(6));
  const lng = vendor.location?.longitude != null
    ? Number(vendor.location.longitude)
    : Number((base.lng + lngOffset).toFixed(6));

  let distance = null;
  let distanceInMiles = null;
  if (
    userCoords &&
    Number.isFinite(Number(userCoords.lat)) &&
    Number.isFinite(Number(userCoords.lng)) &&
    Number.isFinite(lat) &&
    Number.isFinite(lng)
  ) {
    distanceInMiles = calculateDistanceInMiles(userCoords.lat, userCoords.lng, lat, lng);
    distance = formatDistance(distanceInMiles);
  }

  return {
    id: vendor.id,
    name: vendor.name,
    type: vendor.type,
    city: vendor.city,
    email: vendor.email,
    phone: vendor.phone,
    website: vendor.website,
    latitude: lat,
    longitude: lng,
    location: {
      lat,
      lng,
      latitude: lat,
      longitude: lng,
    },
    distance,
    distanceInMiles,
    hours: "10:00 AM – 6:00 PM",
  };
}

router.get("/", async (req, res, next) => {
  try {
    const rawVendors = await db.orm.public.Vendor.include("location").all();
    const lat = req.query.lat != null ? Number(req.query.lat) : null;
    const lng = req.query.lng != null ? Number(req.query.lng) : null;
    const userCoords = Number.isFinite(lat) && Number.isFinite(lng) ? { lat, lng } : null;

    let vendors = rawVendors.map((v) => formatVendor(v, userCoords));
    if (userCoords) {
      vendors.sort((a, b) => {
        const distA = a.distanceInMiles != null ? a.distanceInMiles : Infinity;
        const distB = b.distanceInMiles != null ? b.distanceInMiles : Infinity;
        return distA - distB;
      });
    }

    return res.json({ vendors });
  } catch (error) {
    next(error);
  }
});

router.get("/:id", async (req, res, next) => {
  try {
    const id = Number(req.params.id);
    if (!Number.isFinite(id)) {
      return res.status(400).json({ error: "Invalid vendor ID." });
    }

    const rawVendor = await db.orm.public.Vendor.where({ id }).include("location").first();
    if (!rawVendor) {
      return res.status(404).json({ error: "Vendor not found." });
    }

    return res.json({ vendor: formatVendor(rawVendor) });
  } catch (error) {
    next(error);
  }
});

export default router;

