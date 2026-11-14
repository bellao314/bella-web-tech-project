import path from "node:path";
import fs from "node:fs";
import { fileURLToPath } from "node:url";
import express from "express";
import dotenv from "dotenv";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, ".env") });
dotenv.config();

import auth from "./routes/auth.js";
import user from "./routes/user.js";
import vendors from "./routes/vendors.js";
import recommendations from "./routes/recommendations.js";
import mapsRouter from "./routes/maps.routes.js";
import forgotPassword from "./routes/forgot-password.js";
import { errorHandler, notFoundHandler } from "./middleware/error.middleware.js";

const app = express();
const port = Number(process.env.PORT) || 3000;

app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true, limit: "10mb" }));
app.get("/health", (_req, res) => res.json({ status: "ok" }));
app.use("/api/auth", auth);
app.use("/api/forgot-password", forgotPassword);
app.use("/api/user", user);
app.use("/api/profile", user);
app.use("/api/favorites", user);
app.use("/api/vendors", vendors);
app.use("/api/recommendations", recommendations);
app.use("/api/maps", mapsRouter);

// Serve frontend static build if present (e.g. unified single-container deployment)
const clientDistPath = path.resolve(__dirname, "../app/dist");
if (fs.existsSync(clientDistPath)) {
  app.use(express.static(clientDistPath));
  app.get("{*splat}", (req, res, next) => {
    if (req.path.startsWith("/api") || req.path === "/health") {
      return next();
    }
    res.sendFile(path.join(clientDistPath, "index.html"));
  });
} else {
  app.get("/", (_req, res) => {
    res.json({
      name: "Mobile Vendor API",
      status: "running",
      endpoints: {
        health: "/health",
        api: "/api",
      },
    });
  });
}

app.use(notFoundHandler);
app.use(errorHandler);

app.listen(port, () => console.log(`API listening on http://localhost:${port}`));

