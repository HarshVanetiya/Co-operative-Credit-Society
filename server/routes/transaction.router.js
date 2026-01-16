import express from "express";
import {
    createTransaction,
    getAllTransactions,
    getMemberTransactions,
    deleteTransaction
} from "../controller/transaction.controller.js";

const router = express.Router();

router.post("/create", createTransaction);
router.get("/list", getAllTransactions);
router.get("/member/:memberId", getMemberTransactions);
router.delete("/:id", deleteTransaction);

export default router;
