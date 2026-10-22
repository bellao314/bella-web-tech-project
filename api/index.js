import express from "express";
import dotenv from "dotenv";
import auth from "./routes/auth.js";
import mapsRouter from "./routes/maps.routes.js";
import { errorHandler, notFoundHandler } from "./middleware/error.middleware.js";

dotenv.config();

const app = express();
const port = Number(process.env.PORT) || 3000;

app.use(express.json());
app.get("/health", (_req, res) => res.json({ status: "ok" }));
app.use("/api/auth", auth);
app.use("/api/maps", mapsRouter);
app.use(notFoundHandler);
app.use(errorHandler);

app.listen(port, () => console.log(`API listening on http://localhost:${port}`));
