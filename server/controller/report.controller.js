import prisma from "../lib/prisma-client.js";

// Get merged activity for a specific month (Member-Centric)
export const getMonthlyActivity = async (req, res) => {
    let { month, year } = req.query;

    if (!month || !year) {
        const now = new Date();
        month = now.getMonth() + 1;
        year = now.getFullYear();
    }

    try {
        const startDate = new Date(year, month - 1, 1);
        const endDate = new Date(year, month, 0, 23, 59, 59, 999);

        // 1. Fetch All Members
        const members = await prisma.member.findMany({
            include: {
                account: true,
                loans: {
                    where: {
                        OR: [
                            { status: 'ACTIVE' },
                            { status: 'COMPLETED' } // Include completed loans if they had activity this month?
                            // Better: We just check payments.
                        ]
                    }
                }
            },
            orderBy: { name: 'asc' }
        });

        // 2. Fetch Deposits (TransactionLogs)
        const deposits = await prisma.transactionLog.groupBy({
            by: ['memberId'],
            where: {
                createdAt: { gte: startDate, lte: endDate }
            },
            _sum: {
                basicPay: true,
                developmentFee: true,
                penalty: true
            }
        });

        // 3. Fetch LoanPayments
        // Prisma groupBy doesn't support deep relations easily (like loan.memberId).
        // So we fetch plain payments and aggregate manually or use raw query.
        // Let's use findMany and aggregate in code for simplicity/safety.
        const loanPayments = await prisma.loanPayment.findMany({
            where: {
                createdAt: { gte: startDate, lte: endDate }
            },
            include: {
                loan: { select: { memberId: true } }
            }
        });

        // 4. Fetch OrgWithdrawals (Overview Stats only)
        const withdrawals = await prisma.orgWithdrawal.aggregate({
            where: { createdAt: { gte: startDate, lte: endDate } },
            _sum: { amount: true }
        });

        // --- Aggregation Logic ---

        // Map memberId -> Deposit Total
        const depositMap = {};
        deposits.forEach(d => {
            const total = (d._sum.basicPay || 0) + (d._sum.developmentFee || 0) + (d._sum.penalty || 0);
            depositMap[d.memberId] = total;
        });

        // Map memberId -> Loan Payment Total
        const loanMap = {};
        loanPayments.forEach(p => {
            const memberId = p.loan.memberId;
            loanMap[memberId] = (loanMap[memberId] || 0) + p.totalPaid;
        });

        // Build Member Rows
        const memberRows = members.map(m => {
            const depositAmt = depositMap[m.id] || 0;
            const loanAmt = loanMap[m.id] || 0;
            
            // Check if member has EVER had a loan or currently active to determine "N/A" vs "0"
            // Requirement: "if loan is running then give stats if not then na"
            // We can check m.loans array. If they have ANY active loan, we show 0 or amount.
            // If strictly no active loans, maybe N/A? 
            // Let's assume based on payment: If > 0 show amount. 
            // If 0, check compatible loans.
            const hasActiveOrRecentLoan = m.loans.some(l => l.status === 'ACTIVE' || l.updatedAt >= startDate);
            
            return {
                memberId: m.id,
                name: m.name,
                mobile: m.mobile,
                accountNumber: m.account?.accountNumber || 'N/A',
                depositAmount: depositAmt,
                loanAmount: loanAmt,
                loanStatus: hasActiveOrRecentLoan ? 'ACTIVE' : 'NONE', 
                totalPaid: depositAmt + loanAmt
            };
        });

        // Summary Calculations
        const totalDeposits = Object.values(depositMap).reduce((a, b) => a + b, 0);
        const totalLoanPayments = Object.values(loanMap).reduce((a, b) => a + b, 0);
        const totalExpenses = withdrawals._sum.amount || 0;

        res.json({
            month,
            year,
            summary: {
                totalIn: totalDeposits + totalLoanPayments,
                totalOut: totalExpenses,
                net: (totalDeposits + totalLoanPayments) - totalExpenses
            },
            rows: memberRows
        });

    } catch (error) {
        console.error("Error fetching monthly activity:", error);
        res.status(500).json({ error: "Failed to fetch activity report" });
    }
};

// Get expected collections for next month
export const getExpectedCollections = async (req, res) => {
    try {
        const STANDARD_FEE = 520; // 500 Basic + 20 Dev Fee

        const members = await prisma.member.findMany({
            include: {
                account: true,
                loans: {
                    where: { status: 'ACTIVE' }
                }
            },
            orderBy: { name: 'asc' }
        });

        const expectedList = members.map(member => {
            const hasActiveLoan = member.loans.length > 0;
            let loanExpectation = 0;
            let loanDetails = null;

            if (hasActiveLoan) {
                const loan = member.loans[0]; 
                const interest = loan.remainingBalance * loan.interestRate;
                let principalComponent = Math.min(loan.emiAmount, loan.remainingBalance);
                
                loanExpectation = interest + principalComponent;
                
                loanDetails = {
                    expectedInterest: interest,
                    expectedPrincipal: principalComponent
                };
            }

            return {
                memberId: member.id,
                name: member.name,
                mobile: member.mobile,
                accountNumber: member.account?.accountNumber || 'N/A',
                baseAmount: STANDARD_FEE,
                loanAmount: loanExpectation,
                hasActiveLoan, 
                totalExpected: STANDARD_FEE + loanExpectation
            };
        });

        const totalExpected = expectedList.reduce((sum, item) => sum + item.totalExpected, 0);

        res.status(200).json({
            totalExpected,
            memberCount: members.length,
            collections: expectedList
        });

    } catch (error) {
        console.error("Error fetching expected collections:", error);
        res.status(500).json({ error: "Failed to calculate expected collections" });
    }
};

// Get detailed member status report
export const getMemberStatus = async (req, res) => {
    try {
        const STANDARD_FEE = 520; // 500 Basic + 20 Dev Fee

        const members = await prisma.member.findMany({
            include: {
                account: true,
                loans: {
                    where: { status: 'ACTIVE' }
                }
            },
            orderBy: { name: 'asc' }
        });

        const statusList = members.map(member => {
            const hasActiveLoan = member.loans.length > 0;
            let remainingPrincipal = 0;
            let loanExpectation = 0;

            if (hasActiveLoan) {
                const loan = member.loans[0]; 
                remainingPrincipal = loan.remainingBalance;
                
                const interest = loan.remainingBalance * loan.interestRate;
                // emiAmount in DB is the principal component (Principal / Months)
                const principalComponent = Math.min(loan.emiAmount, loan.remainingBalance);
                
                loanExpectation = interest + principalComponent;
            }

            return {
                memberId: member.id,
                name: member.name,
                fathersName: member.fathersName || 'N/A', // Added Fathers Name
                accountNumber: member.account?.accountNumber || 'N/A',
                remainingLoanPrincipal: remainingPrincipal,
                expectedAmount: STANDARD_FEE + loanExpectation
            };
        });

        res.status(200).json({
            count: members.length,
            rows: statusList
        });

    } catch (error) {
        console.error("Error fetching member status:", error);
        res.status(500).json({ error: "Failed to fetch member status" });
    }
};
