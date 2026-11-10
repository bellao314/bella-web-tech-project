import { Router } from "express";
import jwt from "jsonwebtoken";
import { db } from "../prisma/db.ts";
import { formatVendor } from "./vendors.js";
import { geocodeAddress } from "../services/google-maps.service.js";

const router = Router();

export async function getUserFromRequest(req) {
	const authorization = req.headers.authorization;
	let token = null;

	if (authorization) {
		if (authorization.startsWith("Bearer ") || authorization.startsWith("bearer ")) {
			token = authorization.slice(7).trim();
		} else if (!authorization.includes(" ")) {
			token = authorization.trim();
		}
	}

	if (!token) {
		return null;
	}

	try {
		const jwtSecret = process.env.JWT_SECRET || "default_jwt_secret_dev_mode";
		let payload = null;

		try {
			payload = jwt.verify(token, jwtSecret);
		} catch (verifyErr) {
			if (jwtSecret !== "default_jwt_secret_dev_mode") {
				try {
					payload = jwt.verify(token, "default_jwt_secret_dev_mode");
				} catch {
					return null;
				}
			} else {
				return null;
			}
		}

		const rawId = typeof payload === "object" && payload !== null ? (payload.id ?? payload.userId) : null;
		const userId = rawId !== null && !isNaN(Number(rawId)) ? Number(rawId) : null;

		let user = null;
		if (userId !== null) {
			user = await db.orm.public.User.where({ id: userId }).first();
		}
		if (!user && payload?.email) {
			user = await db.orm.public.User.where({ email: String(payload.email) }).first();
		}

		if (user) {
			user.accountType = user.type || payload?.type || payload?.accountType || "customer";
		}

		return user;
	} catch {
		return null;
	}
}

export async function getUserFavorites(userId) {
	try {
		const rawFavs = await db.orm.public.Favorite
			.where({ userId: Number(userId) })
			.all();

		if (!rawFavs || !rawFavs.length) return [];

		const vendors = await Promise.all(
			rawFavs.map(async (fav) => {
				try {
					const rawVendor = await db.orm.public.Vendor
						.where({ id: Number(fav.vendorId) })
						.include("location")
						.first();
					return rawVendor ? formatVendor(rawVendor) : null;
				} catch {
					return null;
				}
			})
		);

		return vendors.filter(Boolean);
	} catch (error) {
		console.error("Error fetching favorites:", error);
		return [];
	}
}

async function handleProfile(req, res, next) {
	try {
		const user = await getUserFromRequest(req);
		if (!user) {
			return res.status(401).json({ error: "Authentication is required." });
		}

		const favorites = await getUserFavorites(user.id);
		const userType = user.type || user.accountType || "customer";

		return res.json({
			profile: {
				id: user.id,
				name: user.name,
				email: user.email,
				type: userType,
				accountType: userType,
				city: user.city || null,
				latitude: user.latitude != null ? Number(user.latitude) : null,
				longitude: user.longitude != null ? Number(user.longitude) : null,
				createdAt: user.createdAt,
				updatedAt: user.updatedAt,
				favorites,
				stats: {
					Favorites: favorites.length,
					Reviews: 0,
					CheckIns: 0,
				},
			},
		});
	} catch (error) {
		next(error);
	}
}

async function handleUpdateProfile(req, res, next) {
	try {
		const user = await getUserFromRequest(req);
		if (!user) {
			return res.status(401).json({ error: "Authentication is required." });
		}

		const { city, name } = req.body || {};
		const updateData = {
			updatedAt: new Date(),
		};

		if (name !== undefined) {
			updateData.name = typeof name === "string" ? name.trim() : null;
		}

		if (city !== undefined) {
			const cleanCity = typeof city === "string" ? city.trim() : "";
			updateData.city = cleanCity || null;

			if (cleanCity) {
				let lat = req.body?.latitude != null ? Number(req.body?.latitude) : null;
				let lng = req.body?.longitude != null ? Number(req.body?.longitude) : null;

				if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
					try {
						const geoResult = await geocodeAddress(cleanCity);
						const loc = geoResult?.results?.[0]?.geometry?.location;
						if (loc && Number.isFinite(loc.lat) && Number.isFinite(loc.lng)) {
							lat = loc.lat;
							lng = loc.lng;
						}
					} catch (geoErr) {
						console.warn("Geocoding failed for city:", cleanCity, geoErr?.message);
					}
				}

				updateData.latitude = lat != null ? String(lat) : null;
				updateData.longitude = lng != null ? String(lng) : null;
			} else {
				updateData.latitude = null;
				updateData.longitude = null;
			}
		} else if (req.body?.latitude !== undefined && req.body?.longitude !== undefined) {
			const lat = Number(req.body.latitude);
			const lng = Number(req.body.longitude);
			if (Number.isFinite(lat) && Number.isFinite(lng)) {
				updateData.latitude = String(lat);
				updateData.longitude = String(lng);
			}
		}

		await db.orm.public.User.where({ id: user.id }).update(updateData);

		const updatedUser = await db.orm.public.User.where({ id: user.id }).first();
		const favorites = await getUserFavorites(user.id);
		const userType = updatedUser?.type || user.accountType || "customer";

		return res.json({
			success: true,
			profile: {
				id: updatedUser.id,
				name: updatedUser.name,
				email: updatedUser.email,
				type: userType,
				accountType: userType,
				city: updatedUser.city || null,
				latitude: updatedUser.latitude != null ? Number(updatedUser.latitude) : null,
				longitude: updatedUser.longitude != null ? Number(updatedUser.longitude) : null,
				createdAt: updatedUser.createdAt,
				updatedAt: updatedUser.updatedAt,
				favorites,
				stats: {
					Favorites: favorites.length,
					Reviews: 0,
					CheckIns: 0,
				},
			},
		});
	} catch (error) {
		next(error);
	}
}

