// Force dynamic rendering to ensure fresh data on every view
export const dynamic = 'force-dynamic'

import { SalesTable } from '@/components/sales/sales-table'
import { getSales } from '@/actions/sales'

export default async function SalesPage() {
  const salesData = await getSales({ page: 1 })

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Sales History</h1>
        <p className="text-muted-foreground">View and manage all sales transactions</p>
      </div>

      <SalesTable initialData={salesData} />
    </div>
  )
}

