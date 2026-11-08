import { useForm } from "@tanstack/react-form";
import {
	queryOptions,
	useMutation,
	useQueryClient,
	useSuspenseQuery,
} from "@tanstack/react-query";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { createServerFn } from "@tanstack/react-start";
import { KeyRound, User as UserIcon } from "lucide-react";
import { useState } from "react";
import { Button } from "#/components/ui/button";
import { Input } from "#/components/ui/input";
import { Label } from "#/components/ui/label";
import { prisma } from "#/db";
import { authClient } from "#/lib/auth-client";
import { getSessionFn } from "#/lib/utils";

const getUserProfile = createServerFn().handler(async () => {
	const session = await getSessionFn();
	if (!session?.user?.id) throw new Error("Unauthorized");

	const user = await prisma.user.findUnique({
		where: { id: session.user.id },
		select: {
			id: true,
			name: true,
			email: true,
			image: true,
		},
	});
	return user;
});

const updateProfileServerFn = createServerFn()
	.validator((data: { name: string; email: string }) => data)
	.handler(async ({ data }) => {
		const session = await getSessionFn();
		if (!session?.user?.id) throw new Error("Unauthorized");

		const updatedUser = await prisma.user.update({
			where: { id: session.user.id },
			data: {
				name: data.name,
				email: data.email,
			},
		});

		return { success: true, user: updatedUser };
	});

const profileQueryOptions = () =>
	queryOptions({
		queryKey: ["profile"],
		queryFn: () => getUserProfile(),
		staleTime: 15000,
		gcTime: 15000,
		refetchInterval: 15000,
	});

export const Route = createFileRoute("/_protected/profile/")({
	loader: async ({ context }) => {
		await context.queryClient.ensureQueryData(profileQueryOptions());
	},
	component: ProfilePage,
});

