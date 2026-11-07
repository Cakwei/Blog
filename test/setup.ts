import "@testing-library/jest-dom/vitest";
import { cleanup } from "@testing-library/react";
import { afterEach } from "vitest";

// Populate dummy environment variables for unit tests to prevent startup crashes
process.env.RESEND_API_KEY ||= "re_mock_test_api_key_12345";
process.env.BETTER_AUTH_SECRET ||= "mock_better_auth_secret_minimum_32_characters_long_for_security";
process.env.BETTER_AUTH_URL ||= "http://localhost:3000";
process.env.DATABASE_URL ||= "mariadb://mock_user:mock_pass@localhost:3306/blog";
process.env.RUSTFS_ACCESS_KEY_ID ||= "mock_rustfs_key";
process.env.RUSTFS_SECRET_ACCESS_KEY ||= "mock_rustfs_secret";
process.env.RUSTFS_ENDPOINT_URL ||= "https://s3.mock.endpoint";

afterEach(() => {
	cleanup();
});
