import { useNavigate } from "@tanstack/react-router";
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
import { authClient } from "#/lib/auth-client";

export default function BetterAuthHeader() {
	const { data: session, isPending } = authClient.useSession();
	const navigate = useNavigate();
	if (isPending) {
		return (
			<div className="h-8 w-8 bg-neutral-100 dark:bg-neutral-800 animate-pulse" />
		);
	}

	if (session?.user) {
		return (
			<div className="flex items-center gap-5">
				<Button
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
					<DropdownMenuContent>
						<DropdownMenuGroup>
							<DropdownMenuLabel className="font-bold">
								My Account
							</DropdownMenuLabel>
							<DropdownMenuItem>Profile</DropdownMenuItem>
						</DropdownMenuGroup>
						<DropdownMenuSeparator />
						<DropdownMenuGroup>
							<DropdownMenuItem
								onClick={() => {
									authClient.signOut({
										fetchOptions: {
											onSuccess: () => {
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
