import prisma from "./prisma-client.js";

const startServer = async (port) => {
    try {
        await prisma.$connect();
        console.log(`Running server on localhost:${port}`);
    } catch (error) {
        console.log(`Gracefully shutting down`);
        await prisma.$disconnect();
        console.log(`DB connection closed`);
        process.exit(1);
    }
};

export default startServer;
