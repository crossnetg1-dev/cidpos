# Setup Guide

## Initial Setup Steps

### 1. Install Dependencies

```bash
npm install
```

### 2. Environment Variables

Create a `.env` file in the root directory:

```bash
cp .env.example .env
```

Or manually create `.env` with:

```env
DATABASE_URL="file:./dev.db"
NEXTAUTH_SECRET="your-secret-key-here"
NEXTAUTH_URL="http://localhost:3000"
APP_NAME="POS System"
APP_URL="http://localhost:3000"
```

### 3. Database Setup

Generate Prisma Client and create the database:

```bash
# Generate Prisma Client
npm run db:generate

# Push schema to database (creates tables)
npm run db:push

# Or use migrations (recommended for production)
npm run db:migrate
```

### 4. Create Initial Admin User

You can create an initial admin user using Prisma Studio:

```bash
npm run db:studio
```

Or create a seed script (recommended):

Create `prisma/seed.ts`:

```typescript
import { PrismaClient } from '@prisma/client'
import * as bcrypt from 'bcryptjs'

const prisma = new PrismaClient()

async function main() {
  // Create default admin user
  const hashedPassword = await bcrypt.hash('admin123', 10)
  
  const admin = await prisma.user.upsert({
    where: { username: 'admin' },
    update: {},
    create: {
      username: 'admin',
      password: hashedPassword,
      fullName: 'Administrator',
      role: 'OWNER',
      status: 'ACTIVE',
    },
  })

  console.log('Admin user created:', admin)

  // Create default category
  const category = await prisma.category.upsert({
    where: { name: 'General' },
    update: {},
    create: {
      name: 'General',
      description: 'General category',
    },
  })

  console.log('Default category created:', category)
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
```

Then add to `package.json`:

```json
{
  "prisma": {
    "seed": "ts-node --compiler-options {\"module\":\"CommonJS\"} prisma/seed.ts"
  }
}
```

Run seed:

```bash
npx prisma db seed
```

### 5. Install Shadcn/UI Components

Initialize Shadcn/UI:

```bash
npx shadcn-ui@latest init
```

Add components as needed:

```bash
npx shadcn-ui@latest add button
npx shadcn-ui@latest add input
npx shadcn-ui@latest add card
npx shadcn-ui@latest add dialog
npx shadcn-ui@latest add table
# ... add more as needed
```

### 6. Run Development Server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

## Default Credentials

After running the seed script:

- **Username**: `admin`
- **Password**: `admin123`

⚠️ **Important**: Change the default password immediately after first login!

## Project Structure

```
pos-js/
├── app/                    # Next.js App Router
│   ├── (auth)/            # Authentication routes
│   ├── (dashboard)/       # Dashboard routes
│   ├── api/               # API routes
│   ├── layout.tsx         # Root layout
│   └── page.tsx           # Home page
├── components/            # React components
│   ├── ui/               # Shadcn UI components
│   └── ...               # Feature components
├── lib/                  # Utility functions
│   ├── prisma.ts         # Prisma client
│   ├── utils.ts          # Helper functions
│   ├── validations.ts    # Zod schemas
│   ├── constants.ts      # App constants
│   └── helpers.ts        # Helper functions
├── stores/               # Zustand stores
│   ├── cart-store.ts     # Shopping cart
│   └── session-store.ts  # User session
├── types/                # TypeScript types
│   └── index.ts
├── prisma/               # Prisma files
│   └── schema.prisma     # Database schema
└── ...
```

## Next Steps

1. ✅ Database schema is ready
2. ✅ Basic project structure is set up
3. ⏳ Create authentication pages (login, etc.)
4. ⏳ Create dashboard layout
5. ⏳ Implement POS interface
6. ⏳ Build product management
7. ⏳ Add other modules...

## Troubleshooting

### Database Issues

If you encounter database errors:

```bash
# Reset database (⚠️ deletes all data)
npx prisma migrate reset

# Or delete and recreate
rm prisma/dev.db
npm run db:push
```

### Prisma Client Issues

If Prisma Client is not generated:

```bash
npm run db:generate
```

### Port Already in Use

If port 3000 is already in use:

```bash
# Use a different port
npm run dev -- -p 3001
```

## Development Commands

```bash
# Development
npm run dev              # Start dev server

# Database
npm run db:generate      # Generate Prisma Client
npm run db:push          # Push schema changes
npm run db:migrate       # Create migration
npm run db:studio        # Open Prisma Studio

# Build
npm run build            # Build for production
npm run start            # Start production server
npm run lint             # Run ESLint
```

