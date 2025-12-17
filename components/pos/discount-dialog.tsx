'use client'

import { useState, useEffect } from 'react'
import { useCartStore } from '@/stores/cart-store'
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Percent, DollarSign } from 'lucide-react'
import type { DiscountType } from '@/types'

interface DiscountDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function DiscountDialog({ open, onOpenChange }: DiscountDialogProps) {
  const subtotal = useCartStore((state) => state.subtotal)
  const discount = useCartStore((state) => state.discount)
  const discountPercent = useCartStore((state) => state.discountPercent)
  const discountType = useCartStore((state) => state.discountType)
  const discountValue = useCartStore((state) => state.discountValue)
  const setDiscount = useCartStore((state) => state.setDiscount)
  const removeDiscount = useCartStore((state) => state.removeDiscount)

  const [localDiscountType, setLocalDiscountType] = useState<DiscountType>(discountType)
  const [localValue, setLocalValue] = useState('')

  // Initialize local state when dialog opens
  useEffect(() => {
    if (open) {
      setLocalDiscountType(discountType)
      setLocalValue(discountValue > 0 ? discountValue.toString() : '')
    }
  }, [open, discountType, discountValue])

  const handleApply = () => {
    const value = parseFloat(localValue) || 0
    
    if (localDiscountType === 'FIXED') {
      if (value > 0 && value <= subtotal) {
        setDiscount('FIXED', value)
        onOpenChange(false)
        setLocalValue('')
      }
    } else {
      if (value > 0 && value <= 100) {
        setDiscount('PERCENT', value)
        onOpenChange(false)
        setLocalValue('')
      }
    }
  }

  const handleRemove = () => {
    removeDiscount()
    onOpenChange(false)
    setLocalValue('')
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[400px]">
        <DialogHeader>
          <DialogTitle>Apply Discount</DialogTitle>
          <DialogDescription>
            Enter discount amount or percentage
          </DialogDescription>
        </DialogHeader>

        <Tabs value={localDiscountType} onValueChange={(v) => setLocalDiscountType(v as DiscountType)}>
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="FIXED">
              <DollarSign className="h-4 w-4 mr-2" />
              Fixed Amount
            </TabsTrigger>
            <TabsTrigger value="PERCENT">
              <Percent className="h-4 w-4 mr-2" />
              Percentage
            </TabsTrigger>
          </TabsList>

          <TabsContent value="FIXED" className="space-y-4 mt-4">
            <div className="space-y-2">
              <Label htmlFor="amount">Discount Amount (MMK)</Label>
              <Input
                id="amount"
                type="number"
                placeholder="0"
                value={localValue}
                onChange={(e) => setLocalValue(e.target.value)}
                onFocus={(e) => e.target.select()}
              />
              <p className="text-xs text-muted-foreground">
                Maximum: {subtotal.toLocaleString()} MMK
              </p>
            </div>
          </TabsContent>

          <TabsContent value="PERCENT" className="space-y-4 mt-4">
            <div className="space-y-2">
              <Label htmlFor="percent">Discount Percentage (%)</Label>
              <Input
                id="percent"
                type="number"
                placeholder="0"
                min="0"
                max="100"
                value={localValue}
                onChange={(e) => setLocalValue(e.target.value)}
                onFocus={(e) => e.target.select()}
              />
              {localValue && parseFloat(localValue) > 0 && (
                <p className="text-xs text-muted-foreground">
                  Amount: {Math.round((subtotal * parseFloat(localValue) / 100) * 100) / 100} MMK
                </p>
              )}
            </div>
          </TabsContent>
        </Tabs>

        <DialogFooter>
          {discount > 0 && (
            <Button
              variant="outline"
              onClick={handleRemove}
              className="mr-auto"
            >
              Remove Discount
            </Button>
          )}
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
          >
            Cancel
          </Button>
          <Button
            onClick={handleApply}
            disabled={
              !localValue || parseFloat(localValue) <= 0 ||
              (localDiscountType === 'FIXED' && parseFloat(localValue) > subtotal) ||
              (localDiscountType === 'PERCENT' && parseFloat(localValue) > 100)
            }
          >
            Apply
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

