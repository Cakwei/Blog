import { useForm } from "@tanstack/react-form";
import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowRight, AtSign, Lock, Mail, User } from "lucide-react";
import { toast } from "sonner";
import { authClient } from "#/lib/auth-client";
import { logger } from "#/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export const Route = createFileRoute("/register/")({
	component: RegisterPage,
});

function RegisterPage() {
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
						callbackURL: "/login",
					},
					{
						onSuccess: () => {
							toast.success(
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
								);
							window.location.href = "/login";
						},
						onError: ({ error }) => {
							logger("error", "", error);
							toast.error(
								<div className="flex flex-col gap-1">
									<span className="text-(--link) font-semibold text-xs">
										Registration failed
									</span>
									<span className="text-white text-xs">
										{error.message ||
											"Account with this username or email already exists."}
									</span>
								</div>,{
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
						<span className="text-(--link) font-semibold">
							An unexpected error occurred
						</span>
						<span className="text-white text-sm">
							Please check your network connection and try again.
						</span>
					</div>,{
									position: "top-center",
								},
				);
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
								Create an account
							</h1>
							<p className="text-sm text-(--text-secondary)">
								Enter your details to sign up for an account.
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
										className="text-xs font-semibold uppercase tracking-wider text-(--text-secondary)"
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
											className="pl-10 bg-(--bg) border-(--border) text-(--text) placeholder:text-(--text-secondary)/60 focus-visible:ring-(--link) h-11 rounded-md text-sm"
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
										className="text-xs font-semibold uppercase tracking-wider text-(--text-secondary)"
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
											className="pl-10 bg-(--bg) border-(--border) text-(--text) placeholder:text-(--text-secondary)/60 focus-visible:ring-(--link) h-11 rounded-md text-sm"
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
										className="text-xs font-semibold uppercase tracking-wider text-(--text-secondary)"
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
											className="pl-10 bg-(--bg) border-(--border) text-(--text) placeholder:text-(--text-secondary)/60 focus-visible:ring-(--link) h-11 rounded-md text-sm"
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
										className="text-xs font-semibold uppercase tracking-wider text-(--text-secondary)"
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
											className="pl-10 bg-(--bg) text-sm border-(--border) text-(--text) placeholder:text-(--text-secondary)/60 focus-visible:ring-(--link) h-11 rounded-md"
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
									className="w-full bg-(--link) hover:bg-(--link) transition-color font-semibold text-white hover:opacity-95 transition-all duration-200 h-11 rounded-md flex items-center justify-center gap-2 group shadow-lg shadow-(--link)/25"
								>
									{isSubmitting ? (
										"Creating account..."
									) : (
										<>
											Sign Up
											<ArrowRight className="w-4 h-4 transition-transform" />
										</>
									)}
								</Button>
							)}
						</form.Subscribe>
					</form>

					{/* Footer Login Link */}
					<div className="text-center text-sm text-(--text-secondary) pt-4 border-t border-(--border)/60">
						Already have an account?{" "}
						<Link
							to="/login"
							className="text-(--link) font-semibold hover:underline"
						>
							<span className="text-(--link) hover:underline">Login</span>
						</Link>
					</div>
				</div>
			</div>
		</div>
	);
}
