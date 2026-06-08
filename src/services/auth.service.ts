import { AuthTokenType, Role } from "@prisma/client";
import { prisma } from "@/lib/db/prisma";
import { hashPassword, verifyPassword } from "@/lib/auth/password";
import { signAccessToken } from "@/lib/auth/jwt";
import {
  generateSecureToken,
  hashToken,
  parseDurationToMs,
} from "@/lib/auth/tokens";
import {
  hashRefreshToken,
  revokeRefreshTokenFamily,
} from "@/lib/auth/refresh-token";
import {
  AUTH_MESSAGES,
  AuthServiceError,
} from "@/lib/auth/errors";
import { emailService } from "@/services/email.service";
import { auditLogService } from "@/services/audit-log.service";
import { getServerEnv } from "@/lib/env";
import type { RequestMeta } from "@/types";
import type {
  ForgotPasswordInput,
  LoginInput,
  RegisterInput,
  ResetPasswordInput,
} from "@/validators/auth";

const VERIFY_EXPIRY_MS = 24 * 60 * 60 * 1000;
const RESET_EXPIRY_MS = 60 * 60 * 1000;

export type AuthSessionResult = {
  accessToken: string;
  refreshToken: string;
  user: {
    id: string;
    email: string;
    role: Role;
    emailVerified: boolean;
  };
};

