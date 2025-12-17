'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Switch } from '@/components/ui/switch'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { AdjustStockDialog } from '@/components/stock/adjust-stock-dialog'
import { StockHistorySheet } from '@/components/stock/stock-history-sheet'
import { getStockProducts, getStockOverview, type StockProduct, type StockOverview } from '@/actions/stock'
import { Settings2, History, RefreshCw, AlertTriangle } from 'lucide-react'
import { toast } from 'sonner'
import Image from 'next/image'
import { Package } from 'lucide-react'

interface StockTableProps {
  initialOverview: StockOverview
  initialProducts: StockProduct[]
  categories: Array<{ id: string; name: string }>
}

export function StockTable({ initialOverview, initialProducts, categories }: StockTableProps) {
  const router = useRouter()
  const [overview, setOverview] = useState(initialOverview)
  const [products, setProducts] = useState(initialProducts)
  const [isPending, startTransition] = useTransition()
  const [searchQuery, setSearchQuery] = useState('')
  const [categoryFilter, setCategoryFilter] = useState('all')
  const [lowStockOnly, setLowStockOnly] = useState(false)
  
  // Dialog states
  const [adjustingProduct, setAdjustingProduct] = useState<StockProduct | null>(null)
  const [viewingHistory, setViewingHistory] = useState<StockProduct | null>(null)

  const loadProducts = async () => {
    startTransition(async () => {
      try {
        const [productsData, overviewData] = await Promise.all([
          getStockProducts({
            query: searchQuery,
            categoryId: categoryFilter === 'all' ? undefined : categoryFilter,
            lowStockOnly,
          }),
          getStockOverview(),
        ])
        setProducts(productsData)
        setOverview(overviewData)
      } catch (error) {
        toast.error('Failed to load products')
      }
    })
  }

  const handleSearch = () => {
    loadProducts()
  }

  const handleAdjustSuccess = () => {
    setAdjustingProduct(null)
    router.refresh()
    loadProducts()
  }

  const handleHistoryClose = () => {
    setViewingHistory(null)
  }

  return (
    <div className="space-y-6">
      {/* Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Inventory Value</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-primary">
              {overview.totalInventoryValue.toLocaleString()} MMK
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Low Stock Items</CardTitle>
            <AlertTriangle className="h-4 w-4 text-destructive" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-destructive">
              {overview.lowStockItemCount}
            </div>
            <p className="text-xs text-muted-foreground">Items below minimum level</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Products</CardTitle>
            <Package className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {overview.totalItems}
            </div>
            <p className="text-xs text-muted-foreground">Active products</p>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle>Filters</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1">
              <Input
                placeholder="Search by name, barcode, or SKU..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
              />
            </div>
            <Select value={categoryFilter} onValueChange={setCategoryFilter}>
              <SelectTrigger className="w-[200px]">
                <SelectValue placeholder="Category" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Categories</SelectItem>
                {categories.map((category) => (
                  <SelectItem key={category.id} value={category.id}>
                    {category.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <div className="flex items-center space-x-2">
              <Switch
                id="lowStockOnly"
                checked={lowStockOnly}
                onCheckedChange={setLowStockOnly}
              />
              <Label htmlFor="lowStockOnly">Low Stock Only</Label>
            </div>
            <Button onClick={handleSearch} disabled={isPending}>
              <RefreshCw className={`h-4 w-4 mr-2 ${isPending ? 'animate-spin' : ''}`} />
              Search
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Products Table */}
      <Card>
        <CardHeader>
          <CardTitle>Inventory</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-16">Image</TableHead>
                  <TableHead>Name</TableHead>
                  <TableHead>Category</TableHead>
                  <TableHead className="text-right">Cost Price</TableHead>
                  <TableHead className="text-right">Current Stock</TableHead>
                  <TableHead className="text-right">Total Value</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isPending && products.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-8">
                      Loading...
                    </TableCell>
                  </TableRow>
                ) : products.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                      No products found
                    </TableCell>
                  </TableRow>
                ) : (
                  products.map((product) => {
                    const isLowStock = product.stock <= product.minStockLevel
                    return (
                      <TableRow key={product.id}>
                        <TableCell>
                          {product.image ? (
                            <div className="relative w-12 h-12 rounded-md overflow-hidden">
                              <Image
                                src={product.image}
                                alt={product.name}
                                fill
                                className="object-cover"
                              />
                            </div>
                          ) : (
                            <div className="w-12 h-12 rounded-md bg-muted flex items-center justify-center">
                              <Package className="h-6 w-6 text-muted-foreground" />
                            </div>
                          )}
                        </TableCell>
                        <TableCell className="font-medium">{product.name}</TableCell>
                        <TableCell>{product.category.name}</TableCell>
                        <TableCell className="text-right">
                          {product.purchasePrice.toLocaleString()} MMK
                        </TableCell>
                        <TableCell className="text-right">
                          <Badge
                            variant={isLowStock ? 'destructive' : 'default'}
                            className={isLowStock ? '' : 'bg-green-100 text-green-800'}
                          >
                            {product.stock} {product.unit}
                          </Badge>
                          {isLowStock && (
                            <p className="text-xs text-destructive mt-1">
                              Min: {product.minStockLevel}
                            </p>
                          )}
                        </TableCell>
                        <TableCell className="text-right font-medium">
                          {product.totalValue.toLocaleString()} MMK
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-2">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => setAdjustingProduct(product)}
                            >
                              <Settings2 className="h-4 w-4 mr-2" />
                              Adjust
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => setViewingHistory(product)}
                            >
                              <History className="h-4 w-4 mr-2" />
                              History
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    )
                  })
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Adjust Stock Dialog */}
      {adjustingProduct && (
        <AdjustStockDialog
          product={adjustingProduct}
          open={!!adjustingProduct}
          onOpenChange={(open) => !open && setAdjustingProduct(null)}
          onSuccess={handleAdjustSuccess}
        />
      )}

      {/* Stock History Sheet */}
      {viewingHistory && (
        <StockHistorySheet
          product={viewingHistory}
          open={!!viewingHistory}
          onOpenChange={handleHistoryClose}
        />
      )}
    </div>
  )
}

