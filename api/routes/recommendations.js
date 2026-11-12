import { Router } from "express";
import { db } from "../prisma/db.ts";
import { getUserFromRequest, getUserFavorites } from "./user.js";
import { formatVendor } from "./vendors.js";
import { vendors as defaultVendors } from "../prisma/export-vendors.js";
import { calculateRecommendations, getVendorKeywords } from "../services/recommendations.service.js";

const router = Router();

router.get("/", async (req, res, next) => {
  try {
    let rawVendors = [];
    try {
      rawVendors = await db.orm.public.Vendor.include("location").all();
    } catch {
      rawVendors = [];
    }

    if (!rawVendors || rawVendors.length === 0) {
      rawVendors = defaultVendors.map((v, idx) => ({
        id: idx + 1,
        ...v,
      }));
    }

    // Attempt to identify user from Authorization header
    const user = await getUserFromRequest(req);
    let userFavorites = [];
    if (user) {
      try {
        userFavorites = await getUserFavorites(user.id);
      } catch {
        userFavorites = [];
      }
    }

    // Determine user coordinates: query params override profile
    let lat = req.query.lat != null && req.query.lat !== "" ? Number(req.query.lat) : null;
    let lng = req.query.lng != null && req.query.lng !== "" ? Number(req.query.lng) : null;

    if ((lat == null || !Number.isFinite(lat)) && user?.latitude != null) {
      lat = Number(user.latitude);
    }
    if ((lng == null || !Number.isFinite(lng)) && user?.longitude != null) {
      lng = Number(user.longitude);
    }

    const userCoords = Number.isFinite(lat) && Number.isFinite(lng) ? { lat, lng } : null;

    // Merge favorites from query param if provided
    const favoriteMap = new Map();
    userFavorites.forEach((fav) => {
      if (fav && fav.id != null) favoriteMap.set(String(fav.id), fav);
    });

    if (req.query.favorites) {
      const ids = String(req.query.favorites).split(",").map((s) => s.trim()).filter(Boolean);
      for (const favId of ids) {
        if (!favoriteMap.has(favId)) {
          const match = rawVendors.find((v) => String(v.id) === favId);
          if (match) {
            favoriteMap.set(favId, formatVendor(match, userCoords));
          } else {
            favoriteMap.set(favId, { id: favId });
          }
        }
      }
    }

    // Optional preferred keywords from query
    let preferredKeywords = [];
    if (req.query.keywords) {
      preferredKeywords = String(req.query.keywords)
        .split(",")
        .map((k) => k.trim().toLowerCase())
        .filter(Boolean);
    }

    const formattedVendors = rawVendors.map((v) => {
      const formatted = formatVendor(v, userCoords);
      return {
        ...formatted,
        keywords: Array.isArray(v.keywords) ? v.keywords : getVendorKeywords(formatted),
      };
    });

    const limit = req.query.limit != null && !isNaN(Number(req.query.limit))
      ? Math.max(1, Math.min(20, Number(req.query.limit)))
      : 6;

    const recommendations = calculateRecommendations({
      vendors: formattedVendors,
      userCoords,
      favorites: Array.from(favoriteMap.values()),
      preferredKeywords,
      limit,
    });

    return res.json({ recommendations });
  } catch (error) {
    next(error);
  }
});

export default router;
