// app/routes/login.tsx
import { createFileRoute, Link, redirect } from "@tanstack/react-router";
import { type ChangeEvent, useRef, useState } from "react";
import { authClient } from "#/lib/auth-client";
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

export const Route = createFileRoute("/login/")({
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
	const [isLoginError, setIsLoginError] = useState<boolean>(false);

	const [formData, setFormData] = useState<AuthFormData>({
		email: "",
		password: "",
	});
	const passwordRef = useRef<HTMLInputElement | null>(null);

	const handleInput = (event: ChangeEvent<HTMLInputElement>) => {
		const { name, value } = event.target;
		setFormData((prevData) => ({
			...prevData, // Copy previous state
			[name]: value,
		}));
	};

	const signIn = async (formData: { email: string; password: string }) => {
		await authClient.signIn.email({
			email: formData.email,
			password: formData.password,
			callbackURL: "/",
			fetchOptions: {
				onError: (ctx) => {
					switch (ctx.error.code) {
						case "INVALID_EMAIL_OR_PASSWORD":
							setIsLoginError(true);

							if (passwordRef.current) {
								passwordRef.current.value = "";
							}
					}
				},
			},
		});
	};
	/*
	useEffect(() => {
		console.log(formData);
	}, [formData]);
*/
	return (
		<div className="flex items-center justify-center min-h-[calc(100vh-64px)]">
			<Card className="w-full max-w-md">
				<CardHeader className="space-y-1">
					<CardTitle className="text-2xl font-bold text-center">
						Login
					</CardTitle>
					<CardDescription className="text-center">
						Enter your email to sign in to your account
					</CardDescription>
				</CardHeader>
				<CardContent className="space-y-4">
					<div className="space-y-2">
						<Label htmlFor="email">Email</Label>
						<Input
							autoComplete="email"
							onChange={handleInput}
							name="email"
							id="email"
							type="email"
							placeholder="m@example.com"
						/>
					</div>
					<div>
						<div className="space-y-2">
							<Label htmlFor="password">Password</Label>
							<Input
								ref={passwordRef}
								autoComplete="current-password"
								onChange={handleInput}
								name="password"
								id="password"
								type="password"
							/>
						</div>
						{isLoginError ? (
							<span className="text-red-500 text-xs">
								Invalid username or password
							</span>
						) : null}
					</div>
					<Button
						onClick={() => {
							signIn(formData);
						}}
						className="w-full"
					>
						Sign In
					</Button>
				</CardContent>
				<CardFooter className="flex flex-wrap justify-center gap-1">
					<p className="text-sm text-muted-foreground">
						Don't have an account?
					</p>
					<Link to="/register" className="text-sm font-medium hover:underline">
						Register
					</Link>
				</CardFooter>
			</Card>
		</div>
	);
}
