# POS System for Mini Mart

A comprehensive Point of Sale (POS) system built with Next.js 14, TypeScript, Prisma, and SQLite.

## Tech Stack

- **Framework**: Next.js 14 (App Router)
- **Language**: TypeScript
- **Styling**: Tailwind CSS + Shadcn/UI
- **Database**: SQLite
- **ORM**: Prisma
- **State Management**: Zustand (for Cart & Session)
- **Forms**: React Hook Form + Zod

## Features

### Core Modules

1. **Login & Security** 🔐
   - User authentication with role-based access (Owner/Cashier)
   - User management (CRUD operations)
   - Session management with auto-logout

2. **Dashboard** 📊
   - Today's sales summary
   - Quick stats cards
   - Alerts & notifications
   - Sales charts
   - Top selling products
   - Recent transactions

3. **POS (Point of Sale)** 🛒
   - Product search (barcode, name, category)
   - Shopping cart management
   - Pricing with discounts and tax
   - Customer selection
   - Multiple payment methods
   - Receipt generation

4. **Products Management** 📦
   - Product CRUD operations
   - Category management
   - Stock tracking
   - Barcode generation
   - Low stock alerts

5. **Purchase Management** 🚚
   - Supplier management
   - Purchase Orders (PO)
   - Goods Receipt Notes (GRN)
   - Purchase payments
   - Purchase returns

6. **Stock Management** 📊
   - Real-time stock tracking
   - Stock movements history
   - Stock adjustments
   - Physical inventory count
   - Stock alerts

7. **Customer Management** 👥
   - Customer CRUD
   - Credit/debt tracking
   - Payment history
   - Customer reports

8. **Sales Returns** 🔄
   - Return entry
   - Refund processing
   - Automatic stock updates

9. **Reports & Analytics** 📈
   - Sales reports
   - Product reports
   - Customer reports
   - Financial reports
   - Charts & graphs
   - Export options

10. **Settings** ⚙️
    - Store settings
    - Receipt settings
    - System settings
    - Printer settings
    - Backup & restore

11. **Import/Export** 📁
    - Excel/CSV import
    - Data export
    - Template downloads

12. **Notifications** 🔔
    - System notifications
    - Alert management
    - Notification center

13. **Audit & Logs** 📝
    - Activity logs
    - Price change history
    - Stock audit trail

14. **Mobile Responsive** 📱
    - Responsive design
    - Touch-friendly UI
    - Offline mode support

15. **Special Features** ⭐
    - Barcode scanner integration
    - Receipt printer support
    - Multi-store support (future)
    - Loyalty program (future)

## Getting Started

### Prerequisites

- Node.js 18+ 
- npm or yarn or pnpm

### Installation

1. Clone the repository
```bash
git clone <repository-url>
cd pos-js
```

2. Install dependencies
```bash
npm install
```

3. Set up environment variables
```bash
cp .env.example .env
```

4. Set up the database
```bash
# Generate Prisma Client
npm run db:generate

# Push schema to database
npm run db:push

# Or run migrations
npm run db:migrate
```

5. Run the development server
```bash
npm run dev
```

6. Open [http://localhost:3000](http://localhost:3000) in your browser

## Database Schema

The database schema is defined in `prisma/schema.prisma`. It includes:

- **Users & Authentication**: User management with roles
- **Products & Categories**: Product catalog with categories
- **Sales**: Sales transactions with items
- **Purchases**: Purchase orders and receipts
- **Stock Management**: Stock movements and adjustments
- **Customers & Suppliers**: Customer and supplier management
- **Cash Management**: Shift management
- **Audit Logs**: Activity tracking
- **Settings**: System configuration
- **Notifications**: Alert system

## Project Structure

```
pos-js/
├── app/                 # Next.js app directory
│   ├── (auth)/         # Authentication routes
│   ├── (dashboard)/    # Dashboard routes
│   ├── api/            # API routes
│   └── ...
├── components/         # React components
│   ├── ui/            # Shadcn UI components
│   └── ...
├── lib/               # Utility functions
│   ├── prisma.ts      # Prisma client
│   └── utils.ts       # Helper functions
├── stores/            # Zustand stores
├── types/            # TypeScript types
├── prisma/           # Prisma schema and migrations
│   └── schema.prisma
└── ...
```

## Development

### Database Commands

```bash
# Generate Prisma Client
npm run db:generate

# Push schema changes
npm run db:push

# Create migration
npm run db:migrate

# Open Prisma Studio
npm run db:studio
```

## License

This project is private and proprietary.

