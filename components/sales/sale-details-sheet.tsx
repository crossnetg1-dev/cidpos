'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { getSaleById } from '@/actions/sales'
import { ReceiptTemplate } from '@/components/pos/receipt-template'
import { Printer, Loader2 } from 'lucide-react'
import { format } from 'date-fns'
import { toast } from 'sonner'

interface SaleDetailsSheetProps {
  saleId: string
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function SaleDetailsSheet({ saleId, open, onOpenChange }: SaleDetailsSheetProps) {
  const router = useRouter()
  const [sale, setSale] = useState<any>(null)
  const [isLoading, setIsLoading] = useState(false)

  useEffect(() => {
    if (open && saleId) {
      loadSale()
    }
  }, [open, saleId])

  const loadSale = async () => {
    setIsLoading(true)
    try {
      const result = await getSaleById(saleId)
      if (result.success && result.data) {
        setSale(result.data)
      } else {
        toast.error(result.error || 'Failed to load sale details')
        onOpenChange(false)
      }
    } catch (error) {
      toast.error('An error occurred')
      onOpenChange(false)
    } finally {
      setIsLoading(false)
    }
  }

  const handlePrint = () => {
    if (sale) {
      // Set receipt data and trigger print
      setTimeout(() => {
        window.print()
      }, 100)
    }
  }

  const getStatusBadge = (status: string) => {
    const variants: Record<string, 'default' | 'secondary' | 'destructive' | 'outline'> = {
      COMPLETED: 'default',
      HOLD: 'secondary',
      VOID: 'destructive',
      RETURNED: 'outline',
    }
    return (
      <Badge variant={variants[status] || 'default'}>
        {status}
      </Badge>
    )
  }

  const getPaymentStatusBadge = (status: string) => {
    const statusConfig: Record<string, { label: string; className: string }> = {
      PAID: {
        label: 'PAID',
        className: 'bg-green-100 text-green-800 hover:bg-green-100',
      },
      UNPAID: {
        label: 'UNPAID',
        className: 'bg-red-100 text-red-800 hover:bg-red-100',
      },
      PARTIAL: {
        label: 'PARTIAL',
        className: 'bg-yellow-100 text-yellow-800 hover:bg-yellow-100',
      },
    }

    const config = statusConfig[status] || {
      label: status,
      className: 'bg-gray-100 text-gray-800 hover:bg-gray-100',
    }

    return (
      <Badge className={config.className}>
        {config.label}
      </Badge>
    )
  }

  const getPaymentMethodBadge = (method: string) => {
    const colors: Record<string, string> = {
      CASH: 'bg-green-100 text-green-800',
      KBZPAY: 'bg-blue-100 text-blue-800',
      WAVEPAY: 'bg-purple-100 text-purple-800',
      AYAPAY: 'bg-orange-100 text-orange-800',
      CREDIT: 'bg-yellow-100 text-yellow-800',
      SPLIT: 'bg-gray-100 text-gray-800',
    }
    return (
      <span className={`px-2 py-1 rounded text-xs font-medium ${colors[method] || 'bg-gray-100 text-gray-800'}`}>
        {method}
      </span>
    )
  }

  if (!sale && !isLoading) {
    return null
  }

  return (
    <>
      <Sheet open={open} onOpenChange={onOpenChange}>
        <SheetContent className="w-full sm:max-w-2xl overflow-y-auto">
          <SheetHeader>
            <SheetTitle>Sale Details</SheetTitle>
            <SheetDescription>
              View complete sale information and receipt
            </SheetDescription>
          </SheetHeader>

          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin" />
            </div>
          ) : sale ? (
            <div className="space-y-6 mt-6">
              {/* Sale Header */}
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-lg font-semibold">{sale.saleNumber}</h3>
                  <p className="text-sm text-muted-foreground">
                    {format(new Date(sale.createdAt), 'MMM dd, yyyy HH:mm:ss')}
                  </p>
                </div>
                <div className="flex gap-2">
                  {getStatusBadge(sale.status)}
                  {getPaymentMethodBadge(sale.paymentMethod)}
                  {getPaymentStatusBadge(sale.paymentStatus || 'PAID')}
                </div>
              </div>

              <Separator />

              {/* Customer & Cashier Info */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Customer</p>
                  <p className="text-sm">{sale.customer?.name || 'Walk-in Customer'}</p>
                  {sale.customer?.phone && (
                    <p className="text-xs text-muted-foreground">{sale.customer.phone}</p>
                  )}
                </div>
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Cashier</p>
                  <p className="text-sm">{sale.user.fullName}</p>
                  <p className="text-xs text-muted-foreground">@{sale.user.username}</p>
                </div>
              </div>

              <Separator />

              {/* Items */}
              <div>
                <h4 className="font-semibold mb-3">Items</h4>
                <div className="space-y-2">
                  {sale.items.map((item: any) => (
                    <div key={item.id} className="flex justify-between items-start py-2 border-b">
                      <div className="flex-1">
                        <p className="font-medium">{item.product.name}</p>
                        <p className="text-sm text-muted-foreground">
                          {Number(item.quantity)} × {Number(item.unitPrice).toLocaleString()} MMK
                        </p>
                        {item.product.barcode && (
                          <p className="text-xs text-muted-foreground">
                            Barcode: {item.product.barcode}
                          </p>
                        )}
                      </div>
                      <div className="text-right">
                        <p className="font-medium">
                          {Number(item.total).toLocaleString()} MMK
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <Separator />

              {/* Totals */}
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Subtotal:</span>
                  <span>{Number(sale.subtotal).toLocaleString()} MMK</span>
                </div>
                {sale.discount > 0 && (
                  <div className="flex justify-between text-green-600">
                    <span>Discount:</span>
                    <span>-{Number(sale.discount).toLocaleString()} MMK</span>
                  </div>
                )}
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Tax:</span>
                  <span>{Number(sale.tax).toLocaleString()} MMK</span>
                </div>
                <Separator />
                <div className="flex justify-between text-lg font-semibold">
                  <span>Total:</span>
                  <span>{Number(sale.total).toLocaleString()} MMK</span>
                </div>
                {sale.paymentMethod === 'CASH' && sale.cashReceived && (
                  <>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Cash Received:</span>
                      <span>{Number(sale.cashReceived).toLocaleString()} MMK</span>
                    </div>
                    {sale.change && (
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Change:</span>
                        <span>{Number(sale.change).toLocaleString()} MMK</span>
                      </div>
                    )}
                  </>
                )}
              </div>

              {sale.notes && (
                <>
                  <Separator />
                  <div>
                    <p className="text-sm font-medium text-muted-foreground mb-1">Notes</p>
                    <p className="text-sm">{sale.notes}</p>
                  </div>
                </>
              )}

              {/* Actions */}
              <div className="flex gap-2 pt-4">
                <Button onClick={handlePrint} className="flex-1">
                  <Printer className="h-4 w-4 mr-2" />
                  Reprint Receipt
                </Button>
              </div>
            </div>
          ) : null}
        </SheetContent>
      </Sheet>

      {/* Hidden Receipt for Printing */}
      {sale && (
        <div className="hidden print:block">
          <ReceiptTemplate
            saleNumber={sale.saleNumber}
            date={format(new Date(sale.createdAt), 'MM/dd/yyyy HH:mm')}
            items={sale.items.map((item: any) => ({
              productId: item.product.id,
              productName: item.product.name,
              barcode: item.product.barcode,
              quantity: Number(item.quantity),
              unitPrice: Number(item.unitPrice),
              discount: Number(item.discount),
              tax: Number(item.tax),
              total: Number(item.total),
              stock: 0, // Not needed for receipt
            }))}
            subtotal={Number(sale.subtotal)}
            discount={Number(sale.discount)}
            discountPercent={Number(sale.discountPercent)}
            tax={Number(sale.tax)}
            total={Number(sale.total)}
            paymentMethod={sale.paymentMethod}
            cashReceived={sale.cashReceived ? Number(sale.cashReceived) : undefined}
            change={sale.change ? Number(sale.change) : undefined}
            customerName={sale.customer?.name}
          />
        </div>
      )}
    </>
  )
}

