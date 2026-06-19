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

export const Route = createFileRoute("/register/")({
	component: LoginPage,
});

function LoginPage() {
	return (
		<div className=" flex items-center justify-center min-h-[calc(100vh-64px)] w-full">
			<Card className="w-full max-w-md">
				<CardHeader className="space-y-1">
					<CardTitle className="text-2xl font-bold text-center">
						Register
					</CardTitle>
					<CardDescription className="text-center">
						Enter your email to sign up for an account
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
					<Button className="w-full">Sign Up</Button>
				</CardContent>
				<CardFooter className="flex flex-wrap justify-center gap-1">
					<p className="text-sm text-muted-foreground">
						Already have an account?
					</p>
					<Link to="/login" className="text-sm font-medium hover:underline">
						Register
					</Link>
				</CardFooter>
			</Card>
		</div>
	);
}
