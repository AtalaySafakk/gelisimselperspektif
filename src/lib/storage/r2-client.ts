import { S3Client } from "@aws-sdk/client-s3";
import { getServerEnv, isR2Configured } from "@/lib/env";

let _client: S3Client | null = null;

export function getR2Client(): S3Client {
  if (!isR2Configured()) {
    throw new Error("R2 is not configured. Set R2_* environment variables.");
  }
  if (!_client) {
    const env = getServerEnv();
    _client = new S3Client({
      region: "auto",
      endpoint: env.R2_ENDPOINT!,
      credentials: {
        accessKeyId: env.R2_ACCESS_KEY_ID!,
        secretAccessKey: env.R2_SECRET_ACCESS_KEY!,
      },
      forcePathStyle: true,
    });
  }
  return _client;
}

export function getR2BucketName(): string {
  const env = getServerEnv();
  if (!env.R2_BUCKET_NAME) {
    throw new Error("R2_BUCKET_NAME is not configured");
  }
  return env.R2_BUCKET_NAME;
}
