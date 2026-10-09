-- AlterTable
ALTER TABLE "User" ADD COLUMN     "monthlySummaryEnabled" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "monthlySummaryDay" INTEGER NOT NULL DEFAULT 1,
ADD COLUMN     "monthlySummaryHour" INTEGER NOT NULL DEFAULT 9,
ADD COLUMN     "monthlySummaryLastSentAt" TIMESTAMP(3);
