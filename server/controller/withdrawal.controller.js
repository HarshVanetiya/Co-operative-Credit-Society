import prisma from "../lib/prisma-client.js";

// Create a new withdrawal
export const createWithdrawal = async (req, res) => {
    const { purpose, amount, source } = req.body;

    try {
        // Validate required fields
        if (!purpose || !amount || !source) {
            return res.status(400).json({
                error: "purpose, amount, and source are required"
            });
        }

        const withdrawalAmount = parseFloat(amount);
        if (withdrawalAmount <= 0) {
            return res.status(400).json({ error: "Amount must be greater than 0" });
        }

        // Validate source
        if (!["AMOUNT", "PENALTY"].includes(source)) {
            return res.status(400).json({
                error: "Source must be either 'AMOUNT' or 'PENALTY'"
            });
        }

        // Get organisation details
        const org = await prisma.organisation.findUnique({
            where: { id: 1 }
        });

        if (!org) {
            return res.status(404).json({ error: "Organisation not found" });
        }

        // Check if sufficient funds
        const availableBalance = source === "AMOUNT" ? org.amount : org.penalty;
        if (withdrawalAmount > availableBalance) {
            return res.status(400).json({
                error: `Insufficient funds. Available: ₹${availableBalance.toFixed(2)}`
            });
        }

        // Use transaction for atomicity
        const result = await prisma.$transaction(async (tx) => {
            // Create withdrawal record
            const withdrawal = await tx.orgWithdrawal.create({
                data: {
                    purpose,
                    amount: withdrawalAmount,
                    source
                }
            });

            // Deduct from organisation
            const updateData = source === "AMOUNT"
                ? { amount: { decrement: withdrawalAmount } }
                : { penalty: { decrement: withdrawalAmount } };

            const updatedOrg = await tx.organisation.update({
                where: { id: 1 },
                data: updateData
            });

            return { withdrawal, organisation: updatedOrg };
        });

        res.status(201).json(result);
    } catch (error) {
        console.error("Error creating withdrawal:", error);
        res.status(500).json({ error: "Failed to create withdrawal" });
    }
};

// Get all withdrawals with pagination
export const getAllWithdrawals = async (req, res) => {
    const { page = 1, limit = 20 } = req.query;

    try {
        const pageNum = parseInt(page);
        const limitNum = parseInt(limit);
        const skip = (pageNum - 1) * limitNum;

        // Get total count and paginated data
        const [total, withdrawals] = await Promise.all([
            prisma.orgWithdrawal.count(),
            prisma.orgWithdrawal.findMany({
                orderBy: { createdAt: 'desc' },
                skip,
                take: limitNum
            })
        ]);

        res.status(200).json({
            data: withdrawals,
            pagination: {
                page: pageNum,
                limit: limitNum,
                total,
                totalPages: Math.ceil(total / limitNum)
            }
        });
    } catch (error) {
        console.error("Error fetching withdrawals:", error);
        res.status(500).json({ error: "Failed to fetch withdrawals" });
    }
};
