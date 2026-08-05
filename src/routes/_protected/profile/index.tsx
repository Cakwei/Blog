import { useForm } from "@tanstack/react-form";
import {
	queryOptions,
	useMutation,
	useQueryClient,
	useSuspenseQuery,
} from "@tanstack/react-query";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { createServerFn } from "@tanstack/react-start";
import { useState } from "react";
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
import { prisma } from "#/db";
import { authClient } from "#/lib/auth-client";
import { getSessionFn } from "#/lib/utils";

//  Server Functions with secure session context validation
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

	const [currentPassword, setCurrentPassword] = useState("");
	const [newPassword, setNewPassword] = useState("");
	const [confirmPassword, setConfirmPassword] = useState("");
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
				text: "Profile settings saved successfully.",
			});
		},
		onError: () => {
			setMessage({ type: "error", text: "An error occurred during updating." });
		},
	});

	const form = useForm({
		defaultValues: {
			name: user?.name || "",
			email: user?.email || "",
		},
		onSubmit: async ({ value }) => {
			setMessage(null);

			if (newPassword) {
				if (newPassword !== confirmPassword) {
					setMessage({ type: "error", text: "New passwords do not match." });
					return;
				}

				await authClient.changePassword({
					newPassword,
					currentPassword,
					revokeOtherSessions: true,
					fetchOptions: {
						onError: ({ error }) => {
							setMessage({
								type: "error",
								text: error.message || "Failed to update password.",
							});
						},
						onSuccess: () => {
							authClient.revokeSessions();
							navigate({ to: "/", reloadDocument: true });
						},
					},
				});
			}

			mutate({
				name: value.name,
				email: value.email,
			});
		},
	});

	return (
		<div className="bg-(--bg) min-h-screen text-(--text)">
			<div className="max-w-6xl mx-auto px-4 py-12">
				<div className="mb-12">
					<span className="text-(--link) font-bold uppercase tracking-wider text-xs">
						Account Settings
					</span>
					<h1 className="text-4xl text-(--text) font-extrabold mt-2">
						Personal Profile
					</h1>
					<p className="text-(--text-secondary) text-lg mt-2">
						Manage your account credentials and security details.
					</p>
				</div>

				<div className="grid md:grid-cols-3 gap-8 items-start">
					<Card className="border-(--border) shadow-xl rounded-2xl bg-(--bg-secondary)">
						<CardHeader className="text-center pb-2">
							{user?.image ? (
								<img
									src={user.image}
									alt={user.name}
									className="w-20 h-20 rounded-full mx-auto mb-4 object-cover border border-(--border)"
								/>
							) : (
								<div className="w-20 h-20 bg-(--link)/10 text-(--link) font-bold text-2xl flex items-center justify-center rounded-full mx-auto mb-4 border border-(--border)">
									{user?.name?.charAt(0).toUpperCase() || "U"}
								</div>
							)}
							<CardTitle className="text-xl text-(--text) font-bold">
								{user?.name || "User Profile"}
							</CardTitle>
							<CardDescription className="text-(--text-secondary)">
								{user?.email}
							</CardDescription>
						</CardHeader>
					</Card>

					<div className="md:col-span-2">
						<form
							onSubmit={(e) => {
								e.preventDefault();
								e.stopPropagation();
								form.handleSubmit();
							}}
							className="space-y-8"
						>
							{message && (
								<div
									className={`p-4 rounded-xl text-sm font-medium ${
										message.type === "success"
											? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
											: "bg-(--error)/10 text-(--error) border border-(--error)/20"
									}`}
								>
									{message.text}
								</div>
							)}

							<Card className="border-(--border) bg-(--bg-secondary) shadow-xl rounded-2xl">
								<CardHeader>
									<CardTitle className="text-xl text-(--text) font-bold">
										Personal Information
									</CardTitle>
									<CardDescription className="text-(--text-secondary)">
										Update your active account names and identifiers.
									</CardDescription>
								</CardHeader>
								<CardContent className="space-y-4">
									<form.Field name="name">
										{(field) => (
											<div className="space-y-2">
												<Label
													htmlFor="name"
													className="text-sm font-semibold text-(--text)"
												>
													Full Name
												</Label>
												<Input
													id="name"
													type="text"
													value={field.state.value}
													onChange={(e) => field.handleChange(e.target.value)}
													required
													className="text-sm rounded-md border-(--border) bg-(--bg) text-(--text) focus:border-(--link) focus:ring-(--link)"
												/>
											</div>
										)}
									</form.Field>

									<form.Field name="email">
										{(field) => (
											<div className="space-y-2">
												<Label
													htmlFor="email"
													className="text-sm font-semibold text-(--text)"
												>
													Email Address
												</Label>
												<Input
													id="email"
													type="email"
													value={field.state.value}
													onChange={(e) => field.handleChange(e.target.value)}
													required
													className="text-sm rounded-md border-(--border) bg-(--bg) text-(--text) focus:border-(--link) focus:ring-(--link)"
												/>
											</div>
										)}
									</form.Field>
								</CardContent>
							</Card>

							<Card className="border-(--border) bg-(--bg-secondary) shadow-xl rounded-2xl">
								<CardHeader>
									<CardTitle className="text-xl text-(--text) font-bold">
										Security & Password
									</CardTitle>
									<CardDescription className="text-(--text-secondary)">
										Leave blank if you wish to preserve your existing security
										configurations.
									</CardDescription>
								</CardHeader>
								<CardContent className="space-y-4">
									<div className="space-y-2">
										<Label
											htmlFor="current-password"
											className="text-sm font-semibold text-(--text)"
										>
											Current Password
										</Label>
										<Input
											id="current-password"
											type="password"
											value={currentPassword}
											onChange={(e) => setCurrentPassword(e.target.value)}
											required={!!newPassword}
											className="text-sm rounded-md border-(--border) bg-(--bg) text-(--text) focus:border-(--link) focus:ring-(--link)"
										/>
									</div>
									<div className="grid sm:grid-cols-2 gap-4">
										<div className="space-y-2">
											<Label
												htmlFor="new-password"
												className="text-sm font-semibold text-(--text)"
											>
												New Password
											</Label>
											<Input
												id="new-password"
												type="password"
												value={newPassword}
												onChange={(e) => setNewPassword(e.target.value)}
												className="text-sm rounded-md border-(--border) bg-(--bg) text-(--text) focus:border-(--link) focus:ring-(--link)"
											/>
										</div>
										<div className="space-y-2">
											<Label
												htmlFor="confirm-password"
												className="text-sm font-semibold text-(--text)"
											>
												Confirm New Password
											</Label>
											<Input
												id="confirm-password"
												type="password"
												value={confirmPassword}
												onChange={(e) => setConfirmPassword(e.target.value)}
												className="text-sm rounded-md border-(--border) bg-(--bg) text-(--text) focus:border-(--link) focus:ring-(--link)"
											/>
										</div>
									</div>
								</CardContent>
							</Card>

							<div className="flex justify-end gap-4">
								<Button
									type="submit"
									disabled={isPending}
									className="text-(--text) hover:text-(--text)/90 hover:bg-(--link)/80 bg-(--link) font-semibold px-6 py-2.5 transition-colors shadow-sm"
								>
									{isPending ? "Updating Account..." : "Save Changes"}
								</Button>
							</div>
						</form>
					</div>
				</div>
			</div>
		</div>
	);
}