function ProfilePage() {
	const navigate = useNavigate();
	const queryClient = useQueryClient();
	const { data: user } = useSuspenseQuery(profileQueryOptions());

	const [isResettingPassword, setIsResettingPassword] = useState(false);
	const [message, setMessage] = useState<{
		type: "success" | "error";
		text: string;
	} | null>(null);

	const { mutate, isPending } = useMutation({
		mutationFn: (variables: { name: string; email: string }) =>
			updateProfileServerFn({ data: variables }),
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: ["profile"] });
			setMessage({
				type: "success",
				text: "Your profile details have been updated successfully.",
			});
		},
		onError: () => {
			setMessage({
				type: "error",
				text: "Failed to update profile configurations.",
			});
		},
	});

	const form = useForm({
		defaultValues: {
			name: user?.name || "",
			email: user?.email || "",
		},
		onSubmit: async ({ value }) => {
			setMessage(null);
			mutate({
				name: value.name,
				email: value.email,
			});
		},
	});

	const handlePasswordReset = async () => {
		if (!user?.email) return;
		setMessage(null);
		setIsResettingPassword(true);

		await authClient.requestPasswordReset({
			email: user.email,
			redirectTo: "/reset-password", // Change to match your actual password reset page route
			fetchOptions: {
				onError: ({ error }) => {
					setMessage({
						type: "error",
						text: error.message || "Failed to request password reset.",
					});
					setIsResettingPassword(false);
				},
				onSuccess: () => {
					setMessage({
						type: "success",
						text: "Password reset instructions have been sent to your email address.",
					});
					setIsResettingPassword(false);
				},
			},
		});
	};

	return (
		<div className="w-full max-w-3xl mx-auto space-y-8">
			{/* Minimalist Top Back & Title Bar */}
			<div className="space-y-4">
				<button
					type="button"
					onClick={() => navigate({ to: "/" })}
					className="inline-flex items-center gap-1.5 text-xs text-(--text-secondary) hover:text-(--text) transition-colors cursor-pointer"
				>
					← Return Home
				</button>

				<div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6 border-b border-(--border) pb-6">
					<div>
						<h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-(--text)">
							Account Settings
						</h1>
						<p className="text-(--text-secondary) text-xs sm:text-sm mt-1">
							Manage your profile credentials and security.
						</p>
					</div>

					{/* Mini Identity Chip */}
					<div className="flex items-center gap-3 bg-(--bg-secondary)/40 border border-(--border) p-2 rounded-xl">
						{user?.image ? (
							<img
								src={user.image}
								alt={user.name || "Avatar"}
								className="w-9 h-9 rounded-lg object-cover border border-(--border)"
							/>
						) : (
							<div className="w-9 h-9 rounded-lg bg-(--bg) border border-(--border) flex items-center justify-center text-(--text) font-semibold text-xs">
								{user?.name?.charAt(0).toUpperCase() || "U"}
							</div>
						)}
						<div className="pr-2">
							<p className="text-xs font-medium text-(--text) truncate max-w-[140px]">
								{user?.name}
							</p>
							<p className="text-[11px] text-(--text-secondary) truncate max-w-[140px]">
								{user?.email}
							</p>
						</div>
					</div>
				</div>
			</div>

			{/* Settings Form Wrapper */}
			<form
				onSubmit={(e) => {
					e.preventDefault();
					e.stopPropagation();
					form.handleSubmit();
				}}
				className="space-y-6"
			>
				{message && (
					<div
						data-testid="statusMsg"
						className={`p-3.5 rounded-lg text-xs font-medium transition-all ${
							message.type === "success"
								? "bg-emerald-500/10 text-emerald-500 border border-emerald-500/20"
								: "bg-(--error)/10 text-(--error) border border-(--error)/20"
						}`}
					>
						{message.text}
					</div>
				)}

				{/* Section 1: General Credentials */}
				<div className="bg-(--bg-secondary)/30 border border-(--border) rounded-xl p-5 sm:p-6 space-y-4">
					<div className="flex items-center gap-2 pb-3 border-b border-(--border)">
						<UserIcon className="w-4 h-4 text-(--text-muted)" />
						<h2 className="text-xs font-semibold uppercase tracking-wider text-(--text-muted)">
							Personal Credentials
						</h2>
					</div>

					<div className="grid sm:grid-cols-2 gap-4">
						<form.Field name="name">
							{(field) => (
								<div className="space-y-1.5">
									<Label
										htmlFor="name"
										className="text-xs font-medium text-(--text-secondary)"
									>
										Display Name
									</Label>
									<Input
										id="name"
										type="text"
										value={field.state.value}
										onChange={(e) => field.handleChange(e.target.value)}
										required
										className="text-xs rounded-lg border-(--border) bg-(--bg) text-(--text) focus-visible:ring-(--link)/50"
									/>
								</div>
							)}
						</form.Field>

						<form.Field name="email">
							{(field) => (
								<div className="space-y-1.5">
									<Label
										htmlFor="email"
										className="text-xs font-medium text-(--text-secondary)"
									>
										Email Address
									</Label>
									<Input
										id="email"
										type="email"
										value={field.state.value}
										onChange={(e) => field.handleChange(e.target.value)}
										required
										className="text-xs rounded-lg border-(--border) bg-(--bg) text-(--text) focus-visible:ring-(--link)/50"
									/>
								</div>
							)}
						</form.Field>
					</div>
				</div>

				{/* Section 2: Security & Password Reset */}
				<div className="bg-(--bg-secondary)/30 border border-(--border) rounded-xl p-5 sm:p-6 space-y-4">
					<div className="flex items-center gap-2 pb-3 border-b border-(--border)">
						<KeyRound className="w-4 h-4 text-(--text-muted)" />
						<h2 className="text-xs font-semibold uppercase tracking-wider text-(--text-muted)">
							Password & Authentication
						</h2>
					</div>

					<div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
						<p className="text-xs text-(--text-secondary) max-w-md">
							Need to update your password? Request a secure password reset link to be sent to your registered email address.
						</p>
						<Button
							type="button"
							variant="outline"
							disabled={isResettingPassword}
							onClick={handlePasswordReset}
							className="text-xs font-medium hover:text-(--text) border-(--border) bg-(--bg) hover:bg-(--bg-secondary) text-(--text) cursor-pointer shrink-0 rounded-lg"
						>
							{isResettingPassword ? "Sending Link..." : "Reset Password via Email"}
						</Button>
					</div>
				</div>

				{/* Submit Action Bar */}
				<div className="flex items-center justify-end pt-2">
					<Button
						data-testid="saveProfileBtn"
						type="submit"
						disabled={isPending}
						className="px-5 bg-(--text) hover:opacity-90 text-(--bg) font-medium text-xs rounded-lg transition-all cursor-pointer"
					>
						{isPending ? "Saving..." : "Save Changes"}
					</Button>
				</div>
			</form>
		</div>
	);
}
