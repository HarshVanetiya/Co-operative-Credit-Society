-- CreateTable
CREATE TABLE "OrgWithdrawal" (
    "id" SERIAL NOT NULL,
    "purpose" TEXT NOT NULL,
    "amount" DOUBLE PRECISION NOT NULL,
    "source" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "OrgWithdrawal_pkey" PRIMARY KEY ("id")
);
