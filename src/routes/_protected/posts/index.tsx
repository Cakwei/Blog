import { queryOptions, useQueryClient, useSuspenseQuery } from '@tanstack/react-query';
import { createFileRoute, Link, useNavigate } from '@tanstack/react-router';
import { createServerFn } from '@tanstack/react-start';
import type { Session } from 'better-auth';
import { Suspense } from 'react';
import { Button } from '#/components/ui/button';
import { Loading } from '#/components/ui/loading';
import { prisma } from '#/db';
import type { Post } from '#/lib/types';
import { getFreshServerSession } from '#/lib/utils';
import '#/index.css';

const getOwnPosts = createServerFn().handler(async () => {
  // This runs only on the server
  const session = await getFreshServerSession();
  const posts = await prisma.post.findMany({
    where: {
      userId: session?.user.id,
    },
  });
  console.log(JSON.stringify(posts));
  return posts;
});

const postsQueryOptions = (userId: string) =>
  queryOptions({
    queryKey: ['posts', userId],
    queryFn: () => getOwnPosts(),
  });

export const Route = createFileRoute('/_protected/posts/')({
  beforeLoad: async ({ context }) => {
    const userId = context.user.id;
    context.queryClient.fetchQuery(postsQueryOptions(userId));
  },
  component: AdminPostsPage,
});

function AdminPostsPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  
  return (
    <div className="bg-black">
      <div className="max-w-6xl bg-black mx-auto px-4 py-12">
        <div className="flex justify-between items-end mb-10">
          <div>
            <h1 className="text-3xl text-white font-extrabold">Your posts</h1>
            <p className="text-neutral-300 mt-1">Create, edit, and publish your articles.</p>
          </div>
          <Button
            onClick={() => navigate({ to: '/posts/create' })}
            className="px-5 bg-white text-black border hover:bg-white/90 border-neutral-700 font-semibold transition-colors whitespace-nowrap"
          >
            New post
          </Button>
          {/*<Button
						onClick={() => {
							queryClient.clear();
							//queryClient.removeQueries();
						}}
						className="px-5 bg-white text-black border hover:bg-white/90 border-neutral-700 font-semibold transition-colors whitespace-nowrap"
					>
						Reset Cache
					</Button> */}
        </div>

        {/* Suspense handles the loading state cleanly while useSuspenseQuery fetches data */}
        <Suspense fallback={<Loading />}>
          <PostListContent />
        </Suspense>
      </div>
    </div>
  );
}

// Extracted the query logic into a separate component so Suspense can catch the loading promise
function PostListContent() {
  const { session }: { session: Session } = Route.useRouteContext();
  const userId = session.userId;
  const { data: posts } = useSuspenseQuery(postsQueryOptions(userId));

  if (posts.length === 0) {
    return <EmptyState />;
  }

  return (
    <div className="rounded-2xl overflow-hidden divide-y divide-neutral-700">
      {posts.map((post) => (
        <PostRow key={post.id} post={post} />
      ))}
    </div>
  );
}

function PostRow({ post }: { post: Post }) {
  const isDraft = post.status === 'draft';

  return (
    <div className="flex items-center gap-4 px-5 py-4 hover:bg-neutral-900 transition-colors group">
      <div className="w-16 h-16 rounded-lg overflow-hidden bg-gray-100 flex-shrink-0">
        {post.image && <img src={post.image} alt="" className="w-full h-full object-cover" />}
      </div>

      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-1">
          <span
            className={`text-xs font-semibold px-2 py-0.5 rounded-full ${
              isDraft ? 'bg-amber-50 text-amber-700' : 'bg-green-50 text-green-700'
            }`}
          >
            {isDraft ? 'Draft' : 'Published'}
          </span>
          <span className="text-xs font-bold text-white flex gap-1.5">
            {post.category ? (
              post.category.split(',').map((cat) => (
                <span
                  key={cat}
                  className={`rounded-full border border-neutral-700 px-2.5 py-0.5 text-xs font-semibold bg-blue-600 text-white captitalize
                        `}
                >
                  {capitalize(cat)}
                </span>
              ))
            ) : (
              <span
                className={`rounded-full border border-neutral-700 px-2.5 py-0.5 text-xs font-semibold bg-blue-600 text-white captitalize
                            `}
              >
                No tags
              </span>
            )}
          </span>
        </div>
        <h3 className="font-bold text-white truncate hover:text-white/90 transition-colors">
          {post.title}
        </h3>
        <p className="text-sm text-neutral-400">
          {new Date(post.date).toLocaleDateString('en-MY')}
        </p>
      </div>

      <div className="flex items-center gap-2 flex-shrink-0">
        <Link
          to="/posts/$postId"
          params={{ postId: post.id.toString() }}
          className="px-3 py-2 text-sm font-semibold rounded-lg transition-colors"
        >
          <span className="text-white hover:bg-none hover:underline">View</span>
        </Link>
        <Link
          to="/posts/edit/$postId"
          params={{ postId: post.id.toString() }}
          className="px-3 py-2 text-sm font-semibold text-white rounded-lg transition-colors"
        >
          <span className="text-white hover:bg-none hover:underline">Edit</span>
        </Link>
      </div>
    </div>
  );
}

function EmptyState() {
  return (
    <div className="text-center py-20 border border-dashed min-h-[65dvh] border-neutral-500 flex justify-center flex-col items-center rounded-2xl">
      <h3 className="text-lg font-bold text-white mb-2">No posts yet</h3>
      <p className="text-neutral-300 mb-6 text-sm">Write your first post to see it here.</p>
    </div>
  );
}

function capitalize(string: string) {
  return string.charAt(0).toUpperCase() + string.slice(1).toLowerCase();
}
