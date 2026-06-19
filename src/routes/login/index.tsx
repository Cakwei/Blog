// app/routes/login.tsx
import { createFileRoute, Link } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import {
	Card,
	CardContent,
	CardDescription,
	CardFooter,
	CardHeader,
	CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export const Route = createFileRoute("/login/")({
	component: LoginPage,
});

function LoginPage() {
	return (
		<div className="flex items-center justify-center min-h-[calc(100vh-64px)]">
			<Card className="w-full max-w-md">
				<CardHeader className="space-y-1">
					<CardTitle className="text-2xl font-bold text-center">
						Login
					</CardTitle>
					<CardDescription className="text-center">
						Enter your email to sign in to your account
					</CardDescription>
				</CardHeader>
				<CardContent className="space-y-4">
					<div className="space-y-2">
						<Label htmlFor="email">Email</Label>
						<Input id="email" type="email" placeholder="m@example.com" />
					</div>
					<div className="space-y-2">
						<Label htmlFor="password">Password</Label>
						<Input id="password" type="password" />
					</div>
					<Button className="w-full">Sign In</Button>
				</CardContent>
				<CardFooter className="flex flex-wrap justify-center gap-1">
					<p className="text-sm text-muted-foreground">
						Don't have an account?
					</p>
					<Link to="/register" className="text-sm font-medium hover:underline">
						Register
					</Link>
				</CardFooter>
			</Card>
		</div>
	);
}
