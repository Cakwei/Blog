import { createFileRoute, Link } from "@tanstack/react-router";
import { Mail, ShieldCheck } from "lucide-react";
import { Button } from "#/components/ui/button";
import { Label } from "#/components/ui/label";

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
		<div className="min-h-screen text-(--text) bg-(--bg) flex items-center justify-center px-4">
			<div className="max-w-md w-full mx-auto text-center space-y-8 bg-(--bg-secondary)/30 p-8 rounded-2xl border border-(--border)">
				<div
					className={`w-16 h-16 mx-auto rounded-full flex items-center justify-center border ${
						success
							? "bg-emerald-500/10 text-emerald-500 border-emerald-500/25"
							: "bg-(--link)/10 text-(--link) border-(--link)/20"
					}`}
				>
					{success ? (
						<ShieldCheck className="w-8 h-8" />
					) : (
						<Mail className="w-8 h-8" />
					)}
				</div>

				<div className="space-y-3">
					{/* <div
						className={`flex items-center justify-center gap-1.5 text-xs font-semibold tracking-widest uppercase ${
							success ? "text-emerald-500" : "text-(--link)"
						}`}
					>
						<CheckCircle2 className="w-4 h-4" />{" "}
						{success ? "Email Verified" : "Account Created"}
					</div>
					*/}
					<h1 className="text-3xl font-black tracking-tight text-(--text)">
						{success ? "You're all set!" : "Check your inbox."}
					</h1>
					<p className="text-(--text-secondary) text-sm leading-relaxed">
						{success ? (
							"Your email address has been successfully verified. You can now access all features of your Cakwei account."
						) : (
							<>
								We've sent a verification link to{" "}
								{email ? (
									<strong className="text-(--text)">{email}</strong>
								) : (
									"your email address"
								)}
								. Please open the message and click the link to activate your
								account.
							</>
						)}
					</p>
				</div>

				<div className="pt-4 border-t border-(--border) flex flex-col gap-3">
					<Button
						asChild
						variant="outline"
						className="w-full border-(--border) bg-(--bg-secondary)/50 hover:bg-(--link)/10 hover:text-(--link)"
					>
						<Link
							to={success ? "/" : "/"}
							className="flex items-center justify-center gap-2 text-xs font-bold tracking-wider"
						>
							<Label className="text-(--text) text-xs">
								{success ? "← Go to login" : "← Back to Home"}
							</Label>
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
