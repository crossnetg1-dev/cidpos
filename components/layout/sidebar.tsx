'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { cn } from '@/lib/utils'
import {
  LayoutDashboard,
  ShoppingCart,
  Package,
  TrendingUp,
  FileText,
  Settings,
  BarChart3,
  Users,
  Truck,
  Warehouse,
  FolderTree,
  Ruler,
} from 'lucide-react'
import { usePermission } from '@/hooks/use-permission'
import { ModeToggle } from '@/components/ui/mode-toggle'

interface SidebarProps {
  storeName?: string
}

const menuItems = [
  {
    title: 'Dashboard',
    href: '/dashboard',
    icon: LayoutDashboard,
    permission: { module: 'dashboard', action: 'view' },
  },
  {
    title: 'POS',
    href: '/pos',
    icon: ShoppingCart,
    permission: { module: 'pos', action: 'access' },
  },
  {
    title: 'Products',
    href: '/products',
    icon: Package,
    permission: { module: 'products', action: 'view' },
  },
  {
    title: 'Categories',
    href: '/categories',
    icon: FolderTree,
    permission: { module: 'categories', action: 'view' },
  },
  {
    title: 'Units',
    href: '/units',
    icon: Ruler,
    permission: { module: 'categories', action: 'view' }, // Use categories permission for now
  },
  {
    title: 'Sales',
    href: '/sales',
    icon: TrendingUp,
    permission: { module: 'sales', action: 'view' },
  },
  {
    title: 'Purchases',
    href: '/purchases',
    icon: Truck,
    permission: { module: 'purchases', action: 'view' },
  },
  {
    title: 'Stock',
    href: '/stock',
    icon: Warehouse,
    permission: { module: 'stock', action: 'view' },
  },
  {
    title: 'Customers',
    href: '/customers',
    icon: Users,
    permission: { module: 'customers', action: 'view' },
  },
  {
    title: 'Reports',
    href: '/reports',
    icon: BarChart3,
    permission: { module: 'reports', action: 'view' },
  },
  {
    title: 'Settings',
    href: '/settings',
    icon: Settings,
    permission: { module: 'settings', action: 'view' },
  },
]

export function Sidebar({ storeName = 'CidPOS' }: SidebarProps) {
  const pathname = usePathname()
  const { hasPermission, isLoading } = usePermission()

  // Don't render anything while loading to prevent flash
  if (isLoading) {
    return (
      <div className="flex h-full w-64 flex-col border-r bg-card">
        <div className="flex h-16 items-center border-b px-6">
          <div className="flex items-center space-x-2">
            <ShoppingCart className="h-6 w-6 text-primary" />
            <span className="text-lg font-bold">{storeName}</span>
          </div>
        </div>
        <nav className="flex-1 space-y-1 p-4">
          <div className="text-sm text-muted-foreground">Loading...</div>
        </nav>
      </div>
    )
  }

  return (
    <div className="flex h-full w-64 flex-col border-r bg-card">
      <div className="flex h-16 items-center border-b px-6">
        <Link href="/dashboard" className="flex items-center space-x-2">
          <ShoppingCart className="h-6 w-6 text-primary" />
          <span className="text-lg font-bold">{storeName}</span>
        </Link>
      </div>
      <nav className="flex-1 space-y-1 p-4">
        {menuItems.map((item) => {
          // Check permission for this menu item
          const hasAccess = hasPermission(item.permission.module, item.permission.action)
          
          // Don't render if user doesn't have permission
          if (!hasAccess) {
            return null
          }

          const Icon = item.icon
          const isActive = pathname === item.href || pathname?.startsWith(`${item.href}/`)
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                'flex items-center space-x-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors',
                isActive
                  ? 'bg-primary text-primary-foreground'
                  : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground'
              )}
            >
              <Icon className="h-5 w-5" />
              <span>{item.title}</span>
            </Link>
          )
        })}
      </nav>
      {/* Theme Toggle at Bottom */}
      <div className="border-t p-4">
        <div className="flex items-center justify-between">
          <span className="text-xs text-muted-foreground">Theme</span>
          <ModeToggle />
        </div>
      </div>
    </div>
  )
}

