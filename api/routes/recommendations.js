import { Router } from "express";
import { db } from "../prisma/db.ts";

const router = Router();

router.get("/", async (req, res, next) => {
  try {
    const rawVendors = await db.orm.public.Vendor.include("location").all();
    const recommendations = rawVendors.slice(0, 10).map((vendor, index) => {
      const id = Number(vendor.id);
      const lat = vendor.location?.latitude != null ? Number(vendor.location.latitude) : null;
      const lng = vendor.location?.longitude != null ? Number(vendor.location.longitude) : null;
      return {
        id: vendor.id,
        name: vendor.name,
        type: vendor.type,
        city: vendor.city,
        rating: (4.6 + ((id * 2) % 4) / 10).toFixed(1),
        distance: `${(0.4 + ((id * 5) % 25) / 10).toFixed(1)} mi`,
        latitude: lat,
        longitude: lng,
        note: index % 2 === 0 ? "Popular in your area" : "Trending today",
      };
    });
    return res.json({ recommendations });
  } catch (error) {
    next(error);
  }
});

export default router;

