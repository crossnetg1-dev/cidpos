// Force dynamic rendering to ensure fresh data on every view
export const dynamic = 'force-dynamic'

import { PurchasesTable } from '@/components/purchases/purchases-table'
import { getPurchases } from '@/actions/purchases'

export default async function PurchasesPage() {
  const purchasesData = await getPurchases({ page: 1 })

  return (
    <div className="space-y-6">
      <PurchasesTable initialData={purchasesData} />
    </div>
  )
}
