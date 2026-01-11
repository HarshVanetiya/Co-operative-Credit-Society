import prisma from "../lib/prisma-client.js";

// Run audit - distribute profit equally among all members
export const runAudit = async (req, res) => {
    try {
        // Get organisation
        const organisation = await prisma.organisation.findUnique({
            where: { id: 1 }
        });

        if (!organisation) {
            return res.status(404).json({ error: "Organisation not found" });
        }

        if (organisation.profit <= 0) {
            return res.status(400).json({ error: "No profit available to distribute" });
        }

        // Get all members count
        const memberCount = await prisma.member.count();

        if (memberCount === 0) {
            return res.status(400).json({ error: "No members found to distribute profit to" });
        }

        // Calculate per member share
        const perMemberShare = organisation.profit / memberCount;

        // Use transaction to ensure atomicity
        const result = await prisma.$transaction(async (tx) => {
            // Update all member accounts - add their share
            await tx.account.updateMany({
                data: {
                    totalAmount: { increment: perMemberShare }
                }
            });

            // Reset organisation profit to 0
            await tx.organisation.update({
                where: { id: 1 },
                data: { profit: 0 }
            });

            // Create audit log
            const auditLog = await tx.auditLog.create({
                data: {
                    totalProfit: organisation.profit,
                    memberCount: memberCount,
                    perMemberShare: perMemberShare
                }
            });

            return auditLog;
        });

        res.status(200).json({
            message: "Audit completed successfully",
            audit: result
        });
    } catch (error) {
        console.error("Error running audit:", error);
        res.status(500).json({ error: "Failed to run audit" });
    }
};

// Get audit history
export const getAuditHistory = async (req, res) => {
    try {
        const audits = await prisma.auditLog.findMany({
            orderBy: { createdAt: 'desc' }
        });

        res.status(200).json(audits);
    } catch (error) {
        console.error("Error fetching audit history:", error);
        res.status(500).json({ error: "Failed to fetch audit history" });
    }
};
