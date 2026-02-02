-- CreateEnum
CREATE TYPE "LoanType" AS ENUM ('NEW', 'OLD');

-- DropIndex
DROP INDEX "Member_mobile_key";

-- AlterTable
ALTER TABLE "Loan" ADD COLUMN     "type" "LoanType" NOT NULL DEFAULT 'NEW';

-- AlterTable
ALTER TABLE "Member" ALTER COLUMN "mobile" DROP NOT NULL;
