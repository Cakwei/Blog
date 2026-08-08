import { queryOptions, useSuspenseQuery } from "@tanstack/react-query";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { createServerFn } from "@tanstack/react-start";
import { logger } from "better-auth";
import debounce from "lodash.debounce";
import {
	ArrowLeft,
	Calendar,
	ChevronDown,
	Compass,
	ImageIcon,
	Search,
	Sparkles,
	User,
} from "lucide-react";
import {
	createContext,
	Suspense,
	useContext,
	useEffect,
	useMemo,
	useRef,
	useState,
	useTransition,
} from "react";
import { Button } from "#/components/ui/button";
import {
	Card,
	CardContent,
	CardFooter,
	CardHeader,
} from "#/components/ui/card";
import { Input } from "#/components/ui/input";
import { Skeleton } from "#/components/ui/skeleton";
import { prisma } from "#/db";
import { CATEGORIES } from "#/lib/const";

type ArticlesSearch = {
	search?: string | "";
	category?: "ALL" | (string & {});
};

const getFilteredPosts = createServerFn({ method: "GET" })
	.validator((data: ArticlesSearch) => data)
	.handler(async ({ data }) => {
		const { search, category } = data;

		const normalizedCategory = category ? category.toLowerCase() : "all";
		const isValidCategory =
			normalizedCategory === "all" ||
			CATEGORIES.some((cat) => cat.toLowerCase() === normalizedCategory);

		const categoryFilter =
			isValidCategory && normalizedCategory !== "all"
				? normalizedCategory
				: undefined;

		const posts = await prisma.post.findMany({
			where: {
				AND: [
					search
						? {
								OR: [
									{ title: { contains: search } },
									{ excerpt: { contains: search } },
								],
							}
						: {},
					categoryFilter
						? {
								// Fixed: Use 'categories' (many-to-many relation) with 'some'
								categories: {
									some: {
										name: { contains: categoryFilter },
									},
								},
							}
						: {},
				],
			},
			orderBy: { date: "desc" },
			select: {
				id: true,
				content: true,
				date: true,
				excerpt: true,
				image: true,
				title: true,
				userId: true,
				categories: {
					// Fixed: Match schema plural relation name
					select: {
						id: true,
						name: true,
						slug: true,
					},
				},
				user: {
					select: {
						displayUsername: true,
					},
				},
			},
		});
		return posts;
	});

const postsQueryOptions = (searchParams: ArticlesSearch) =>
	queryOptions({
		queryKey: ["articles", searchParams],
		queryFn: () => getFilteredPosts({ data: searchParams }),
		refetchInterval: 1000 * 60,
	});

export const Route = createFileRoute("/articles/")({
	validateSearch: (search: ArticlesSearch): ArticlesSearch => {
		const rawCategory = search.category
			? String(search.category).toLowerCase()
			: "all";

		const matchedCategory = CATEGORIES.find(
			(cat) => cat.toLowerCase() === rawCategory,
		);

		return {
			search: (search.search as string) || "",
			category: matchedCategory || "all",
		};
	},
	loader: async ({ context, location }) => {
		const searchParams = location.search as ArticlesSearch;
		await context.queryClient.ensureQueryData(postsQueryOptions(searchParams));
	},
	component: AllArticlesPage,
	pendingComponent: ArticlesPageSkeleton,
});

/* -------------------------------------------------------------------------- */
/*                               Provider Context                             */
/* -------------------------------------------------------------------------- */

type ArticlesContextType = {
	searchParams: ArticlesSearch;
	searchTerm: string;
	setSearchTerm: (val: string) => void;
	selectedCategory: string;
	setSelectedCategory: (val: string) => void;
	isPending: boolean;
};

const ArticlesContext = createContext<ArticlesContextType | null>(null);

function useArticlesContext() {
	const context = useContext(ArticlesContext);
	if (!context) {
		throw new Error(
			"useArticlesContext must be used within an ArticlesProvider",
		);
	}
	return context;
}

