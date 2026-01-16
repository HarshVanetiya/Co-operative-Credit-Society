import prisma from "../lib/prisma-client.js";

// Create a new loan for a member
export const createLoan = async (req, res) => {
    const { memberId, principalAmount, interestRate, timePeriod } = req.body;

    try {
        // Validate required fields
        if (!memberId || !principalAmount || !interestRate || !timePeriod) {
            return res.status(400).json({ 
                error: "memberId, principalAmount, interestRate, and timePeriod are required" 
            });
        }

        const principal = parseFloat(principalAmount);
        const rate = parseFloat(interestRate) / 100; // Convert percentage to decimal
        const months = parseInt(timePeriod);

        // Check if member exists
        const member = await prisma.member.findUnique({
            where: { id: parseInt(memberId) },
            include: { account: true }
        });

        if (!member) {
            return res.status(404).json({ error: "Member not found" });
        }

        // Check if member already has an active loan
        const activeLoan = await prisma.loan.findFirst({
            where: {
                memberId: parseInt(memberId),
                status: "ACTIVE"
            }
        });

        if (activeLoan) {
            return res.status(400).json({ 
                error: "Member already has an active loan. Only one active loan per member is allowed." 
            });
        }

        // Check if organization has enough funds (sum of all member accounts)
        const accountsAggregate = await prisma.account.aggregate({
            _sum: { totalAmount: true }
        });
        const loanableAmount = accountsAggregate._sum.totalAmount || 0;

        // Get total amount currently on active loans
        const activeLoansAggregate = await prisma.loan.aggregate({
            where: { status: "ACTIVE" },
            _sum: { remainingBalance: true }
        });
        const totalLoaned = activeLoansAggregate._sum.remainingBalance || 0;

        const availableFunds = loanableAmount - totalLoaned;

        if (principal > availableFunds) {
            return res.status(400).json({ 
                error: `Insufficient funds. Available: ₹${availableFunds.toFixed(2)}, Requested: ₹${principal.toFixed(2)}` 
            });
        }

        // Calculate EMI amount (principal / time period)
        const emiAmount = principal / months;

        // Create the loan
        const loan = await prisma.loan.create({
            data: {
                memberId: parseInt(memberId),
                principalAmount: principal,
                interestRate: rate,
                timePeriod: months,
                emiAmount: emiAmount,
                remainingBalance: principal,
                status: "ACTIVE"
            },
            include: {
                member: {
                    select: { id: true, name: true, mobile: true }
                }
            }
        });

        res.status(201).json(loan);
    } catch (error) {
        console.error("Error creating loan:", error);
        res.status(500).json({ error: "Failed to create loan" });
    }
};

// Get a specific loan with payment history
export const getLoan = async (req, res) => {
    const { id } = req.params;

    try {
        const loan = await prisma.loan.findUnique({
            where: { id: parseInt(id) },
            include: {
                member: {
                    select: { id: true, name: true, mobile: true }
                },
                loanPayments: {
                    orderBy: { createdAt: 'desc' }
                }
            }
        });

        if (!loan) {
            return res.status(404).json({ error: "Loan not found" });
        }

        res.status(200).json(loan);
    } catch (error) {
        console.error("Error fetching loan:", error);
        res.status(500).json({ error: "Failed to fetch loan" });
    }
};

// Get all loans for a specific member
export const getMemberLoans = async (req, res) => {
    const { memberId } = req.params;
    const { limit } = req.query;

    try {
        const queryOptions = {
            where: { memberId: parseInt(memberId) },
            orderBy: { createdAt: 'desc' },
            include: {
                loanPayments: {
                    orderBy: { createdAt: 'desc' }
                }
            }
        };

        // Add limit if specified
        if (limit) {
            queryOptions.take = parseInt(limit);
        }

        const loans = await prisma.loan.findMany(queryOptions);

        res.status(200).json(loans);
    } catch (error) {
        console.error("Error fetching member loans:", error);
        res.status(500).json({ error: "Failed to fetch member loans" });
    }
};

