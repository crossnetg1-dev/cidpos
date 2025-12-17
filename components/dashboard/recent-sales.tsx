'use client'

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import type { RecentSale } from '@/actions/dashboard'
import { formatDistanceToNow } from 'date-fns'

interface RecentSalesProps {
  sales: RecentSale[]
}

export function RecentSales({ sales }: RecentSalesProps) {
  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map((n) => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2)
  }

  const getPaymentMethodColor = (method: string) => {
    const colors: { [key: string]: string } = {
      CASH: 'bg-green-100 text-green-800',
      KBZPAY: 'bg-blue-100 text-blue-800',
      WAVEPAY: 'bg-purple-100 text-purple-800',
      AYAPAY: 'bg-yellow-100 text-yellow-800',
      CREDIT: 'bg-orange-100 text-orange-800',
    }
    return colors[method] || 'bg-gray-100 text-gray-800'
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Recent Sales</CardTitle>
        <CardDescription>Latest transactions</CardDescription>
      </CardHeader>
      <CardContent>
        {sales.length === 0 ? (
          <p className="text-sm text-muted-foreground">No recent sales</p>
        ) : (
          <div className="space-y-4">
            {sales.map((sale) => (
              <div key={sale.id} className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Avatar>
                    <AvatarFallback>{getInitials(sale.user.fullName)}</AvatarFallback>
                  </Avatar>
                  <div>
                    <p className="text-sm font-medium">{sale.saleNumber}</p>
                    <p className="text-xs text-muted-foreground">
                      {sale.user.fullName} • {formatDistanceToNow(sale.createdAt, { addSuffix: true })}
                    </p>
                    {sale.customer && (
                      <p className="text-xs text-muted-foreground">{sale.customer.name}</p>
                    )}
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-sm font-semibold">{sale.total.toLocaleString()} MMK</p>
                  <Badge variant="outline" className={getPaymentMethodColor(sale.paymentMethod)}>
                    {sale.paymentMethod}
                  </Badge>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  )
}

