import express from "express";
import {
    createTransaction,
    getAllTransactions,
    getUnifiedHistory,
    getMemberTransactions,
    deleteTransaction,
    smartDistribute
} from "../controller/transaction.controller.js";

const router = express.Router();

router.post("/create", createTransaction);
router.get("/list", getAllTransactions);
router.get("/unified-list", getUnifiedHistory);
router.get("/member/:memberId", getMemberTransactions);
router.post("/smart-distribute", smartDistribute);
router.delete("/:id", deleteTransaction);

export default router;
