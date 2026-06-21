import { PrismaClient } from '../src/generated/prisma/client.js'
import { PrismaMariaDb } from '@prisma/adapter-mariadb'

export const adapter = new PrismaMariaDb({
  host: 'localhost',
  port: 3306,
  connectionLimit: 5,
  user:'root',
  database: 'blog'
})

const tempId = 'LAadQqhJakDFV5LoVbKVawMNQa4M4J0N'
export const prisma = new PrismaClient({ adapter })

async function main() {
  console.log('🌱 Seeding database...')

  // Clear existing todos
   await prisma.post.deleteMany()

  // Create example todos
const posts = await prisma.post.createMany({
	data: [
		{
			id: "1",
			title: "The Future of Full-stack React",
			excerpt:
				"Exploring why TanStack Start is changing the game for React developers...",
			date: new Date("2024-05-20").toISOString(),
			userId:tempId,
			category: "Engineering",
			image: "https://picsum.photos/seed/post1/800/450",
		},
		{
			id: "2",
			title: "Mastering Type-Safe Routing",
			excerpt: "How to leverage TypeScript to never write a broken link again.",
			date: new Date("2024-05-18").toISOString(),
			userId:tempId,
			category: "TypeScript",
			image: "https://picsum.photos/seed/post2/800/450",
		},
		{
			id: "3",
			title: "Server Functions Explained",
			excerpt: "Bridge the gap between your frontend and backend seamlessly.",
			date: new Date("2024-05-15").toISOString(),
			userId: tempId,
			category: "Backend",
			image: "https://picsum.photos/seed/post3/800/450",
		},
	]
	})
	console.log(`✅ Created ${posts.count} todos`)

	} 


main()
  .catch((e) => {
    console.error('❌ Error seeding database:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
