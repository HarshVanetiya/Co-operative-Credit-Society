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

async function main() {
    console.log("🌱 Starting database seed...");

    await createOrganisation()
    // await deleteAllMembers()
    // await deleteAllOperator()
    // await createOperator()
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
