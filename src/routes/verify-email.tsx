import { createFileRoute, Link } from "@tanstack/react-router";
import { Mail, ShieldCheck } from "lucide-react";
import { Button } from "#/components/ui/button";

export const Route = createFileRoute("/verify-email")({
	validateSearch: (search: Record<string, unknown>) => {
		return {
			email: (search.email as string) || "",
			success: String(search.success as string) === "true",
		};
	},
	component: VerifyEmailePage,
});

function VerifyEmailePage() {
	const { email, success } = Route.useSearch();

	return (
		<div className="w-full flex items-center justify-center py-6 sm:py-12">
			<div className="max-w-md w-full mx-auto text-center space-y-6 bg-(--bg-secondary)/30 p-8 rounded-xl border border-(--border)">
				<div
					className={`w-12 h-12 mx-auto rounded-xl flex items-center justify-center border ${
						success
							? "bg-emerald-500/10 text-emerald-500 border-emerald-500/25"
							: "bg-(--bg) text-(--text) border-(--border)"
					}`}
				>
					{success ? (
						<ShieldCheck className="w-6 h-6" />
					) : (
						<Mail className="w-6 h-6" />
					)}
				</div>

				<div className="space-y-2">
					<h1 className="text-2xl font-bold tracking-tight text-(--text)">
						{success ? "You're all set!" : "Check your inbox."}
					</h1>
					<p className="text-(--text-secondary) text-xs sm:text-sm leading-relaxed">
						{success ? (
							"Your email address has been successfully verified. You can now access all features of your account."
						) : (
							<>
								We've sent a verification link to{" "}
								{email ? (
									<strong className="text-(--text)">{email}</strong>
								) : (
									"your email address"
								)}
								. Please open the message and click the link to activate your account.
							</>
						)}
					</p>
				</div>

				<div className="pt-4 border-t border-(--border) flex flex-col gap-3">
					<Button
						asChild
						variant="outline"
						className="w-full border-(--border) bg-(--bg) hover:bg-(--bg-secondary) text-(--text) rounded-lg text-xs"
					>
						<Link
							to={success ? "/login" : "/"}
							className="flex items-center justify-center gap-2 text-xs font-medium"
						>
							<span>{success ? "← Go to login" : "← Back to Home"}</span>
						</Link>
					</Button>
				</div>

				{!success && (
					<p className="text-xs text-(--text-secondary)">
						Didn't receive the email? Check your spam folder or try signing up
						again.
					</p>
				)}
			</div>
		</div>
	);
}
