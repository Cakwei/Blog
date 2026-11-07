import { createFileRoute } from '@tanstack/react-router';
import { z } from 'zod';
import { prisma } from '#/db';
import { MESSAGE } from '#/lib/const';
import { authMiddleware } from '#/lib/middleware';
import { logger, parseBody, safeParseInt } from '#/lib/utils';

const ALLOWED_MIME_TYPES = [
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/gif',
] as const;

const createPostSchema = z.object({
  title: z.string().min(1, 'Title is required').max(200, 'Title too long'),
  excerpt: z.string().max(500, 'Excerpt too long').optional(),
  jsonContent: z.any(),
  tags: z.array(z.string().trim().min(1)).optional(),
  fileName: z.string().min(1, 'File name is required').max(255),
  fileType: z.string().refine(
    (type) => ALLOWED_MIME_TYPES.includes(type as any),
    'Only JPEG, PNG, WebP, or GIF image files are allowed',
  ),
  base64Data: z
    .string()
    .min(1, 'Base64 image data is required')
    .max(8 * 1024 * 1024, 'Image payload exceeds 8MB base64 limit'),
});

export const Route = createFileRoute('/api/posts/')({
  server: {
    handlers: ({ createHandlers }) =>
      createHandlers({
        GET: {
          //  middleware: [authMiddleware],
          handler: async ({ request }) => {
            try {
              const url = new URL(request.url);
              const search = url.searchParams.get('search') || '';
              const limit = safeParseInt(url.searchParams.get('limit')) || 10;
              const page = safeParseInt(url.searchParams.get('page')) || 1;
              const skip = (page - 1) * limit;

              const whereClause = {
                published: true,
                title: { contains: search },
              };

              const [posts, totalPosts] = await Promise.all([
                prisma.post.findMany({
                  take: limit,
                  skip: skip,
                  where: whereClause,
                  orderBy: { date: 'desc' },
                  select: {
                    id: true,
                    categories: true,
                    content: true,
                    date: true,
                    isFeatured: true,
                    excerpt: true,
                    image: true,
                    published: true,
                    title: true,
                    userId: true,
                    user: {
                      select: {
                        displayUsername: true,
                      },
                    },
                  },
                }),
                prisma.post.count({ where: whereClause }),
              ]);

              const totalPages = Math.ceil(totalPosts / limit);

              return Response.json({
                success: true,
                data: posts,
                totalCount: totalPosts,
                totalPages,
                currentPage: page,
                message: MESSAGE.FETCH_SUCCESS,
              });
            } catch (error) {
              logger('debug', 'api/posts/index', error);
              return Response.json({
                success: false,
                data: {},
                message: MESSAGE.SERVER_ERROR,
              });
            }
          },
        },
        POST: {
          middleware: [authMiddleware],
          handler: async ({ request, context }) => {
            try {
              const body = await parseBody(request);

              // Validate and parse body using Zod
              const result = createPostSchema.safeParse(body);

              if (!result.success) {
                const errorMessage = result.error.issues
                  .map((issue) => `${issue.path.join('.')}: ${issue.message}`)
                  .join(', ');

                return Response.json(
                  {
                    success: false,
                    message: errorMessage || 'Validation failed',
                  },
                  { status: 400 },
                );
              }

              const { title, excerpt, jsonContent, tags, fileName, fileType, base64Data } = result.data;

              const session = context.session;

              // Upload Image to S3
              const { Upload } = await import('@aws-sdk/lib-storage');
              const { s3Client } = await import('#/lib/s3');

              const uuid = crypto.randomUUID();
              const cleanFileName = fileName.replace(/[^a-zA-Z0-9.-]/g, '_');
              const s3Key = `${uuid}-${cleanFileName}`;

              const base64Content = base64Data.includes(',')
                ? base64Data.split(',')[1]
                : base64Data;
              const buffer = Buffer.from(base64Content, 'base64');

              if (buffer.length > 5 * 1024 * 1024) {
                return Response.json(
                  {
                    success: false,
                    message: 'Decoded image exceeds maximum allowed limit of 5MB',
                  },
                  { status: 400 },
                );
              }

              const bucketName = process.env.S3_BUCKET || 'blog';
              const uploader = new Upload({
                client: s3Client,
                params: {
                  Bucket: bucketName,
                  Key: s3Key,
                  Body: buffer,
                  ContentType: fileType,
                },
                queueSize: 4,
                partSize: 5 * 1024 * 1024,
              });

              await uploader.done();
              const baseUrl = process.env.S3_PUBLIC_URL || 'https://s3.cakwei.dev/blog';
              const imageUrl = `${baseUrl.replace(/\/$/, '')}/${s3Key}`;

              // Handle multiple categories mapping
              const categoryList = tags && tags.length > 0 ? tags : ['Engineering'];

              const categoryRecords = await Promise.all(
                categoryList.map(async (catName: string) => {
                  const categorySlug = catName
                    .toLowerCase()
                    .replace(/[^a-z0-9]+/g, '-')
                    .replace(/(^-|-$)/g, '');

                  return prisma.category.upsert({
                    where: { slug: categorySlug },
                    update: {},
                    create: {
                      name: catName,
                      slug: categorySlug,
                    },
                  });
                }),
              );

              // Save post to database with multiple category connections
              const slug = title
                .toLowerCase()
                .replace(/[^a-z0-9]+/g, '-')
                .replace(/(^-|-$)/g, '');

              await prisma.post.create({
                data: {
                  title,
                  slug: `${slug}-${Date.now()}`,
                  excerpt: excerpt || 'A deep dive into article contents.',
                  date: new Date(),
                  image: imageUrl,
                  content: jsonContent,
                  published: true,
                  isFeatured: false,
                  views: 0,
                  user: {
                    connect: { id: session.user.id },
                  },
                  categories: {
                    connect: categoryRecords.map((cat) => ({ id: cat.id })),
                  },
                },
              });

              return Response.json({
                success: true,
                message: 'Successfully published post',
              });
            } catch (error: any) {
              logger('error', 'Post Creation API Error:', error);
              return Response.json(
                {
                  success: false,
                  message: error?.message || 'An internal server error occurred',
                },
                { status: 500 },
              );
            }
          },
        },
      }),
  },
});
