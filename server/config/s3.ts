
import { S3Client } from "@aws-sdk/client-s3";

const region = process.env.AWS_REGION;
const bucketName = process.env.AWS_S3_BUCKET_NAME;

if (!region || !bucketName) {
  throw new Error(
    "AWS_REGION and AWS_S3_BUCKET_NAME must be configured in the environment"
  );
}

export const s3Client = new S3Client({
  region,
});

 const toImageUrl = <T extends string | null | undefined>(value: T): T | string => {
  if (!value) return value;
  if (/^https?:\/\//.test(value) || value.startsWith("/")) return value;
  const base = `https://${process.env.AWS_S3_BUCKET_NAME}.s3.${process.env.AWS_REGION}.amazonaws.com`;
  return `${base}/${value}`;
};

export { bucketName , toImageUrl};