// Get all loans with optional filters and pagination
export const getAllLoans = async (req, res) => {
    const { status, memberId, page = 1, limit = 20 } = req.query;

    try {
        const where = {};
        const pageNum = parseInt(page);
        const limitNum = parseInt(limit);
        const skip = (pageNum - 1) * limitNum;

        if (status) {
            where.status = status.toUpperCase();
        }

        if (memberId) {
            where.memberId = parseInt(memberId);
        }

        // Get total count and paginated data
        const [total, loans] = await Promise.all([
            prisma.loan.count({ where }),
            prisma.loan.findMany({
                where,
                orderBy: { createdAt: 'desc' },
                skip,
                take: limitNum,
                include: {
                    member: {
                        select: { 
                            id: true, 
                            name: true, 
                            mobile: true,
                            account: {
                                select: { accountNumber: true }
                            }
                        }
                    }
                }
            })
        ]);

        res.status(200).json({
            data: loans,
            pagination: {
                page: pageNum,
                limit: limitNum,
                total,
                totalPages: Math.ceil(total / limitNum)
            }
        });
    } catch (error) {
        console.error("Error fetching loans:", error);
        res.status(500).json({ error: "Failed to fetch loans" });
    }
};

// Pay EMI for a loan (Flexible Payment)
export const payLoanEmi = async (req, res) => {
    const { id } = req.params;
    // principalPaid is now the amount user WANTS to pay towards principal
    const { penalty = 0, principalPaid } = req.body;

    try {
        const penaltyAmount = parseFloat(penalty) || 0;
        let requestedPrincipalInfo = parseFloat(principalPaid);

        // Get the loan
        const loan = await prisma.loan.findUnique({
            where: { id: parseInt(id) }
        });

        if (!loan) {
            return res.status(404).json({ error: "Loan not found" });
        }

        if (loan.status !== "ACTIVE") {
            return res.status(400).json({ error: "Loan is not active" });
        }

        // Calculate interest on remaining balance
        const interestAmount = loan.remainingBalance * loan.interestRate;

        // Validation
        if (isNaN(requestedPrincipalInfo) || requestedPrincipalInfo < 0) {
             return res.status(400).json({ error: "Invalid principal amount" });
        }
        
        // Cannot pay more principal than remaining
        if (requestedPrincipalInfo > loan.remainingBalance) {
            // Cap it if they sent too much, or error? Let's error to be safe or cap it. 
            // Better to cap it to act as "Full Settlement"
            requestedPrincipalInfo = loan.remainingBalance; 
        }

        const actualPrincipalPaid = requestedPrincipalInfo;

        // Calculate "extra" component for analytics (anything above the standard EMI principal part)
        // Standard EMI principal part for this month would ideally be (EMI - Interest), but EMI is fixed.
        // Actually, previous logic was: emiPrincipal = Math.min(loan.emiAmount, loan.remainingBalance)
        // We can keep a loose definition: 
        // If they pay MORE than the standard EMI's principal component, that diff is "extra".
        // Standard emiPrincipal expectation:
        const standardEmiPrincipal = Math.min(loan.emiAmount, loan.remainingBalance);
        
        // If they pay less than standard, extra is 0. If more, extra is difference.
        // NOTE: This is just for record keeping in LoanPayment table.
        const extraPrincipal = Math.max(0, actualPrincipalPaid - standardEmiPrincipal);
        
        // Total payment
        const totalPayment = actualPrincipalPaid + interestAmount + penaltyAmount;
        
        // New remaining balance
        const newRemainingBalance = loan.remainingBalance - actualPrincipalPaid;
        
        // Check if loan is completed
        // specific check for small float errors, though < 1 is safe enough for "zero" usually, <=0 is best.
        const isCompleted = newRemainingBalance <= 0.01; 

        // Use transaction to ensure atomicity
        const result = await prisma.$transaction(async (tx) => {
            // Create payment record
            const payment = await tx.loanPayment.create({
                data: {
                    loanId: parseInt(id),
                    principalPaid: actualPrincipalPaid,
                    interestPaid: interestAmount,
                    penalty: penaltyAmount,
                    extraPrincipal: extraPrincipal,
                    totalPaid: totalPayment,
                    remainingAfter: Math.max(0, newRemainingBalance)
                }
            });

            // Update loan
            const updatedLoan = await tx.loan.update({
                where: { id: parseInt(id) },
                data: {
                    remainingBalance: Math.max(0, newRemainingBalance),
                    totalInterestPaid: { increment: interestAmount },
                    status: isCompleted ? "COMPLETED" : "ACTIVE",
                    completedAt: isCompleted ? new Date() : null
                },
                include: {
                    member: {
                        select: { id: true, name: true, mobile: true }
                    }
                }
            });

            // Add interest to organisation profit and penalty to organisation penalty
            await tx.organisation.update({
                where: { id: 1 },
                data: {
                    profit: { increment: interestAmount },
                    penalty: { increment: penaltyAmount }
                }
            });

            return { payment, loan: updatedLoan };
        });

        res.status(200).json(result);
    } catch (error) {
        console.error("Error processing loan payment:", error);
        res.status(500).json({ error: "Failed to process loan payment" });
    }
};

