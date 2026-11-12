import path from "node:path";
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

app.use(express.json());
app.get("/health", (_req, res) => res.json({ status: "ok" }));
app.use("/api/auth", auth);
app.use("/api/forgot-password", forgotPassword);
app.use("/api/user", user);
app.use("/api/profile", user);
app.use("/api/favorites", user);
app.use("/api/vendors", vendors);
app.use("/api/recommendations", recommendations);
app.use("/api/maps", mapsRouter);
app.use(notFoundHandler);
app.use(errorHandler);

app.listen(port, () => console.log(`API listening on http://localhost:${port}`));
