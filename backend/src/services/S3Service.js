/**
 * AWS S3 Upload Service
 * Handles uploading images to S3 bucket
 * 
 * ENV:
 *  - AWS_S3_BUCKET_NAME (required)
 *  - AWS_ACCESS_KEY_ID (required)
 *  - AWS_SECRET_ACCESS_KEY (required)
 *  - AWS_REGION (optional, default: us-east-1)
 */

import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import { Readable } from 'stream';

let s3Client = null;

/**
 * Get or create S3 client
 */
function getS3Client() {
  if (!s3Client) {
    const bucketName = process.env.AWS_S3_BUCKET_NAME;
    const accessKeyId = process.env.AWS_ACCESS_KEY_ID;
    const secretAccessKey = process.env.AWS_SECRET_ACCESS_KEY;
    const region = process.env.AWS_REGION || 'us-east-1';

    if (!bucketName || !accessKeyId || !secretAccessKey) {
      throw new Error('AWS S3 credentials not configured. Please set AWS_S3_BUCKET_NAME, AWS_ACCESS_KEY_ID, and AWS_SECRET_ACCESS_KEY in .env');
    }

    s3Client = new S3Client({
      region,
      credentials: {
        accessKeyId,
        secretAccessKey,
      },
    });
  }
  return s3Client;
}

/**
 * Upload buffer to S3
 * @param {Buffer} buffer - Image buffer
 * @param {string} key - S3 object key (path/filename)
 * @param {string} contentType - MIME type (e.g., 'image/png', 'image/jpeg')
 * @returns {Promise<string>} - S3 URL of uploaded file
 */
export async function uploadToS3(buffer, key, contentType = 'image/png') {
  try {
    const client = getS3Client();
    const bucketName = process.env.AWS_S3_BUCKET_NAME;

    const command = new PutObjectCommand({
      Bucket: bucketName,
      Key: key,
      Body: buffer,
      ContentType: contentType,
      CacheControl: 'public, max-age=31536000, immutable',
      // Note: ACL is deprecated in newer S3 buckets
      // If your bucket has ACLs disabled, ensure bucket policy allows public read access
      // For buckets with ACLs enabled, uncomment the line below:
      // ACL: 'public-read',
    });

    await client.send(command);

    // Construct S3 URL
    // Format: https://bucket-name.s3.region.amazonaws.com/key
    // For us-east-1, the format is slightly different: https://bucket-name.s3.amazonaws.com/key
    const region = process.env.AWS_REGION || 'us-east-1';
    let s3Url;
    if (region === 'us-east-1') {
      s3Url = `https://${bucketName}.s3.amazonaws.com/${key}`;
    } else {
      s3Url = `https://${bucketName}.s3.${region}.amazonaws.com/${key}`;
    }
    
    console.log(`✅ Uploaded to S3: ${s3Url}`);
    return s3Url;
  } catch (error) {
    console.error('❌ Error uploading to S3:', error);
    throw error;
  }
}

/**
 * Upload file from local path to S3
 * @param {string} filePath - Local file path
 * @param {string} key - S3 object key (path/filename)
 * @param {string} contentType - MIME type
 * @returns {Promise<string>} - S3 URL of uploaded file
 */
export async function uploadFileToS3(filePath, key, contentType = 'image/png') {
  try {
    const { readFile } = await import('fs/promises');
    const buffer = await readFile(filePath);
    return await uploadToS3(buffer, key, contentType);
  } catch (error) {
    console.error('❌ Error reading file for S3 upload:', error);
    throw error;
  }
}

/**
 * Check if S3 is configured
 * @returns {boolean}
 */
export function isS3Configured() {
  return !!(
    process.env.AWS_S3_BUCKET_NAME &&
    process.env.AWS_ACCESS_KEY_ID &&
    process.env.AWS_SECRET_ACCESS_KEY
  );
}
