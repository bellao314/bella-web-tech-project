import { Router } from "express";
import jwt from "jsonwebtoken";
import { db } from "../prisma/db.ts";

const router = Router();

async function handleProfile(req, res, next) {
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
		return res.status(401).json({ error: "Authentication is required." });
	}

	try {
		const jwtSecret = process.env.JWT_SECRET || "default_jwt_secret_dev_mode";
		let payload = null;

		try {
			payload = jwt.verify(token, jwtSecret);
		} catch (verifyErr) {
			// If verification failed and a custom secret was used, attempt fallback dev secret
			if (jwtSecret !== "default_jwt_secret_dev_mode") {
				try {
					payload = jwt.verify(token, "default_jwt_secret_dev_mode");
				} catch {
					throw verifyErr;
				}
			} else {
				throw verifyErr;
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

		if (!user) {
			return res.status(404).json({ error: "User not found." });
		}

		return res.json({
			profile: {
				id: user.id,
				name: user.name,
				email: user.email,
				createdAt: user.createdAt,
				updatedAt: user.updatedAt,
			},
		});
	} catch (error) {
		if (error.name === "JsonWebTokenError" || error.name === "TokenExpiredError") {
			return res.status(401).json({ error: "Invalid or expired authentication token." });
		}
		next(error);
	}
}

router.get("/profile", handleProfile);
router.get("/", handleProfile);

export default router;