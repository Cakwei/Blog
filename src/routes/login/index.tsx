import { useForm } from "@tanstack/react-form";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { ArrowRight, Lock, Mail } from "lucide-react";
import { toast } from "sonner";
import { Button } from "#/components/ui/button";
import { Input } from "#/components/ui/input";
import { Label } from "#/components/ui/label";
import { authClient } from "#/lib/auth-client";
import { logger } from "#/lib/utils";

export const Route = createFileRoute("/login/")({
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
				// logger("debug", value.email, value.password);
				await authClient.signIn.email(
					{
						email: value.email,
						password: value.password,
						// callbackURL: "/verify-email?success=true",
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
							/*	toast.error(
								<div className="flex flex-col gap-1">
									<span className="text-(--text) font-semibold text-xs">
										Sign in failed
									</span>
									<span className="text-(--text-secondary) text-xs">
										{error.message ||
											"Invalid email or password. Please try again."}
									</span>
								</div>,
								{
									position: "top-center",
								},
							);
						*/
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
			{/* Subtle background ambient lighting / glow effect */}
			<div className="absolute w-[500px] h-[500px] bg-(--link)/10 rounded-full blur-3xl pointer-events-none -top-32 -left-32" />
			<div className="absolute w-[400px] h-[400px] bg-indigo-500/5 rounded-full blur-3xl pointer-events-none -bottom-32 -right-32" />

			<div className="w-full max-w-md relative z-10">
				{/* Clean Floating Card */}
				<div className="bg-(--bg-secondary)/80 backdrop-blur-xl p-8 sm:p-10 rounded-3xl border border-(--border)/60 shadow-2xl shadow-black/40 space-y-8">
					{/* Centered Header */}
					<div className="space-y-3 text-center flex flex-col items-center">
						<div className="inline-flex items-center justify-center w-12 h-12 rounded-2xl bg-(--link)/10 border border-(--link)/20 text-(--link)">
							<Lock className="w-5 h-5" />
						</div>
						<div className="space-y-1">
							<h1 className="text-2xl font-bold tracking-tight text-(--text)">
								Welcome back
							</h1>
							<p className="text-sm text-(--text-secondary)">
								Please enter your details to sign in.
							</p>
						</div>
					</div>

					{/* TanStack Form */}
					<form
						onSubmit={(e) => {
							e.preventDefault();
							e.stopPropagation();
							form.handleSubmit();
						}}
						className="space-y-3"
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
										className="text-xs font-semibold uppercase tracking-wider text-(--text-secondary)"
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
											className="pl-10 bg-(--bg) border-(--border) placeholder:text-xs text-(--text) placeholder:text-(--text-secondary)/60 focus-visible:ring-(--link) rounded-md text-xs"
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
											className="text-xs font-semibold uppercase tracking-wider text-(--text-secondary)"
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
											className="pl-10 bg-(--bg) placeholder:text-xs text-xs border-(--border) text-(--text) placeholder:text-(--text-secondary)/60 focus-visible:ring-(--link) rounded-md"
										/>
									</div>
									{field.state.meta.errors ? (
										<p className="text-xs text-(--error) font-medium">
											{field.state.meta.errors.join(", ")}
										</p>
									) : null}
									<Link
										to="/"
										className="text-xs font-medium text-(--link) hover:underline"
									>
										<span className="text-(--link) text-xs hover:underline">
											Forgot password?
										</span>
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
									className="w-full bg-(--link) hover:bg-(--link) font-semibold text-white hover:opacity-90 transition-all duration-200 rounded-md flex items-center justify-center gap-2 group shadow-lg shadow-(--link)/25 text-xs"
								>
									{isSubmitting ? (
										"Signing in..."
									) : (
										<>
											Sign in
											<ArrowRight className="w-4 h-4 transition-transform" />
										</>
									)}
								</Button>
							)}
						</form.Subscribe>
					</form>

					{/* Footer Register Link */}
					<div className="text-center text-xs text-(--text-secondary) pt-4 border-t border-(--border)/60">
						Don't have an account?{" "}
						<Link
							to="/register"
							className="text-(--link) font-semibold hover:underline"
						>
							<span className="text-(--link) hover:text-(--link) hover:underline">
								Create account
							</span>
						</Link>
					</div>
				</div>
			</div>
		</div>
	);
}
