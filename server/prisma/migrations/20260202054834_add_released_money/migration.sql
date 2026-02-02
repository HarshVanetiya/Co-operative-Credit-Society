-- AlterTable
ALTER TABLE "Account" ADD COLUMN     "releasedMoney" DOUBLE PRECISION NOT NULL DEFAULT 0;

-- CreateTable
CREATE TABLE "ReleasedMoneyLog" (
    "id" SERIAL NOT NULL,
    "accountId" INTEGER NOT NULL,
    "amount" DOUBLE PRECISION NOT NULL,
    "profit" DOUBLE PRECISION DEFAULT 0,
    "type" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ReleasedMoneyLog_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "ReleasedMoneyLog" ADD CONSTRAINT "ReleasedMoneyLog_accountId_fkey" FOREIGN KEY ("accountId") REFERENCES "Account"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
