import { z } from "zod";

const serverSchema = z.object({
  NODE_ENV: z
    .enum(["development", "test", "production"])
    .default("development"),
  DATABASE_URL: z.string().min(1),
  JWT_ACCESS_SECRET: z.string().min(32),
  JWT_REFRESH_SECRET: z.string().min(32),
  JWT_ACCESS_EXPIRES: z.string().default("15m"),
  JWT_REFRESH_EXPIRES: z.string().default("30d"),
  R2_ACCOUNT_ID: z.string().optional(),
  R2_ACCESS_KEY_ID: z.string().optional(),
  R2_SECRET_ACCESS_KEY: z.string().optional(),
  R2_BUCKET_NAME: z.string().optional(),
  R2_ENDPOINT: z.string().url().optional(),
  /** Boş string .env ile gelirse yoksayılır (Zod .url() hatası olmasın) */
  R2_PUBLIC_URL: z.preprocess(
    (v) => (typeof v === "string" && v.trim() === "" ? undefined : v),
    z.string().url().optional(),
  ),
  VIDEO_PROVIDER: z.enum(["manual", "r2", "bunny", "mux"]).default("manual"),
  PAYMENT_PROVIDER: z.enum(["manual", "iyzico", "paytr"]).default("manual"),
  DEFAULT_PLATFORM_FEE_PERCENT: z.coerce.number().min(0).max(100).default(20),
  ENCRYPTION_KEY: z.string().min(32).optional(),
});

const clientSchema = z.object({
  NEXT_PUBLIC_APP_URL: z.string().url(),
});

export type ServerEnv = z.infer<typeof serverSchema>;
export type ClientEnv = z.infer<typeof clientSchema>;

function parseServerEnv(): ServerEnv {
  const parsed = serverSchema.safeParse(process.env);
  if (!parsed.success) {
    console.error("❌ Invalid server environment variables:", parsed.error.flatten().fieldErrors);
    throw new Error("Invalid server environment variables");
  }
  return parsed.data;
}

function parseClientEnv(): ClientEnv {
  const parsed = clientSchema.safeParse({
    NEXT_PUBLIC_APP_URL: process.env.NEXT_PUBLIC_APP_URL,
  });
  if (!parsed.success) {
    console.error("❌ Invalid client environment variables:", parsed.error.flatten().fieldErrors);
    throw new Error("Invalid client environment variables");
  }
  return parsed.data;
}

let _server: ServerEnv | undefined;
let _client: ClientEnv | undefined;

/** Server-only validated env (lazy singleton) */
export function getServerEnv(): ServerEnv {
  if (!_server) _server = parseServerEnv();
  return _server;
}

/** Client-safe validated env */
export function getClientEnv(): ClientEnv {
  if (!_client) _client = parseClientEnv();
  return _client;
}

export function isR2Configured(): boolean {
  const env = getServerEnv();
  return Boolean(
    env.R2_ACCOUNT_ID &&
      env.R2_ACCESS_KEY_ID &&
      env.R2_SECRET_ACCESS_KEY &&
      env.R2_BUCKET_NAME &&
      env.R2_ENDPOINT,
  );
}