function AllArticlesPage() {
	const navigate = useNavigate();
	const searchParams = Route.useSearch();

	const [searchTerm, setSearchTerm] = useState(searchParams.search || "");
	const [selectedCategory, setSelectedCategory] = useState(
		searchParams.category || "all",
	);

	const [isPending, startTransition] = useTransition();

	const debouncedNavigate = useMemo(
		() =>
			debounce((search: string, category: string) => {
				startTransition(() => {
					navigate({
						to: "/articles",
						search: {
							search: search || "",
							category,
						},
						replace: true,
					});
				});
			}, 300),
		[navigate],
	);

	useEffect(() => {
		debouncedNavigate(searchTerm, selectedCategory);
		return () => {
			debouncedNavigate.cancel();
		};
	}, [searchTerm, selectedCategory, debouncedNavigate]);

	return (
		<ArticlesContext.Provider
			value={{
				searchParams,
				searchTerm,
				setSearchTerm,
				selectedCategory,
				setSelectedCategory,
				isPending,
			}}
		>
			<div className="min-h-screen text-(--text) bg-(--bg) selection:bg-(--link)/25 selection:text-(--link) relative overflow-hidden">
				{/* Modern Atmospheric Gradient Background */}
				<div className="absolute top-0 left-1/2 -translate-x-1/2 w-full max-w-7xl h-[500px] bg-gradient-to-b from-(--link)/10 via-(--link)/5 to-transparent blur-[120px] pointer-events-none -z-10" />

				<div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 lg:py-20 space-y-12">
					{/* Editorial Header Block */}
					<div className="flex flex-col md:flex-row md:items-end justify-between gap-6 border-b border-(--border)/60 pb-10">
						<div className="space-y-4 max-w-2xl">
							<Link
								to="/"
								className="inline-flex items-center gap-2 text-xs font-semibold text-(--text-secondary) hover:text-(--link) transition-colors group"
							>
								<ArrowLeft className="w-3.5 h-3.5 group-hover:-translate-x-1 transition-transform" />{" "}
								Back to Home
							</Link>

							<div className="space-y-2">
								<div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-(--link)/10 border border-(--link)/20 text-(--link) text-[11px] font-bold uppercase tracking-widest">
									<Compass className="w-3 h-3" /> Explore Index
								</div>
								<h1 className="text-4xl sm:text-6xl font-black tracking-tight text-(--text)">
									Article Archive.
								</h1>
								<p className="text-(--text-secondary) text-sm sm:text-base leading-relaxed">
									Browse through our full directory of engineering write-ups,
									deep-dives, and personal notes.
								</p>
							</div>
						</div>
					</div>

					<ArticlesContent />
				</div>
			</div>
		</ArticlesContext.Provider>
	);
}

function ArticlesContent() {
	return (
		<div className="space-y-8">
			<FilterControlsBar />
			<Suspense fallback={<GridSkeleton gridCount={6} />}>
				<PostsGrid />
			</Suspense>
		</div>
	);
}

function FilterControlsBar() {
	const { searchTerm, setSearchTerm } = useArticlesContext();

	return (
		<div className="flex flex-col md:flex-row gap-4 justify-between items-center bg-(--bg-secondary)/60 p-3 sm:p-4 rounded-3xl border border-(--border) backdrop-blur-2xl shadow-xl">
			{/* Search Input */}
			<div className="relative w-full md:w-[420px]">
				<Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-(--link)" />
				<Input
					type="text"
					placeholder="Search by title, topic, or keyword..."
					value={searchTerm}
					onChange={(e) => setSearchTerm(e.target.value)}
					className="w-full bg-(--bg) border-(--border) rounded-2xl pl-11 pr-4 py-3 text-xs sm:text-sm text-(--text) placeholder:text-(--text-secondary) focus-visible:ring-(--link)/50 shadow-inner"
				/>
			</div>

			<CategoryDropdown />
		</div>
	);
}

