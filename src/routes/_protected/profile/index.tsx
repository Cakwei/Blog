import { useForm } from "@tanstack/react-form";
import {
	queryOptions,
	useMutation,
	useQueryClient,
	useSuspenseQuery,
} from "@tanstack/react-query";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { createServerFn } from "@tanstack/react-start";
import { Camera, KeyRound, Loader2, User as UserIcon } from "lucide-react";
import { useRef, useState } from "react";
import { toast } from "sonner";
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
	.validator(
		(data: { name: string; email: string; image?: string | null }) => data,
	)
	.handler(async ({ data }) => {
		const session = await getSessionFn();
		if (!session?.user?.id) throw new Error("Unauthorized");

		const updatedUser = await prisma.user.update({
			where: { id: session.user.id },
			data: {
				name: data.name,
				email: data.email,
				...(data.image !== undefined ? { image: data.image } : {}),
			},
		});

		return { success: true, user: updatedUser };
	});

const uploadProfileAvatarServerFn = createServerFn({ method: "POST" })
	.validator(
		(data: { fileName: string; fileType: string; base64Data: string }) => {
			if (!data.fileName || !data.fileType || !data.base64Data) {
				throw new Error("Missing avatar upload payload data");
			}
			if (!data.fileType.startsWith("image/")) {
				throw new Error("Invalid file type. Only images are permitted.");
			}
			return data;
		},
	)
	.handler(async ({ data }) => {
		try {
			const session = await getSessionFn();
			if (!session?.user?.id) {
				return {
					success: false,
					url: "",
					message: "Unauthorized upload session",
				};
			}

			const { Upload } = await import("@aws-sdk/lib-storage");
			const { s3Client } = await import("#/lib/s3");

			const uuid = crypto.randomUUID();
			const cleanFileName = data.fileName.replace(/[^a-zA-Z0-9.-]/g, "_");
			const s3Key = `avatars/${uuid}-${cleanFileName}`;

			const base64Content = data.base64Data.includes(",")
				? data.base64Data.split(",")[1]
				: data.base64Data;

			if (!base64Content) {
				throw new Error("Corrupted base64 payload data");
			}

			const buffer = Buffer.from(base64Content, "base64");
			if (buffer.length > 5 * 1024 * 1024) {
				throw new Error("File payload exceeds 5MB limit.");
			}

			const uploader = new Upload({
				client: s3Client,
				params: {
					Bucket: "blog",
					Key: s3Key,
					Body: buffer,
					ContentType: data.fileType,
				},
				queueSize: 4,
				partSize: 5 * 1024 * 1024,
			});

			await uploader.done();
			const avatarUrl = `https://s3.cakwei.dev/blog/${s3Key}`;

			// Update user record immediately in DB
			await prisma.user.update({
				where: { id: session.user.id },
				data: { image: avatarUrl },
			});

			return {
				success: true,
				url: avatarUrl,
				message: "Avatar uploaded successfully",
			};
		} catch (error: any) {
			return {
				success: false,
				url: "",
				message: error?.message || "Failed to upload avatar to S3 storage",
			};
		}
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

	const avatarInputRef = useRef<HTMLInputElement>(null);
	const [isUploadingAvatar, setIsUploadingAvatar] = useState(false);
	const [isResettingPassword, setIsResettingPassword] = useState(false);
	const [message, setMessage] = useState<{
		type: "success" | "error";
		text: string;
	} | null>(null);

	const handleAvatarFileChange = async (
		e: React.ChangeEvent<HTMLInputElement>,
	) => {
		const file = e.target.files?.[0];
		if (!file) return;

		// Validation: Image types only
		if (!file.type.startsWith("image/")) {
			toast.error("Please upload a valid image file (JPG, PNG, WebP, etc.).");
			return;
		}

		// Validation: 5MB limit
		if (file.size > 5 * 1024 * 1024) {
			toast.error("Profile picture size must be under 5MB.");
			return;
		}

		try {
			setIsUploadingAvatar(true);
			const reader = new FileReader();

			reader.onload = async () => {
				try {
					const base64Data = reader.result as string;
					const res = await uploadProfileAvatarServerFn({
						data: {
							fileName: file.name,
							fileType: file.type,
							base64Data,
						},
					});

					if (!res.success) {
						toast.error(res.message || "Failed to upload avatar");
						return;
					}

					await queryClient.invalidateQueries({ queryKey: ["profile"] });
					toast.success("Profile picture updated successfully!");
				} catch (err: any) {
					toast.error(err?.message || "Failed to upload avatar.");
				} finally {
					setIsUploadingAvatar(false);
					if (avatarInputRef.current) {
						avatarInputRef.current.value = "";
					}
				}
			};

			reader.readAsDataURL(file);
		} catch (err: any) {
			toast.error(err?.message || "Failed reading image file.");
			setIsUploadingAvatar(false);
		}
	};

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

					{/* Mini Identity Chip with Avatar Upload */}
					<div className="flex items-center gap-3.5 bg-(--bg-secondary)/40 border border-(--border) p-2.5 rounded-xl">
						<input
							type="file"
							ref={avatarInputRef}
							onChange={handleAvatarFileChange}
							accept="image/png,image/jpeg,image/webp,image/gif"
							className="hidden"
							disabled={isUploadingAvatar}
						/>
						<button
							type="button"
							onClick={() => avatarInputRef.current?.click()}
							disabled={isUploadingAvatar}
							title="Click to change profile picture"
							className="relative group w-11 h-11 rounded-lg overflow-hidden border border-(--border) flex-shrink-0 cursor-pointer focus:outline-none focus:ring-2 focus:ring-(--text) focus:ring-offset-2 transition-all"
						>
							{user?.image ? (
								<img
									src={user.image}
									alt={user.name || "Avatar"}
									className="w-full h-full object-cover"
								/>
							) : (
								<div className="w-full h-full bg-(--bg) flex items-center justify-center text-(--text) font-semibold text-sm">
									{user?.name?.charAt(0).toUpperCase() || "U"}
								</div>
							)}

							{/* Overlay */}
							<div
								className={`absolute inset-0 bg-black/60 flex items-center justify-center transition-opacity ${
									isUploadingAvatar
										? "opacity-100"
										: "opacity-0 group-hover:opacity-100"
								}`}
							>
								{isUploadingAvatar ? (
									<Loader2 className="w-4 h-4 text-white animate-spin" />
								) : (
									<Camera className="w-4 h-4 text-white" />
								)}
							</div>
						</button>

						<div className="pr-2">
							<div className="flex items-center gap-1.5">
								<p className="text-xs font-medium text-(--text) truncate max-w-[140px]">
									{user?.name}
								</p>
								<button
									type="button"
									onClick={() => avatarInputRef.current?.click()}
									disabled={isUploadingAvatar}
									className="text-[10px] text-xs font-mono text-(--text-muted) hover:text-(--text) underline cursor-pointer"
								>
									{isUploadingAvatar ? "Uploading..." : "Change"}
								</button>
							</div>
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
