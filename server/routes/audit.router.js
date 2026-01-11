import { Router } from "express";
import { runAudit, getAuditHistory } from "../controller/audit.controller.js";

const router = Router();

router.post("/run", runAudit);
router.get("/history", getAuditHistory);

export default router;
