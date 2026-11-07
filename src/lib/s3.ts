import { S3Client } from "@aws-sdk/client-s3";

// Read server-side environment variables first, falling back to legacy Vite prefixes if present
const accessKeyId =
	process.env.RUSTFS_ACCESS_KEY_ID ||
	process.env.VITE_RUSTFS_ACCESS_KEY_ID ||
	"";
const secretAccessKey =
	process.env.RUSTFS_SECRET_ACCESS_KEY ||
	process.env.VITE_RUSTFS_SECRET_ACCESS_KEY ||
	"";
const endpoint =
	process.env.RUSTFS_ENDPOINT_URL ||
	process.env.VITE_RUSTFS_ENDPOINT_URL ||
	"";

export const s3Client = new S3Client({
	region: "us-east-1",
	forcePathStyle: true, // Must be enabled for RustFS/MinIO compatibility
	credentials: {
		accessKeyId,
		secretAccessKey,
	},
	endpoint,
});

