import { useForm } from "@tanstack/react-form";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { ArrowLeft, ArrowRight, Lock, Mail } from "lucide-react";
import { toast } from "sonner";
import { Button } from "#/components/ui/button";
import {
	Card,
	CardContent,
	CardDescription,
	CardFooter,
	CardHeader,
	CardTitle,
} from "#/components/ui/card";
import { Input } from "#/components/ui/input";
import { Label } from "#/components/ui/label";
import { authClient } from "#/lib/auth-client";
import { logger } from "#/lib/utils";

export const Route = createFileRoute("/_protected/login/")({
	component: LoginPage,
});

function LoginPage() {
	const navigate = useNavigate();

	const form = useForm({
		defaultValues: {
			email: "",
			password: "",
		},
		onSubmit: async ({ value }) => {
			try {
				await authClient.signIn.email(
					{
						email: value.email,
						password: value.password,
					},
					{
						onSuccess: () => {
							toast.success(
								<div className="flex flex-col gap-1">
									<span className="text-(--link) font-semibold text-xs">
										Welcome back!
									</span>
									<span className="text-white text-sm">
										Successfully signed in to your account.
									</span>
								</div>,
								{
									position: "top-center",
								},
							);
							navigate({ to: "/" });
						},
						onError: async ({ error }) => {
							if (error.status === 403) {
								navigate({
									to: "/verify-email",
									search: { email: value.email, success: false },
								});
							}
							logger("error", "", error);
						},
					},
				);
			} catch (error) {
				logger("error", "Login failed:", error);
				toast.error("An unexpected error occurred", {
					description: "Please check your network connection and try again.",
					position: "top-center",
				});
			}
		},
	});

	return (
		<div className="min-h-[calc(100vh-10rem)] flex items-center justify-center px-4 py-12 bg-(--bg) relative overflow-hidden">
			<div className="w-full max-w-md relative z-10">
				<Card className="bg-(--bg-secondary)/40 border-border rounded-xl backdrop-blur-2xl shadow-xl">
					<CardHeader className="space-y-3 text-center pb-4">
						<div className="mx-auto inline-flex items-center justify-center w-12 h-12 rounded-xl bg-(--link)/10 border border-(--link)/30 text-(--link)">
							<Lock className="w-5 h-5" />
						</div>
						<CardTitle className="text-3xl font-black tracking-tight text-(--text)">
							<h1>Welcome back</h1>
						</CardTitle>
						<CardDescription className="text-(--text-secondary) text-xs sm:text-sm">
							Please enter your details to sign in.
						</CardDescription>
					</CardHeader>

					<CardContent className="space-y-6 pt-2">
						<form
							onSubmit={(e) => {
								e.preventDefault();
								e.stopPropagation();
								form.handleSubmit();
							}}
							className="space-y-4"
						>
							{/* Email Field */}
							<form.Field
								name="email"
								validators={{
									onChange: ({ value }) =>
										!value ? "Email is required" : undefined,
								}}
							>
								{(field) => (
									<div className="space-y-2">
										<Label
											htmlFor={field.name}
											className="text-xs font-bold uppercase tracking-wider text-(--text-secondary)"
										>
											Email
										</Label>
										<div className="relative">
											<Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-(--text-secondary)" />
											<Input
												data-testid="emailInput"
												id={field.name}
												name={field.name}
												type="email"
												value={field.state.value}
												onBlur={field.handleBlur}
												onChange={(e) => field.handleChange(e.target.value)}
												placeholder="name@example.com"
												className="pl-10 text-xs rounded-md border-(--border) bg-(--bg) text-(--text) focus-visible:ring-(--link)/50 placeholder:text-(--text-secondary)/60"
											/>
										</div>
										{field.state.meta.errors ? (
											<p className="text-xs text-(--error)">
												{field.state.meta.errors.join(", ")}
											</p>
										) : null}
									</div>
								)}
							</form.Field>

							{/* Password Field */}
							<form.Field
								name="password"
								validators={{
									onChange: ({ value }) =>
										!value ? "Password is required" : undefined,
								}}
							>
								{(field) => (
									<div className="space-y-2">
										<div className="flex items-center justify-between">
											<Label
												htmlFor={field.name}
												className="text-xs font-bold uppercase tracking-wider text-(--text-secondary)"
											>
												Password
											</Label>
										</div>

										<div className="relative">
											<Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-(--text-secondary)" />
											<Input
												data-testid="passwordInput"
												id={field.name}
												name={field.name}
												type="password"
												value={field.state.value}
												onBlur={field.handleBlur}
												onChange={(e) => field.handleChange(e.target.value)}
												placeholder="••••••••"
												className="pl-10 text-xs rounded-md border-(--border) bg-(--bg) text-(--text) focus-visible:ring-(--link)/50 placeholder:text-(--text-secondary)/60"
											/>
										</div>
										{field.state.meta.errors ? (
											<p className="text-xs text-(--error) font-medium">
												{field.state.meta.errors.join(", ")}
											</p>
										) : null}
										<Link
											to="/reset-password"
											search={{ token: "" }}
											className="text-xs font-medium text-(--link)"
										>
											<Label className="text-(--link) text-xs hover:underline">
												Forgot password?
											</Label>
										</Link>
									</div>
								)}
							</form.Field>

							{/* Submit Button */}
							<form.Subscribe
								selector={(state) => [state.canSubmit, state.isSubmitting]}
							>
								{([canSubmit, isSubmitting]) => (
									<Button
										data-testid="submitLoginBtn"
										type="submit"
										disabled={!canSubmit}
										className="w-full mt-2 py-2.5 bg-(--link) hover:bg-(--link)/90 text-white font-semibold text-xs rounded-md shadow-lg shadow-(--link)/20 transition-all cursor-pointer disabled:opacity-50 flex items-center justify-center gap-2"
									>
										{isSubmitting ? (
											"Signing in..."
										) : (
											<>
												Sign in
												<ArrowRight className="w-4 h-4" />
											</>
										)}
									</Button>
								)}
							</form.Subscribe>
						</form>

						{/* Footer Links */}
						<div className="space-y-3 pt-2 text-center">
							<div className="text-xs text-(--text-secondary)">
								Don't have an account?{" "}
								<Link
									to="/register"
									className="text-(--link) font-semibold hover:underline"
								>
									<Label className="inline text-(--link) font-semibold hover:underline text-xs">
										Create account
									</Label>
								</Link>
							</div>

							<div className="pt-2 border-t border-(--border)">
								<Link to="/" className="inline-flex items-center gap-1.5">
									<Label className="text-xs text-(--link) font-semibold hover:underline">
										← Back to Homepage
									</Label>
								</Link>
							</div>
						</div>
					</CardContent>
				</Card>
			</div>
		</div>
	);
}
