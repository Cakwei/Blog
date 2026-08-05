import {
	CircleCheckIcon,
	InfoIcon,
	Loader2Icon,
	OctagonXIcon,
	TriangleAlertIcon,
} from "lucide-react";
import { useTheme } from "next-themes";
import { Toaster as Sonner, type ToasterProps } from "sonner";

const Toaster = ({ ...props }: ToasterProps) => {
	const { theme = "system" } = useTheme();

	return (
		<Sonner
			theme={theme as ToasterProps["theme"]}
			className="toaster group"
			icons={{
				success: <CircleCheckIcon className="size-4 text-emerald-500" />,
				info: <InfoIcon className="size-4 text-(--link)" />,
				warning: <TriangleAlertIcon className="size-4 text-amber-500" />,
				error: <OctagonXIcon className="size-4 text-(--error)" />,
				loading: <Loader2Icon className="size-4 animate-spin text-(--link)" />,
			}}
			toastOptions={{
				classNames: {
					toast:
						"group toast bg-(--bg-secondary) text-(--text) border-(--border) shadow-xl backdrop-blur-xl",
					success: "border-(--link)/50 text-(--text)",
					// Explicitly targeting Sonner's internal data attributes for error titles and descriptions
					error: "border-(--error)/50 bg-(--bg-secondary)",
					title: "text-red-400",
					description: "text-(--text-secondary)",
				},
			}}
			style={
				{
					"--normal-bg": "var(--bg-secondary)",
					"--normal-text": "var(--text)",
					"--normal-border": "var(--border)",
					"--border-radius": "var(--radius)",
				} as React.CSSProperties
			}
			{...props}
		/>
	);
};

export { Toaster };
