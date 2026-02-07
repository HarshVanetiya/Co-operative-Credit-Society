import express from "express";
import { downloadBackup } from "../controller/backup.controller.js";

const router = express.Router();

router.get("/download", downloadBackup);

export default router;
