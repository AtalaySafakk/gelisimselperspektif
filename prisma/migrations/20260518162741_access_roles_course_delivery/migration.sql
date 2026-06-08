-- CreateEnum
CREATE TYPE "AccessRoleApplicationStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED');

-- CreateEnum
CREATE TYPE "CourseDeliveryMode" AS ENUM ('ONLINE', 'OFFLINE');

-- AlterTable
ALTER TABLE "courses" ADD COLUMN     "deliveryMode" "CourseDeliveryMode" NOT NULL DEFAULT 'OFFLINE';

-- CreateTable
CREATE TABLE "AccessRole" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "description" TEXT,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AccessRole_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "user_access_roles" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "accessRoleId" TEXT NOT NULL,
    "approvedById" TEXT,
    "approvedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "user_access_roles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "access_role_applications" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "accessRoleId" TEXT NOT NULL,
    "status" "AccessRoleApplicationStatus" NOT NULL DEFAULT 'PENDING',
    "note" TEXT,
    "reviewNote" TEXT,
    "reviewedById" TEXT,
    "reviewedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "access_role_applications_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "access_role_application_documents" (
    "id" TEXT NOT NULL,
    "applicationId" TEXT NOT NULL,
    "storageKey" TEXT NOT NULL,
    "fileName" TEXT NOT NULL,
    "mimeType" TEXT NOT NULL DEFAULT 'application/pdf',
    "fileSizeBytes" BIGINT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "access_role_application_documents_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "course_required_access_roles" (
    "courseId" TEXT NOT NULL,
    "accessRoleId" TEXT NOT NULL,

    CONSTRAINT "course_required_access_roles_pkey" PRIMARY KEY ("courseId","accessRoleId")
);

-- CreateTable
CREATE TABLE "online_course_sessions" (
    "id" TEXT NOT NULL,
    "courseId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "platform" "LivePlatform" NOT NULL DEFAULT 'ZOOM',
    "meetingUrl" TEXT NOT NULL,
    "meetingPasswordEncrypted" TEXT,
    "startsAt" TIMESTAMP(3) NOT NULL,
    "durationMinutes" INTEGER NOT NULL DEFAULT 60,
    "timezone" TEXT NOT NULL DEFAULT 'Europe/Istanbul',
    "participantNotes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "online_course_sessions_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "AccessRole_slug_key" ON "AccessRole"("slug");

-- CreateIndex
CREATE INDEX "user_access_roles_accessRoleId_idx" ON "user_access_roles"("accessRoleId");

-- CreateIndex
CREATE UNIQUE INDEX "user_access_roles_userId_accessRoleId_key" ON "user_access_roles"("userId", "accessRoleId");

-- CreateIndex
CREATE INDEX "access_role_applications_userId_status_idx" ON "access_role_applications"("userId", "status");

-- CreateIndex
CREATE INDEX "access_role_applications_status_createdAt_idx" ON "access_role_applications"("status", "createdAt");

-- CreateIndex
CREATE INDEX "access_role_application_documents_applicationId_idx" ON "access_role_application_documents"("applicationId");

-- CreateIndex
CREATE INDEX "online_course_sessions_courseId_idx" ON "online_course_sessions"("courseId");

-- CreateIndex
CREATE INDEX "online_course_sessions_courseId_startsAt_idx" ON "online_course_sessions"("courseId", "startsAt");

-- AddForeignKey
ALTER TABLE "user_access_roles" ADD CONSTRAINT "user_access_roles_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_access_roles" ADD CONSTRAINT "user_access_roles_accessRoleId_fkey" FOREIGN KEY ("accessRoleId") REFERENCES "AccessRole"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_access_roles" ADD CONSTRAINT "user_access_roles_approvedById_fkey" FOREIGN KEY ("approvedById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "access_role_applications" ADD CONSTRAINT "access_role_applications_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "access_role_applications" ADD CONSTRAINT "access_role_applications_accessRoleId_fkey" FOREIGN KEY ("accessRoleId") REFERENCES "AccessRole"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "access_role_applications" ADD CONSTRAINT "access_role_applications_reviewedById_fkey" FOREIGN KEY ("reviewedById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "access_role_application_documents" ADD CONSTRAINT "access_role_application_documents_applicationId_fkey" FOREIGN KEY ("applicationId") REFERENCES "access_role_applications"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "course_required_access_roles" ADD CONSTRAINT "course_required_access_roles_courseId_fkey" FOREIGN KEY ("courseId") REFERENCES "courses"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "course_required_access_roles" ADD CONSTRAINT "course_required_access_roles_accessRoleId_fkey" FOREIGN KEY ("accessRoleId") REFERENCES "AccessRole"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "online_course_sessions" ADD CONSTRAINT "online_course_sessions_courseId_fkey" FOREIGN KEY ("courseId") REFERENCES "courses"("id") ON DELETE CASCADE ON UPDATE CASCADE;
