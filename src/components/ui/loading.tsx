import { Card, CardContent } from "@/components/ui/card";
import { Spinner } from "@/components/ui/spinner";

export function Loading() {
	return (
		<div className="w-full overflow-hidden">
			{/* Overlay */}
			<Card className="bg-black inset-0 z-10 w-full h-[25vh] backdrop-blur-xs border border-dashed border-neutral-500 rounded-2xl">
				<CardContent className="flex grow flex-col items-center justify-center gap-2">
					<Spinner className="size-5 opacity-60" />
					<span className="text-muted-foreground text-sm">Loading data...</span>
				</CardContent>
			</Card>
		</div>
	);
}
