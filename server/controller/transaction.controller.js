import prisma from "../lib/prisma-client.js";

// Create a new transaction log and update balances
export const createTransaction = async (req, res) => {
    const { memberId, accountId, basicPay, developmentFee, penalty } = req.body;

    try {
        // Validate required fields
        if (!memberId || !accountId) {
            return res.status(400).json({ error: "memberId and accountId are required" });
        }

        const basicPayAmount = parseFloat(basicPay) || 0;
        const devFeeAmount = parseFloat(developmentFee) || 0;
        const penaltyAmount = parseFloat(penalty) || 0;

        // Use Prisma transaction to ensure atomicity
        const result = await prisma.$transaction(async (tx) => {
            // Create the transaction log
            const transactionLog = await tx.transactionLog.create({
                data: {
                    memberId: parseInt(memberId),
                    accountId: parseInt(accountId),
                    basicPay: basicPayAmount,
                    developmentFee: devFeeAmount,
                    penalty: penaltyAmount,
                },
                include: {
                    member: true,
                    account: true,
                }
            });

            // Update account total amount (add basicPay)
            await tx.account.update({
                where: { id: parseInt(accountId) },
                data: {
                    totalAmount: { increment: basicPayAmount }
                }
            });

            // Update organisation amount and penalty
            await tx.organisation.update({
                where: { id: 1 },
                data: {
                    amount: { increment: devFeeAmount },
                    penalty: { increment: penaltyAmount }
                }
            });

            return transactionLog;
        });

        res.status(201).json(result);
    } catch (error) {
        console.error("Error creating transaction:", error);
        res.status(500).json({ error: "Failed to create transaction" });
    }
};

// Get all transactions with optional filters and pagination
export const getAllTransactions = async (req, res) => {
    const { name, accountNumber, mobile, startDate, endDate, page = 1, limit = 20 } = req.query;

    try {
        const where = {};
        const pageNum = parseInt(page);
        const limitNum = parseInt(limit);
        const skip = (pageNum - 1) * limitNum;

        // Build filter conditions
        if (name || mobile) {
            where.member = {};
            if (name) {
                where.member.name = { contains: name, mode: 'insensitive' };
            }
            if (mobile) {
                where.member.mobile = { contains: mobile };
            }
        }

        if (accountNumber) {
            where.account = {
                accountNumber: { contains: accountNumber }
            };
        }

        if (startDate || endDate) {
            where.createdAt = {};
            if (startDate) {
                where.createdAt.gte = new Date(startDate);
            }
            if (endDate) {
                // Set end date to end of day
                const end = new Date(endDate);
                end.setHours(23, 59, 59, 999);
                where.createdAt.lte = end;
            }
        }

        // Get total count and paginated data
        const [total, transactions] = await Promise.all([
            prisma.transactionLog.count({ where }),
            prisma.transactionLog.findMany({
                where,
                orderBy: { createdAt: 'desc' },
                skip,
                take: limitNum,
                include: {
                    member: {
                        select: { id: true, name: true, mobile: true }
                    },
                    account: {
                        select: { id: true, accountNumber: true }
                    }
                }
            })
        ]);

        res.status(200).json({
            data: transactions,
            pagination: {
                page: pageNum,
                limit: limitNum,
                total,
                totalPages: Math.ceil(total / limitNum)
            }
        });
    } catch (error) {
        console.error("Error fetching transactions:", error);
        res.status(500).json({ error: "Failed to fetch transactions" });
    }
};

