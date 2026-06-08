import {
  GetObjectCommand,
  PutObjectCommand,
  type PutObjectCommandInput,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { getR2BucketName, getR2Client } from "@/lib/storage/r2-client";

const DEFAULT_UPLOAD_EXPIRES = 60 * 10;
const DEFAULT_DOWNLOAD_EXPIRES = 60 * 60 * 4;

export type PresignUploadInput = {
  key: string;
  contentType: string;
  contentLength?: number;
  expiresIn?: number;
};

export type PresignDownloadInput = {
  key: string;
  expiresIn?: number;
  responseContentDisposition?: string;
};

/** Private bucket — client uploads via presigned PUT */
export async function createPresignedUploadUrl(
  input: PresignUploadInput,
): Promise<{ url: string; key: string; expiresIn: number }> {
  const expiresIn = input.expiresIn ?? DEFAULT_UPLOAD_EXPIRES;
  const commandInput: PutObjectCommandInput = {
    Bucket: getR2BucketName(),
    Key: input.key,
    ContentType: input.contentType,
  };
  if (input.contentLength) {
    commandInput.ContentLength = input.contentLength;
  }
  const command = new PutObjectCommand(commandInput);
  const url = await getSignedUrl(getR2Client(), command, { expiresIn });
  return { url, key: input.key, expiresIn };
}

/** Private bucket — playback/download via presigned GET */
export async function createPresignedDownloadUrl(
  input: PresignDownloadInput,
): Promise<{ url: string; expiresIn: number }> {
  const expiresIn = input.expiresIn ?? DEFAULT_DOWNLOAD_EXPIRES;
  const command = new GetObjectCommand({
    Bucket: getR2BucketName(),
    Key: input.key,
    ResponseContentDisposition: input.responseContentDisposition,
  });
  const url = await getSignedUrl(getR2Client(), command, { expiresIn });
  return { url, expiresIn };
}

/** Standard key builders */
export const storageKeys = {
  receipt: (orderId: string, filename: string) =>
    `receipts/${orderId}/${filename}`,
  courseThumbnail: (courseId: string, filename: string) =>
    `courses/${courseId}/thumbnail/${filename}`,
  lessonDocument: (lessonId: string, filename: string) =>
    `documents/${lessonId}/${filename}`,
  video: (videoId: string, filename: string) =>
    `videos/${videoId}/${filename}`,
  accessApplication: (applicationId: string, filename: string) =>
    `access-applications/${applicationId}/${filename}`,
  courseEnrollmentApplication: (applicationId: string, filename: string) =>
    `course-enrollment-applications/${applicationId}/${filename}`,
  heroSlide: (slideId: string, filename: string) =>
    `hero-slides/${slideId}/${filename}`,
};
