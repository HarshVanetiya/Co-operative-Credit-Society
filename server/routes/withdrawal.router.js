import { Router } from "express";
import {
    createWithdrawal,
    getAllWithdrawals
} from "../controller/withdrawal.controller.js";

const router = Router();

router.post("/create", createWithdrawal);
router.get("/list", getAllWithdrawals);

export default router;
