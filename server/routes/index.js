import express from "express";
import memberRouter from "./member.router.js";
import operatorRouter from "./operator.router.js";
import overviewRouter from "./overview.router.js";
import transactionRouter from "./transaction.router.js";
import loanRouter from "./loan.router.js";
import auditRouter from "./audit.router.js";
import withdrawalRouter from "./withdrawal.router.js";
import reportRouter from "./report.router.js";
import releasedMoneyRouter from "./releasedMoney.router.js";
import { authMiddleware } from "../middleware/auth.js";

const router = express.Router();

router.use("/operator", operatorRouter);

// to protect rest of the route
router.use(authMiddleware)
router.use("/member", memberRouter);
router.use("/overview", overviewRouter);
router.use("/transaction", transactionRouter);
router.use("/loan", loanRouter);
router.use("/audit", auditRouter);
router.use("/withdrawal", withdrawalRouter);
router.use("/report", reportRouter);
router.use("/released-money", releasedMoneyRouter);

export default router;
