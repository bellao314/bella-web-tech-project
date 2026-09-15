import { Router } from "express";
import * as mapsController from "../controllers/maps.controller.js";

const router = Router();
router.get("/geocode", mapsController.geocode);
router.get("/reverse-geocode", mapsController.reverseGeocode);
router.post("/places/autocomplete", mapsController.autocomplete);
router.post("/places/search", mapsController.placeSearch);
router.post("/routes", mapsController.route);
export default router;
