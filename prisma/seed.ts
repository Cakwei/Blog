import { prisma } from '#/db'
import type { Category } from '#/generated/prisma/client'
import { hashPassword } from 'better-auth/crypto'

const fetchThisEmailId = 'charleetan2020@gmail.com'
const ISSUER = 'local:credential'

async function main() {
    console.log('🌱 Seeding database...')

    await prisma.post.deleteMany()
    await prisma.category.deleteMany()
    await prisma.session.deleteMany()
    await prisma.account.deleteMany()
    await prisma.user.deleteMany()

    console.log('🧹 Cleaned existing database data.')

    const defaultHashedPassword = await hashPassword('123456789')

    const primaryUser = await prisma.user.create({
        data: {
            id: 'FA96EjZ4aTQrdKvruz3kknCgGk5LkcwT',
            name: 'Charlee Tan',
            email: fetchThisEmailId,
            emailVerified: true,
            username: 'cakwei',
            displayUsername: 'Cakwei',
            image: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=400&auto=format&fit=crop&q=80',
            accounts: {
                create: {
                    id: 'acc_primary_1',
                    accountId: 'FA96EjZ4aTQrdKvruz3kknCgGk5LkcwT',
                    providerId: 'credential',
                    password: defaultHashedPassword,
                    'issuer': ISSUER,    
                },
                
            },
        },
    })

    const secondaryUser = await prisma.user.create({
        data: {
            id: 'user_mock_2',
            name: 'Charlee Tan 2',
            email: 'charleetan121@gmail.com',
            emailVerified: true,
            username: 'cakwei2',
            displayUsername: 'Cakwei2',
            image: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=400&auto=format&fit=crop&q=80',
            accounts: {
                create: {
                    id: 'acc_secondary_2',
                    accountId: 'user_mock_2',
                    providerId: 'credential',
                    password: defaultHashedPassword,
                    'issuer': ISSUER,
                },
            },
        },
    })

    console.log('👤 Created mock users with Better Auth credential accounts (Password: 123456789).')

    const targetAccount = await prisma.account.findFirst({
        where: {
            accountId: fetchThisEmailId,
            providerId: 'credential',
        },
        select: {
            userId: true,
        },
    })

    const primaryUserId = targetAccount ? targetAccount.userId : primaryUser.id
    console.log(`🔍 Resolved primaryUserId from account lookup: ${primaryUserId}`)

    const categoryData = [
        { name: 'Engineering', slug: 'engineering' },
        { name: 'TypeScript', slug: 'typescript' },
        { name: 'Backend', slug: 'backend' },
        { name: 'Design Systems', slug: 'design-systems' },
        { name: 'Productivity', slug: 'productivity' },
    ]

    const createdCategories: Category[] = []
    for (const cat of categoryData) {
        const created = await prisma.category.create({ data: cat })
        createdCategories.push(created)
    }
    console.log(`🏷️ Created ${createdCategories.length} categories.`)

    const postBlueprints = [
        {
            title: 'The Future of Full-stack React',
            categorySlugs: ['engineering', 'typescript'],
            excerpt: 'Exploring why modern meta-frameworks are shifting the paradigm for React developers worldwide.',
        },
        {
            title: 'Mastering Type-Safe Routing in Modern Apps',
            categorySlugs: ['typescript'],
            excerpt: 'How to leverage advanced TypeScript features to never write a broken layout route or link again.',
        },
        {
            title: 'Server Functions Explained: Bridging the Gap',
            categorySlugs: ['backend', 'engineering'],
            excerpt: 'Bridge the gap seamlessly between your client frontend and backend database infrastructure.',
        },
        {
            title: 'Why We Moved Back to Monoliths',
            categorySlugs: ['engineering'],
            excerpt: 'Microservices added unnecessary overhead. Here is why consolidating our architecture scaled better.',
        },
        {
            title: 'Deep Dive into Prisma Performance',
            categorySlugs: ['backend', 'typescript'],
            excerpt: 'Unlock maximum database query efficiency using indexes, selective payloads, and connection pooling.',
        },
        {
            title: 'Writing Clean Tailwind CSS Architecture',
            categorySlugs: ['design-systems', 'productivity'],
            excerpt: 'Structure utility classes cleanly using component patterns and layout abstraction systems.',
        },
        {
            title: 'State Management: What Actually Matters',
            categorySlugs: ['productivity'],
            excerpt: 'Ditch global bloat. Learn when to use URL search params, React context, or server cache states.',
        },
        {
            title: 'Building Resilient Micro-Frontends',
            categorySlugs: ['engineering', 'design-systems'],
            excerpt: 'Decouple large team workflows without sacrificing bundle performance or layout consistency.',
        },
        {
            title: 'A Practical Guide to Database Indexing',
            categorySlugs: ['backend'],
            excerpt: 'Composite indexes, B-trees, and query optimization strategies every fullstack engineer should know.',
        },
        {
            title: 'Async/Await Patterns You Should Know',
            categorySlugs: ['typescript', 'backend'],
            excerpt: 'Clean up asynchronous JavaScript code with advanced concurrency handling and error boundaries.',
        },
        {
            title: 'Securing Node.js Applications with Better Auth',
            categorySlugs: ['backend', 'security' as any], // Fallback gracefully if slug missing
            excerpt: 'Implement bulletproof sessions, credential hashing, and OAuth guards effortlessly.',
        },
        {
            title: 'Optimizing Core Web Vitals for Blogs',
            categorySlugs: ['productivity', 'engineering'],
            excerpt: 'Boost SEO rankings by optimizing Largest Contentful Paint and Cumulative Layout Shift.',
        },
        {
            title: 'The Hidden Power of TypeScript Conditional Types',
            categorySlugs: ['typescript'],
            excerpt: 'Write dynamic types that adapt based on input shapes using infer constraints and utility helpers.',
        },
        {
            title: 'Dockerizing Fullstack Apps Made Simple',
            categorySlugs: ['engineering', 'backend'],
            excerpt: 'Multi-stage Docker builds optimized for lightning-fast container deployment pipelines.',
        },
        {
            title: 'UI/UX Trends Shaping Software Today',
            categorySlugs: ['design-systems'],
            excerpt: 'Minimalist layouts, micro-interactions, and accessible design principles for modern web apps.',
        },
        {
            title: 'Introduction to Edge Computing',
            categorySlugs: ['backend', 'engineering'],
            excerpt: 'Run code closer to your users with serverless edge functions and distributed key-value stores.',
        },
        {
            title: 'Writing Automated Tests That Don’t Flake',
            categorySlugs: ['productivity', 'typescript'],
            excerpt: 'Best practices for writing predictable, maintainable end-to-end integration test suites.',
        },
        {
            title: 'Refactoring Legacy Code Without Fear',
            categorySlugs: ['engineering'],
            excerpt: 'The Boy Scout rule in action: incremental refactoring strategies supported by robust type checking.',
        },
        {
            title: 'Effective Code Reviews for Fast Teams',
            categorySlugs: ['productivity'],
            excerpt: 'Build psychological safety, automate style checks, and review PRs with high developer empathy.',
        },
        {
            title: 'Building a Personal Brand as a Developer',
            categorySlugs: ['productivity'],
            excerpt: 'Why sharing your daily engineering learnings publicly accelerates your career trajectory.',
        },
    ]

    for (const [index, blueprint] of postBlueprints.entries()) {
        const id = index + 1
        const slug = blueprint.title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '')
        const userId = index % 2 === 0 ? primaryUserId : secondaryUser.id

        // Filter valid category slugs matching our created categories
        const matchedCategories = createdCategories.filter((cat) =>
            blueprint.categorySlugs.includes(cat.slug)
        )
        const fallbackCategory = [createdCategories[0]] // Fallback to first category if none match

        // Rich Tiptap JSON Document Structure
        const tiptapContent = {
            type: 'doc',
            content: [
                {
                    type: 'heading',
                    attrs: { level: 1 },
                    content: [{ type: 'text', text: blueprint.title }],
                },
                {
                    type: 'paragraph',
                    content: [
                        {
                            type: 'text',
                            text: `Welcome to this deep dive. In this article, we explore the core principles of ${blueprint.title.toLowerCase()} and how modern web architecture is evolving to meet higher standards of speed and developer ergonomics.`,
                        },
                    ],
                },
                {
                    type: 'heading',
                    attrs: { level: 2 },
                    content: [{ type: 'text', text: 'Key Architectural Concepts' }],
                },
                {
                    type: 'paragraph',
                    content: [
                        {
                            type: 'text',
                            text: 'When building production-ready systems, maintaining type safety and clean component boundaries is crucial. Here is a quick example showcasing how modern tooling simplifies complex workflows:',
                        },
                    ],
                },
                {
                    type: 'codeBlock',
                    attrs: { language: 'typescript' },
                    content: [
                        {
                            type: 'text',
                            text: `// Example configuration for modern workflows\nconst config = {\n  name: "${blueprint.title}",\n  version: "1.0.0",\n  enabled: true,\n};\n\nexport function bootstrap() {\n  console.log("System initialized successfully.");\n}`,
                        },
                    ],
                },
                {
                    type: 'heading',
                    attrs: { level: 2 },
                    content: [{ type: 'text', text: 'Conclusion & Next Steps' }],
                },
                {
                    type: 'paragraph',
                    content: [
                        {
                            type: 'text',
                            text: 'By implementing these strategies early in your project lifecycle, you can avoid technical debt and scale your application effortlessly. Happy coding!',
                        },
                    ],
                },
            ],
        }

        await prisma.post.create({
            data: {
                title: blueprint.title,
                slug: `${slug}-${id}`,
                excerpt: blueprint.excerpt,
                date: new Date(Date.now() - index * 86400000 * 2),
                userId,
                image: `https://picsum.photos/seed/post${id}/800/450`,
                content: tiptapContent,
                published: true,
                isFeatured: index < 3,
                views: Math.floor(Math.random() * 1500) + 50,
                // Assign multiple categories using Prisma's connect syntax
                categories: {
                    connect: (matchedCategories.length > 0 ? matchedCategories : fallbackCategory).map((cat) => ({
                        id: cat.id,
                    })),
                },
            },
        })
    }

    console.log(`✅ Successfully seeded ${postBlueprints.length} rich Tiptap-formatted posts with multi-category support.`)
}

main()
    .catch((e) => {
        console.error('❌ Error seeding database:', e)
        process.exit(1)
    })
    .finally(async () => {
        await prisma.$disconnect()
    })