// Get loanable amount (total funds available for loans)
export const getLoanableAmount = async (req, res) => {
    try {
        // Get sum of all member accounts
        const accountsAggregate = await prisma.account.aggregate({
            _sum: { totalAmount: true }
        });
        const totalMemberFunds = accountsAggregate._sum.totalAmount || 0;

        // Get total amount currently on active loans
        const activeLoansAggregate = await prisma.loan.aggregate({
            where: { status: "ACTIVE" },
            _sum: { remainingBalance: true }
        });
        const totalLoaned = activeLoansAggregate._sum.remainingBalance || 0;

        const availableFunds = totalMemberFunds - totalLoaned;

        res.status(200).json({
            totalMemberFunds,
            totalLoaned,
            availableFunds
        });
    } catch (error) {
        console.error("Error fetching loanable amount:", error);
        res.status(500).json({ error: "Failed to fetch loanable amount" });
    }
};
// Get all loan payments for a specific member with date filtering
export const getMemberLoanPayments = async (req, res) => {
    const { memberId } = req.params;
    const { startDate, endDate } = req.query;

    try {
        const where = {
            loan: {
                memberId: parseInt(memberId)
            }
        };

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

        const payments = await prisma.loanPayment.findMany({
            where,
            orderBy: { createdAt: 'desc' },
            include: {
                loan: {
                    select: { id: true, principalAmount: true }
                }
            }
        });

        res.status(200).json(payments);
    } catch (error) {
        console.error("Error fetching member loan payments:", error);
        res.status(500).json({ error: "Failed to fetch loan payments" });
    }
};
// Delete a loan payment and revert balances
export const deleteLoanPayment = async (req, res) => {
    const { id } = req.params;

    try {
        const paymentId = parseInt(id);

        // Find the payment first
        const payment = await prisma.loanPayment.findUnique({
            where: { id: paymentId },
            include: { loan: true }
        });

        if (!payment) {
            return res.status(404).json({ error: "Loan payment not found" });
        }

        const { loan } = payment;

        // Use Prisma transaction to ensure atomicity
        await prisma.$transaction(async (tx) => {
            
            // Revert organisation profit and penalty
            // Interest paid went to profit, penalty went to penalty
            await tx.organisation.update({
                where: { id: 1 },
                data: {
                    profit: { decrement: payment.interestPaid },
                    penalty: { decrement: payment.penalty }
                }
            });

            // Revert loan status and amounts
            // We need to add back the principal that was paid
            const newRemainingBalance = loan.remainingBalance + payment.principalPaid;
            
            // Revert total interest paid
            // Revert status if it was completed
            // If loan is currently COMPLETED, and we revert a payment, it likely becomes ACTIVE again.
            // If it was ACTIVE, it stays ACTIVE.
            
            await tx.loan.update({
                where: { id: loan.id },
                data: {
                    remainingBalance: newRemainingBalance,
                    totalInterestPaid: { decrement: payment.interestPaid },
                    status: "ACTIVE", // Always revert to ACTIVE if we are deleting a payment that might have closed it
                    completedAt: null // Clear completion date
                }
            });

            // Delete the loan payment record
            await tx.loanPayment.delete({
                where: { id: paymentId }
            });
        });

        res.status(200).json({ message: "Loan payment deleted successfully" });
    } catch (error) {
        console.error("Error deleting loan payment:", error);
        res.status(500).json({ error: "Failed to delete loan payment" });
    }
};
