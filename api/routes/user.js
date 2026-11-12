import { Router } from "express";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import { db } from "../prisma/db.ts";
import { formatVendor, vendorBrandingStore } from "./vendors.js";
import { geocodeAddress } from "../services/google-maps.service.js";

const router = Router();
export const userBrandingStore = new Map();
export const vendorTypeStore = new Map();

export async function getUserFromRequest(req) {
	if (req?.user) {
		return req.user;
	}

	const authorization = req.headers?.authorization;
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
		} catch (_verifyErr) {
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
		try {
			if (userId !== null) {
				user = await db.orm.public.User.where({ id: userId }).first();
			}
			if (!user && payload?.email) {
				user = await db.orm.public.User.where({ email: String(payload.email) }).first();
			}
		} catch {
			// DB unavailable (offline/testing)
		}

		if (!user && payload) {
			user = {
				id: userId || 1,
				email: payload.email,
				name: payload.name || "User",
				type: payload.type || payload.accountType || "customer",
				accountType: payload.type || payload.accountType || "customer",
				password: payload.passwordHash || null,
			};
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

export async function handleProfile(req, res, next) {
	try {
		const user = await getUserFromRequest(req);
		if (!user) {
			return res.status(401).json({ error: "Authentication is required." });
		}

		const favorites = await getUserFavorites(user.id);
		const userType = user.type || user.accountType || "customer";
		const userBranding = userBrandingStore.get(user.id) || (user.email ? userBrandingStore.get(user.email) : null) || {};
		const userLogo = user.logo || userBranding.logo || null;
		const userBanner = user.banner || userBranding.banner || null;

		let vendor = null;
		if (userType === "business" || userType === "vendor") {
			try {
				vendor = await db.orm.public.Vendor.where({ email: user.email }).first();
				if (!vendor && user.name) {
					vendor = await db.orm.public.Vendor.where({ name: user.name }).first();
				}
			} catch {}
		}
		const vendorType = vendor?.type || vendorTypeStore.get(user.id) || (user.email ? vendorTypeStore.get(user.email) : null) || "Mobile Food & Beverage";

		return res.json({
			profile: {
				id: user.id,
				name: user.name,
				email: user.email,
				type: userType,
				accountType: userType,
				vendorType: userType === "business" || userType === "vendor" ? vendorType : undefined,
				category: userType === "business" || userType === "vendor" ? vendorType : undefined,
				city: user.city || null,
				latitude: user.latitude != null ? Number(user.latitude) : null,
				longitude: user.longitude != null ? Number(user.longitude) : null,
				logo: userLogo,
				banner: userBanner,
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

export async function handleUpdateProfile(req, res, next) {
	try {
		const user = await getUserFromRequest(req);
		if (!user) {
			return res.status(401).json({ error: "Authentication is required." });
		}

		const { city, name, email, vendorType, type, logo, banner, password } = req.body || {};
		const userType = user.type || user.accountType || "customer";
		const isBusinessUser = userType === "business" || userType === "vendor";

		// Security: changing core account details (email, business name, vendor type) requires password verification
		const isUpdatingDetails =
			email !== undefined ||
			name !== undefined ||
			vendorType !== undefined ||
			(isBusinessUser && type !== undefined && type !== "business" && type !== "customer");

		if (isUpdatingDetails) {
			if (!password || typeof password !== "string" || !password.trim()) {
				return res.status(400).json({ error: "Current password is required to update account details." });
			}

			if (user.password) {
				const isMatched = await bcrypt.compare(password, user.password);
				if (!isMatched) {
					return res.status(401).json({ error: "Incorrect password. Please verify your current password." });
				}
			}
		}

		const updateData = {
			updatedAt: new Date(),
		};

		if (logo !== undefined || banner !== undefined) {
			const existingBranding = userBrandingStore.get(user.id) || (user.email ? userBrandingStore.get(user.email) : null) || {};
			const updatedBranding = {
				...existingBranding,
				...(logo !== undefined ? { logo: typeof logo === "string" ? logo : null } : {}),
				...(banner !== undefined ? { banner: typeof banner === "string" ? banner : null } : {}),
			};
			userBrandingStore.set(user.id, updatedBranding);
			if (user.email) userBrandingStore.set(user.email, updatedBranding);
		}

		// Email validation & update: both customers and vendors can update their email
		let updatedEmail = null;
		if (email !== undefined) {
			const cleanEmail = typeof email === "string" ? email.trim().toLowerCase() : "";
			if (!cleanEmail || !cleanEmail.includes("@")) {
				return res.status(400).json({ error: "Please enter a valid email address." });
			}
			if (cleanEmail !== (user.email || "").toLowerCase()) {
				try {
					const existing = await db.orm.public.User.where({ email: cleanEmail }).first();
					if (existing && Number(existing.id) !== Number(user.id)) {
						return res.status(409).json({ error: "An account with this email address already exists." });
					}
				} catch {}
				updateData.email = cleanEmail;
				updatedEmail = cleanEmail;
			}
		}

		// Business Name update: only vendors can change Business Name
		if (name !== undefined) {
			if (!isBusinessUser) {
				if (name !== user.name) {
					return res.status(403).json({ error: "Customer accounts can only update their email address." });
				}
			} else {
				const cleanName = typeof name === "string" ? name.trim() : "";
				if (!cleanName) {
					return res.status(400).json({ error: "Business name cannot be empty." });
				}
				updateData.name = cleanName;
			}
		}

		// Vendor Type update: only vendors can change vendor type
		let updatedVendorType = null;
		const rawVendorType = vendorType !== undefined ? vendorType : (isBusinessUser && type && type !== "business" && type !== "customer" ? type : undefined);
		if (rawVendorType !== undefined) {
			if (!isBusinessUser) {
				return res.status(403).json({ error: "Only vendor accounts can update vendor type." });
			}
			const cleanVendorType = typeof rawVendorType === "string" ? rawVendorType.trim() : "";
			if (!cleanVendorType) {
				return res.status(400).json({ error: "Vendor type cannot be empty." });
			}
			updatedVendorType = cleanVendorType;
			vendorTypeStore.set(user.id, cleanVendorType);
			if (user.email) vendorTypeStore.set(user.email, cleanVendorType);
			if (updatedEmail) vendorTypeStore.set(updatedEmail, cleanVendorType);
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

		try {
			await db.orm.public.User.where({ id: user.id }).update(updateData);
		} catch (dbErr) {
			console.warn("Could not update User record in DB:", dbErr?.message);
		}

		let updatedUser = null;
		try {
			updatedUser = await db.orm.public.User.where({ id: user.id }).first();
		} catch {}

		if (isBusinessUser) {
			try {
				let vendor = await db.orm.public.Vendor.where({ email: user.email }).first();
				if (!vendor && user.name) {
					vendor = await db.orm.public.Vendor.where({ name: user.name }).first();
				}
				if (vendor) {
					const vendorUpdate = {};
					if (updateData.name) vendorUpdate.name = updateData.name;
					if (updateData.email) vendorUpdate.email = updateData.email;
					if (updatedVendorType) vendorUpdate.type = updatedVendorType;
					if (updateData.city !== undefined && updateData.city) {
						vendorUpdate.city = updateData.city;
					}
					if (Object.keys(vendorUpdate).length > 0) {
						await db.orm.public.Vendor.where({ id: vendor.id }).update(vendorUpdate);
					}

					if (logo !== undefined || banner !== undefined) {
						const vBranding = vendorBrandingStore.get(Number(vendor.id)) || {};
						vendorBrandingStore.set(Number(vendor.id), {
							...vBranding,
							...(logo !== undefined ? { logo: typeof logo === "string" ? logo : null } : {}),
							...(banner !== undefined ? { banner: typeof banner === "string" ? banner : null } : {}),
						});
					}
					if (updateData.latitude != null && updateData.longitude != null) {
						const existingLoc = await db.orm.public.Location.where({ vendorId: vendor.id }).first();
						if (existingLoc) {
							await db.orm.public.Location.where({ id: existingLoc.id }).update({
								latitude: updateData.latitude,
								longitude: updateData.longitude,
							});
						} else {
							await db.orm.public.Location.create({
								vendorId: vendor.id,
								latitude: updateData.latitude,
								longitude: updateData.longitude,
							});
						}
					}
				}
			} catch (vendorErr) {
				console.warn("Could not update vendor/location record:", vendorErr?.message);
			}
		}

		const finalEmail = updatedUser?.email || updateData.email || user.email;
		const finalName = updatedUser?.name || updateData.name || user.name;
		const finalCity = updatedUser?.city || (updateData.city !== undefined ? updateData.city : user.city);
		const finalLat = updatedUser?.latitude != null ? Number(updatedUser.latitude) : (updateData.latitude != null ? Number(updateData.latitude) : (user.latitude != null ? Number(user.latitude) : null));
		const finalLng = updatedUser?.longitude != null ? Number(updatedUser.longitude) : (updateData.longitude != null ? Number(updateData.longitude) : (user.longitude != null ? Number(user.longitude) : null));

		const jwtSecret = process.env.JWT_SECRET || "default_jwt_secret_dev_mode";
		const token = jwt.sign(
			{
				id: user.id,
				email: finalEmail,
				name: finalName,
				type: userType,
				accountType: userType,
				city: finalCity || null,
			},
			jwtSecret,
			{ expiresIn: "4h" }
		);

		const resolvedVendorType =
			updatedVendorType ||
			vendorTypeStore.get(user.id) ||
			(user.email ? vendorTypeStore.get(user.email) : null) ||
			(finalEmail ? vendorTypeStore.get(finalEmail) : null) ||
			"Mobile Food & Beverage";

		const favorites = await getUserFavorites(user.id);
		const currentBranding = userBrandingStore.get(user.id) || (user.email ? userBrandingStore.get(user.email) : null) || {};

		return res.json({
			success: true,
			token,
			profile: {
				id: updatedUser?.id || user.id,
				name: finalName,
				email: finalEmail,
				type: userType,
				accountType: userType,
				vendorType: isBusinessUser ? resolvedVendorType : undefined,
				category: isBusinessUser ? resolvedVendorType : undefined,
				city: finalCity || null,
				latitude: finalLat,
				longitude: finalLng,
				logo: currentBranding.logo ?? null,
				banner: currentBranding.banner ?? null,
				createdAt: updatedUser?.createdAt || user.createdAt,
				updatedAt: updatedUser?.updatedAt || updateData.updatedAt,
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
