import express from "express";
import { getMonthlyActivity, getExpectedCollections, getMemberStatus } from "../controller/report.controller.js";

const router = express.Router();

router.get("/activity", getMonthlyActivity);
router.get("/expected", getExpectedCollections);
router.get("/status", getMemberStatus);

export default router;
