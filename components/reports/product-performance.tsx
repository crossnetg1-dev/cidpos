'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { AlertTriangle, Trophy } from 'lucide-react'

interface ProductPerformanceProps {
  topProducts: Array<{
    productId: string
    productName: string
    quantitySold: number
    revenue: number
  }>
  deadStock: Array<{
    id: string
    name: string
    stock: number
    value: number
  }>
}

export function ProductPerformance({
  topProducts,
  deadStock,
}: ProductPerformanceProps) {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
      {/* Top Selling Products */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Trophy className="h-5 w-5" />
            Top Selling Products
          </CardTitle>
        </CardHeader>
        <CardContent>
          {topProducts.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-12">Rank</TableHead>
                  <TableHead>Product Name</TableHead>
                  <TableHead className="text-right">Qty Sold</TableHead>
                  <TableHead className="text-right">Revenue</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {topProducts.map((product, index) => (
                  <TableRow key={product.productId}>
                    <TableCell>
                      <Badge
                        variant={
                          index === 0
                            ? 'default'
                            : index === 1
                            ? 'secondary'
                            : index === 2
                            ? 'outline'
                            : 'outline'
                        }
                        className={
                          index === 0
                            ? 'bg-yellow-100 text-yellow-800'
                            : index === 1
                            ? 'bg-gray-100 text-gray-800'
                            : index === 2
                            ? 'bg-orange-100 text-orange-800'
                            : ''
                        }
                      >
                        #{index + 1}
                      </Badge>
                    </TableCell>
                    <TableCell className="font-medium">
                      {product.productName}
                    </TableCell>
                    <TableCell className="text-right">
                      {product.quantitySold}
                    </TableCell>
                    <TableCell className="text-right font-medium">
                      {product.revenue.toLocaleString()} MMK
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              No sales data available for the selected period
            </div>
          )}
        </CardContent>
      </Card>

      {/* Dead Stock Warning */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-orange-600" />
            Dead Stock Alert
          </CardTitle>
        </CardHeader>
        <CardContent>
          {deadStock.length > 0 ? (
            <div className="space-y-4">
              <div className="text-sm text-muted-foreground">
                Products with no sales in the selected period:
              </div>
              <div className="max-h-[400px] overflow-y-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Product Name</TableHead>
                      <TableHead className="text-right">Stock</TableHead>
                      <TableHead className="text-right">Value</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {deadStock.map((product) => (
                      <TableRow key={product.id}>
                        <TableCell className="font-medium">
                          {product.name}
                        </TableCell>
                        <TableCell className="text-right">
                          {product.stock}
                        </TableCell>
                        <TableCell className="text-right font-medium text-orange-600">
                          {product.value.toLocaleString()} MMK
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </div>
          ) : (
            <div className="text-center py-8">
              <div className="text-green-600 font-medium mb-2">
                ✓ All products have sales
              </div>
              <div className="text-sm text-muted-foreground">
                No dead stock detected in the selected period
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

