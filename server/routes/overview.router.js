import express from "express";
import { getOverviewStats } from "../controller/overview.controller.js";

const router = express.Router();

router.get("/stats", getOverviewStats);

export default router;
