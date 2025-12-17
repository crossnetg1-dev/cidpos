'use client'

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { AlertTriangle } from 'lucide-react'
import type { LowStockProduct } from '@/actions/dashboard'

interface LowStockAlertProps {
  products: LowStockProduct[]
}

export function LowStockAlert({ products }: LowStockAlertProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <AlertTriangle className="h-5 w-5 text-orange-500" />
          Low Stock Alert
        </CardTitle>
        <CardDescription>Products that need restocking</CardDescription>
      </CardHeader>
      <CardContent>
        {products.length === 0 ? (
          <p className="text-sm text-muted-foreground">All products are well stocked</p>
        ) : (
          <div className="space-y-2">
            {products.map((product) => (
              <div
                key={product.id}
                className="flex items-center justify-between p-2 rounded-md border"
              >
                <div className="flex-1">
                  <p className="text-sm font-medium">{product.name}</p>
                  <p className="text-xs text-muted-foreground">
                    Min: {product.minStockLevel} {product.unit}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-sm font-semibold">
                    {product.stock} {product.unit}
                  </span>
                  {product.stock === 0 ? (
                    <Badge variant="destructive">Out of Stock</Badge>
                  ) : (
                    <Badge variant="outline" className="bg-orange-50 text-orange-700 border-orange-200">
                      Low Stock
                    </Badge>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  )
}

