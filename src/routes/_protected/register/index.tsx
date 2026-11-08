import { useForm } from "@tanstack/react-form";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { ArrowRight, AtSign, Lock, Mail, User } from "lucide-react";
import { toast } from "sonner";
import { Button } from "#/components/ui/button";
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "#/components/ui/card";
import { Input } from "#/components/ui/input";
import { Label } from "#/components/ui/label";
import { authClient } from "#/lib/auth-client";
import { logger } from "#/lib/utils";

export const Route = createFileRoute("/_protected/register/")({
	component: RegisterPage,
});

function RegisterPage() {
	const navigate = useNavigate();

	const form = useForm({
		defaultValues: {
			fullName: "",
			username: "",
			email: "",
			password: "",
		},
		onSubmit: async ({ value }) => {
			try {
				await authClient.signUp.email(
					{
						name: value.fullName,
						username: value.username,
						displayUsername: value.username,
						email: value.email,
						password: value.password,
						callbackURL: "/verify-email?success=true",
					},
					{
						onSuccess: () => {
							/*toast.success(
								<div className="flex flex-col gap-1">
									<span className="text-(--link) font-semibold text-xs">
										Account created
									</span>
									<span className="text-white text-xs">
										Successfully registered your account. Please sign in.
									</span>
								</div>,
								{
									position: "top-center",
								},
							);*/

							navigate({
								to: "/verify-email",
								search: {
									email: value.email,
									success: false,
								},
							});
						},
						onError: ({ error }) => {
							logger("error", "", error);
							toast.error(
								<div className="flex flex-col gap-1">
									<span className="font-semibold text-xs text-(--link)">
										Registration failed
									</span>
									<span className="text-xs text-(--text)">
										{error.message ||
											"Account with this username or email already exists."}
									</span>
								</div>,
								{
									position: "top-center",
								},
							);
						},
					},
				);
			} catch (error) {
				logger("error", "Sign up failed:", error);
				toast.error(
					<div className="flex flex-col gap-1">
						<span className="font-semibold text-xs text-(--link)">
							An unexpected error occurred
						</span>
						<span className="text-xs text-(--text)">
							Please check your network connection and try again.
						</span>
					</div>,
					{
						position: "top-center",
					},
				);
			}
		},
	});

	return (
		<div className="w-full flex items-center justify-center py-6 sm:py-12">
			<div className="w-full max-w-md">
				<Card className="bg-(--bg-secondary)/30 border-(--border) rounded-xl shadow-none">
					<CardHeader className="space-y-2 text-center pb-4">
						<div className="mx-auto inline-flex items-center justify-center w-10 h-10 rounded-lg bg-(--bg) border border-(--border) text-(--text)">
							<User className="w-4 h-4" />
						</div>
						<CardTitle className="text-2xl font-bold tracking-tight text-(--text)">
							<h1>Create an account</h1>
						</CardTitle>
						<CardDescription className="text-(--text-secondary) text-xs sm:text-sm">
							Enter your details to sign up for an account.
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
							{/* Full Name Field */}
							<form.Field
								name="fullName"
								validators={{
									onChange: ({ value }) =>
										!value ? "Full Name is required" : undefined,
								}}
							>
								{(field) => (
									<div className="space-y-2">
										<Label
											htmlFor={field.name}
											className="text-xs font-bold uppercase tracking-wider text-(--text-secondary)"
										>
											Full Name
										</Label>
										<div className="relative">
											<User className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-(--text-secondary)" />
											<Input
												id={field.name}
												name={field.name}
												type="text"
												value={field.state.value}
												onBlur={field.handleBlur}
												onChange={(e) => field.handleChange(e.target.value)}
												placeholder="Charlee Tan"
												className="pl-10 text-xs rounded-md border-(--border) bg-(--bg) text-(--text) focus-visible:ring-(--link)/50 placeholder:text-(--text-secondary)/60"
											/>
										</div>
										{field.state.meta.errors ? (
											<p className="text-xs text-(--error) font-medium">
												{field.state.meta.errors.join(", ")}
											</p>
										) : null}
									</div>
								)}
							</form.Field>

							{/* Username Field */}
							<form.Field
								name="username"
								validators={{
									onChange: ({ value }) =>
										!value ? "Username is required" : undefined,
								}}
							>
								{(field) => (
									<div className="space-y-2">
										<Label
											htmlFor={field.name}
											className="text-xs font-bold uppercase tracking-wider text-(--text-secondary)"
										>
											Username
										</Label>
										<div className="relative">
											<AtSign className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-(--text-secondary)" />
											<Input
												id={field.name}
												name={field.name}
												type="text"
												value={field.state.value}
												onBlur={field.handleBlur}
												onChange={(e) => field.handleChange(e.target.value)}
												placeholder="Cakwei"
												className="pl-10 text-xs rounded-md border-(--border) bg-(--bg) text-(--text) focus-visible:ring-(--link)/50 placeholder:text-(--text-secondary)/60"
											/>
										</div>
										{field.state.meta.errors ? (
											<p className="text-xs text-(--error) font-medium">
												{field.state.meta.errors.join(", ")}
											</p>
										) : null}
									</div>
								)}
							</form.Field>

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
												id={field.name}
												name={field.name}
												type="email"
												value={field.state.value}
												onBlur={field.handleBlur}
												onChange={(e) => field.handleChange(e.target.value)}
												placeholder="charlee@cakwei.dev"
												className="pl-10 text-xs rounded-md border-(--border) bg-(--bg) text-(--text) focus-visible:ring-(--link)/50 placeholder:text-(--text-secondary)/60"
											/>
										</div>
										{field.state.meta.errors ? (
											<p className="text-xs text-(--error) font-medium">
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
										<Label
											htmlFor={field.name}
											className="text-xs font-bold uppercase tracking-wider text-(--text-secondary)"
										>
											Password
										</Label>
										<div className="relative">
											<Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-(--text-secondary)" />
											<Input
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
									</div>
								)}
							</form.Field>

							{/* Submit Button */}
							<form.Subscribe
								selector={(state) => [state.canSubmit, state.isSubmitting]}
							>
								{([canSubmit, isSubmitting]) => (
									<Button
										type="submit"
										disabled={!canSubmit}
										className="w-full mt-2 py-2 bg-(--text) hover:opacity-90 text-(--bg) font-medium text-xs rounded-lg transition-all cursor-pointer disabled:opacity-50 flex items-center justify-center gap-2"
									>
										{isSubmitting ? (
											"Creating account..."
										) : (
											<>
												Sign Up
												<ArrowRight className="w-3.5 h-3.5" />
											</>
										)}
									</Button>
								)}
							</form.Subscribe>
						</form>

						{/* Footer Links */}
						<div className="space-y-3 pt-2 text-center text-xs">
							<div className="text-(--text-secondary)">
								Already have an account?{" "}
								<Link
									to="/login"
									className="text-(--text) font-medium hover:underline"
								>
									Login
								</Link>
							</div>

							<div className="pt-2 border-t border-(--border)">
								<Link
									to="/"
									className="inline-flex items-center gap-1.5 text-xs text-(--text-secondary) hover:text-(--text) hover:underline"
								>
									← Back to Homepage
								</Link>
							</div>
						</div>
					</CardContent>
				</Card>
			</div>
		</div>
	);
}
