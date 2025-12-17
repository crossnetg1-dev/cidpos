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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { getPurchaseById, markPurchaseAsPaid } from '@/actions/purchases'
import { Loader2, CheckCircle2 } from 'lucide-react'
import { format } from 'date-fns'
import { toast } from 'sonner'
import { useTransition } from 'react'

interface PurchaseDetailsSheetProps {
  purchaseId: string
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function PurchaseDetailsSheet({ purchaseId, open, onOpenChange }: PurchaseDetailsSheetProps) {
  const router = useRouter()
  const [purchase, setPurchase] = useState<any>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [isPending, startTransition] = useTransition()

  useEffect(() => {
    if (open && purchaseId) {
      loadPurchase()
    }
  }, [open, purchaseId])

  const loadPurchase = async () => {
    setIsLoading(true)
    try {
      const result = await getPurchaseById(purchaseId)
      if (result.success && result.data) {
        setPurchase(result.data)
      } else {
        toast.error(result.error || 'Failed to load purchase details')
        onOpenChange(false)
      }
    } catch (error) {
      toast.error('An error occurred')
      onOpenChange(false)
    } finally {
      setIsLoading(false)
    }
  }

  const handleMarkAsPaid = async () => {
    startTransition(async () => {
      try {
        const result = await markPurchaseAsPaid(purchaseId)
        if (result.success) {
          toast.success('Purchase marked as paid successfully')
          // Force refresh to update UI
          router.refresh()
          loadPurchase()
        } else {
          toast.error(result.error || 'Failed to mark purchase as paid')
        }
      } catch (error) {
        toast.error('An error occurred')
      }
    })
  }

  const getStatusBadge = (status: string) => {
    if (status === 'RECEIVED') {
      return <Badge className="bg-green-100 text-green-800 hover:bg-green-100">Received</Badge>
    }
    if (status === 'PENDING') {
      return <Badge className="bg-orange-100 text-orange-800 hover:bg-orange-100">Pending</Badge>
    }
    if (status === 'CANCELLED') {
      return <Badge variant="destructive">Cancelled</Badge>
    }
    return <Badge variant="secondary">{status}</Badge>
  }

  if (!purchase && !isLoading) {
    return null
  }

  const dueAmount = purchase ? purchase.total - purchase.paidAmount : 0
  const canMarkAsPaid = purchase && purchase.status === 'PENDING' && dueAmount > 0

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:max-w-2xl overflow-y-auto">
        <SheetHeader>
          <SheetTitle>Purchase Details</SheetTitle>
          <SheetDescription>
            View complete purchase information
          </SheetDescription>
        </SheetHeader>

        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin" />
          </div>
        ) : purchase ? (
          <div className="space-y-6 mt-6">
            {/* Purchase Header */}
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-lg font-semibold">{purchase.poNumber}</h3>
                <p className="text-sm text-muted-foreground">
                  {format(new Date(purchase.createdAt), 'MMM dd, yyyy HH:mm:ss')}
                </p>
              </div>
              <div className="flex gap-2">
                {getStatusBadge(purchase.status)}
              </div>
            </div>

            <Separator />

            {/* Supplier & User Info */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Supplier</p>
                <p className="text-sm">{purchase.supplier.name}</p>
                {purchase.supplier.phone && (
                  <p className="text-xs text-muted-foreground">{purchase.supplier.phone}</p>
                )}
                {purchase.supplier.address && (
                  <p className="text-xs text-muted-foreground">{purchase.supplier.address}</p>
                )}
              </div>
              <div>
                <p className="text-sm font-medium text-muted-foreground">Created By</p>
                <p className="text-sm">{purchase.user.fullName}</p>
                <p className="text-xs text-muted-foreground">@{purchase.user.username}</p>
              </div>
            </div>

            <Separator />

            {/* Items Table */}
            <div>
              <h4 className="font-semibold mb-3">Items</h4>
              <div className="border rounded-md">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Product</TableHead>
                      <TableHead className="text-right">Quantity</TableHead>
                      <TableHead className="text-right">Unit Cost</TableHead>
                      <TableHead className="text-right">Subtotal</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {purchase.items.map((item: any) => (
                      <TableRow key={item.id}>
                        <TableCell>
                          <div>
                            <p className="font-medium">{item.product.name}</p>
                            {item.product.barcode && (
                              <p className="text-xs text-muted-foreground">
                                Barcode: {item.product.barcode}
                              </p>
                            )}
                          </div>
                        </TableCell>
                        <TableCell className="text-right">
                          {item.quantity} {item.product.unit}
                        </TableCell>
                        <TableCell className="text-right">
                          {item.unitPrice.toLocaleString()} MMK
                        </TableCell>
                        <TableCell className="text-right font-medium">
                          {item.total.toLocaleString()} MMK
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </div>

            <Separator />

            {/* Totals */}
            <div className="space-y-2">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Subtotal:</span>
                <span>{purchase.subtotal.toLocaleString()} MMK</span>
              </div>
              {purchase.discount > 0 && (
                <div className="flex justify-between text-green-600">
                  <span>Discount:</span>
                  <span>-{purchase.discount.toLocaleString()} MMK</span>
                </div>
              )}
              <div className="flex justify-between">
                <span className="text-muted-foreground">Tax:</span>
                <span>{purchase.tax.toLocaleString()} MMK</span>
              </div>
              <Separator />
              <div className="flex justify-between text-lg font-semibold">
                <span>Grand Total:</span>
                <span>{purchase.total.toLocaleString()} MMK</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Paid Amount:</span>
                <span>{purchase.paidAmount.toLocaleString()} MMK</span>
              </div>
              <Separator />
              <div className="flex justify-between text-lg font-semibold">
                <span>Due Amount:</span>
                <span className={dueAmount > 0 ? 'text-orange-600' : 'text-green-600'}>
                  {dueAmount.toLocaleString()} MMK
                </span>
              </div>
            </div>

            {purchase.notes && (
              <>
                <Separator />
                <div>
                  <p className="text-sm font-medium text-muted-foreground mb-1">Notes</p>
                  <p className="text-sm">{purchase.notes}</p>
                </div>
              </>
            )}

            {/* Actions */}
            <div className="flex gap-2 pt-4">
              {canMarkAsPaid && (
                <Button
                  onClick={handleMarkAsPaid}
                  disabled={isPending}
                  className="flex-1"
                >
                  {isPending ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Processing...
                    </>
                  ) : (
                    <>
                      <CheckCircle2 className="mr-2 h-4 w-4" />
                      Mark as Paid
                    </>
                  )}
                </Button>
              )}
            </div>
          </div>
        ) : null}
      </SheetContent>
    </Sheet>
  )
}

