import prisma from "../lib/prisma-client.js";
import bcrypt from "bcrypt";

const USERNAME = "hvanetiya"
const PASSWORD = "qstn7954"
const SALT_ROUNDS = 10;

const createOperator = async () => {
    // Hash the password
    const hashedPassword = await bcrypt.hash(PASSWORD, SALT_ROUNDS);

    const operator = await prisma.operator.upsert({
        where: { username: USERNAME },
        update: {},
        create: {
            username: USERNAME,
            password: hashedPassword,
        },
    });

    console.log("✅ Operator seeded:", operator.username);
    console.log("✅ Password seeded:", operator.password);
    console.log("🔐 Password hashed with bcrypt");
}

const deleteAllOperator = async () => {
    await prisma.operator.deleteMany();
    console.log("✅ All operators deleted");
}

const deleteAllMembers = async () => {
    // Delete accounts first due to foreign key constraint
    await prisma.account.deleteMany();
    console.log("✅ All accounts deleted");

    await prisma.member.deleteMany();
    console.log("✅ All members deleted");
}

const ORG_NAME = "Hvanetiya Finance";
const ORG_AMOUNT = 0;

const createOrganisation = async () => {
    const organisation = await prisma.organisation.upsert({
        where: { id: 1 },
        update: {},
        create: {
            id: 1,
            name: ORG_NAME,
            amount: ORG_AMOUNT
        }
    });

    console.log("✅ Organisation seeded:", organisation.name);
    console.log("💰 Initial amount:", organisation.amount);
}

// ---------------------------------------------------------
// MANUAL CORRECTION UTILITIES
// Use these only if a loan was entered with the wrong amount
// and no payments have been made yet.
// ---------------------------------------------------------

/**
 * Corrects the principal amount of a loan.
 * Updates principalAmount, remainingBalance, and recalculates emiAmount.
 */
const correctLoanPrincipal = async (loanId, newPrincipal) => {
    try {
        const loan = await prisma.loan.findUnique({
            where: { id: loanId },
            include: { loanPayments: true }
        });

        if (!loan) {
            console.error(`❌ Loan ID ${loanId} not found.`);
            return;
        }

        if (loan.loanPayments.length > 0) {
            console.error(`❌ Cannot update Loan ${loanId}: It already has payments recorded.`);
            return;
        }

        const newEmi = newPrincipal / loan.timePeriod;

        const updatedLoan = await prisma.loan.update({
            where: { id: loanId },
            data: {
                principalAmount: newPrincipal,
                remainingBalance: newPrincipal,
                emiAmount: newEmi
            }
        });

        console.log(`✅ Loan ${loanId} corrected successfully!`);
        console.log(`   New Principal: ₹${updatedLoan.principalAmount}`);
        console.log(`   New EMI: ₹${updatedLoan.emiAmount.toFixed(2)}`);
    } catch (error) {
        console.error("❌ Error correcting loan:", error);
    }
}

/**
 * Deletes a loan record entirely.
 * Only works if no payments have been made.
 */
const deleteLoanSafely = async (loanId) => {
    try {
        const loan = await prisma.loan.findUnique({
            where: { id: loanId },
            include: { loanPayments: true }
        });

        if (!loan) {
            console.error(`❌ Loan ID ${loanId} not found.`);
            return;
        }

        if (loan.loanPayments.length > 0) {
            console.error(`❌ Cannot delete Loan ${loanId}: It already has payments recorded.`);
            return;
        }

        await prisma.loan.delete({
            where: { id: loanId }
        });

        console.log(`✅ Loan ${loanId} deleted successfully!`);
    } catch (error) {
        console.error("❌ Error deleting loan:", error);
    }
}

async function main() {
    console.log("🌱 Starting database seed...");

    await createOrganisation()
    await createOperator()
    // await deleteAllMembers()
    // await deleteAllOperator()
    // await createOperator()

    // --- To correct a loan, uncomment and set values below: ---
    // await correctLoanPrincipal(1, 50000) // (loanId, newPrincipal)

    // --- To delete a loan, uncomment and set value below: ---
    // await deleteLoanSafely(1) // (loanId)
}

main()
    .then(async () => {
        await prisma.$disconnect();
        console.log("🌱 Seeding completed!");
    })
    .catch(async (e) => {
        console.error("❌ Seeding failed:", e);
        await prisma.$disconnect();
        process.exit(1);
    });