function CategoryDropdown() {
	const { selectedCategory, setSelectedCategory } = useArticlesContext();

	const [categoryOpen, setCategoryOpen] = useState(false);
	const [categoryQuery, setCategoryQuery] = useState("");
	const dropdownRef = useRef<HTMLDivElement>(null);

	useEffect(() => {
		const handleClickOutside = (event: MouseEvent) => {
			if (
				dropdownRef.current &&
				!dropdownRef.current.contains(event.target as Node)
			) {
				setCategoryOpen(false);
			}
		};
		document.addEventListener("mousedown", handleClickOutside);
		return () => document.removeEventListener("mousedown", handleClickOutside);
	}, []);

	const filteredCategories = useMemo(() => {
		if (!categoryQuery) return CATEGORIES;
		return CATEGORIES.filter((cat) =>
			cat.toLowerCase().includes(categoryQuery.toLowerCase()),
		);
	}, [categoryQuery]);

	return (
		<div className="relative w-full md:w-72" ref={dropdownRef}>
			<Button
				type="button"
				variant="outline"
				onClick={() => setCategoryOpen(!categoryOpen)}
				className="w-full justify-between items-center bg-(--bg) border-(--border) hover:bg-(--bg-secondary) rounded-2xl px-4 py-3 text-xs sm:text-sm text-(--text) capitalize font-semibold shadow-sm"
			>
				<span className="truncate">
					{selectedCategory === "all" ? "All Categories" : selectedCategory}
				</span>
				<ChevronDown className="w-4 h-4 text-(--link) shrink-0 ml-2" />
			</Button>

			{categoryOpen && (
				<div className="absolute right-0 z-20 mt-2 w-full bg-(--bg-secondary) border border-(--border) rounded-3xl shadow-2xl overflow-hidden p-3 backdrop-blur-2xl">
					<input
						type="text"
						placeholder="Filter categories..."
						value={categoryQuery}
						onChange={(e) => setCategoryQuery(e.target.value)}
						className="w-full bg-(--bg) border border-(--border) rounded-xl px-3.5 py-2.5 text-xs text-(--text) placeholder:text-(--text-secondary) focus:outline-none focus:border-(--link) mb-2.5"
					/>
					<div className="max-h-52 overflow-y-auto space-y-1">
						<Button
							type="button"
							variant="ghost"
							onClick={() => {
								setSelectedCategory("all");
								setCategoryOpen(false);
							}}
							className={`w-full justify-start px-3.5 py-2.5 text-xs rounded-xl transition-all font-semibold ${
								selectedCategory === "all"
									? "bg-(--link) text-white hover:bg-(--link) shadow-md shadow-(--link)/20"
									: "text-(--text-secondary) hover:bg-(--border)/60 hover:text-(--text)"
							}`}
						>
							All Categories
						</Button>
						{filteredCategories.map((cat) => (
							<Button
								key={cat}
								type="button"
								variant="ghost"
								onClick={() => {
									setSelectedCategory(cat);
									setCategoryOpen(false);
								}}
								className={`w-full justify-start px-3.5 py-2.5 text-xs rounded-xl transition-all capitalize font-semibold ${
									selectedCategory === cat
										? "bg-(--link) text-white hover:bg-(--link) shadow-md shadow-(--link)/20"
										: "text-(--text-secondary) hover:bg-(--border)/60 hover:text-(--text)"
								}`}
							>
								{cat}
							</Button>
						))}
					</div>
				</div>
			)}
		</div>
	);
}

function PostsGrid() {
	const { searchParams, isPending } = useArticlesContext();
	const { data: posts } = useSuspenseQuery(postsQueryOptions(searchParams));

	return (
		<div
			className={`transition-opacity duration-300 ${
				isPending ? "opacity-40 pointer-events-none" : "opacity-100"
			}`}
		>
			{posts.length === 0 ? (
				<div className="text-center py-28 border border-dashed border-(--border) bg-(--bg-secondary)/20 rounded-3xl flex justify-center flex-col items-center space-y-4">
					<div className="w-14 h-14 rounded-2xl bg-(--bg-secondary) border border-(--border) flex items-center justify-center text-(--link) shadow-inner">
						<Sparkles className="w-7 h-7" />
					</div>
					<div className="space-y-1">
						<h3 className="text-lg font-bold text-(--text)">
							No matching posts found
						</h3>
						<p className="text-(--text-secondary) text-xs sm:text-sm max-w-sm mx-auto">
							Try adjusting your keyword or clearing filters to locate what you
							need.
						</p>
					</div>
				</div>
			) : (
				<div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
					{posts.map((post) => {
						return <ArticleCard key={post.id} post={post} />;
					})}
				</div>
			)}
		</div>
	);
}

