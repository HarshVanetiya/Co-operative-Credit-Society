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
// Get unified history of transactions and loan payments
export const getUnifiedHistory = async (req, res) => {
    const { name, accountNumber, mobile, startDate, endDate, page = 1, limit = 20 } = req.query;

    try {
        const pageNum = parseInt(page);
        const limitNum = parseInt(limit);
        const skip = (pageNum - 1) * limitNum;

        // Build where clauses for both models
        const txWhere = {};
        const loanWhere = { loan: {} };

        if (name || mobile) {
            txWhere.member = {};
            loanWhere.loan.member = {};
            if (name) {
                txWhere.member.name = { contains: name, mode: 'insensitive' };
                loanWhere.loan.member.name = { contains: name, mode: 'insensitive' };
            }
            if (mobile) {
                txWhere.member.mobile = { contains: mobile };
                loanWhere.loan.member.mobile = { contains: mobile };
            }
        }

        if (accountNumber) {
            txWhere.account = { accountNumber: { contains: accountNumber } };
            loanWhere.loan.member.account = { accountNumber: { contains: accountNumber } };
        }

        if (startDate || endDate) {
            const dateFilter = {};
            if (startDate) dateFilter.gte = new Date(startDate);
            if (endDate) {
                const end = new Date(endDate);
                end.setHours(23, 59, 59, 999);
                dateFilter.lte = end;
            }
            txWhere.createdAt = dateFilter;
            loanWhere.createdAt = dateFilter;
        }

        // Fetch both (without limit first to merge, or we might need a more complex query)
        // For efficiency, we'll fetch a larger set and then group
        // If it's a small app, this is fine. For large apps, we'd need a view or union.
        const [transactions, loanPayments] = await Promise.all([
            prisma.transactionLog.findMany({
                where: txWhere,
                include: {
                    member: { select: { id: true, name: true, fathersName: true, mobile: true } },
                    account: { select: { id: true, accountNumber: true } }
                },
                orderBy: { createdAt: 'desc' },
                take: limitNum * 2 // Fetch more to account for grouping
            }),
            prisma.loanPayment.findMany({
                where: loanWhere,
                include: {
                    loan: {
                        include: {
                            member: {
                                select: {
                                    id: true,
                                    name: true,
                                    fathersName: true,
                                    mobile: true,
                                    account: { select: { accountNumber: true } }
                                }
                            }
                        }
                    }
                },
                orderBy: { createdAt: 'desc' },
                take: limitNum * 2
            })
        ]);

        // Merge and group by (memberId + timestamp rounded to seconds)
        const unifiedMap = new Map();

        const getGroupKey = (memberId, date) => `${memberId}_${Math.floor(new Date(date).getTime() / 1000)}`;

        transactions.forEach(tx => {
            const key = getGroupKey(tx.memberId, tx.createdAt);
            unifiedMap.set(key, {
                id: `tx_${tx.id}`,
                date: tx.createdAt,
                member: tx.member,
                accountNumber: tx.account.accountNumber,
                basicPay: tx.basicPay,
                developmentFee: tx.developmentFee,
                penalty: tx.penalty,
                principalPaid: 0,
                interestPaid: 0,
                isSmart: false
            });
        });

        loanPayments.forEach(lp => {
            const member = lp.loan.member;
            const key = getGroupKey(member.id, lp.createdAt);

            if (unifiedMap.has(key)) {
                // Merge with existing transaction (likely from smart distribution)
                const existing = unifiedMap.get(key);
                existing.principalPaid = lp.principalPaid;
                existing.interestPaid = lp.interestPaid;
                existing.penalty += lp.penalty;
                existing.isSmart = true;
                existing.loanId = lp.loanId;
            } else {
                unifiedMap.set(key, {
                    id: `lp_${lp.id}`,
                    date: lp.createdAt,
                    member: {
                        id: member.id,
                        name: member.name,
                        fathersName: member.fathersName,
                        mobile: member.mobile
                    },
                    accountNumber: member.account.accountNumber,
                    basicPay: 0,
                    developmentFee: 0,
                    penalty: lp.penalty,
                    principalPaid: lp.principalPaid,
                    interestPaid: lp.interestPaid,
                    isSmart: false,
                    loanId: lp.loanId
                });
            }
        });

        // Convert to array and sort
        let combined = Array.from(unifiedMap.values()).sort((a, b) => new Date(b.date) - new Date(a.date));

        // Total for pagination (approximate if we don't fetch everything)
        // For a strictly correct total, we'd need to fetch all IDs or use a SQL UNION
        const total = combined.length;

        // Apply pagination
        const paginated = combined.slice(skip, skip + limitNum);

        res.status(200).json({
            data: paginated,
            pagination: {
                page: pageNum,
                limit: limitNum,
                total: total,
                totalPages: Math.ceil(total / limitNum)
            }
        });
    } catch (error) {
        console.error("Error fetching unified history:", error);
        res.status(500).json({ error: "Failed to fetch unified history" });
    }
};
