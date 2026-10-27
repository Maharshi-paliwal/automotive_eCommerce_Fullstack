
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

export { bucketName };
