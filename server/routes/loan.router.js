import { Router } from "express";
import { 
    createLoan, 
    getLoan, 
    getMemberLoans, 
    getAllLoans, 
    payLoanEmi, 
    getLoanableAmount,
    getMemberLoanPayments,
    deleteLoanPayment
} from "../controller/loan.controller.js";

const router = Router();

router.post("/create", createLoan);
router.get("/get/:id", getLoan);
router.get("/member/:memberId", getMemberLoans);
// Get all loan payments for a member
router.get("/payments/member/:memberId", getMemberLoanPayments);
router.get("/all", getAllLoans);
router.post("/pay/:id", payLoanEmi);
router.delete("/payment/:id", deleteLoanPayment);
router.get("/available", getLoanableAmount);

export default router;
