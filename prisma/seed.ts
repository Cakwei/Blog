import { prisma } from '#/db';
import type { Category } from '#/generated/prisma/client';
import { hashPassword } from 'better-auth/crypto';

const fetchThisEmailId = 'charleetan2020@gmail.com';
const ISSUER = 'local:credential';

async function main() {
  console.log('🌱 Seeding database...');

  await prisma.post.deleteMany();
  await prisma.category.deleteMany();
  await prisma.session.deleteMany();
  await prisma.account.deleteMany();
  await prisma.user.deleteMany();

  console.log('🧹 Cleaned existing database data.');

  const defaultHashedPassword = await hashPassword('123456789');

  const primaryUser = await prisma.user.create({
    data: {
      id: 'FA96EjZ4aTQrdKvruz3kknCgGk5LkcwT',
      name: 'Charlee Tan',
      email: fetchThisEmailId,
      emailVerified: true,
      username: 'cakwei',
      displayUsername: 'Cakwei',
      image:
        'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=400&auto=format&fit=crop&q=80',
      accounts: {
        create: {
          id: 'acc_primary_1',
          accountId: 'FA96EjZ4aTQrdKvruz3kknCgGk5LkcwT',
          providerId: 'credential',
          password: defaultHashedPassword,
          issuer: ISSUER,
        },
      },
    },
  });

  const secondaryUser = await prisma.user.create({
    data: {
      id: 'user_mock_2',
      name: 'Charlee Tan 2',
      email: 'charleetan121@gmail.com',
      emailVerified: true,
      username: 'cakwei2',
      displayUsername: 'Cakwei2',
      image:
        'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=400&auto=format&fit=crop&q=80',
      accounts: {
        create: {
          id: 'acc_secondary_2',
          accountId: 'user_mock_2',
          providerId: 'credential',
          password: defaultHashedPassword,
          issuer: ISSUER,
        },
      },
    },
  });

  console.log('👤 Created mock users with Better Auth credential accounts (Password: 123456789).');

  const targetAccount = await prisma.account.findFirst({
    where: {
      accountId: fetchThisEmailId,
      providerId: 'credential',
    },
    select: {
      userId: true,
    },
  });

  const primaryUserId = targetAccount ? targetAccount.userId : primaryUser.id;
  console.log(`🔍 Resolved primaryUserId from account lookup: ${primaryUserId}`);

  const categoryData = [
    { name: 'Engineering', slug: 'engineering' },
    { name: 'TypeScript', slug: 'typescript' },
    { name: 'Backend', slug: 'backend' },
    { name: 'Design Systems', slug: 'design-systems' },
    { name: 'Productivity', slug: 'productivity' },
  ];

  const createdCategories: Category[] = [];
  for (const cat of categoryData) {
    const created = await prisma.category.create({ data: cat });
    createdCategories.push(created);
  }
  console.log(`🏷️ Created ${createdCategories.length} categories.`);

  const postBlueprints = [
    {
      title: 'Building Modern Full-Stack Web Apps with TanStack Start & Nitro',
      categorySlugs: ['engineering', 'typescript'],
      excerpt:
        'Why full-stack React is evolving beyond traditional frameworks. Architectural insights on type-safe server functions, fine-grained TanStack Query caching, and Nitro universal deployment.',
      image:
        'https://images.unsplash.com/photo-1555066931-4365d14bab8c?w=1200&auto=format&fit=crop&q=80',
      views: 1420,
      isFeatured: true,
      content: {
        type: 'doc',
        content: [
          {
            type: 'paragraph',
            content: [
              {
                type: 'text',
                text: 'The full-stack React landscape has reached an inflection point. For years, web teams traded architectural autonomy for monolithic, opinionated meta-frameworks. While conventions accelerate initial delivery, scaling production systems often surfaces friction with vendor lock-in, non-standard server primitives, and brittle bundling boundaries.',
              },
            ],
          },
          {
            type: 'heading',
            attrs: { level: 2 },
            content: [{ type: 'text', text: 'The Shift Toward Composable Architecture' }],
          },
          {
            type: 'paragraph',
            content: [
              {
                type: 'text',
                text: 'TanStack Start introduces a decoupled, standard-first approach. By pairing TanStack Router for type-safe routing, TanStack Query for reactive asynchronous cache management, and Nitro as the universal server runtime, applications remain portable across Node.js, Cloudflare Workers, and containerized Docker environments without rewriting platform glue code.',
              },
            ],
          },
          {
            type: 'heading',
            attrs: { level: 3 },
            content: [{ type: 'text', text: 'End-to-End Type Safety with Server Functions' }],
          },
          {
            type: 'paragraph',
            content: [
              {
                type: 'text',
                text: 'Unlike REST controllers or untyped fetch calls, `createServerFn` creates a type-safe RPC boundary between client execution and server logic. Every validator guarantees compile-time inference and runtime validation, eliminating manual schema drift between frontend and backend.',
              },
            ],
          },
          {
            type: 'heading',
            attrs: { level: 2 },
            content: [{ type: 'text', text: 'SSR Hydration and Anti-FOUC Strategies' }],
          },
          {
            type: 'paragraph',
            content: [
              {
                type: 'text',
                text: 'Server-side rendering must guarantee zero content layout shifts and zero flash-of-unstyled-content (anti-FOUC). Placing a lightweight inline theme script in the HTML document head ensures system preference and cached localStorage themes evaluate synchronously before rendering begins, while router loaders preload data into TanStack Query before client hydration starts.',
              },
            ],
          },
          {
            type: 'heading',
            attrs: { level: 2 },
            content: [{ type: 'text', text: 'Nitro Engine: Deploying Anywhere' }],
          },
          {
            type: 'paragraph',
            content: [
              {
                type: 'text',
                text: 'Nitro compiles standalone output for your target provider. Whether running inside lightweight Alpine Docker images on self-hosted VPS servers or distributed edge networks, runtime-specific adapter packages handle request parsing and response streaming predictably.',
              },
            ],
          },
        ],
      },
    },
    {
      title: 'Self-Hosting with Dokploy & Docker Containers',
      categorySlugs: ['engineering', 'backend'],
      excerpt:
        'Moving away from costly PaaS providers to a private VPS with Dokploy, GitOps automated builds, Traefik reverse proxies, and production container tuning.',
      image:
        'https://images.unsplash.com/photo-1607799279861-4dd421887fb3?w=1200&auto=format&fit=crop&q=80',
      views: 980,
      isFeatured: true,
      content: {
        type: 'doc',
        content: [
          {
            type: 'paragraph',
            content: [
              {
                type: 'text',
                text: 'Modern PaaS providers offer remarkable developer velocity, but their pricing models quickly become prohibitive as bandwidth, database compute, and container concurrency grow. Self-hosting production web services on bare-metal or cloud VPS infrastructure has seen a massive resurgence thanks to modern orchestration control planes like Dokploy.',
              },
            ],
          },
          {
            type: 'heading',
            attrs: { level: 2 },
            content: [{ type: 'text', text: 'Why Developers Are Returning to Self-Hosting' }],
          },
          {
            type: 'paragraph',
            content: [
              {
                type: 'text',
                text: 'With predictable fixed server costs, full root control, zero artificial limits on background workers or Cron tasks, and complete ownership of data sovereignty, self-hosting gives engineering teams transparency and resilience.',
              },
            ],
          },
          {
            type: 'heading',
            attrs: { level: 2 },
            content: [{ type: 'text', text: 'Dokploy Architecture & Traefik Routing' }],
          },
          {
            type: 'paragraph',
            content: [
              {
                type: 'text',
                text: 'Dokploy pairs a web management interface with Docker Swarm and Traefik. As container instances spin up, Traefik detects labels dynamically, auto-issues Let’s Encrypt SSL/TLS certificates via ACME challenges, and routes external HTTP/HTTPS traffic directly to container ports.',
              },
            ],
          },
          {
            type: 'heading',
            attrs: { level: 3 },
            content: [{ type: 'text', text: 'Railpack Builds and Production Image Optimization' }],
          },
          {
            type: 'paragraph',
            content: [
              {
                type: 'text',
                text: 'Using Railpack buildpacks simplifies container lifecycle management by detecting package managers automatically. Isolating dependencies into multi-stage cache layers ensures CI builds remain fast, reproducible, and minimal in final size.',
              },
            ],
          },
          {
            type: 'heading',
            attrs: { level: 2 },
            content: [{ type: 'text', text: 'Automated GitOps & Zero-Downtime Deployments' }],
          },
          {
            type: 'paragraph',
            content: [
              {
                type: 'text',
                text: 'Every push to main triggers webhook webhooks in Dokploy, building the latest commit, running migrations, and health-checking new container instances before draining traffic from old containers. The result is zero-downtime updates with a single git push.',
              },
            ],
          },
        ],
      },
    },
    {
      title: 'Authentication Architecture: Modern Session Security with Better Auth',
      categorySlugs: ['backend', 'typescript'],
      excerpt:
        'A comprehensive deep dive into modern session management, credential authentication with password hashing, and cookie security across SSR server boundaries.',
      image:
        'https://images.unsplash.com/photo-1558494949-ef010cbdcc31?w=1200&auto=format&fit=crop&q=80',
      views: 760,
      isFeatured: true,
      content: {
        type: 'doc',
        content: [
          {
            type: 'paragraph',
            content: [
              {
                type: 'text',
                text: 'Authentication remains one of the most critical and easily misconfigured pillars of modern web development. Balancing security, developer ergonomics, and server-side rendering performance requires a deliberate architectural strategy.',
              },
            ],
          },
          {
            type: 'heading',
            attrs: { level: 2 },
            content: [{ type: 'text', text: 'Database-Backed Sessions vs. Stateless JWTs' }],
          },
          {
            type: 'paragraph',
            content: [
              {
                type: 'text',
                text: 'While JSON Web Tokens (JWTs) provide stateless portability, real-time revocation and session management become notoriously complex when security incidents occur. Database-backed sessions stored in performant SQL tables allow instantaneous logout, multi-device management, and session invalidation without distributed token blacklists.',
              },
            ],
          },
          {
            type: 'heading',
            attrs: { level: 2 },
            content: [{ type: 'text', text: 'Better Auth Architecture & Extensibility' }],
          },
          {
            type: 'paragraph',
            content: [
              {
                type: 'text',
                text: 'Better Auth provides a TypeScript-first, modular authentication framework designed for modern web frameworks. It handles password hashing, two-factor authentication, email verification flows, and OAuth providers natively without requiring third-party hosted auth vendors.',
              },
            ],
          },
          {
            type: 'heading',
            attrs: { level: 3 },
            content: [{ type: 'text', text: 'Cookie Security in SSR Environments' }],
          },
          {
            type: 'paragraph',
            content: [
              {
                type: 'text',
                text: 'Session cookies require strict configuration: `HttpOnly` to eliminate client-side XSS leakage, `SameSite=Lax` to safeguard against Cross-Site Request Forgery (CSRF), and `Secure` to guarantee transmission exclusively over HTTPS. During SSR rendering, cookie headers are parsed server-side to resolve authenticated user context prior to DOM generation.',
              },
            ],
          },
          {
            type: 'heading',
            attrs: { level: 2 },
            content: [{ type: 'text', text: 'Enforcing Multi-Tenant Authorization in Server Functions' }],
          },
          {
            type: 'paragraph',
            content: [
              {
                type: 'text',
                text: 'Authentication identifies who the user is; authorization enforces what they are allowed to touch. Wrapping server function handlers with session checks ensures database queries always scope records by verified `userId`, guaranteeing zero authorization bypass or IDOR vulnerabilities.',
              },
            ],
          },
        ],
      },
    },
    {
      title: 'Self-Introduction',
      categorySlugs: [] as string[],
      excerpt: 'A short first post introduction and for testing purposes',
      image:
        'https://s3.cakwei.dev/blog/8725b9ca-1ef3-458d-b292-9ef2790a3b07-That_Time_I_Got_Reincarnated_as_a_Slime_Season_3_E11.png',
      views: 310,
      isFeatured: false,
      content: {
        type: 'doc',
        content: [
          {
            type: 'paragraph',
            attrs: { textAlign: null },
            content: [
              {
                type: 'text',
                text: 'Hello! To anyone reading this, I have developed this blog application as a way to demonstrate my fundamentals of programming and web development skills. I hope you like it alot.',
              },
            ],
          },
          {
            type: 'paragraph',
            attrs: { textAlign: null },
            content: [
              {
                type: 'text',
                text: 'Also anything below this line of text will be for testing purposes:',
              },
            ],
          },
          {
            type: 'heading',
            attrs: { textAlign: null, level: 1 },
            content: [{ type: 'text', text: 'Heading 1' }],
          },
          {
            type: 'heading',
            attrs: { textAlign: null, level: 2 },
            content: [{ type: 'text', text: 'Heading 2' }],
          },
          {
            type: 'heading',
            attrs: { textAlign: null, level: 3 },
            content: [{ type: 'text', text: 'Heading 3' }],
          },
          {
            type: 'heading',
            attrs: { textAlign: null, level: 4 },
            content: [{ type: 'text', text: 'Heading 4' }],
          },
          {
            type: 'bulletList',
            content: [
              {
                type: 'listItem',
                content: [
                  {
                    type: 'paragraph',
                    attrs: { textAlign: null },
                    content: [{ type: 'text', text: '1' }],
                  },
                ],
              },
              {
                type: 'listItem',
                content: [
                  {
                    type: 'paragraph',
                    attrs: { textAlign: null },
                    content: [{ type: 'text', text: '2' }],
                  },
                ],
              },
            ],
          },
          {
            type: 'orderedList',
            attrs: { start: 1, type: null },
            content: [
              {
                type: 'listItem',
                content: [
                  {
                    type: 'paragraph',
                    attrs: { textAlign: null },
                    content: [{ type: 'text', text: '1' }],
                  },
                ],
              },
              {
                type: 'listItem',
                content: [
                  {
                    type: 'paragraph',
                    attrs: { textAlign: null },
                    content: [{ type: 'text', text: '2' }],
                  },
                ],
              },
            ],
          },
          {
            type: 'image',
            attrs: {
              src: 'https://s3.cakwei.dev/blog/editor/c882014d-a835-4d15-9972-52175fcbbdb7-bom.gif',
              alt: 'bom',
              title: 'bom',
              width: 159,
              height: 91,
            },
          },
          { type: 'paragraph', attrs: { textAlign: null } },
        ],
      },
    },
  ];

  for (const [index, blueprint] of postBlueprints.entries()) {
    const id = index + 1;
    const slug = blueprint.title
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)/g, '');
    const userId = index % 2 === 0 ? primaryUserId : secondaryUser.id;

    // Filter valid category slugs matching our created categories
    const matchedCategories = createdCategories.filter((cat) =>
      blueprint.categorySlugs.includes(cat.slug),
    );
    const fallbackCategory = [createdCategories[0]]; // Fallback to first category if none match

    await prisma.post.create({
      data: {
        title: blueprint.title,
        slug: `${slug}-${id}`,
        excerpt: blueprint.excerpt,
        date: new Date(Date.now() - index * 86400000 * 2),
        userId,
        image: blueprint.image,
        content: blueprint.content,
        published: true,
        isFeatured: blueprint.isFeatured,
        views: blueprint.views,
        // Assign multiple categories using Prisma's connect syntax
        categories: {
          connect: (matchedCategories.length > 0 ? matchedCategories : fallbackCategory).map(
            (cat) => ({
              id: cat.id,
            }),
          ),
        },
      },
    });
  }

  console.log(
    `✅ Successfully seeded ${postBlueprints.length} rich Tiptap-formatted posts with multi-category support.`,
  );
}

main()
  .catch((e) => {
    console.error('❌ Error seeding database:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
