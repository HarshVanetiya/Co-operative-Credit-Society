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
