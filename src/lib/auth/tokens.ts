import { createHash, randomBytes } from "crypto";

export function hashToken(raw: string): string {
  return createHash("sha256").update(raw).digest("hex");
}

export function generateSecureToken(bytes = 32): string {
  return randomBytes(bytes).toString("base64url");
}

export function parseDurationToMs(duration: string): number {
  const match = /^(\d+)([smhd])$/.exec(duration.trim());
  if (!match) return 30 * 24 * 60 * 60 * 1000;
  const value = Number(match[1]);
  const unit = match[2];
  const multipliers: Record<string, number> = {
    s: 1000,
    m: 60 * 1000,
    h: 60 * 60 * 1000,
    d: 24 * 60 * 60 * 1000,
  };
  return value * (multipliers[unit] ?? multipliers.d);
}
