import { betterAuth } from "better-auth";
import { prismaAdapter } from "better-auth/adapters/prisma";
import { username } from "better-auth/plugins";
import { tanstackStartCookies } from "better-auth/tanstack-start";
import { Resend } from "resend";
import { prisma } from "#/db";

if (!process.env.RESEND_API_KEY)
	throw Error("RESEND_API_KEY is not set as environment variable");

const resend = new Resend(process.env.RESEND_API_KEY);

export const auth = betterAuth({
	database: prismaAdapter(prisma, {
		provider: "mysql",
	}),
	emailVerification: {
		sendVerificationEmail: async ({ user, url }) => {
			void resend.emails.send({
				from: "Cakwei <auth@cakwei.dev>",
				to: user.email,
				subject: "Verify your email address",
				html: `
                    <!DOCTYPE html>
                    <html lang="en">
                    <head>
                        <meta charset="UTF-8">
                        <meta name="viewport" content="width=device-width, initial-scale=1.0">
                        <title>Verify Your Email</title>
                    </head>
                    <body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #f4f4f5;">
                        <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%" style="table-layout: fixed; background-color: #f4f4f5; padding: 40px 0;">
                            <tr>
                                <td align="center">
                                    <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%" style="max-width: 600px; background-color: #ffffff; border-radius: 8px; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.05); overflow: hidden;">
                                        <!-- Header -->
                                        <tr>
                                            <td style="padding: 40px 40px 20px 40px; text-align: center; background-color: #09090b;">
                                                <h1 style="margin: 0; color: #ffffff; font-size: 24px; font-weight: 600; letter-spacing: -0.5px;">Cakwei</h1>
                                            </td>
                                        </tr>
                                        <!-- Body Content -->
                                        <tr>
                                            <td style="padding: 40px;">
                                                <h2 style="margin: 0 0 16px 0; color: #09090b; font-size: 20px; font-weight: 600;">Check your inbox, almost there!</h2>
                                                <p style="margin: 0 0 24px 0; color: #71717a; font-size: 16px; line-height: 24px;">
                                                    Hi ${user.name || "there"}, thanks for signing up for Cakwei. Please confirm your email address by clicking the button below.
                                                </p>
                                                <table role="presentation" border="0" cellpadding="0" cellspacing="0" style="margin-bottom: 24px;">
                                                    <tr>
                                                        <td align="center" style="border-radius: 6px; background-color: #2563eb;">
                                                            <a href="${url}" target="_blank" style="font-size: 16px; font-weight: 600; color: #ffffff; text-decoration: none; padding: 12px 24px; border-radius: 6px; border: 1px solid #2563eb; display: inline-block;">Verify Email Address</a>
                                                        </td>
                                                    </tr>
                                                </table>
                                                <p style="margin: 0 0 16px 0; color: #71717a; font-size: 14px; line-height: 20px;">
                                                    If you didn't create an account with Cakwei, you can safely ignore this email.
                                                </p>
                                                <hr style="border: none; border-top: 1px solid #e4e4e7; margin: 32px 0;">
                                                <p style="margin: 0; color: #a1a1aa; font-size: 12px; line-height: 16px; word-break: break-all;">
                                                    Or copy and paste this URL into your browser: <a href="${url}" style="color: #2563eb; text-decoration: underline;">${url}</a>
                                                </p>
                                            </td>
                                        </tr>
                                        <!-- Footer -->
                                        <tr>
                                            <td style="padding: 24px 40px; background-color: #fafafa; text-align: center;">
                                                <p style="margin: 0; color: #a1a1aa; font-size: 12px;">© ${new Date().getFullYear()} Cakwei. All rights reserved.</p>
                                            </td>
                                        </tr>
                                    </table>
                                </td>
                            </tr>
                        </table>
                    </body>
                    </html>
                `,
			});
		},
		sendOnSignIn: true, // <--- Only send verification email upon registration/signup
	},
	emailAndPassword: {
		enabled: true,
		requireEmailVerification: true,
		sendResetPassword: async ({ user, url }) => {
			void resend.emails.send({
				from: "Cakwei <auth@cakwei.dev>",
				to: user.email,
				subject: "Reset your password",
				html: `
                    <!DOCTYPE html>
                    <html lang="en">
                    <head>
                        <meta charset="UTF-8">
                        <meta name="viewport" content="width=device-width, initial-scale=1.0">
                        <title>Reset Your Password</title>
                    </head>
                    <body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #f4f4f5;">
                        <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%" style="table-layout: fixed; background-color: #f4f4f5; padding: 40px 0;">
                            <tr>
                                <td align="center">
                                    <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%" style="max-width: 600px; background-color: #ffffff; border-radius: 8px; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.05); overflow: hidden;">
                                        <!-- Header -->
                                        <tr>
                                            <td style="padding: 40px 40px 20px 40px; text-align: center; background-color: #09090b;">
                                                <h1 style="margin: 0; color: #ffffff; font-size: 24px; font-weight: 600; letter-spacing: -0.5px;">Cakwei</h1>
                                            </td>
                                        </tr>
                                        <!-- Body Content -->
                                        <tr>
                                            <td style="padding: 40px;">
                                                <h2 style="margin: 0 0 16px 0; color: #09090b; font-size: 20px; font-weight: 600;">Reset your password</h2>
                                                <p style="margin: 0 0 24px 0; color: #71717a; font-size: 16px; line-height: 24px;">
                                                    We received a request to reset the password for your Cakwei account. Click the button below to choose a new password.
                                                </p>
                                                <table role="presentation" border="0" cellpadding="0" cellspacing="0" style="margin-bottom: 24px;">
                                                    <tr>
                                                        <td align="center" style="border-radius: 6px; background-color: #2563eb;">
                                                            <a href="${url}" target="_blank" style="font-size: 16px; font-weight: 600; color: #ffffff; text-decoration: none; padding: 12px 24px; border-radius: 6px; border: 1px solid #2563eb; display: inline-block;">Reset Password</a>
                                                        </td>
                                                    </tr>
                                                </table>
                                                <p style="margin: 0 0 16px 0; color: #71717a; font-size: 14px; line-height: 20px;">
                                                    If you didn't request a password reset, you can safely ignore this email—your password will remain unchanged.
                                                </p>
                                                <hr style="border: none; border-top: 1px solid #e4e4e7; margin: 32px 0;">
                                                <p style="margin: 0; color: #a1a1aa; font-size: 12px; line-height: 16px; word-break: break-all;">
                                                    Or copy and paste this URL into your browser: <a href="${url}" style="color: #2563eb; text-decoration: underline;">${url}</a>
                                                </p>
                                            </td>
                                        </tr>
                                        <!-- Footer -->
                                        <tr>
                                            <td style="padding: 24px 40px; background-color: #fafafa; text-align: center;">
                                                <p style="margin: 0; color: #a1a1aa; font-size: 12px;">© ${new Date().getFullYear()} Cakwei. All rights reserved.</p>
                                            </td>
                                        </tr>
                                    </table>
                                </td>
                            </tr>
                        </table>
                    </body>
                    </html>
                `,
			});
		},
	},
	plugins: [tanstackStartCookies(), username()],
});
