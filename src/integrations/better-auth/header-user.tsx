import { useQueryClient } from "@tanstack/react-query";
import { useLocation, useNavigate } from "@tanstack/react-router";
import { Button } from "#/components/ui/button";
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuGroup,
	DropdownMenuItem,
	DropdownMenuLabel,
	DropdownMenuSeparator,
	DropdownMenuTrigger,
} from "#/components/ui/dropdown-menu";
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
			<div className="flex items-center gap-5">
				<Skeleton className="inline-flex w-20 h-10 shrink-0 items-center justify-center gap-2 rounded-md text-sm font-medium whitespace-nowrap transition-all outline-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50 disabled:pointer-events-none disabled:opacity-50 aria-invalid:border-destructive aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4" />
				<div className="h-8 w-8 bg-neutral-100 dark:bg-neutral-800 animate-pulse" />
			</div>
		);
	}

	if (session?.user) {
		return (
			<div className="flex items-center gap-5">
				<Button
					className={`${pathname === "/posts" ? "hidden" : ""} bg-white text-black hover:bg-white/90 `}
					onClick={() => {
						navigate({ to: "/posts" });
					}}
				>
					Create Blog
				</Button>
				<DropdownMenu>
					<DropdownMenuTrigger asChild>
						{session.user.image ? (
							<img
								src={session.user.image}
								alt=""
								className="h-8 w-8 rounded-full"
							/>
						) : (
							<div className="h-8 w-8 bg-neutral-100 dark:bg-neutral-800 flex items-center justify-center rounded-full">
								<Button className="text-xs font-medium text-neutral-600 dark:text-neutral-400 rounded-full p-3.5 bg-neutral-200 hover:bg-neutral-300">
									{session.user.name?.charAt(0).toUpperCase() || "P"}
								</Button>
							</div>
						)}
					</DropdownMenuTrigger>
					<DropdownMenuContent className="mr-3.5 border-neutral-700 bg-neutral-900 ">
						<DropdownMenuGroup>
							<DropdownMenuLabel className="font-bold text-white">
								My Account
							</DropdownMenuLabel>
							<DropdownMenuItem
								className="text-white"
								onClick={() => navigate({ to: "/profile" })}
							>
								Profile
							</DropdownMenuItem>
						</DropdownMenuGroup>
						<DropdownMenuSeparator className="bg-neutral-700" />
						<DropdownMenuGroup>
							<DropdownMenuItem
								onClick={() => {
									authClient.signOut({
										fetchOptions: {
											onSuccess: () => {
												queryClient.clear();
												queryClient.removeQueries();
												window.location.href = "/";
											},
										},
									});
								}}
							>
								<span className="text-red-500">Sign out</span>
							</DropdownMenuItem>
						</DropdownMenuGroup>
					</DropdownMenuContent>
				</DropdownMenu>
			</div>
		);
	}

	return null;
}
