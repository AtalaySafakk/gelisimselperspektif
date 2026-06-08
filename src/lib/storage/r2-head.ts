import { HeadObjectCommand } from "@aws-sdk/client-s3";
import { getR2BucketName, getR2Client } from "@/lib/storage/r2-client";

/** Object metadata from R2 (S3 HeadObject). */
export async function headR2Object(key: string): Promise<{
  contentType: string | undefined;
  contentLength: number;
}> {
  const out = await getR2Client().send(
    new HeadObjectCommand({ Bucket: getR2BucketName(), Key: key }),
  );
  return {
    contentType: out.ContentType,
    contentLength: Number(out.ContentLength ?? 0),
  };
}
