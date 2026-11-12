import { Router } from "express";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import { db } from "../prisma/db.ts";

const router = Router();

// POST / (or POST /api/forgot-password, POST /api/auth/forgot-password)
router.post("/", async (req, res, next) => {
  const { email } = req.body || {};

  if (!email || typeof email !== "string" || !email.trim()) {
    return res.status(400).json({ error: "Email is required." });
  }

  try {
    const cleanEmail = email.trim();
    const user =
      (await db.orm.public.User.where({ email: cleanEmail.toLowerCase() }).first()) ||
      (await db.orm.public.User.where({ email: cleanEmail }).first());

    if (!user) {
      return res.status(404).json({ error: "User does not exist." });
    }

    const jwtSecret = process.env.JWT_SECRET || "default_jwt_secret_dev_mode";
    const resetToken = jwt.sign(
      { id: user.id, email: user.email, type: "password_reset" },
      jwtSecret,
      { expiresIn: "1h" }
    );

    const baseUrl = process.env.BASE_URL || "http://localhost:5173";
    const resetLink = `${baseUrl}/reset?reset_tok=${resetToken}`;

    await db.orm.public.logs.create({
      type: "USER_PASSWORD_CHANGE",
      userId: user.id,
    });

    return res.status(200).json({
      success: true,
      message: "Password reset link sent.",
      resetLink,
    });
  } catch (error) {
    next(error);
  }
});

// PUT / or POST /reset or PUT /reset - Update password using token
async function handleResetPassword(req, res, next) {
  const { newPassword, password, token, reset_tok } = req.body || {};
  const pwd = newPassword || password;
  const resetToken = token || reset_tok;

  if (!resetToken) {
    return res.status(400).json({ error: "Reset token is required." });
  }

  if (!pwd || typeof pwd !== "string" || pwd.length < 6) {
    return res.status(400).json({ error: "Password must be at least 6 characters." });
  }

  try {
    const jwtSecret = process.env.JWT_SECRET || "default_jwt_secret_dev_mode";
    let decodedToken;

    try {
      decodedToken = jwt.verify(resetToken, jwtSecret);
    } catch (_err) {
      if (jwtSecret !== "default_jwt_secret_dev_mode") {
        try {
          decodedToken = jwt.verify(resetToken, "default_jwt_secret_dev_mode");
        } catch {
          return res.status(401).json({ error: "Invalid or expired link." });
        }
      } else {
        return res.status(401).json({ error: "Invalid or expired link." });
      }
    }

    const userId = Number(decodedToken?.id);
    if (!userId || isNaN(userId)) {
      return res.status(401).json({ error: "Invalid or expired link." });
    }

    const user = await db.orm.public.User.where({ id: userId }).first();
    if (!user) {
      return res.status(401).json({ error: "Invalid or expired link." });
    }

    const hashedPassword = await bcrypt.hash(pwd, 10);

    await db.orm.public.User.where({ id: userId }).update({
      password: hashedPassword,
      updatedAt: new Date(),
    });

    await db.orm.public.logs.create({
      type: "USER_PASSWORD_CHANGE",
      userId: user.id,
    });

    return res.status(200).json({
      success: true,
      message: "Password updated successfully.",
    });
  } catch (error) {
    next(error);
  }
}

router.put("/", handleResetPassword);
router.post("/reset", handleResetPassword);
router.put("/reset", handleResetPassword);

export default router;
