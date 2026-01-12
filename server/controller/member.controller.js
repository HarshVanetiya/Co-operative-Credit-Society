import prisma from "../lib/prisma-client.js";

// Helper function to generate unique account number
const generateAccountNumber = () => {
    const timestamp = Date.now().toString().slice(-8);
    const random = Math.floor(Math.random() * 10000).toString().padStart(4, '0');
    return `ACC${timestamp}${random}`;
};

export const createMember = async (req, res) => {
    const { name, mobile, address, fathersName, initialAmount, developmentFee, accountNumber } = req.body;
    try {
        const accountBalance = parseFloat(initialAmount) || 0;
        const devFee = parseFloat(developmentFee) || 0;

        // Use transaction to ensure atomicity
        const result = await prisma.$transaction(async (tx) => {
            // Create the member with account
            const newMember = await tx.member.create({
                data: {
                    name,
                    mobile,
                    address,
                    fathersName,
                    account: {
                        create: {
                            accountNumber: accountNumber, // Use provided account number
                            totalAmount: accountBalance
                        }
                    }
                },
                include: {
                    account: true
                }
            });

            // Add development fee to organisation amount if provided
            if (devFee > 0) {
                await tx.organisation.update({
                    where: { id: 1 },
                    data: {
                        amount: { increment: devFee }
                    }
                });
            }

            return newMember;
        });

        res.status(201).json(result);
    } catch (error) {
        console.log("Error creating member:", error);
        
        // Handle specific error for unique constraint violation (account number)
        if (error.code === 'P2002') {
             // The meta target will tell us which field failed. 
             // With recent prisma versions, it might be in meta.target
             const target = error.meta?.target || [];
             if (target.includes('accountNumber')) {
                 return res.status(409).json({ error: "Account number already exists" });
             }
             // Fallback if we can't identify exactly but code is P2002
             return res.status(409).json({ error: "A unique constraint failed. Check account number." });
        }

        res.status(500).json({ error: "Failed to create member" });
    }
};

export const getMember = async (req, res) => {
    const { id } = req.params;
    try {
        const member = await prisma.member.findUnique({
            where: { id: parseInt(id) },
            include: { account: true }
        });
        if (!member) {
            return res.status(404).json({ error: "Member not found" });
        }
        res.status(200).json(member);
    } catch (error) {
        console.log(error);
        res.status(500).json({ error: "Failed to get member" });
    }
};

export const getAllMember = async (req, res) => {
    try {
        const members = await prisma.member.findMany({
            orderBy: { createdAt: 'desc' },
            include: { account: true }
        });
        res.status(200).json(members);
    } catch (error) {
        console.log(error);
        res.status(500).json({ error: "Failed to get members" });
    }
};

export const updateMember = async (req, res) => {
    const { id } = req.params;
    const { name, mobile, address, fathersName } = req.body;
    console.log('Update request body:', req.body);
    console.log('Extracted fathersName:', fathersName);
    try {
        const updatedMember = await prisma.member.update({
            where: { id: parseInt(id) },
            data: { name, mobile, address, fathersName },
            include: {
                account: true
            }
        });
        res.status(200).json(updatedMember);
    } catch (error) {
        console.log(error);
        res.status(500).json({ error: "Failed to update member" });
    }
};

// export const deleteMember = async (req, res) => {
//     const { id } = req.params;
//     try {
//         await prisma.member.delete({
//             where: { id: parseInt(id) }
//         });
//         res.status(200).json({ message: "Member deleted successfully" });
//     } catch (error) {
//         console.log(error);
//         res.status(500).json({ error: "Failed to delete member" });
//     }
// };
