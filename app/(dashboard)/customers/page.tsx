// Force dynamic rendering to ensure fresh data on every view
export const dynamic = 'force-dynamic'

import { CustomersTable } from '@/components/customers/customers-table'
import { getCustomersList } from '@/actions/customers'

export default async function CustomersPage() {
  const customersData = await getCustomersList({ page: 1 })

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Customers</h1>
        <p className="text-muted-foreground">Manage customer relationships and track loyalty</p>
      </div>

      <CustomersTable initialData={customersData} />
    </div>
  )
}

