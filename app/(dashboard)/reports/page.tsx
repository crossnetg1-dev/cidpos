// Force dynamic rendering to ensure fresh data on every view
export const dynamic = 'force-dynamic'

import { ReportsClient } from '@/components/reports/reports-client'
import { getReportData, getDeadStockProducts } from '@/actions/reports'
import { startOfDay, endOfDay, subDays, startOfMonth, endOfMonth, subMonths } from 'date-fns'

export default async function ReportsPage({
  searchParams,
}: {
  searchParams: { startDate?: string; endDate?: string }
}) {
  // Default to last 30 days if no dates provided
  const endDate = searchParams.endDate
    ? endOfDay(new Date(searchParams.endDate))
    : endOfDay(new Date())
  
  const startDate = searchParams.startDate
    ? startOfDay(new Date(searchParams.startDate))
    : startOfDay(subDays(endDate, 30))

  const [reportData, deadStock] = await Promise.all([
    getReportData({ startDate, endDate }),
    getDeadStockProducts({ startDate, endDate }),
  ])

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Business Reports</h1>
        <p className="text-muted-foreground">Financial performance and inventory insights</p>
      </div>

      <ReportsClient
        initialData={reportData}
        initialDeadStock={deadStock}
        initialStartDate={startDate}
        initialEndDate={endDate}
      />
    </div>
  )
}

