import prisma from "../lib/prisma-client.js";

// Helper to calculate cash in hand for internal checks
const calculateCashInHand = async (tx) => {
    // Organisation (Amount + Penalty)
    const org = await tx.organisation.findUnique({ where: { id: 1 } });

    // Sum of all members' savings and already released money
    const accountsAggregate = await tx.account.aggregate({
        _sum: {
            totalAmount: true,
            releasedMoney: true
        }
    });
    const totalMembersAmount = accountsAggregate._sum.totalAmount || 0;
    const totalReleasedAmount = accountsAggregate._sum.releasedMoney || 0;

    // Active loans (Principal remaining)
    const activeLoansAggregate = await tx.loan.aggregate({
        where: { status: "ACTIVE" },
        _sum: { remainingBalance: true }
    });
    const totalLoanedAmount = activeLoansAggregate._sum.remainingBalance || 0;

    // Formula: (Org Amount + Penalty + Profit + Total Member Savings) - Total Loans - Total Released
    const loanableAmount = totalMembersAmount - totalLoanedAmount;
    return (org.amount || 0) + (org.penalty || 0) + (org.profit || 0) + loanableAmount - totalReleasedAmount;
};

export const releaseCash = async (req, res) => {
    const { memberId, amount } = req.body;

    try {
        if (!memberId || isNaN(amount) || amount <= 0) {
            return res.status(400).json({ error: "Valid memberId and amount are required" });
        }

        const releaseAmount = parseFloat(amount);

        const result = await prisma.$transaction(async (tx) => {
            // Get member and account
            const member = await tx.member.findUnique({
                where: { id: parseInt(memberId) },
                include: { account: true }
            });

            if (!member || !member.account) {
                throw new Error("Member or Account not found");
            }

            // --- LIQUIDITY CHECK (CAP) ---
            const currentCashInHand = await calculateCashInHand(tx);
            if (currentCashInHand < releaseAmount) {
                throw new Error(`Insufficient cash in hand. Available: ₹${Math.round(currentCashInHand)}`);
            }
            // ------------------------------

            // 1. Increment Account releasedMoney
            const updatedAccount = await tx.account.update({
                where: { id: member.account.id },
                data: { releasedMoney: { increment: releaseAmount } }
            });

            // 2. Create Log
            const log = await tx.releasedMoneyLog.create({
                data: {
                    accountId: member.account.id,
                    amount: releaseAmount,
                    type: "RELEASE"
                }
            });

            return { log, updatedAccount };
        }, {
            timeout: 10000 // Increase timeout for complex calculations if needed
        });

        res.status(201).json(result);
    } catch (error) {
        console.error("Error releasing cash:", error);
        res.status(400).json({ error: error.message || "Failed to release cash" });
    }
};

export const settleCash = async (req, res) => {
    const { memberId, amountPaid, profit } = req.body;

    try {
        if (!memberId || isNaN(amountPaid) || amountPaid < 0) {
            return res.status(400).json({ error: "Valid memberId and amountPaid are required" });
        }

        const principalPaid = parseFloat(amountPaid);
        const profitGained = parseFloat(profit) || 0;

        const result = await prisma.$transaction(async (tx) => {
            // Get member and account
            const member = await tx.member.findUnique({
                where: { id: parseInt(memberId) },
                include: { account: true }
            });

            if (!member || !member.account) {
                throw new Error("Member or Account not found");
            }

            // Ensure we don't settle more than what was released
            if (principalPaid > (member.account.releasedMoney + 0.01)) {
                throw new Error(`Amount paid (₹${principalPaid}) exceeds current released amount (₹${member.account.releasedMoney})`);
            }

            // 1. Increment Organisation profit by the "gain" portion
            if (profitGained > 0) {
                await tx.organisation.update({
                    where: { id: 1 },
                    data: {
                        profit: { increment: profitGained }
                    }
                });
            }

            // 2. Decrement Account releasedMoney
            const updatedAccount = await tx.account.update({
                where: { id: member.account.id },
                data: { releasedMoney: { decrement: principalPaid } }
            });

            // 3. Create Log
            const log = await tx.releasedMoneyLog.create({
                data: {
                    accountId: member.account.id,
                    amount: principalPaid,
                    profit: profitGained,
                    type: "SETTLEMENT"
                }
            });

            return { log, updatedAccount };
        });

        res.status(200).json(result);
    } catch (error) {
        console.error("Error settling cash:", error);
        res.status(400).json({ error: error.message || "Failed to settle cash" });
    }
};

export const getMemberLogs = async (req, res) => {
    const { memberId } = req.params;

    try {
        const member = await prisma.member.findUnique({
            where: { id: parseInt(memberId) },
            include: { account: true }
        });

        if (!member || !member.account) {
            return res.status(404).json({ error: "Member or Account not found" });
        }

        const logs = await prisma.releasedMoneyLog.findMany({
            where: { accountId: member.account.id },
            orderBy: { createdAt: 'desc' }
        });

        res.status(200).json(logs);
    } catch (error) {
        console.error("Error fetching released money logs:", error);
        res.status(500).json({ error: "Failed to fetch logs" });
    }
};
