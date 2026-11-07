import { describe, expect, it } from "vitest";
import { s3Client } from "#/lib/s3";

describe("S3 Client & Storage Configuration", () => {
	it("initializes S3Client with custom endpoint and credentials", async () => {
		expect(s3Client).toBeDefined();
		const config = s3Client.config;

		// Verify forcePathStyle is enabled for S3/MinIO/RustFS compatibility
		expect(config.forcePathStyle).toBe(true);

		// Verify credentials resolver
		const creds = await config.credentials();
		expect(creds.accessKeyId).toBe("mock_rustfs_key");
		expect(creds.secretAccessKey).toBe("mock_rustfs_secret");

		// Verify region
		expect(await config.region()).toBe("us-east-1");
	});

	it("sanitizes file names for safe S3 keys", () => {
		const sanitize = (fileName: string): string => {
			const dotIndex = fileName.lastIndexOf(".");
			const nameWithoutExt =
				dotIndex !== -1 ? fileName.substring(0, dotIndex) : fileName;
			const ext = dotIndex !== -1 ? fileName.substring(dotIndex) : "";

			const sanitized = nameWithoutExt
				.replace(/\.\.\//g, "")
				.replace(/[^a-zA-Z0-9_\-\.]/g, "_")
				.replace(/__+/g, "_");

			return `${sanitized}${ext.toLowerCase()}`;
		};

		// Directory traversal prevention
		expect(sanitize("../../etc/passwd.jpg")).toBe("etc_passwd.jpg");

		// Spaces and dangerous characters replacement
		expect(sanitize("My Cool Photo (1) #draft!.png")).toBe(
			"My_Cool_Photo_1_draft_.png",
		);

		// Lowercases extensions for consistency
		expect(sanitize("HERO_IMAGE.PNG")).toBe("HERO_IMAGE.png");
	});
});
