import { redirect } from "@tanstack/react-router";
import { createAuthClient } from "better-auth/react";

export const authClient = createAuthClient();

export const signIn = async (formData: { email: string; password: string }) => {
	await authClient.signIn.email({
		email: formData.email,
		password: formData.password,
		callbackURL: "/",
	});
};

export const signUp = async (formData: { email: string; password: string }) => {
	await authClient.signUp.email(
		{
			name: "User",
			email: formData.email,
			password: formData.password,
		},
		{
			onSuccess: () => {
				throw redirect({ to: "/login" });
			},
		},
	);
};