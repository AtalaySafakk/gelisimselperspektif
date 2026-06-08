-- CreateEnum
CREATE TYPE "CourseAccessRequirementMode" AS ENUM ('ALL', 'ANY');

-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "AuditAction" ADD VALUE 'ACCESS_ROLE_APPLICATION_APPROVED';
ALTER TYPE "AuditAction" ADD VALUE 'ACCESS_ROLE_APPLICATION_REJECTED';
ALTER TYPE "AuditAction" ADD VALUE 'ACCESS_ROLE_GRANTED_MANUAL';
ALTER TYPE "AuditAction" ADD VALUE 'ACCESS_ROLE_REVOKED';

-- AlterEnum
ALTER TYPE "AuditEntityType" ADD VALUE 'ACCESS_ROLE_APPLICATION';

-- AlterTable
ALTER TABLE "courses" ADD COLUMN     "accessRequirementMode" "CourseAccessRequirementMode" NOT NULL DEFAULT 'ALL';

-- AlterTable
ALTER TABLE "online_course_sessions" ADD COLUMN     "isPublished" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE "user_access_roles" ADD COLUMN     "manualGrantNote" TEXT;
