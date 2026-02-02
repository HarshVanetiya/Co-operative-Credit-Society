import express from "express";
import { releaseCash, settleCash, getMemberLogs } from "../controller/releasedMoney.controller.js";

const router = express.Router();

router.post("/release", releaseCash);
router.post("/settle", settleCash);
router.get("/logs/:memberId", getMemberLogs);

export default router;
