import { S3Client } from "@aws-sdk/client-s3";

export const s3Client = new S3Client({
	region: "us-east-1",
	forcePathStyle: true, // Must be enabled for RustFS compatibility
	credentials: {
		accessKeyId: import.meta.env.VITE_RUSTFS_ACCESS_KEY_ID || "",
		secretAccessKey: import.meta.env.VITE_RUSTFS_SECRET_ACCESS_KEY || "",
	},
	endpoint: import.meta.env.VITE_RUSTFS_ENDPOINT_URL || "",
});