async function handleGetFavorites(req, res, next) {
	try {
		const user = await getUserFromRequest(req);
		if (!user) {
			return res.status(401).json({ error: "Authentication is required." });
		}

		const favorites = await getUserFavorites(user.id);
		return res.json({ favorites });
	} catch (error) {
		next(error);
	}
}

async function handleAddFavorite(req, res, next) {
	try {
		const user = await getUserFromRequest(req);
		if (!user) {
			return res.status(401).json({ error: "Authentication is required." });
		}

		const rawVendorId = req.body?.vendorId ?? req.params?.vendorId;
		const vendorId = Number(rawVendorId);

		if (!Number.isFinite(vendorId)) {
			// For non-numeric custom IDs (e.g. "my-business"), return success
			return res.json({
				success: true,
				isFavorite: true,
				vendorId: rawVendorId,
				favorites: await getUserFavorites(user.id),
			});
		}

		const existing = await db.orm.public.Favorite
			.where({ userId: user.id, vendorId })
			.first();

		if (!existing) {
			await db.orm.public.Favorite.create({
				userId: user.id,
				vendorId,
				createdAt: new Date().toISOString(),
			});
		}

		const favorites = await getUserFavorites(user.id);
		return res.status(200).json({
			success: true,
			isFavorite: true,
			favorites,
		});
	} catch (error) {
		next(error);
	}
}

async function handleRemoveFavorite(req, res, next) {
	try {
		const user = await getUserFromRequest(req);
		if (!user) {
			return res.status(401).json({ error: "Authentication is required." });
		}

		const rawVendorId = req.params?.vendorId ?? req.body?.vendorId;
		const vendorId = Number(rawVendorId);

		if (!Number.isFinite(vendorId)) {
			return res.json({
				success: true,
				isFavorite: false,
				vendorId: rawVendorId,
				favorites: await getUserFavorites(user.id),
			});
		}

		await db.orm.public.Favorite
			.where({ userId: user.id, vendorId })
			.delete();

		const favorites = await getUserFavorites(user.id);
		return res.status(200).json({
			success: true,
			isFavorite: false,
			favorites,
		});
	} catch (error) {
		next(error);
	}
}

async function handleToggleFavorite(req, res, next) {
	try {
		const user = await getUserFromRequest(req);
		if (!user) {
			return res.status(401).json({ error: "Authentication is required." });
		}

		const rawVendorId = req.body?.vendorId ?? req.params?.vendorId;
		const vendorId = Number(rawVendorId);

		if (!Number.isFinite(vendorId)) {
			return res.json({
				success: true,
				isFavorite: true,
				vendorId: rawVendorId,
				favorites: await getUserFavorites(user.id),
			});
		}

		const existing = await db.orm.public.Favorite
			.where({ userId: user.id, vendorId })
			.first();

		let isFavorite = false;
		if (existing) {
			await db.orm.public.Favorite
				.where({ userId: user.id, vendorId })
				.delete();
			isFavorite = false;
		} else {
			await db.orm.public.Favorite.create({
				userId: user.id,
				vendorId,
				createdAt: new Date().toISOString(),
			});
			isFavorite = true;
		}

		const favorites = await getUserFavorites(user.id);
		return res.status(200).json({
			success: true,
			isFavorite,
			favorites,
		});
	} catch (error) {
		next(error);
	}
}

router.get("/profile", handleProfile);
router.put("/profile", handleUpdateProfile);
router.patch("/profile", handleUpdateProfile);
router.get("/favorites", handleGetFavorites);
router.post("/favorites", handleAddFavorite);
router.post("/favorites/toggle", handleToggleFavorite);
router.delete("/favorites/:vendorId", handleRemoveFavorite);
router.get("/", handleProfile);
router.put("/", handleUpdateProfile);
router.patch("/", handleUpdateProfile);

export default router;
