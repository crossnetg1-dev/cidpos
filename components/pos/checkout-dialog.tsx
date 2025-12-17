'use client'

import { useState, useTransition } from 'react'
import { useCartStore } from '@/stores/cart-store'
import { processSale } from '@/actions/pos'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
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
import { useRouter } from 'next/navigation'
import { Loader2, CheckCircle2, XCircle, Printer } from 'lucide-react'

interface CheckoutDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSaleComplete?: (saleData: {
    id: string
    saleNumber: string
    items: Array<{
      productId: string
      productName: string
      barcode?: string
      sku?: string
      quantity: number
      unitPrice: number
      discount: number
      tax: number
      total: number
    }>
    subtotal: number
    discount: number
    discountPercent: number
    tax: number
    total: number
    paymentMethod: string
    cashReceived?: number
    change?: number
    customerId?: string
    customerName?: string
    createdAt: string
  }, shouldPrint?: boolean) => void
}

export function CheckoutDialog({ open, onOpenChange, onSaleComplete }: CheckoutDialogProps) {
  const router = useRouter()
  const items = useCartStore((state) => state.items)
  const subtotal = useCartStore((state) => state.subtotal)
  const discount = useCartStore((state) => state.discount)
  const discountPercent = useCartStore((state) => state.discountPercent)
  const tax = useCartStore((state) => state.tax)
  const taxType = useCartStore((state) => state.taxType)
  const taxValue = useCartStore((state) => state.taxValue)
  const total = useCartStore((state) => state.total)
  const paymentMethod = useCartStore((state) => state.paymentMethod)
  const cashReceived = useCartStore((state) => state.cashReceived)
  const change = useCartStore((state) => state.change)
  const customerId = useCartStore((state) => state.selectedCustomerId || state.customerId)
  
  const setPaymentMethod = useCartStore((state) => state.setPaymentMethod)
  const setCashReceived = useCartStore((state) => state.setCashReceived)
  const clearCart = useCartStore((state) => state.clearCart)

  const [localCashReceived, setLocalCashReceived] = useState('')
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState(paymentMethod)
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)
  const [saleNumber, setSaleNumber] = useState<string | null>(null)

  const isEmpty = items.length === 0

  const handlePaymentMethodChange = (method: string) => {
    setSelectedPaymentMethod(method as any)
    setPaymentMethod(method as any)
    if (method !== 'CASH') {
      setLocalCashReceived('')
      setCashReceived(undefined)
    }
  }

  const handleCashReceivedChange = (value: string) => {
    setLocalCashReceived(value)
    const amount = parseFloat(value) || 0
    setCashReceived(amount)
  }

  const calculateChange = () => {
    if (selectedPaymentMethod === 'CASH' && localCashReceived) {
      const received = parseFloat(localCashReceived) || 0
      return Math.max(0, received - total)
    }
    return 0
  }

  const handleProcessSale = (shouldPrint: boolean = false) => {
    if (isEmpty) {
      setError('Cart is empty')
      return
    }

    if (selectedPaymentMethod === 'CASH' && (!localCashReceived || parseFloat(localCashReceived) < total)) {
      setError('Cash received must be greater than or equal to total')
      return
    }

    setError(null)
    startTransition(async () => {
      try {
        const result = await processSale({
          items: items.map((item) => ({
            productId: item.productId,
            quantity: item.quantity,
            unitPrice: item.unitPrice,
            discount: item.discount,
            tax: item.tax,
          })),
          subtotal,
          discount,
          discountPercent,
          tax,
          total,
          paymentMethod: selectedPaymentMethod,
          cashReceived: selectedPaymentMethod === 'CASH' ? parseFloat(localCashReceived) : undefined,
          change: selectedPaymentMethod === 'CASH' ? calculateChange() : undefined,
          customerId: customerId || undefined,
        })

        if (!result.success || !result.data) {
          throw new Error('Failed to process sale')
        }

        setSuccess(true)
        setSaleNumber(result.data.saleNumber)
        
        // Force refresh immediately to update product stock and other cached data
        router.refresh()
        
        // Call onSaleComplete callback with full sale data from server and print flag
        if (onSaleComplete) {
          onSaleComplete(result.data, shouldPrint)
        }
        
        clearCart()
        
        // For print: wait for state update and DOM render before triggering print
        if (shouldPrint) {
          // Wait for state update and DOM render
          setTimeout(() => {
            window.print()
            // Close dialog after print dialog closes (user cancels or prints)
            setTimeout(() => {
              onOpenChange(false)
              setSuccess(false)
              setSaleNumber(null)
            }, 500)
          }, 500)
        } else {
          // Close dialog after 1 second for non-print flow
          setTimeout(() => {
            onOpenChange(false)
            setSuccess(false)
            setSaleNumber(null)
          }, 1000)
        }
      } catch (err: any) {
        setError(err.message || 'Failed to process sale')
      }
    })
  }

  const handleClose = () => {
    if (!isPending && !success) {
      onOpenChange(false)
      setError(null)
      setLocalCashReceived('')
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Checkout</DialogTitle>
          <DialogDescription>
            Review your order and complete the payment
          </DialogDescription>
        </DialogHeader>

        {success ? (
          <div className="flex flex-col items-center justify-center py-8">
            <CheckCircle2 className="h-16 w-16 text-green-500 mb-4" />
            <h3 className="text-lg font-semibold mb-2">Sale Completed!</h3>
            <p className="text-sm text-muted-foreground mb-4">
              Sale Number: <span className="font-mono font-semibold">{saleNumber}</span>
            </p>
            <Button
              onClick={() => {
                // Wait a bit for receipt to render, then print
                setTimeout(() => {
                  window.print()
                }, 300)
              }}
              className="mt-2"
            >
              <Printer className="mr-2 h-4 w-4" />
              Print Receipt
            </Button>
          </div>
        ) : (
          <>
            <div className="space-y-4 py-4">
              {/* Order Summary */}
              <div className="space-y-2">
                <h4 className="font-semibold">Order Summary</h4>
                <div className="space-y-1 text-sm">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Items:</span>
                    <span>{items.length}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Subtotal:</span>
                    <span>{subtotal.toLocaleString()} MMK</span>
                  </div>
                  {discount > 0 && (
                    <div className="flex justify-between text-green-600">
                      <span>Discount:</span>
                      <span>-{discount.toLocaleString()} MMK</span>
                    </div>
                  )}
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">
                      Tax {taxType === 'PERCENT' ? `(${taxValue}%)` : '(Fixed)'}:
                    </span>
                    <span>{tax.toLocaleString()} MMK</span>
                  </div>
                  <div className="flex justify-between border-t pt-2 font-semibold text-lg">
                    <span>Total:</span>
                    <span className="text-primary">{total.toLocaleString()} MMK</span>
                  </div>
                </div>
              </div>

              {/* Payment Method */}
              <div className="space-y-2">
                <Label htmlFor="payment-method">Payment Method</Label>
                <Select
                  value={selectedPaymentMethod}
                  onValueChange={handlePaymentMethodChange}
                >
                  <SelectTrigger id="payment-method">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="CASH">Cash</SelectItem>
                    <SelectItem value="KBZPAY">KBZPay</SelectItem>
                    <SelectItem value="WAVEPAY">WavePay</SelectItem>
                    <SelectItem value="AYAPAY">AYAPay</SelectItem>
                    <SelectItem value="CREDIT">Credit Sale</SelectItem>
                    <SelectItem value="SPLIT">Split Payment</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Cash Received (only for CASH payment) */}
              {selectedPaymentMethod === 'CASH' && (
                <div className="space-y-2">
                  <Label htmlFor="cash-received">Cash Received</Label>
                  <Input
                    id="cash-received"
                    type="number"
                    placeholder="0"
                    value={localCashReceived}
                    onChange={(e) => handleCashReceivedChange(e.target.value)}
                    onFocus={(e) => e.target.select()}
                  />
                  {localCashReceived && parseFloat(localCashReceived) >= total && (
                    <div className="text-sm">
                      <span className="text-muted-foreground">Change: </span>
                      <span className="font-semibold text-green-600">
                        {calculateChange().toLocaleString()} MMK
                      </span>
                    </div>
                  )}
                </div>
              )}

              {/* Error Message */}
              {error && (
                <div className="rounded-md bg-destructive/15 p-3 text-sm text-destructive flex items-center gap-2">
                  <XCircle className="h-4 w-4" />
                  {error}
                </div>
              )}
            </div>

            <DialogFooter className="flex gap-2">
              <Button
                variant="outline"
                onClick={handleClose}
                disabled={isPending}
              >
                Cancel
              </Button>
              <Button
                variant="outline"
                onClick={() => handleProcessSale(false)}
                disabled={isPending || isEmpty || (selectedPaymentMethod === 'CASH' && (!localCashReceived || parseFloat(localCashReceived) < total))}
              >
                {isPending ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Processing...
                  </>
                ) : (
                  'Complete Sale'
                )}
              </Button>
              <Button
                onClick={() => handleProcessSale(true)}
                disabled={isPending || isEmpty || (selectedPaymentMethod === 'CASH' && (!localCashReceived || parseFloat(localCashReceived) < total))}
              >
                {isPending ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Processing...
                  </>
                ) : (
                  'Complete & Print'
                )}
              </Button>
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  )
}

