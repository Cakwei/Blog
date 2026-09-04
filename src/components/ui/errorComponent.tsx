/** biome-ignore-all lint/a11y/noSvgWithoutTitle: <explanation> */
import { Link, type NotFoundRouteProps } from "@tanstack/react-router";
import { ArrowLeft } from "lucide-react";
import { Button } from "#/components/ui/button";
import { Label } from "./label";

export function NotFound({
	title = "Page Not Found",
	description = "The page you are looking for doesn't exist or has been moved.",
	showHomeButton = true,
}: NotFoundRouteProps & {
	title?: string;
	description?: string;
	showHomeButton?: boolean;
}) {
	return (
		<div className="min-h-[calc(100vh-10rem)] text-(--text) bg-(--bg) selection:bg-(--link)/25 selection:text-(--link) relative overflow-hidden flex items-center justify-center px-4 py-12">
			{/* Background ambient glow effect */}
			<div className="absolute w-96 h-96 bg-(--link)/10 rounded-full blur-3xl pointer-events-none -top-20 -left-20 animate-pulse" />
			<div className="absolute w-96 h-96 bg-purple-500/10 rounded-full blur-3xl pointer-events-none -bottom-20 -right-20 animate-pulse delay-700" />

			<div className="w-full max-w-md relative z-10 text-center space-y-6">
				{/* Animated SVG Illustration */}
				<div className="relative mx-auto w-40 h-40 flex items-center justify-center">
					<svg
						className="w-full h-full text-(--link) drop-shadow-lg"
						viewBox="0 0 200 200"
						fill="none"
						xmlns="http://www.w3.org/2000/svg"
					>
						{/* Outer Orbit Ring */}
						<circle
							cx="100"
							cy="100"
							r="80"
							stroke="currentColor"
							strokeWidth="2"
							strokeDasharray="8 8"
							className="opacity-30 animate-[spin_20s_linear_infinite]"
						/>

						{/* Pulsing Core Background */}
						<circle
							cx="100"
							cy="100"
							r="50"
							fill="currentColor"
							className="opacity-10 animate-ping"
						/>
						<circle
							cx="100"
							cy="100"
							r="45"
							fill="currentColor"
							className="opacity-15 animate-pulse"
						/>

						{/* Floating Glass / Magnifier SVG path */}
						<g className="animate-[bounce_3s_ease-in-out_infinite]">
							<circle
								cx="90"
								cy="90"
								r="30"
								stroke="currentColor"
								strokeWidth="6"
								className="text-(--link)"
							/>
							<line
								x1="112"
								y1="112"
								x2="145"
								y2="145"
								stroke="currentColor"
								strokeWidth="6"
								strokeLinecap="round"
								className="text-(--link)"
							/>
							{/* Question Mark inside lens */}
							<text
								x="90"
								y="100"
								fill="currentColor"
								fontSize="32"
								fontWeight="bold"
								textAnchor="middle"
								className="text-(--text)"
							>
								?
							</text>
						</g>
					</svg>
				</div>

				<div className="space-y-2">
					<h1 className="text-3xl font-black tracking-tight text-(--text)">
						{title}
					</h1>
					<p className="text-xs sm:text-sm text-(--text-secondary) max-w-xs mx-auto leading-relaxed">
						{description}
					</p>
				</div>

				{showHomeButton && (
					<div className="pt-2">
						<Button
							asChild
							className="py-2.5 px-6 bg-(--link) hover:bg-(--link)/90 text-white font-semibold text-xs rounded-md shadow-lg shadow-(--link)/20 transition-all cursor-pointer inline-flex items-center gap-2"
						>
							<Link to="/">
								<Label className="text-(--text) text-xs">← Back to Home</Label>
							</Link>
						</Button>
					</div>
				)}
			</div>
		</div>
	);
}
