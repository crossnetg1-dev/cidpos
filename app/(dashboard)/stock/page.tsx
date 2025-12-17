// Force dynamic rendering to ensure fresh data on every view
export const dynamic = 'force-dynamic'

import { StockTable } from '@/components/stock/stock-table'
import { getStockOverview, getStockProducts } from '@/actions/stock'
import { getCategories } from '@/actions/categories'

export default async function StockPage() {
  const [overview, products, categories] = await Promise.all([
    getStockOverview(),
    getStockProducts({}),
    getCategories(),
  ])

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Stock Management</h1>
        <p className="text-muted-foreground">Monitor inventory levels, valuations, and adjustments</p>
      </div>

      <StockTable
        initialOverview={overview}
        initialProducts={products}
        categories={categories}
      />
    </div>
  )
}

