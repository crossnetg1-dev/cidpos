'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import * as z from 'zod'
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
import { Textarea } from '@/components/ui/textarea'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Loader2 } from 'lucide-react'
import { adjustStock } from '@/actions/stock'
import { toast } from 'sonner'
import type { StockProduct } from '@/actions/stock'

const adjustStockSchema = z.object({
  type: z.enum(['ADD', 'REMOVE']),
  quantity: z.number().min(0.01, 'Quantity must be greater than 0'),
  reason: z.string().min(1, 'Reason is required'),
  notes: z.string().optional(),
})

type AdjustStockFormValues = z.infer<typeof adjustStockSchema>

interface AdjustStockDialogProps {
  product: StockProduct
  open: boolean
  onOpenChange: (open: boolean) => void
  onSuccess?: () => void
}

export function AdjustStockDialog({ product, open, onOpenChange, onSuccess }: AdjustStockDialogProps) {
  const router = useRouter()
  const [isLoading, setIsLoading] = useState(false)
  const [adjustmentType, setAdjustmentType] = useState<'ADD' | 'REMOVE'>('ADD')

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
    setValue,
    watch,
  } = useForm<AdjustStockFormValues>({
    resolver: zodResolver(adjustStockSchema),
    defaultValues: {
      type: 'ADD',
      quantity: 1,
      reason: '',
      notes: '',
    },
  })

  const quantity = watch('quantity')
  const reason = watch('reason')

  const handleTypeChange = (type: 'ADD' | 'REMOVE') => {
    setAdjustmentType(type)
    setValue('type', type)
  }

  const onSubmit = async (data: AdjustStockFormValues) => {
    setIsLoading(true)
    try {
      const result = await adjustStock(
        product.id,
        data.type,
        data.quantity,
        data.reason,
        data.notes
      )

      if (result.success) {
        toast.success(
          `Stock ${data.type === 'ADD' ? 'added' : 'removed'} successfully. New stock: ${result.afterQty}`
        )
        reset()
        onOpenChange(false)
        // Force refresh to update UI
        router.refresh()
        onSuccess?.()
      } else {
        toast.error(result.error || 'Failed to adjust stock')
      }
    } catch (error) {
      toast.error('An error occurred')
    } finally {
      setIsLoading(false)
    }
  }

  const projectedStock = adjustmentType === 'ADD'
    ? product.stock + (quantity || 0)
    : product.stock - (quantity || 0)

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Adjust Stock</DialogTitle>
          <DialogDescription>
            {product.name} - Current Stock: {product.stock} {product.unit}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          {/* Type Selection */}
          <div className="space-y-2">
            <Label>Adjustment Type *</Label>
            <div className="flex gap-2">
              <Button
                type="button"
                variant={adjustmentType === 'ADD' ? 'default' : 'outline'}
                className="flex-1"
                onClick={() => handleTypeChange('ADD')}
              >
                Add Stock
              </Button>
              <Button
                type="button"
                variant={adjustmentType === 'REMOVE' ? 'default' : 'outline'}
                className="flex-1"
                onClick={() => handleTypeChange('REMOVE')}
              >
                Remove Stock
              </Button>
            </div>
          </div>

          {/* Quantity */}
          <div className="space-y-2">
            <Label htmlFor="quantity">Quantity *</Label>
            <Input
              id="quantity"
              type="number"
              step="0.01"
              min="0.01"
              {...register('quantity', {
                valueAsNumber: true,
              })}
            />
            {errors.quantity && (
              <p className="text-sm text-destructive">{errors.quantity.message}</p>
            )}
            {adjustmentType === 'REMOVE' && quantity && quantity > product.stock && (
              <p className="text-sm text-destructive">
                Cannot remove more than current stock ({product.stock} {product.unit})
              </p>
            )}
            {quantity && (
              <p className="text-sm text-muted-foreground">
                Projected Stock: <strong>{projectedStock.toFixed(2)}</strong> {product.unit}
              </p>
            )}
          </div>

          {/* Reason */}
          <div className="space-y-2">
            <Label htmlFor="reason">Reason *</Label>
            <Select
              value={reason}
              onValueChange={(value) => setValue('reason', value)}
            >
              <SelectTrigger id="reason">
                <SelectValue placeholder="Select reason" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="DAMAGE">Damaged</SelectItem>
                <SelectItem value="EXPIRED">Expired</SelectItem>
                <SelectItem value="LOST">Lost</SelectItem>
                <SelectItem value="FOUND">Found</SelectItem>
                <SelectItem value="COUNT">Audit Correction</SelectItem>
                <SelectItem value="CORRECTION">Correction</SelectItem>
                <SelectItem value="OTHER">Other</SelectItem>
              </SelectContent>
            </Select>
            {errors.reason && (
              <p className="text-sm text-destructive">{errors.reason.message}</p>
            )}
          </div>

          {/* Notes */}
          <div className="space-y-2">
            <Label htmlFor="notes">Notes</Label>
            <Textarea
              id="notes"
              placeholder="Additional details (optional)"
              rows={3}
              {...register('notes')}
            />
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isLoading}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={isLoading || (adjustmentType === 'REMOVE' && quantity > product.stock)}
            >
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Adjusting...
                </>
              ) : (
                `${adjustmentType === 'ADD' ? 'Add' : 'Remove'} Stock`
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

