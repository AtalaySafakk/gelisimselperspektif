-- CreateEnum
CREATE TYPE "CourseEnrollmentMode" AS ENUM ('OPEN', 'APPLICATION');

-- CreateEnum
CREATE TYPE "CourseEnrollmentApplicationStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED');

-- AlterEnum
ALTER TYPE "AuditAction" ADD VALUE 'COURSE_ENROLLMENT_APPLICATION_APPROVED';
ALTER TYPE "AuditAction" ADD VALUE 'COURSE_ENROLLMENT_APPLICATION_REJECTED';
ALTER TYPE "AuditAction" ADD VALUE 'PAYMENT_INVITE_ISSUED';

-- AlterEnum
ALTER TYPE "AuditEntityType" ADD VALUE 'COURSE_ENROLLMENT_APPLICATION';

-- AlterTable
ALTER TABLE "courses" ADD COLUMN "enrollmentMode" "CourseEnrollmentMode" NOT NULL DEFAULT 'OPEN';

-- AlterTable
ALTER TABLE "orders" ADD COLUMN "paymentInviteToken" TEXT,
ADD COLUMN "paymentInviteExpiresAt" TIMESTAMP(3);

-- CreateTable
CREATE TABLE "course_enrollment_applications" (
    "id" TEXT NOT NULL,
    "courseId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "status" "CourseEnrollmentApplicationStatus" NOT NULL DEFAULT 'PENDING',
    "note" TEXT,
    "reviewNote" TEXT,
    "reviewedById" TEXT,
    "reviewedAt" TIMESTAMP(3),
    "orderId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "course_enrollment_applications_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "course_enrollment_application_documents" (
    "id" TEXT NOT NULL,
    "applicationId" TEXT NOT NULL,
    "storageKey" TEXT NOT NULL,
    "fileName" TEXT NOT NULL,
    "mimeType" TEXT NOT NULL DEFAULT 'application/pdf',
    "fileSizeBytes" BIGINT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "course_enrollment_application_documents_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "course_enrollment_applications_orderId_key" ON "course_enrollment_applications"("orderId");

-- CreateIndex
CREATE INDEX "course_enrollment_applications_courseId_status_idx" ON "course_enrollment_applications"("courseId", "status");

-- CreateIndex
CREATE INDEX "course_enrollment_applications_userId_status_idx" ON "course_enrollment_applications"("userId", "status");

-- CreateIndex
CREATE INDEX "course_enrollment_application_documents_applicationId_idx" ON "course_enrollment_application_documents"("applicationId");

-- CreateIndex
CREATE UNIQUE INDEX "orders_paymentInviteToken_key" ON "orders"("paymentInviteToken");

-- AddForeignKey
ALTER TABLE "course_enrollment_applications" ADD CONSTRAINT "course_enrollment_applications_courseId_fkey" FOREIGN KEY ("courseId") REFERENCES "courses"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "course_enrollment_applications" ADD CONSTRAINT "course_enrollment_applications_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "course_enrollment_applications" ADD CONSTRAINT "course_enrollment_applications_reviewedById_fkey" FOREIGN KEY ("reviewedById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "course_enrollment_applications" ADD CONSTRAINT "course_enrollment_applications_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "orders"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "course_enrollment_application_documents" ADD CONSTRAINT "course_enrollment_application_documents_applicationId_fkey" FOREIGN KEY ("applicationId") REFERENCES "course_enrollment_applications"("id") ON DELETE CASCADE ON UPDATE CASCADE;
