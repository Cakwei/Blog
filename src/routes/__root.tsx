import { TanStackDevtools } from '@tanstack/react-devtools';
import type { QueryClient } from '@tanstack/react-query';
import { createRootRouteWithContext, HeadContent, Link, Scripts } from '@tanstack/react-router';
import { TanStackRouterDevtoolsPanel } from '@tanstack/react-router-devtools';
import type { Session } from 'better-auth';
import { Button } from '#/components/ui/button';
import BetterAuthHeader from '#/integrations/better-auth/header-user';
import { getFreshServerSession } from '#/lib/utils';
import TanStackQueryDevtools from '../integrations/tanstack-query/devtools';
import appCss from '../styles.css?url';

interface MyRouterContext {
  queryClient: QueryClient;
  session?: Session;
}

export const Route = createRootRouteWithContext<MyRouterContext>()({
  beforeLoad: async ({ location }) => {
    const session = await getFreshServerSession();

    if (location.pathname === '/login') {
      return;
    }

    if (session) {
      // confirm("inside");
      return { session };
    }

    // Testing purposes
    // throw redirect({ to: "/login" });
  },
  head: () => ({
    meta: [
      {
        charSet: 'utf-8',
      },
      {
        name: 'viewport',
        content: 'width=device-width, initial-scale=1',
      },
      {
        title: "Charlee's Blog",
      },
    ],
    links: [
      {
        rel: 'stylesheet',
        href: appCss,
      },
    ],
  }),
  shellComponent: RootDocument,
});

function RootDocument({ children }: { children: React.ReactNode }) {
  const { session } = Route.useRouteContext();

  return (
    <html lang="en" style={{ backgroundColor: 'black', margin: 0 }}>
      <head>
        <HeadContent />
      </head>
      <body>
        {/* HEADER */}
        <header className="border-b backdrop-blur sticky top-0 left-0 z-50 border-neutral-700 w-full px-5 bg-black">
          <div className="h-16 w-full flex items-center justify-between">
            <div className="flex items-center gap-8">
              <Link to="/" className="text-xl font-bold tracking-tighter">
                Charlee's<span className="text-white"> Blog</span>
              </Link>
              <nav className="hidden md:flex gap-6 text-sm font-medium">
                {/*<Link to="/" className="transition-colors hover:text-primary">
									Articles
								</Link>
								<Link
									to="/"
									className="transition-colors hover:text-primary text-muted-foreground"
								>
									About
								</Link>*/}
              </nav>
            </div>
            {/* Showed depending not logged in OR logged in */}
            {session ? (
              <BetterAuthHeader />
            ) : (
              <div className="flex items-center gap-4">
                <Link to="/login">
                  <Button className="bg-white font-semibold border text-black hover:bg-white/90 border-neutral-700">
                    Log in{' '}
                  </Button>
                </Link>

                <Link to="/register">
                  <Button className="bg-white font-semibold border text-black hover:bg-white/90 border-neutral-700">
                    Sign up{' '}
                  </Button>
                </Link>
              </div>
            )}
          </div>
        </header>
        {children}
        {/* FOOTER */}
        <footer className="border-t py-12 bg-black border-neutral-700 h-auto">
          <div className="container mx-auto px-4">
            <div className="grid md:grid-cols-4 gap-8">
              <div className="col-span-2">
                <span className="text-xl text-[#318F97] font-bold tracking-tighter">
                  Charlee's<span className="text-white"> Blog</span>
                </span>
                <p className="text-sm text-neutral-300 max-w-xs">
                  Built with TanStack Start and BetterAuth
                </p>
              </div>
              <div>
                <h3 className="text-sm font-semibold mb-4 text-white">Resources</h3>
                <ul className="space-y-2 text-sm text-neutral-300">
                  <li>Documentation</li>
                  <li>Components</li>
                </ul>
              </div>
              <div>
                <h3 className="text-sm font-semibold mb-4 text-white">Legal</h3>
                <ul className="space-y-2 text-sm text-neutral-300">
                  <li>Privacy</li>
                  <li>Terms</li>
                </ul>
              </div>
            </div>
            <div className="mt-12 pt-8 border-t text-center border-neutral-700 text-sm text-neutral-300">
              © {new Date().getFullYear()} Charlee Tan. All rights reserved.
            </div>
          </div>
        </footer>
        <TanStackDevtools
          config={{
            position: 'bottom-right',
          }}
          plugins={[
            {
              name: 'Tanstack Router',
              render: <TanStackRouterDevtoolsPanel />,
            },
            TanStackQueryDevtools,
          ]}
        />
        <Scripts />
      </body>
    </html>
  );
}
