import {
	queryOptions,
	useMutation,
	useQueryClient,
	useSuspenseQuery,
} from "@tanstack/react-query";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { createServerFn } from "@tanstack/react-start";
import { type MouseEvent, type SubmitEvent, useState } from "react";
import { Button } from "#/components/ui/button";
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "#/components/ui/card";
// Shadcn/ui Components
import { Input } from "#/components/ui/input";
import { Label } from "#/components/ui/label";
import { prisma } from "#/db";
import { authClient } from "#/lib/auth-client";
import { getFreshServerSession } from "#/lib/utils";

// Better Auth uses alpha-numeric/cuid String IDs in MySQL
const loggedInUserEmail = (await getFreshServerSession())?.user.email;

// 1. Server Functions adjusted for Better Auth Schema
const getUserProfile = createServerFn().handler(async () => {
	// Better Auth stores core user info in the User model
	const user = await prisma.user.findUnique({
		where: { email: loggedInUserEmail },
		select: {
			id: true,
			name: true,
			email: true,
			image: true,
		},
	});
	return user;
});

const updateProfileAndId = createServerFn()
	.validator(
		(data: {
			name: string;
			email: string;
			currentPassword?: string;
			newPassword?: string;
		}) => data,
	)
	.handler(async ({ data }) => {
		// Update user core information
		const updatedUser = await prisma.user.update({
			where: { id: loggedInUserEmail },
			data: {
				name: data.name,
				email: data.email,
			},
		});

		if (data.newPassword) {
			// Securely updating password fields in Better Auth tables.
			// If using the email-password provider, password structures live in your `Account` model
			// or password hashes attached to internal providers. Adjust targeting to your auth setup:
			await prisma.account.updateMany({
				where: {
					userId: loggedInUserEmail,
					providerId: "credential", // Default for Better Auth email/password provider
				},
				data: {
					// Make sure you hash this using your app's hashing algorithm (e.g., bcrypt / argon2)
					// password: await hashPassword(data.newPassword)
				},
			});
		}

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

	const [name, setName] = useState(user?.name || "");
	const [email, setEmail] = useState(user?.email || "");
	const [currentPassword, setCurrentPassword] = useState("");
	const [newPassword, setNewPassword] = useState("");
	const [confirmPassword, setConfirmPassword] = useState("");
	const [message, setMessage] = useState<{
		type: "success" | "error";
		text: string;
	} | null>(null);

	const { mutate, isPending } = useMutation({
		mutationFn: (variables: {
			name: string;
			email: string;
			currentPassword?: string;
			newPassword?: string;
		}) => updateProfileAndId({ data: variables }),

		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: ["profile"] });
			setMessage({
				type: "success",
				text: "Profile settings saved successfully.",
			});
			setCurrentPassword("");
			setNewPassword("");
			setConfirmPassword("");
		},
		onError: () => {
			setMessage({ type: "error", text: "An error occurred during updating." });
		},
	});

	const handleSubmit = (e: SubmitEvent<HTMLFormElement>) => {
		e.preventDefault();
		setMessage(null);

		if (newPassword && newPassword !== confirmPassword) {
			setMessage({ type: "error", text: "New passwords do not match." });
			return;
		}

		mutate({
			name,
			email,
			...(newPassword ? { currentPassword, newPassword } : {}),
		});
	};

	async function handleChangePassword(e: MouseEvent<HTMLButtonElement>) {
		e.preventDefault();

		await authClient.changePassword({
			newPassword: newPassword,
			currentPassword: currentPassword,
			revokeOtherSessions: true,
			fetchOptions: {
				onError: ({ error }) => {
					console.log(error);
				},
				onSuccess: (ctx) => {
					// Revoke all sessions stored in DB and force user to relogin again for security
					console.log(ctx);
					authClient.revokeSessions();
					navigate({ to: "/", reloadDocument: true });
				},
			},
		});
	}
	return (
		<div className="max-w-6xl mx-auto px-4 py-12 bg-black">
			<div className="mb-12">
				<span className="text-white font-bold uppercase tracking-wider text-sm">
					Account Settings
				</span>
				<h1 className="text-4xl text-white font-bold mt-2">Personal Profile</h1>
				<p className="text-neutral-300 text-lg mt-2">
					Manage your Better Auth account credentials and details.
				</p>
			</div>

			<div className="grid md:grid-cols-3 gap-8 items-start">
				<Card className="border-neutral-700 shadow-none rounded-2xl bg-neutral-900">
					<CardHeader className="text-center pb-2">
						{user?.image ? (
							<img
								src={user.image}
								alt={name}
								className="w-20 h-20 rounded-full mx-auto mb-4 object-cover border border-gray-200"
							/>
						) : (
							<div className="w-20 h-20 bg-blue-100 text-blue-600 font-bold text-2xl flex items-center justify-center rounded-full mx-auto mb-4">
								{name.charAt(0).toUpperCase() || "U"}
							</div>
						)}
						<CardTitle className="text-xl text-white font-bold">
							{name || "User Profile"}
						</CardTitle>
						<CardDescription className="text-neutral-300">
							{email}
						</CardDescription>
					</CardHeader>
				</Card>

				<div className="md:col-span-2">
					<form onSubmit={handleSubmit} className="space-y-8">
						{message && (
							<div
								className={`p-4 rounded-xl text-sm font-medium ${
									message.type === "success"
										? "bg-green-50 text-green-700 border border-green-200"
										: "bg-red-50 text-red-700 border border-red-200"
								}`}
							>
								{message.text}
							</div>
						)}

						<Card className="border-neutral-700 shadow-none rounded-2xl bg-neutral-900">
							<CardHeader>
								<CardTitle className="text-xl text-white font-bold">
									Personal Information
								</CardTitle>
								<CardDescription className="text-neutral-300">
									Update your active account names and identifiers.
								</CardDescription>
							</CardHeader>
							<CardContent className="space-y-4">
								<div className="space-y-2">
									<Label
										htmlFor="name"
										className="text-sm font-semibold text-white"
									>
										Full Name
									</Label>
									<Input
										id="name"
										type="text"
										value={name}
										onChange={(e) => setName(e.target.value)}
										required
										className="border-neutral-700 focus:border-blue-500 focus:ring-blue-500 text-neutral-300"
									/>
								</div>
								<div className="space-y-2">
									<Label
										htmlFor="email"
										className="text-sm font-semibold text-white"
									>
										Email Address
									</Label>
									<Input
										id="email"
										type="email"
										value={email}
										onChange={(e) => setEmail(e.target.value)}
										required
										className="border-neutral-700 text-neutral-300 focus:border-blue-500 focus:ring-blue-500"
									/>
								</div>
							</CardContent>
						</Card>

						<Card className="border-neutral-700 bg-neutral-900 shadow-none rounded-2xl">
							<CardHeader>
								<CardTitle className="text-xl text-white font-bold">
									Security & Password
								</CardTitle>
								<CardDescription className="text-neutral-300">
									Leave blank if you wish to preserve your existing security
									configurations.
								</CardDescription>
							</CardHeader>
							<CardContent className="space-y-4">
								<div className="space-y-2">
									<Label
										htmlFor="current-password"
										className="text-sm font-semibold text-white"
									>
										Current Password
									</Label>
									<Input
										id="current-password"
										type="password"
										value={currentPassword}
										onChange={(e) => setCurrentPassword(e.target.value)}
										required={!!newPassword}
										className="border-neutral-700 focus:border-blue-500 focus:ring-blue-500 text-neutral-300"
									/>
								</div>
								<div className="grid sm:grid-cols-2 gap-4">
									<div className="space-y-2">
										<Label
											htmlFor="new-password"
											className="text-sm font-semibold text-white"
										>
											New Password
										</Label>
										<Input
											id="new-password"
											type="password"
											value={newPassword}
											onChange={(e) => setNewPassword(e.target.value)}
											className="border-neutral-700 focus:border-blue-500 focus:ring-blue-500 text-neutral-300"
										/>
									</div>
									<div className="space-y-2">
										<Label
											htmlFor="confirm-password"
											className="text-sm font-semibold text-white"
										>
											Confirm New Password
										</Label>
										<Input
											id="confirm-password"
											type="password"
											value={confirmPassword}
											onChange={(e) => setConfirmPassword(e.target.value)}
											className="border-neutral-700 focus:border-blue-500 focus:ring-blue-500 text-neutral-300"
										/>
									</div>
								</div>
							</CardContent>
						</Card>

						<div className="flex justify-end gap-4">
							<Button
								onClick={handleChangePassword}
								type="submit"
								disabled={isPending}
								className="bg-black text-white font-semibold px-5 transition-colors shadow-none"
							>
								{isPending ? "Updating Account..." : "Save Changes"}
							</Button>
						</div>
					</form>
				</div>
			</div>
		</div>
	);
}
