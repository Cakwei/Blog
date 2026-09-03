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
      title: 'Self-Introduction',
      categorySlugs: [] as string[],
      excerpt: 'A short first post introduction and for testing purposes',
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

    // Rich Tiptap JSON Document Structure
    const tiptapContent = {
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
          type: 'blockquote',
          content: [
            {
              type: 'paragraph',
              attrs: { textAlign: null },
              content: [{ type: 'text', text: 'Test blockquote' }],
            },
          ],
        },
        {
          type: 'codeBlock',
          attrs: { language: null },
          content: [{ type: 'text', text: 'console.log("Hello, world!") // Boom' }],
        },
        {
          type: 'paragraph',
          attrs: { textAlign: null },
          content: [
            { type: 'text', marks: [{ type: 'bold' }], text: 'Bold ' },
            { type: 'text', text: 'vs not bold' },
          ],
        },
        {
          type: 'paragraph',
          attrs: { textAlign: null },
          content: [
            { type: 'text', marks: [{ type: 'italic' }], text: 'Italic vs not ' },
            { type: 'text', text: 'italic' },
          ],
        },
        {
          type: 'paragraph',
          attrs: { textAlign: null },
          content: [{ type: 'text', marks: [{ type: 'strike' }], text: 'Strike' }],
        },
        {
          type: 'paragraph',
          attrs: { textAlign: null },
          content: [{ type: 'text', marks: [{ type: 'underline' }], text: 'Underline' }],
        },
        {
          type: 'paragraph',
          attrs: { textAlign: null },
          content: [
            {
              type: 'text',
              marks: [
                {
                  type: 'link',
                  attrs: {
                    href: 'https://www.youtube.com',
                    target: '_blank',
                    rel: 'noopener noreferrer nofollow',
                    class: null,
                    title: null,
                  },
                },
              ],
              text: 'https://www.youtube.com',
            },
          ],
        },
        {
          type: 'paragraph',
          attrs: { textAlign: null },
          content: [
            { type: 'text', text: 'Superscript' },
            { type: 'text', marks: [{ type: 'superscript' }], text: '1' },
          ],
        },
        {
          type: 'paragraph',
          attrs: { textAlign: null },
          content: [
            { type: 'text', text: 'Subscript' },
            { type: 'text', marks: [{ type: 'subscript' }], text: '2' },
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
    };

    await prisma.post.create({
      data: {
        title: blueprint.title,
        slug: `${slug}-${id}`,
        excerpt: blueprint.excerpt,
        date: new Date(Date.now() - index * 86400000 * 2),
        userId,
        image: `https://s3.cakwei.dev/blog/8725b9ca-1ef3-458d-b292-9ef2790a3b07-That_Time_I_Got_Reincarnated_as_a_Slime_Season_3_E11.png`,
        content: tiptapContent,
        published: true,
        isFeatured: index < 3,
        views: Math.floor(Math.random() * 1500) + 50,
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
