import { useQueryClient } from "@tanstack/react-query";
import { useLocation, useNavigate } from "@tanstack/react-router";
import { LogOut, PenSquare, User as UserIcon } from "lucide-react";
import { Button } from "#/components/ui/button";
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuGroup,
	DropdownMenuItem,
	DropdownMenuSeparator,
	DropdownMenuTrigger,
} from "#/components/ui/dropdown-menu";
import { SearchDialog } from "#/components/ui/searchBar";
import { Skeleton } from "#/components/ui/skeleton";
import { authClient } from "#/lib/auth-client";

export default function BetterAuthHeader() {
	const { data: session, isPending } = authClient.useSession();
	const queryClient = useQueryClient();
	const navigate = useNavigate();
	const pathname = useLocation({
		select: (location) => location.pathname,
	});

	if (isPending) {
		return (
			<div className="flex items-center gap-3 animate-pulse">
				<Skeleton className="h-9 w-20 rounded-xl bg-(--bg-secondary)" />
				<Skeleton className="h-9 w-28 rounded-xl bg-(--bg-secondary)" />
				<Skeleton className="h-9 w-9 rounded-full bg-(--bg-secondary)" />
			</div>
		);
	}

	if (session?.user) {
		// logger("debug", "headers.tsx @", session);
		return (
			<div className="flex items-center gap-3">
				<SearchDialog />

				{pathname !== "/posts" && (
					<Button
						data-testid="goPostsBtn"
						onClick={() => navigate({ to: "/posts" })}
						variant="ghost"
						className="hidden group sm:inline-flex items-center gap-2 rounded-xl bg-(--bg-secondary)/60 hover:bg-(--bg-secondary) border border-(--border) hover:border-(--link)/40 text-(--text) font-medium text-xs h-9 px-3.5 transition-all"
					>
						<PenSquare className="w-3.5 h-3.5 text-(--link)" />
						<span className="group-hover:text-(--text) text-(--text-secondary)">
							Write
						</span>
					</Button>
				)}

				<DropdownMenu>
					<DropdownMenuTrigger asChild>
						<button
							type="button"
							data-testid="profileBtn"
							className="group relative flex items-center justify-center rounded-full focus:outline-none transition-transform active:scale-95"
						>
							{session.user.image ? (
								<img
									src={session.user.image}
									alt={session.user.name || "User Avatar"}
									className="h-9 w-9 rounded-full object-cover border border-(--border) group-hover:border-(--link) transition-colors shadow-sm"
								/>
							) : (
								<div className="h-9 w-9 rounded-full bg-(--link)/10 border border-(--link)/30 flex items-center justify-center text-(--link) font-bold text-xs group-hover:bg-(--link) group-hover:text-white transition-all">
									{session.user.name?.charAt(0).toUpperCase() || "P"}
								</div>
							)}
						</button>
					</DropdownMenuTrigger>

					<DropdownMenuContent
						data-testid="profileContent"
						align="end"
						className="w-56 p-1.5 rounded-2xl border border-(--border) bg-(--bg-secondary) backdrop-blur-xl shadow-2xl text-(--text)"
					>
						<div className="px-3 py-2.5 border-b border-(--border)/60 mb-1">
							<p className="text-xs font-bold text-(--text) truncate">
								{session.user.name || "Account"}
							</p>
							<p className="text-[11px] text-(--text-secondary) truncate font-mono mt-0.5">
								{session.user.email}
							</p>
						</div>

						<DropdownMenuGroup className="space-y-0.5">
							<DropdownMenuItem
								data-testid="goToProfileBtn"
								onClick={() => navigate({ to: "/profile" })}
								className="flex items-center gap-2.5 rounded-xl px-3 py-2 text-xs font-medium text-(--text) focus:bg-(--link)/15 focus:text-(--link) cursor-pointer transition-colors"
							>
								<UserIcon className="w-3.5 h-3.5 text-(--link)" />
								<span>Profile</span>
							</DropdownMenuItem>
						</DropdownMenuGroup>

						<DropdownMenuSeparator className="bg-(--border)/60 my-1" />

						<DropdownMenuGroup>
							<DropdownMenuItem
								onClick={() => {
									authClient.signOut({
										fetchOptions: {
											onSuccess: () => {
												queryClient.invalidateQueries();
												queryClient.removeQueries();
												window.location.href = "/";
											},
										},
									});
								}}
								className="flex items-center gap-2.5 rounded-xl px-3 py-2 text-xs font-medium text-red-400 focus:bg-red-500/15 focus:text-red-400 cursor-pointer transition-colors"
							>
								<LogOut className="w-3.5 h-3.5 text-red-400" />
								<span>Sign out</span>
							</DropdownMenuItem>
						</DropdownMenuGroup>
					</DropdownMenuContent>
				</DropdownMenu>
			</div>
		);
	}

	return null;
}
