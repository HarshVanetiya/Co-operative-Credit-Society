-- CreateTable
CREATE TABLE "Organisation" (
    "id" INTEGER NOT NULL DEFAULT 1,
    "name" TEXT NOT NULL,
    "amount" DOUBLE PRECISION NOT NULL DEFAULT 0,

    CONSTRAINT "Organisation_pkey" PRIMARY KEY ("id")
);
