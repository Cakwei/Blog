import { useForm } from "@tanstack/react-form";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { KeyRound, Mail } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { Button } from "#/components/ui/button";
import { Input } from "#/components/ui/input";
import { Label } from "#/components/ui/label";
import { authClient } from "#/lib/auth-client";
import { logger } from "#/lib/utils";

export const Route = createFileRoute("/reset-password/")({
	component: ResetPasswordPage,
	validateSearch: (search: Record<string, unknown>) => {
		return {
			token: (search.token as string) || undefined,
		};
	},
});

function ResetPasswordPage() {
	const navigate = useNavigate();
	const { token } = Route.useSearch();
	const [password, setPassword] = useState("");
	const [confirmPassword, setConfirmPassword] = useState("");
	const [message, setMessage] = useState<{
		type: "success" | "error";
		text: string;
	} | null>(null);
	const [isPending, setIsPending] = useState(false);
	const [isResending, setIsResending] = useState(false);

	const resendForm = useForm({
		defaultValues: {
			email: "",
		},
		onSubmit: async ({ value }) => {
			setMessage(null);
			setIsResending(true);

			await authClient.requestPasswordReset({
				email: value.email,
				redirectTo: window.location.href,
				fetchOptions: {
					onError: ({ error }) => {
						logger("error", "reset-password.tsx @", error);

						setMessage({
							type: "error",
							text:
								error.message ||
								"Failed to send reset email. Please try again.",
						});
						setIsResending(false);
					},
					onSuccess: () => {
						setMessage({
							type: "success",
							text: "If an account exists with this email, a password reset link has been sent.",
						});
						setIsResending(false);
					},
				},
			});
		},
	});

	const handleSubmit = async (e: React.FormEvent) => {
		e.preventDefault();
		setMessage(null);

		if (!token) {
			setMessage({
				type: "error",
				text: "Missing or invalid password reset token.",
			});
			return;
		}

		if (password !== confirmPassword) {
			setMessage({
				type: "error",
				text: "New confirmation passwords do not match.",
			});
			return;
		}

		setIsPending(true);

		await authClient.resetPassword({
			newPassword: password,
			token,
			fetchOptions: {
				onError: ({ error }) => {
					setMessage({
						type: "error",
						text:
							error.message ||
							"Failed to reset password. The link may have expired.",
					});
					setIsPending(false);
				},
				onSuccess: () => {
					toast.success("Password has been reset successfully.", {
						position: "top-center",
					});
					setMessage({
						type: "success",
						text: "Password has been reset successfully. Redirecting to login page...",
					});
					navigate({ to: "/login" });
				},
			},
		});
	};

	return (
		<div className="min-h-[85vh] text-(--text) bg-(--bg) selection:bg-(--link)/25 selection:text-(--link) relative overflow-hidden flex items-center justify-center">
			{/* Soft Ambient Top Glow */}
			<div className="absolute top-0 left-1/2 -translate-x-1/2 w-full max-w-7xl h-[450px] bg-gradient-to-b from-(--link)/10 via-transparent to-transparent blur-[100px] pointer-events-none -z-10" />

			<div className="max-w-md w-full mx-auto px-4 sm:px-6 space-y-8">
				{/* Minimalist Top Title Bar */}
				<div className="space-y-2 text-center">
					<div className="inline-flex items-center justify-center w-12 h-12 rounded-md bg-(--link)/10 border border-(--link)/30 text-(--link) mb-2">
						<KeyRound className="w-6 h-6" />
					</div>
					<h1 className="text-3xl font-black tracking-tight text-(--text)">
						Reset Password.
					</h1>
					<p className="text-(--text-secondary) text-xs sm:text-sm">
						{token
							? "Enter your new secure password credentials below."
							: "Enter your email address to receive a new password reset link."}
					</p>
				</div>

				{message && (
					<div
						data-testid="statusMsg"
						className={`p-4 rounded-md text-xs sm:text-sm font-semibold backdrop-blur-xl transition-all ${
							message.type === "success"
								? "bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 shadow-lg shadow-emerald-500/5"
								: "bg-(--error)/15 text-(--error) border border-(--error)/30 shadow-lg shadow-(--error)/5"
						}`}
					>
						{message.text}
					</div>
				)}

				{/* Conditional View: Reset Form vs. Request New Link Form */}
				{token ? (
					<form onSubmit={handleSubmit} className="space-y-6">
						<div className="bg-(--bg-secondary)/40 border border-(--border) rounded-md p-6 sm:p-8 backdrop-blur-2xl shadow-xl space-y-4">
							<div className="space-y-2">
								<Label
									htmlFor="new-password"
									className="text-xs font-bold uppercase tracking-wider text-(--text-secondary)"
								>
									New Password
								</Label>
								<Input
									id="new-password"
									type="password"
									value={password}
									onChange={(e) => setPassword(e.target.value)}
									required
									placeholder="••••••••••••"
									className="text-xs rounded-md border-(--border) bg-(--bg) text-(--text) focus-visible:ring-(--link)/50"
								/>
							</div>

							<div className="space-y-2">
								<Label
									htmlFor="confirm-password"
									className="text-xs font-bold uppercase tracking-wider text-(--text-secondary)"
								>
									Confirm Password
								</Label>
								<Input
									id="confirm-password"
									type="password"
									value={confirmPassword}
									onChange={(e) => setConfirmPassword(e.target.value)}
									required
									placeholder="••••••••••••"
									className="text-xs rounded-md border-(--border) bg-(--bg) text-(--text) focus-visible:ring-(--link)/50"
								/>
							</div>
						</div>

						<Button
							type="submit"
							disabled={isPending}
							className="w-full py-2.5 bg-(--link) hover:bg-(--link)/90 text-white font-semibold text-xs rounded-md shadow-lg shadow-(--link)/20 transition-all cursor-pointer disabled:opacity-50"
						>
							{isPending ? "Updating Password..." : "Update Password"}
						</Button>
					</form>
				) : (
					<form
						onSubmit={(e) => {
							e.preventDefault();
							e.stopPropagation();
							resendForm.handleSubmit();
						}}
						className="space-y-6"
					>
						<div className="bg-(--bg-secondary)/40 border border-(--border) rounded-md p-6 sm:p-8 backdrop-blur-2xl shadow-xl space-y-4">
							<resendForm.Field name="email">
								{(field) => (
									<div className="space-y-2">
										<Label
											htmlFor={field.name}
											className="text-xs font-bold uppercase tracking-wider text-(--text-secondary)"
										>
											Email Address
										</Label>
										<div className="relative">
											<Mail className="absolute left-3 top-2.5 w-4 h-4 text-(--text-secondary)" />
											<Input
												id={field.name}
												name={field.name}
												type="email"
												value={field.state.value}
												onBlur={field.handleBlur}
												onChange={(e) => field.handleChange(e.target.value)}
												required
												placeholder="name@example.com"
												className="text-xs pl-9 rounded-md border-(--border) bg-(--bg) text-(--text) focus-visible:ring-(--link)/50"
											/>
										</div>
									</div>
								)}
							</resendForm.Field>
						</div>

						<Button
							type="submit"
							disabled={isResending}
							className="w-full py-2.5 bg-(--link) hover:bg-(--link)/90 text-white font-semibold text-xs rounded-md shadow-lg shadow-(--link)/20 transition-all cursor-pointer disabled:opacity-50"
						>
							{isResending ? "Sending Link..." : "Request New Reset Link"}
						</Button>
					</form>
				)}
			</div>
		</div>
	);
}