// Get transactions for a specific member
export const getMemberTransactions = async (req, res) => {
    const { memberId } = req.params;
    const { limit } = req.query;

    try {
        const queryOptions = {
            where: { memberId: parseInt(memberId) },
            orderBy: { createdAt: 'desc' },
            include: {
                account: {
                    select: { accountNumber: true }
                }
            }
        };

        // Add limit if specified
        if (limit) {
            queryOptions.take = parseInt(limit);
        }

        const { startDate, endDate } = req.query;
        if (startDate || endDate) {
            queryOptions.where.createdAt = {};
            if (startDate) {
                queryOptions.where.createdAt.gte = new Date(startDate);
            }
            if (endDate) {
                // Set end date to end of day
                const end = new Date(endDate);
                end.setHours(23, 59, 59, 999);
                queryOptions.where.createdAt.lte = end;
            }
        }

        const transactions = await prisma.transactionLog.findMany(queryOptions);

        res.status(200).json(transactions);
    } catch (error) {
        console.error("Error fetching member transactions:", error);
        res.status(500).json({ error: "Failed to fetch member transactions" });
    }
};
// Delete a transaction and revert balances
export const deleteTransaction = async (req, res) => {
    const { id } = req.params;

    try {
        const transactionId = parseInt(id);

        // Find the transaction first
        const transaction = await prisma.transactionLog.findUnique({
            where: { id: transactionId }
        });

        if (!transaction) {
            return res.status(404).json({ error: "Transaction not found" });
        }

        // Use Prisma transaction to ensure atomicity
        await prisma.$transaction(async (tx) => {
            // Revert account total amount (subtract basicPay)
            await tx.account.update({
                where: { id: transaction.accountId },
                data: {
                    totalAmount: { decrement: transaction.basicPay }
                }
            });

            // Revert organisation amount and penalty
            await tx.organisation.update({
                where: { id: 1 },
                data: {
                    amount: { decrement: transaction.developmentFee },
                    penalty: { decrement: transaction.penalty }
                }
            });

            // Delete the transaction log
            await tx.transactionLog.delete({
                where: { id: transactionId }
            });
        });

        res.status(200).json({ message: "Transaction deleted successfully" });
    } catch (error) {
        console.error("Error deleting transaction:", error);
        res.status(500).json({ error: "Failed to delete transaction" });
    }
};
// Smart Distribution of money
export const smartDistribute = async (req, res) => {
    const { memberId, totalAmount, penaltyProvided = 0 } = req.body;

    try {
        if (!memberId || isNaN(totalAmount) || totalAmount < 0) {
            return res.status(400).json({ error: "Valid memberId and totalAmount are required" });
        }

        const amount = parseFloat(totalAmount);
        const penaltyToPay = parseFloat(penaltyProvided) || 0;
        let remaining = amount;

        const result = await prisma.$transaction(async (tx) => {
            // 1. Get Member, Account and active Loan
            const member = await tx.member.findUnique({
                where: { id: parseInt(memberId) },
                include: {
                    account: true,
                    loans: {
                        where: { status: "ACTIVE" },
                        take: 1
                    }
                }
            });

            if (!member) throw new Error("Member not found");

            const breakdown = {
                penalty: 0,
                developmentFee: 0,
                baseDeposit: 0,
                loanInterest: 0,
                loanPrincipal: 0,
                extraDeposit: 0
            };

            // 1. Take Penalty (Highest Priority)
            const penaltyPaid = Math.min(remaining, penaltyToPay);
            breakdown.penalty = penaltyPaid;
            remaining -= penaltyPaid;

            // 2. Take Development Fee (₹20)
            const devFee = Math.min(remaining, 20);
            breakdown.developmentFee = devFee;
            remaining -= devFee;

            // 3. Take Base Deposit (₹500)
            const baseDeposit = Math.min(remaining, 500);
            breakdown.baseDeposit = baseDeposit;
            remaining -= baseDeposit;

            // 4. Handle Loan if active
            const activeLoan = member.loans[0];
            let loanPaymentRecord = null;

            if (activeLoan && remaining > 0) {
                const interestDue = activeLoan.remainingBalance * activeLoan.interestRate;

                // Pay interest first
                const interestPaid = Math.min(remaining, interestDue);
                breakdown.loanInterest = interestPaid;
                remaining -= interestPaid;

                // Pay principal with remaining
                if (remaining > 0) {
                    const principalPaid = Math.min(remaining, activeLoan.remainingBalance);
                    breakdown.loanPrincipal = principalPaid;
                    remaining -= principalPaid;
                }

                if (breakdown.loanInterest > 0 || breakdown.loanPrincipal > 0) {
                    const totalLoanPaid = breakdown.loanInterest + breakdown.loanPrincipal;
                    const newRemainingBalance = activeLoan.remainingBalance - breakdown.loanPrincipal;
                    const isCompleted = newRemainingBalance <= 0.01;

                    // Create loan payment record
                    loanPaymentRecord = await tx.loanPayment.create({
                        data: {
                            loanId: activeLoan.id,
                            principalPaid: breakdown.loanPrincipal,
                            interestPaid: breakdown.loanInterest,
                            penalty: 0, // Penalty is handled in general transaction log for now as per priority
                            totalPaid: totalLoanPaid,
                            remainingAfter: Math.max(0, newRemainingBalance),
                            extraPrincipal: Math.max(0, breakdown.loanPrincipal - activeLoan.emiAmount)
                        }
                    });

                    // Update loan
                    await tx.loan.update({
                        where: { id: activeLoan.id },
                        data: {
                            remainingBalance: Math.max(0, newRemainingBalance),
                            totalInterestPaid: { increment: breakdown.loanInterest },
                            status: isCompleted ? "COMPLETED" : "ACTIVE",
                            completedAt: isCompleted ? new Date() : null
                        }
                    });

                    // Update organisation profit
                    await tx.organisation.update({
                        where: { id: 1 },
                        data: { profit: { increment: breakdown.loanInterest } }
                    });
                }
            }

            // 5. Remaining goes to extra deposit
            if (remaining > 0) {
                breakdown.extraDeposit = remaining;
                remaining = 0;
            }

            const totalBasePay = breakdown.baseDeposit + breakdown.extraDeposit;

            // 6. Create Transaction Log
            const transactionLog = await tx.transactionLog.create({
                data: {
                    memberId: member.id,
                    accountId: member.account.id,
                    basicPay: totalBasePay,
                    developmentFee: breakdown.developmentFee,
                    penalty: breakdown.penalty,
                }
            });

            // 7. Update Account balance
            await tx.account.update({
                where: { id: member.account.id },
                data: { totalAmount: { increment: totalBasePay } }
            });

            // 8. Update Organisation amount and penalty
            await tx.organisation.update({
                where: { id: 1 },
                data: {
                    amount: { increment: breakdown.developmentFee },
                    penalty: { increment: breakdown.penalty }
                }
            });

            return {
                transaction: transactionLog,
                loanPayment: loanPaymentRecord,
                breakdown: {
                    ...breakdown,
                    total: amount
                }
            };
        });

        res.status(201).json(result);
    } catch (error) {
        console.error("Error in smart distribution:", error);
        res.status(500).json({ error: error.message || "Failed to process smart distribution" });
    }
};
