import { Router } from "express";
import { db } from "../prisma/db.ts";
import { calculateDistanceInMiles, formatDistance } from "../services/google-maps.service.js";

const router = Router();

router.get("/", async (req, res, next) => {
  try {
    const rawVendors = await db.orm.public.Vendor.include("location").all();
    const lat = req.query.lat != null ? Number(req.query.lat) : null;
    const lng = req.query.lng != null ? Number(req.query.lng) : null;
    const userCoords = Number.isFinite(lat) && Number.isFinite(lng) ? { lat, lng } : null;

    let recommendations = rawVendors.slice(0, 10).map((vendor, index) => {
      const vLat = vendor.location?.latitude != null ? Number(vendor.location.latitude) : null;
      const vLng = vendor.location?.longitude != null ? Number(vendor.location.longitude) : null;
      let distance = null;
      let distanceInMiles = null;

      if (
        userCoords &&
        Number.isFinite(userCoords.lat) &&
        Number.isFinite(userCoords.lng) &&
        Number.isFinite(vLat) &&
        Number.isFinite(vLng)
      ) {
        distanceInMiles = calculateDistanceInMiles(userCoords.lat, userCoords.lng, vLat, vLng);
        distance = formatDistance(distanceInMiles);
      }

      return {
        id: vendor.id,
        name: vendor.name,
        type: vendor.type,
        city: vendor.city,
        distance,
        distanceInMiles,
        latitude: vLat,
        longitude: vLng,
        note: index % 2 === 0 ? "Popular in your area" : "Trending today",
      };
    });

    if (userCoords) {
      recommendations.sort((a, b) => {
        const distA = a.distanceInMiles != null ? a.distanceInMiles : Infinity;
        const distB = b.distanceInMiles != null ? b.distanceInMiles : Infinity;
        return distA - distB;
      });
    }

    return res.json({ recommendations });
  } catch (error) {
    next(error);
  }
});

export default router;

