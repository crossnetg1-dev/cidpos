import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { getCurrentUser } from '@/actions/auth'
import { redirect } from 'next/navigation'
import { 
  getDashboardStats, 
  getHourlySales, 
  getPaymentMethodDistribution,
  getRecentSales, 
  getLowStockProducts 
} from '@/actions/dashboard'
import { getDashboardAnalytics } from '@/actions/analytics'
import { StatsCard } from '@/components/dashboard/stats-card'
import { SalesTrendChart } from '@/components/dashboard/sales-trend-chart'
import { OverviewChart } from '@/components/dashboard/overview-chart'
import { PaymentMethodPie } from '@/components/dashboard/payment-method-pie'
import { RecentSales } from '@/components/dashboard/recent-sales'
import { LowStockAlert } from '@/components/dashboard/low-stock-alert'
import { RefreshButton } from '@/components/dashboard/refresh-button'
import { DashboardGuard } from '@/components/dashboard/dashboard-guard'
import { prisma } from '@/lib/prisma'
import type { Metadata } from 'next'

// Force dynamic rendering to ensure fresh data on every view
export const dynamic = 'force-dynamic'

export const metadata: Metadata = {
  title: 'Dashboard',
}

export default async function DashboardPage() {
  const user = await getCurrentUser()

  if (!user) {
    redirect('/login')
  }

  // Server-side permission check
  if (user.roleId) {
    const role = await prisma.role.findUnique({
      where: { id: user.roleId },
    })

    if (role) {
      const permissions = JSON.parse(role.permissions) as any
      const canViewDashboard = role.name === 'Super Admin' || permissions?.dashboard?.view === true

      if (!canViewDashboard) {
        redirect('/pos')
      }
    }
  }

  // Fetch all dashboard data in parallel for optimal performance
  const [stats, analytics, hourlySales, paymentMethods, recentSales, lowStockProducts] = await Promise.all([
    getDashboardStats(),
    getDashboardAnalytics(),
    getHourlySales(),
    getPaymentMethodDistribution(),
    getRecentSales(5),
    getLowStockProducts(),
  ])

  return (
    <DashboardGuard>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
            <p className="text-muted-foreground">
              Welcome back, {user.fullName}! Here's what's happening today.
            </p>
          </div>
          <RefreshButton />
      </div>

      {/* Top Section: Summary Cards with Trends */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <StatsCard
          title="Today's Sales"
          value={`${analytics.todaySales.toLocaleString()} MMK`}
          trend={analytics.dailyGrowth}
          description={`${stats.todayTransactions} ${stats.todayTransactions === 1 ? 'transaction' : 'transactions'}`}
          icon="💰"
        />
        <StatsCard
          title="Today's Profit"
          value={`${stats.todayProfit.toLocaleString()} MMK`}
          description="Profit margin"
          icon="📈"
        />
        <StatsCard
          title="This Month's Sales"
          value={`${analytics.thisMonthSales.toLocaleString()} MMK`}
          trend={analytics.monthlyGrowth}
          description="vs Last Month"
          icon="📊"
        />
        <StatsCard
          title="Total Customers"
          value={stats.totalCustomers.toString()}
          description="Active customers"
          icon="👥"
        />
      </div>

      {/* Sales Trend Chart Section */}
      <div className="my-6">
        <SalesTrendChart data={analytics.dailySalesData} />
      </div>

      {/* Middle Section: Overview Chart & Recent Sales */}
      <div className="grid gap-4 grid-cols-1 md:grid-cols-7">
        <div className="md:col-span-4">
          <OverviewChart data={hourlySales} />
        </div>
        <div className="md:col-span-3">
          <RecentSales sales={recentSales} />
        </div>
      </div>

      {/* Bottom Section: Low Stock Alert */}
      <LowStockAlert products={lowStockProducts} />
      </div>
    </DashboardGuard>
  )
}