export const authService = {
  async register(input: RegisterInput, meta?: RequestMeta) {
    const email = input.email.toLowerCase().trim();

    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing && !existing.deletedAt) {
      if (!existing.emailVerified) {
        const rawVerifyToken = generateSecureToken();
        await prisma.authToken.create({
          data: {
            userId: existing.id,
            type: AuthTokenType.EMAIL_VERIFICATION,
            tokenHash: hashToken(rawVerifyToken),
            expiresAt: new Date(Date.now() + VERIFY_EXPIRY_MS),
          },
        });
        await emailService.sendVerificationEmail(email, rawVerifyToken);
      }
      return { message: AUTH_MESSAGES.REGISTER_SUCCESS };
    }

    const passwordHash = await hashPassword(input.password);
    const rawVerifyToken = generateSecureToken();

    const user = await prisma.$transaction(async (tx) => {
      const created = await tx.user.create({
        data: {
          email,
          passwordHash,
          role: Role.STUDENT,
          profile: {
            create: {
              firstName: input.firstName.trim(),
              lastName: input.lastName.trim(),
              displayName: `${input.firstName.trim()} ${input.lastName.trim()}`,
            },
          },
        },
      });

      await tx.authToken.create({
        data: {
          userId: created.id,
          type: AuthTokenType.EMAIL_VERIFICATION,
          tokenHash: hashToken(rawVerifyToken),
          expiresAt: new Date(Date.now() + VERIFY_EXPIRY_MS),
        },
      });

      return created;
    });

    await emailService.sendVerificationEmail(email, rawVerifyToken);

    await auditLogService.log({
      actorId: user.id,
      action: "USER_REGISTERED",
      entityType: "USER",
      entityId: user.id,
      metadata: { email },
      ipAddress: meta?.ipAddress,
      userAgent: meta?.userAgent,
    });

    return { message: AUTH_MESSAGES.REGISTER_SUCCESS };
  },

  async verifyEmail(rawToken: string, meta?: RequestMeta) {
    const tokenHash = hashToken(rawToken);
    const record = await prisma.authToken.findFirst({
      where: {
        tokenHash,
        type: AuthTokenType.EMAIL_VERIFICATION,
        usedAt: null,
        expiresAt: { gt: new Date() },
      },
      include: { user: true },
    });

    if (!record) {
      throw new AuthServiceError(AUTH_MESSAGES.TOKEN_INVALID, "TOKEN_INVALID");
    }

    await prisma.$transaction(async (tx) => {
      const updated = await tx.authToken.updateMany({
        where: { id: record.id, usedAt: null },
        data: { usedAt: new Date() },
      });
      if (updated.count === 0) {
        throw new AuthServiceError(AUTH_MESSAGES.TOKEN_USED, "TOKEN_USED");
      }
      await tx.user.update({
        where: { id: record.userId },
        data: {
          emailVerified: true,
          emailVerifiedAt: new Date(),
        },
      });
    });

    await auditLogService.log({
      actorId: record.userId,
      action: "EMAIL_VERIFIED",
      entityType: "USER",
      entityId: record.userId,
      ipAddress: meta?.ipAddress,
      userAgent: meta?.userAgent,
    });

    return { message: AUTH_MESSAGES.VERIFY_SUCCESS };
  },

  async login(input: LoginInput, meta?: RequestMeta): Promise<AuthSessionResult> {
    const email = input.email.toLowerCase().trim();
    const user = await prisma.user.findUnique({ where: { email } });

    if (!user || user.deletedAt || !user.isActive) {
      throw new AuthServiceError(AUTH_MESSAGES.INVALID_CREDENTIALS);
    }

    const valid = await verifyPassword(input.password, user.passwordHash);
    if (!valid) {
      throw new AuthServiceError(AUTH_MESSAGES.INVALID_CREDENTIALS);
    }

    if (!user.emailVerified) {
      throw new AuthServiceError(AUTH_MESSAGES.EMAIL_NOT_VERIFIED, "EMAIL_NOT_VERIFIED");
    }

    const session = await this.createSession(user, meta);
    await prisma.user.update({
      where: { id: user.id },
      data: { lastLoginAt: new Date() },
    });

    return session;
  },

  async createSession(
    user: {
      id: string;
      email: string;
      role: Role;
      emailVerified: boolean;
    },
    meta?: RequestMeta,
  ): Promise<AuthSessionResult> {
    const rawRefresh = generateSecureToken();
    const familyId = generateSecureToken(16);
    const refreshMs = parseDurationToMs(getServerEnv().JWT_REFRESH_EXPIRES);

    await prisma.refreshToken.create({
      data: {
        userId: user.id,
        tokenHash: hashRefreshToken(rawRefresh),
        familyId,
        expiresAt: new Date(Date.now() + refreshMs),
        ipAddress: meta?.ipAddress,
        userAgent: meta?.userAgent,
      },
    });

    const accessToken = await signAccessToken({
      sub: user.id,
      email: user.email,
      role: user.role,
      emailVerified: user.emailVerified,
    });

    return {
      accessToken,
      refreshToken: rawRefresh,
      user: {
        id: user.id,
        email: user.email,
        role: user.role,
        emailVerified: user.emailVerified,
      },
    };
  },

  async refreshSession(
    rawRefreshToken: string,
    meta?: RequestMeta,
  ): Promise<AuthSessionResult> {
    const tokenHash = hashRefreshToken(rawRefreshToken);
    const stored = await prisma.refreshToken.findFirst({
      where: { tokenHash },
      include: { user: true },
    });

    if (!stored) {
      throw new AuthServiceError(AUTH_MESSAGES.GENERIC);
    }

    if (stored.revokedAt !== null) {
      await this.handleRefreshTokenReuse(stored.familyId, stored.userId, meta);
      throw new AuthServiceError(AUTH_MESSAGES.GENERIC);
    }

    if (stored.expiresAt <= new Date()) {
      await prisma.refreshToken.update({
        where: { id: stored.id },
        data: { revokedAt: new Date() },
      });
      throw new AuthServiceError(AUTH_MESSAGES.GENERIC);
    }

    if (stored.user.deletedAt || !stored.user.isActive) {
      throw new AuthServiceError(AUTH_MESSAGES.GENERIC);
    }

    const user = stored.user;
    if (!user.emailVerified) {
      throw new AuthServiceError(AUTH_MESSAGES.EMAIL_NOT_VERIFIED, "EMAIL_NOT_VERIFIED");
    }

    await prisma.refreshToken.update({
      where: { id: stored.id },
      data: { revokedAt: new Date() },
    });

    const newRawRefresh = generateSecureToken();
    const refreshMs = parseDurationToMs(getServerEnv().JWT_REFRESH_EXPIRES);

    await prisma.refreshToken.create({
      data: {
        userId: user.id,
        tokenHash: hashRefreshToken(newRawRefresh),
        familyId: stored.familyId,
        expiresAt: new Date(Date.now() + refreshMs),
        ipAddress: meta?.ipAddress,
        userAgent: meta?.userAgent,
      },
    });

    const accessToken = await signAccessToken({
      sub: user.id,
      email: user.email,
      role: user.role,
      emailVerified: user.emailVerified,
    });

    return {
      accessToken,
      refreshToken: newRawRefresh,
      user: {
        id: user.id,
        email: user.email,
        role: user.role,
        emailVerified: user.emailVerified,
      },
    };
  },

  async handleRefreshTokenReuse(
    familyId: string,
    userId: string,
    meta?: RequestMeta,
  ): Promise<void> {
    const revokedCount = await revokeRefreshTokenFamily(familyId);
    await auditLogService.log({
      actorId: null,
      action: "REFRESH_TOKEN_REUSE_DETECTED",
      entityType: "USER",
      entityId: userId,
      metadata: { familyId, revokedCount },
      ipAddress: meta?.ipAddress,
      userAgent: meta?.userAgent,
    });
  },

  async logout(rawRefreshToken: string | undefined, actorId?: string, meta?: RequestMeta) {
    if (rawRefreshToken) {
      const tokenHash = hashRefreshToken(rawRefreshToken);
      await prisma.refreshToken.updateMany({
        where: { tokenHash, revokedAt: null },
        data: { revokedAt: new Date() },
      });
    }

    if (actorId) {
      await auditLogService.log({
        actorId,
        action: "USER_LOGGED_OUT",
        entityType: "USER",
        entityId: actorId,
        ipAddress: meta?.ipAddress,
        userAgent: meta?.userAgent,
      });
    }
  },

  async revokeAllRefreshTokens(userId: string) {
    await prisma.refreshToken.updateMany({
      where: { userId, revokedAt: null },
      data: { revokedAt: new Date() },
    });
  },

  async forgotPassword(input: ForgotPasswordInput) {
    const email = input.email.toLowerCase().trim();
    const user = await prisma.user.findUnique({ where: { email } });

    if (user && !user.deletedAt && user.isActive) {
      const rawToken = generateSecureToken();
      await prisma.authToken.create({
        data: {
          userId: user.id,
          type: AuthTokenType.PASSWORD_RESET,
          tokenHash: hashToken(rawToken),
          expiresAt: new Date(Date.now() + RESET_EXPIRY_MS),
        },
      });
      await emailService.sendPasswordResetEmail(email, rawToken);
    }

    return { message: AUTH_MESSAGES.RESET_EMAIL_SENT };
  },

  async resetPassword(input: ResetPasswordInput, meta?: RequestMeta) {
    const tokenHash = hashToken(input.token);
    const record = await prisma.authToken.findFirst({
      where: {
        tokenHash,
        type: AuthTokenType.PASSWORD_RESET,
        usedAt: null,
        expiresAt: { gt: new Date() },
      },
    });

    if (!record) {
      throw new AuthServiceError(AUTH_MESSAGES.TOKEN_INVALID, "TOKEN_INVALID");
    }

    const passwordHash = await hashPassword(input.password);

    await prisma.$transaction(async (tx) => {
      const updated = await tx.authToken.updateMany({
        where: { id: record.id, usedAt: null },
        data: { usedAt: new Date() },
      });
      if (updated.count === 0) {
        throw new AuthServiceError(AUTH_MESSAGES.TOKEN_USED, "TOKEN_USED");
      }
      await tx.user.update({
        where: { id: record.userId },
        data: { passwordHash },
      });
    });

    await this.revokeAllRefreshTokens(record.userId);

    await auditLogService.log({
      actorId: record.userId,
      action: "PASSWORD_RESET_COMPLETED",
      entityType: "USER",
      entityId: record.userId,
      ipAddress: meta?.ipAddress,
      userAgent: meta?.userAgent,
    });

    return { message: AUTH_MESSAGES.RESET_SUCCESS };
  },
};
