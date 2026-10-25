import { Router } from "express";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import { db } from "../prisma/db.ts";

const router = Router();

// Handle login for either POST /api/auth/login or POST /api/auth
async function handleLogin(req, res, next) {
  const { email, password } = req.body || {};

  if (!email || !password) {
    return res.status(400).json({ error: "Email and password are required." });
  }

  try {
    const user = await db.orm.public.User.where({ email }).first();

    if (!user || !user.password) {
      await db.orm.public.logs.create({
        type: "USER_LOGIN_FAILURE",
        message: `Failed login attempt for ${email}`,
      });
      return res.status(401).json({ error: "Invalid credentials." });
    }

    const isMatched = await bcrypt.compare(password, user.password);
    if (!isMatched) {
      await db.orm.public.logs.create({
        type: "USER_LOGIN_FAILURE",
        userId: user.id,
      });
      return res.status(401).json({ error: "Invalid credentials." });
    }

    await db.orm.public.logs.create({
      type: "USER_LOGIN_LOCAL",
      userId: user.id,
    });

    const jwtSecret = process.env.JWT_SECRET || "default_jwt_secret_dev_mode";
    const token = jwt.sign(
      {
        id: user.id,
        email: user.email,
        name: user.name,
      },
      jwtSecret,
      { expiresIn: "3h" }
    );

    return res.status(200).json({
      token,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
      },
    });
  } catch (error) {
    next(error);
  }
}

router.post("/login", handleLogin);
router.post("/", handleLogin);

// POST /api/auth/register - Register a new user
router.post("/register", async (req, res, next) => {
  const { email, password, name } = req.body || {};

  if (!email || !password) {
    return res.status(400).json({ error: "Email and password are required." });
  }

  try {
    const existing = await db.orm.public.User.where({ email }).first();
    if (existing) {
      return res.status(409).json({ error: "A user with this email already exists." });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const user = await db.orm.public.User.create({
      email,
      password: hashedPassword,
      name: name || null,
      updatedAt: new Date(),
    });

    await db.orm.public.logs.create({
      type: "USER_LOGIN_LOCAL",
      userId: user.id,
    });

    const jwtSecret = process.env.JWT_SECRET || "default_jwt_secret_dev_mode";
    const token = jwt.sign(
      {
        id: user.id,
        email: user.email,
        name: user.name,
      },
      jwtSecret,
      { expiresIn: "3h" }
    );

    return res.status(201).json({
      token,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
      },
    });
  } catch (error) {
    next(error);
  }
});

// PUT /api/auth/password (or PUT /api/auth) - Update password
async function handlePasswordUpdate(req, res, next) {
  const { userId, password } = req.body || {};

  if (!userId || !password) {
    return res.status(400).json({ error: "userId and password are required." });
  }

  try {
    const user = await db.orm.public.User.where({ id: Number(userId) }).first();
    if (!user) {
      return res.status(404).json({ error: "User not found." });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    await db.orm.public.User.where({ id: Number(userId) }).update({
      password: hashedPassword,
      updatedAt: new Date(),
    });

    await db.orm.public.logs.create({
      type: "USER_PASSWORD_CHANGE",
      userId: user.id,
    });

    return res.status(200).json({ success: true });
  } catch (error) {
    next(error);
  }
}

router.put("/password", handlePasswordUpdate);
router.put("/", handlePasswordUpdate);

export default router;