'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { useCartStore } from '@/stores/cart-store'
import { CartItemComponent } from './cart-item'
import { ShoppingCart, Trash2, Percent, User, X, Pencil, Pause, List } from 'lucide-react'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Combobox } from '@/components/ui/combobox'
import { DiscountDialog } from './discount-dialog'
import { TaxDialog } from './tax-dialog'
import { HoldCartDialog } from './hold-cart-dialog'
import { RetrieveCartDialog } from './retrieve-cart-dialog'
import { getCustomers, getOrCreateWalkInCustomer } from '@/actions/customers'
import { Label } from '@/components/ui/label'
import { usePermission } from '@/hooks/use-permission'
import { toast } from 'sonner'

export function CartSidebar() {
  const { canDiscount } = usePermission('pos')
  const items = useCartStore((state) => state.items)
  const subtotal = useCartStore((state) => state.subtotal)
  const discount = useCartStore((state) => state.discount)
  const discountPercent = useCartStore((state) => state.discountPercent)
  const discountType = useCartStore((state) => state.discountType)
  const tax = useCartStore((state) => state.tax)
  const taxType = useCartStore((state) => state.taxType)
  const taxValue = useCartStore((state) => state.taxValue)
  const total = useCartStore((state) => state.total)
  const clearCart = useCartStore((state) => state.clearCart)
  const removeDiscount = useCartStore((state) => state.removeDiscount)
  const selectedCustomerId = useCartStore((state) => state.selectedCustomerId)
  const selectedCustomerName = useCartStore((state) => state.selectedCustomerName)
  const setCustomer = useCartStore((state) => state.setCustomer)
  const resetCustomer = useCartStore((state) => state.resetCustomer)

  const [customers, setCustomers] = useState<Array<{ value: string; label: string; phone?: string | null }>>([])
  const [walkInCustomerId, setWalkInCustomerId] = useState<string | null>(null)
  const [showDiscountDialog, setShowDiscountDialog] = useState(false)
  const [showTaxDialog, setShowTaxDialog] = useState(false)
  const [showHoldDialog, setShowHoldDialog] = useState(false)
  const [showRetrieveDialog, setShowRetrieveDialog] = useState(false)

  const savedCarts = useCartStore((state) => state.savedCarts)
  const holdCart = useCartStore((state) => state.holdCart)
  const retrieveCart = useCartStore((state) => state.retrieveCart)

  const isEmpty = items.length === 0

  // Load customers and set default walk-in customer
  useEffect(() => {
    const loadCustomers = async () => {
      try {
        const [customerList, walkInId] = await Promise.all([
          getCustomers(),
          getOrCreateWalkInCustomer(),
        ])

        setWalkInCustomerId(walkInId)

        // Format customers for combobox
        const customerOptions = customerList.map((c) => ({
          value: c.id,
          label: c.name,
          phone: c.phone,
        }))

        // Add walk-in customer at the top
        const walkInCustomer = customerList.find((c) => c.id === walkInId)
        if (walkInCustomer) {
          setCustomers([
            { value: walkInId, label: 'Walk-in Customer', phone: null },
            ...customerOptions.filter((c) => c.value !== walkInId),
          ])
        } else {
          setCustomers([
            { value: walkInId, label: 'Walk-in Customer', phone: null },
            ...customerOptions,
          ])
        }

        // Set default customer if none selected
        if (selectedCustomerId === null) {
          console.log('Setting default walk-in customer:', walkInId)
          setCustomer(walkInId, 'Walk-in Customer')
        } else {
          console.log('Customer already selected:', selectedCustomerId, selectedCustomerName)
        }
      } catch (error) {
        console.error('Error loading customers:', error)
      }
    }

    loadCustomers()
  }, [selectedCustomerId, setCustomer])

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between p-4 border-b">
        <div className="flex items-center gap-2">
          <ShoppingCart className="h-5 w-5" />
          <h2 className="text-xl font-bold">Cart</h2>
          {items.length > 0 && (
            <span className="text-sm text-muted-foreground">
              ({items.length} {items.length === 1 ? 'item' : 'items'})
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          {!isEmpty && (
            <>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowHoldDialog(true)}
                className="text-primary hover:text-primary"
              >
                <Pause className="h-4 w-4 mr-1" />
                Hold
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={clearCart}
                className="text-destructive hover:text-destructive"
              >
                <Trash2 className="h-4 w-4 mr-1" />
                Clear
              </Button>
            </>
          )}
          {savedCarts.length > 0 && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowRetrieveDialog(true)}
              className="text-primary hover:text-primary"
            >
              <List className="h-4 w-4 mr-1" />
              Hold ({savedCarts.length})
            </Button>
          )}
        </div>
      </div>

      {/* Customer Selection */}
      {!isEmpty && (
        <div className="p-4 border-b space-y-2">
          <Label className="text-sm font-medium flex items-center gap-2">
            <User className="h-4 w-4" />
            Customer
          </Label>
          <Combobox
            options={customers}
            value={selectedCustomerId || walkInCustomerId || ''}
            onValueChange={(value) => {
              console.log('Customer selected value:', value)
              const selectedOption = customers.find(c => c.value === value)
              if (selectedOption) {
                console.log('Setting customer:', selectedOption.value, selectedOption.label)
                // Handle Walk-in Customer separately
                if (selectedOption.label === 'Walk-in Customer' || value === walkInCustomerId) {
                  resetCustomer()
                } else {
                  setCustomer(selectedOption.value, selectedOption.label)
                }
              }
            }}
            placeholder="Select customer..."
            searchPlaceholder="Search customers..."
            emptyText="No customers found"
          />
        </div>
      )}

      <ScrollArea className="flex-1">
        {isEmpty ? (
          <div className="flex flex-col items-center justify-center h-full p-8 text-center">
            <ShoppingCart className="h-16 w-16 text-muted-foreground mb-4" />
            <p className="text-muted-foreground">Cart is empty</p>
            <p className="text-sm text-muted-foreground mt-2">
              Add products to get started
            </p>
          </div>
        ) : (
          <div className="divide-y">
            {items.map((item) => (
              <CartItemComponent key={item.productId} item={item} />
            ))}
          </div>
        )}
      </ScrollArea>

      {!isEmpty && (
        <Card className="m-4 border-t">
          <CardContent className="p-4 space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Subtotal:</span>
              <span className="font-medium">{subtotal.toLocaleString()} MMK</span>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Discount:</span>
              <div className="flex items-center gap-2">
                {discount > 0 ? (
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-red-600">
                      {discountType === 'PERCENT' 
                        ? `-${discount.toLocaleString()} MMK (${discountPercent}%)`
                        : `-${discount.toLocaleString()} MMK`
                      }
                    </span>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={removeDiscount}
                      className="h-6 w-6 p-0 text-muted-foreground hover:text-destructive"
                    >
                      <X className="h-3 w-3" />
                    </Button>
                  </div>
                ) : (
                  canDiscount && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setShowDiscountDialog(true)}
                      className="h-7 px-2 text-muted-foreground"
                    >
                      <Percent className="h-3 w-3 mr-1" />
                      Add Discount
                    </Button>
                  )
                )}
              </div>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">
                Tax {taxType === 'PERCENT' ? `(${taxValue}%)` : '(Fixed)'}:
              </span>
              <div className="flex items-center gap-2">
                <span className="font-medium">{tax.toLocaleString()} MMK</span>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowTaxDialog(true)}
                  className="h-6 w-6 p-0 text-muted-foreground hover:text-primary"
                >
                  <Pencil className="h-3 w-3" />
                </Button>
              </div>
            </div>
            <div className="flex justify-between border-t pt-2 text-lg font-bold">
              <span>Total:</span>
              <span className="text-primary">{total.toLocaleString()} MMK</span>
            </div>
          </CardContent>
        </Card>
      )}

      <DiscountDialog
        open={showDiscountDialog}
        onOpenChange={setShowDiscountDialog}
      />

      <TaxDialog
        open={showTaxDialog}
        onOpenChange={setShowTaxDialog}
      />

      <HoldCartDialog
        open={showHoldDialog}
        onOpenChange={setShowHoldDialog}
        onConfirm={(note) => {
          holdCart(note)
          toast.success('Cart held successfully', {
            description: note ? `Note: ${note}` : undefined,
          })
        }}
      />

      <RetrieveCartDialog
        open={showRetrieveDialog}
        onOpenChange={setShowRetrieveDialog}
        onSelect={(cartId) => {
          retrieveCart(cartId)
          toast.success('Cart retrieved successfully')
        }}
      />
    </div>
  )
}

