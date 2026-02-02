import { Router } from "express";
import * as loanController from "../controller/loan.controller.js";

const router = Router();

router.post("/create", loanController.createLoan);
router.get("/get/:id", loanController.getLoan);
router.get("/member/:memberId", loanController.getMemberLoans);
// Get all loan payments for a member
router.get("/payments/member/:memberId", loanController.getMemberLoanPayments);
router.get("/all", loanController.getAllLoans);
router.post("/pay/:id", loanController.payLoanEmi);
router.post("/pay-old/:id", loanController.payOldLoanEmi);
router.put("/update-type/:id", loanController.updateLoanType);
router.delete("/payment/:id", loanController.deleteLoanPayment);
router.get("/available", loanController.getLoanableAmount);

export default router;
