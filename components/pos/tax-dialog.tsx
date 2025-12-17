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
import type { TaxType } from '@/types'

interface TaxDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function TaxDialog({ open, onOpenChange }: TaxDialogProps) {
  const subtotal = useCartStore((state) => state.subtotal)
  const discount = useCartStore((state) => state.discount)
  const tax = useCartStore((state) => state.tax)
  const taxType = useCartStore((state) => state.taxType)
  const taxValue = useCartStore((state) => state.taxValue)
  const setTax = useCartStore((state) => state.setTax)
  const resetTax = useCartStore((state) => state.resetTax)

  const [localTaxType, setLocalTaxType] = useState<TaxType>(taxType)
  const [localValue, setLocalValue] = useState('')

  // Calculate taxable amount (subtotal - discount)
  const taxableAmount = subtotal - discount

  // Initialize local state when dialog opens
  useEffect(() => {
    if (open) {
      setLocalTaxType(taxType)
      setLocalValue(taxValue > 0 ? taxValue.toString() : '')
    }
  }, [open, taxType, taxValue])

  const handleApply = () => {
    const value = parseFloat(localValue) || 0
    
    if (value >= 0) {
      if (localTaxType === 'FIXED') {
        setTax('FIXED', value)
      } else {
        // Percentage: ensure it's between 0 and 100
        const percentValue = Math.min(100, Math.max(0, value))
        setTax('PERCENT', percentValue)
      }
      onOpenChange(false)
      setLocalValue('')
    }
  }

  const handleReset = () => {
    resetTax()
    onOpenChange(false)
    setLocalValue('')
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[400px]">
        <DialogHeader>
          <DialogTitle>Set Tax</DialogTitle>
          <DialogDescription>
            Enter tax percentage or fixed amount
          </DialogDescription>
        </DialogHeader>

        <Tabs value={localTaxType} onValueChange={(v) => setLocalTaxType(v as TaxType)}>
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="PERCENT">
              <Percent className="h-4 w-4 mr-2" />
              Percentage
            </TabsTrigger>
            <TabsTrigger value="FIXED">
              <DollarSign className="h-4 w-4 mr-2" />
              Fixed Amount
            </TabsTrigger>
          </TabsList>

          <TabsContent value="PERCENT" className="space-y-4 mt-4">
            <div className="space-y-2">
              <Label htmlFor="percent">Tax Percentage (%)</Label>
              <Input
                id="percent"
                type="number"
                placeholder="5"
                min="0"
                max="100"
                value={localValue}
                onChange={(e) => setLocalValue(e.target.value)}
                onFocus={(e) => e.target.select()}
              />
              {localValue && parseFloat(localValue) > 0 && (
                <p className="text-xs text-muted-foreground">
                  Amount: {Math.round((taxableAmount * parseFloat(localValue) / 100) * 100) / 100} MMK
                </p>
              )}
            </div>
          </TabsContent>

          <TabsContent value="FIXED" className="space-y-4 mt-4">
            <div className="space-y-2">
              <Label htmlFor="amount">Tax Amount (MMK)</Label>
              <Input
                id="amount"
                type="number"
                placeholder="0"
                value={localValue}
                onChange={(e) => setLocalValue(e.target.value)}
                onFocus={(e) => e.target.select()}
              />
            </div>
          </TabsContent>
        </Tabs>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={handleReset}
            className="mr-auto"
          >
            Reset to Default (5%)
          </Button>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
          >
            Cancel
          </Button>
          <Button
            onClick={handleApply}
            disabled={
              !localValue || parseFloat(localValue) < 0 ||
              (localTaxType === 'PERCENT' && parseFloat(localValue) > 100)
            }
          >
            Apply
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

