import prisma from "../lib/prisma-client.js";

export const getOverviewStats = async (req, res) => {
    try {
        // Get organisation (there's only one with id=1)
        let organisation = await prisma.organisation.findUnique({
            where: { id: 1 }
        });

        // If no organisation exists, create a default one
        if (!organisation) {
            organisation = await prisma.organisation.create({
                data: {
                    id: 1,
                    name: "My Organisation",
                    amount: 0,
                    profit: 0
                }
            });
        }

        // Get member count
        const memberCount = await prisma.member.count();

        // Get sum of all members' account balances
        const accountsAggregate = await prisma.account.aggregate({
            _sum: {
                totalAmount: true,
                releasedMoney: true
            }
        });
        const totalMembersAmount = accountsAggregate._sum.totalAmount || 0;
        const totalReleasedAmount = accountsAggregate._sum.releasedMoney || 0;

        // Get active loans stats
        const activeLoansCount = await prisma.loan.count({
            where: { status: "ACTIVE" }
        });

        const activeLoansAggregate = await prisma.loan.aggregate({
            where: { status: "ACTIVE" },
            _sum: { remainingBalance: true }
        });
        const totalLoanedAmount = activeLoansAggregate._sum.remainingBalance || 0;

        // Calculate loanable amount
        const loanableAmount = totalMembersAmount - totalLoanedAmount;

        // Calculate Cash in Hand (Org Amount + Penalty Fund + Available for Loan - Released Money)
        const cashInHand = (organisation.amount || 0) + (organisation.penalty || 0) + loanableAmount - totalReleasedAmount;

        // Get members who haven't deposited this month
        const now = new Date();
        const firstDayOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

        // Get all members with their last transaction date
        const membersWithPendingDeposits = await getMembersWithPendingDeposits(firstDayOfMonth);

        res.status(200).json({
            organisation: {
                name: organisation.name,
                amount: organisation.amount,
                penalty: organisation.penalty,
                profit: organisation.profit
            },
            memberCount,
            totalMembersAmount,
            activeLoansCount,
            totalLoanedAmount,
            totalReleasedAmount,
            loanableAmount,
            cashInHand,
            membersWithPendingDeposits
        });
    } catch (error) {
        console.log(error);
        res.status(500).json({ error: "Failed to get overview stats" });
    }
};

// Helper function to get members with pending deposits
async function getMembersWithPendingDeposits(firstDayOfMonth) {
    // Get all members
    const allMembers = await prisma.member.findMany({
        select: {
            id: true,
            name: true,
            mobile: true,
            createdAt: true,
            account: {
                select: { accountNumber: true }
            }
        }
    });

    // Get members who have deposited this month
    const membersWithDeposits = await prisma.transactionLog.findMany({
        where: {
            createdAt: { gte: firstDayOfMonth }
        },
        select: { memberId: true },
        distinct: ['memberId']
    });

    const memberIdsWithDeposits = new Set(membersWithDeposits.map(t => t.memberId));

    // Filter members without deposits this month
    // Only include members created before this month
    const pendingMembers = allMembers.filter(member => {
        const memberCreatedBeforeThisMonth = new Date(member.createdAt) < firstDayOfMonth;
        return memberCreatedBeforeThisMonth && !memberIdsWithDeposits.has(member.id);
    });

    // For each pending member, calculate how many months they've missed
    const now = new Date();
    const result = await Promise.all(pendingMembers.map(async (member) => {
        // Get last transaction date for this member
        const lastTransaction = await prisma.transactionLog.findFirst({
            where: { memberId: member.id },
            orderBy: { createdAt: 'desc' },
            select: { createdAt: true }
        });

        let missedMonths = 1; // At least current month

        if (lastTransaction) {
            const lastDate = new Date(lastTransaction.createdAt);
            const monthsDiff = (now.getFullYear() - lastDate.getFullYear()) * 12
                + (now.getMonth() - lastDate.getMonth());
            missedMonths = Math.max(1, monthsDiff);
        } else {
            // No transactions ever - calculate from member creation
            const createdDate = new Date(member.createdAt);
            const monthsDiff = (now.getFullYear() - createdDate.getFullYear()) * 12
                + (now.getMonth() - createdDate.getMonth());
            missedMonths = Math.max(1, monthsDiff);
        }

        // Calculate suggested payment: 520 * (missedMonths + 1) + 50 * missedMonths
        // missedMonths previous + 1 current + penalty
        const baseAmount = 520 * (missedMonths + 1); // previous + current
        const penaltyAmount = 50 * missedMonths;
        const suggestedPayment = baseAmount + penaltyAmount;

        return {
            id: member.id,
            name: member.name,
            mobile: member.mobile,
            accountNumber: member.account?.accountNumber,
            missedMonths,
            suggestedPayment,
            breakdown: {
                deposits: 520 * (missedMonths + 1),
                penalty: penaltyAmount
            }
        };
    }));

    return result;
}
