import express from "express";
import { getMonthlyActivity, getExpectedCollections } from "../controller/report.controller.js";

const router = express.Router();

router.get("/activity", getMonthlyActivity);
router.get("/expected", getExpectedCollections);

export default router;
