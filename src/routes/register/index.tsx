// app/routes/login.tsx
import { createFileRoute, Link, redirect } from "@tanstack/react-router";
import { type ChangeEvent, useEffect, useState } from "react";
import { signUp } from "#/lib/auth-client";
import type { AuthFormData } from "#/lib/types";
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
	component: LoginPage,
	beforeLoad: async () => {
		const session = await getFreshServerSession();

		if (session) {
			// confirm("inside");
			throw redirect({ to: "/" });
		}
	},
});

function LoginPage() {
	const [formData, setFormData] = useState<AuthFormData>({
		email: "",
		password: "",
	});

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
		<div className=" flex items-center justify-center min-h-[calc(100vh-64px)] w-full">
			<Card className="w-full max-w-md">
				<CardHeader className="space-y-1">
					<CardTitle className="text-2xl font-bold text-center">
						Register
					</CardTitle>
					<CardDescription className="text-center">
						Enter your email to sign up for an account
					</CardDescription>
				</CardHeader>
				<CardContent className="space-y-4">
					<div className="space-y-2">
						<Label htmlFor="email">Email</Label>
						<Input
							name="email"
							id="email"
							type="email"
							placeholder="m@example.com"
							onChange={handleInput}
						/>
					</div>
					<div className="space-y-2">
						<Label htmlFor="password">Password</Label>
						<Input
							id="password"
							name="password"
							type="password"
							onChange={handleInput}
						/>
					</div>
					<Button onClick={() => signUp(formData)} className="w-full">
						Sign Up
					</Button>
				</CardContent>
				<CardFooter className="flex flex-wrap justify-center gap-1">
					<p className="text-sm text-muted-foreground">
						Already have an account?
					</p>
					<Link to="/login" className="text-sm font-medium hover:underline">
						Register
					</Link>
				</CardFooter>
			</Card>
		</div>
	);
}