function ArticleCard({ post }: { post: any }) {
	const [imageError, setImageError] = useState(false);
	const primaryCategory = post.categories?.[0];

	return (
		<article className="group flex">
			<Link
				to="/posts/$postId"
				params={{ postId: post.id.toString() }}
				className="w-full flex"
			>
				<Card className="w-full bg-(--bg-secondary)/40 hover:bg-(--bg-secondary)/80 border-(--border) hover:border-(--link)/50 transition-all duration-300 hover:shadow-2xl hover:shadow-(--link)/10 flex flex-col overflow-hidden rounded-3xl">
					<div className="overflow-hidden aspect-[16/10] bg-(--bg) relative border-b border-(--border)">
						{post.image && !imageError ? (
							<img
								src={post.image}
								alt={post.title}
								onError={() => setImageError(true)}
								className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700 ease-out"
							/>
						) : (
							<div className="w-full h-full flex flex-col items-center justify-center gap-2 bg-gradient-to-br from-(--bg-secondary) to-(--bg) text-(--text-secondary)">
								<div className="p-3 rounded-2xl bg-(--bg) border border-(--border) shadow-inner text-(--link)">
									<ImageIcon className="w-5 h-5" />
								</div>
								<span className="text-[11px] font-mono tracking-wider uppercase text-(--text-secondary)/80">
									Charlee's Archive
								</span>
							</div>
						)}
					</div>

					<CardHeader className="p-6 pb-3 space-y-3 flex-1">
						<div className="flex flex-wrap gap-1.5">
							{primaryCategory ? (
								<span className="rounded-full bg-(--bg) border border-(--border) px-3 py-1 text-[11px] font-bold text-(--link) capitalize tracking-wide shadow-sm">
									{primaryCategory.name}
								</span>
							) : (
								<span className="rounded-full bg-(--bg) border border-(--border) px-3 py-1 text-[11px] font-bold text-(--text-secondary) capitalize tracking-wide shadow-sm">
									General
								</span>
							)}
						</div>

						<h3 className="text-xl font-bold tracking-tight text-(--text) group-hover:text-(--link) transition-colors line-clamp-2 leading-snug">
							{post.title}
						</h3>
						<p className="text-(--text-secondary) line-clamp-2 text-xs sm:text-sm leading-relaxed">
							{post.excerpt}
						</p>
					</CardHeader>

					<CardFooter className="p-6 pt-0 border-t border-(--border)/40 mt-auto flex items-center justify-between text-xs text-(--text-secondary)">
						<div className="flex items-center gap-1.5 pt-4 font-medium">
							<Calendar className="w-3.5 h-3.5 text-(--link)" />
							<span>{new Date(post.date).toLocaleDateString()}</span>
						</div>
						<div className="flex items-center gap-1.5 pt-4 font-medium">
							<User className="w-3.5 h-3.5 text-(--link)" />
							<span>{post.user?.displayUsername || "Anonymous"}</span>
						</div>
					</CardFooter>
				</Card>
			</Link>
		</article>
	);
}

/* -------------------------------------------------------------------------- */
/*                               Skeleton UI                                  */
/* -------------------------------------------------------------------------- */

function ArticleCardSkeleton() {
	return (
		<div className="rounded-3xl bg-(--bg-secondary)/40 border border-(--border) p-6 space-y-4 animate-pulse flex flex-col h-full">
			<Skeleton className="w-full aspect-[16/10] rounded-2xl bg-(--bg)" />
			<div className="space-y-3 flex-1">
				<Skeleton className="h-6 w-20 rounded-full bg-(--bg)" />
				<Skeleton className="h-7 w-full bg-(--bg)" />
				<Skeleton className="h-7 w-4/5 bg-(--bg)" />
				<div className="space-y-2 pt-1">
					<Skeleton className="h-4 w-full bg-(--bg)" />
					<Skeleton className="h-4 w-2/3 bg-(--bg)" />
				</div>
			</div>
			<div className="pt-4 border-t border-(--border)/50 flex items-center justify-between">
				<Skeleton className="h-3.5 w-24 bg-(--bg)" />
				<Skeleton className="h-3.5 w-20 bg-(--bg)" />
			</div>
		</div>
	);
}

function GridSkeleton({ gridCount = 6 }: { gridCount?: number }) {
	return (
		<div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
			{Array.from({ length: gridCount }).map((_, i) => (
				// biome-ignore lint/suspicious/noArrayIndexKey: No-fix atm
				<ArticleCardSkeleton key={i} />
			))}
		</div>
	);
}

function ArticlesPageSkeleton() {
	return (
		<div className="min-h-screen text-(--text) bg-(--bg)">
			<div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 lg:py-20 space-y-12">
				<div className="border-b border-(--border)/60 pb-10 space-y-4">
					<Skeleton className="h-4 w-28 bg-(--bg-secondary)" />
					<div className="space-y-3">
						<Skeleton className="h-6 w-36 rounded-full bg-(--bg-secondary)" />
						<Skeleton className="h-12 sm:h-16 w-80 bg-(--bg-secondary)" />
						<Skeleton className="h-5 w-96 max-w-full bg-(--bg-secondary)" />
					</div>
				</div>

				<div className="space-y-8">
					<div className="flex flex-col md:flex-row gap-4 justify-between items-center bg-(--bg-secondary)/40 p-4 rounded-3xl border border-(--border)">
						<Skeleton className="h-12 w-full md:w-[420px] rounded-2xl bg-(--bg)" />
						<Skeleton className="h-12 w-full md:w-72 rounded-2xl bg-(--bg)" />
					</div>

					<GridSkeleton gridCount={6} />
				</div>
			</div>
		</div>
	);
}
