// app/routes/login.tsx
import { createFileRoute, Link, redirect } from "@tanstack/react-router";
import { type ChangeEvent, useEffect, useState } from "react";
import { authClient } from "#/lib/auth-client";
import type { AuthFormData, IResponse } from "#/lib/types";
import { getFreshServerSession } from "#/lib/utils";
import { Button } from "@/components/ui/button";
import {
	Card,
	CardContent,
	CardDescription,
	CardFooter,
	CardHeader,
	CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export const Route = createFileRoute("/register/")({
	component: RegisterPage,
	beforeLoad: async () => {
		const session = await getFreshServerSession();

		if (session) {
			// confirm("inside");
			throw redirect({ to: "/" });
		}
	},
});

function RegisterPage() {
	const [isRegisterError, setIsRegisterError] = useState<boolean>(false);
	const [formData, setFormData] = useState<AuthFormData>({
		fullName: "",
		username: "",
		email: "",
		password: "",
	});

	const signUp = async (formData: AuthFormData) => {
		const hasValues = Object.values(formData).every(
			(val) => val !== null && val !== undefined && val !== "",
		);

		if (!hasValues || !formData.fullName)
			return {
				success: false,
				message: "One or more inputs is empty",
				data: {},
			} as IResponse;

		await authClient.signUp.email(
			{
				name: formData.fullName,
				username: formData.username,
				displayUsername: formData.username,
				email: formData.email,
				password: formData.password,
				callbackURL: "/login",
			},
			{
				onSuccess: () => {
					window.location.href = "/login";
				},
				onError: () => {
					setIsRegisterError(true);
				},
			},
		);
		return {
			success: false,
			message: "One or more inputs is empty",
			data: {},
		} as IResponse;
	};

	const handleInput = (event: ChangeEvent<HTMLInputElement>) => {
		const { name, value } = event.target;

		setFormData((prevData) => ({
			...prevData, // Copy previous state
			[name]: value, // Use ES6 computed property name [key]
		}));
	};

	useEffect(() => {
		console.log(formData);
	}, [formData]);

	return (
		<div className="bg-black flex items-center justify-center min-h-[calc(100vh-64px)] w-full">
			<Card className="bg-neutral-900 border border-neutral-700 w-full max-w-md">
				<CardHeader className="space-y-1">
					<CardTitle className="text-white text-2xl font-bold text-center">
						Register
					</CardTitle>
					<CardDescription className="text-center text-neutral-300">
						Enter your email to sign up for an account
					</CardDescription>
				</CardHeader>
				<CardContent className="space-y-4">
					<div className="space-y-2">
						<Label className="text-white" htmlFor="fullName">
							Full Name
						</Label>
						<Input
							className="text-white placeholder:text-neutral-700 border border-neutral-700"
							name="fullName"
							id="fullName"
							type="text"
							placeholder="Charlee Tan"
							onChange={handleInput}
						/>
					</div>
					<div className="space-y-2">
						<Label className="text-white" htmlFor="username">
							Username
						</Label>
						<Input
							className="text-white placeholder:text-neutral-700 border border-neutral-700"
							name="username"
							id="username"
							type="text"
							placeholder="Cakwei"
							onChange={handleInput}
						/>
					</div>
					<div className="space-y-2">
						<Label className="text-white" htmlFor="email">
							Email
						</Label>
						<Input
							className="text-white placeholder:text-neutral-700 border border-neutral-700"
							name="email"
							id="email"
							type="email"
							placeholder="charlee@cakwei.dev"
							onChange={handleInput}
						/>
					</div>
					<div>
						<div className="space-y-2">
							<Label className="text-white" htmlFor="password">
								Password
							</Label>
							<Input
								className="text-white placeholder:text-neutral-700 border border-neutral-700"
								id="password"
								name="password"
								type="password"
								placeholder="• •"
								onChange={handleInput}
							/>
						</div>
						{isRegisterError ? (
							<span className="text-red-500 text-xs">
								Account with this username already exists
							</span>
						) : null}
					</div>

					<Button
						onClick={() => signUp(formData)}
						className="w-full hover:bg-white/90 bg-white text-black font-semibold"
					>
						Sign Up
					</Button>
				</CardContent>
				<CardFooter className="flex flex-wrap justify-center gap-1">
					<p className="text-sm text-neutral-300">Already have an account?</p>
					<Link to="/login" className="text-sm font-medium hover:underline">
						<span className="text-blue-500 hover:underline">Login</span>
					</Link>
				</CardFooter>
			</Card>
		</div>
	);
}
