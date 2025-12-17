'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Checkbox } from '@/components/ui/checkbox'
import { Loader2 } from 'lucide-react'
import { processRefund } from '@/actions/sales'
import { toast } from 'sonner'

interface RefundDialogProps {
  sale: {
    id: string
    items: Array<{
      id: string
      quantity: number
      unitPrice: number
      total: number
      product: {
        id: string
        name: string
      }
    }>
  }
  open: boolean
  onOpenChange: (open: boolean) => void
  onSuccess?: () => void
}

export function RefundDialog({ sale, open, onOpenChange, onSuccess }: RefundDialogProps) {
  const router = useRouter()
  const [isLoading, setIsLoading] = useState(false)
  const [selectedItems, setSelectedItems] = useState<string[]>([])
  const [reason, setReason] = useState('')
  const [notes, setNotes] = useState('')

  const handleItemToggle = (itemId: string) => {
    setSelectedItems((prev) =>
      prev.includes(itemId)
        ? prev.filter((id) => id !== itemId)
        : [...prev, itemId]
    )
  }

  const handleSelectAll = () => {
    if (selectedItems.length === sale.items.length) {
      setSelectedItems([])
    } else {
      setSelectedItems(sale.items.map((item) => item.id))
    }
  }

  const calculateRefundTotal = () => {
    return sale.items
      .filter((item) => selectedItems.includes(item.id))
      .reduce((sum, item) => sum + Number(item.total), 0)
  }

  const onSubmit = async () => {
    if (selectedItems.length === 0) {
      toast.error('Please select at least one item to refund')
      return
    }

    if (!reason) {
      toast.error('Please select a reason for the refund')
      return
    }

    setIsLoading(true)
    try {
      const result = await processRefund({
        saleId: sale.id,
        itemIds: selectedItems,
        reason,
        notes: notes || undefined,
      })

      if (result.success) {
        toast.success(`Refund processed successfully. Return #${result.data?.returnNumber}`)
        onOpenChange(false)
        // Reset form
        setSelectedItems([])
        setReason('')
        setNotes('')
        // Force refresh to update UI
        router.refresh()
        onSuccess?.()
      } else {
        toast.error(result.error || 'Failed to process refund')
      }
    } catch (error) {
      toast.error('An error occurred')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Process Refund</DialogTitle>
          <DialogDescription>
            Select items to refund and provide a reason
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Items Selection */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label>Select Items to Refund</Label>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleSelectAll}
              >
                {selectedItems.length === sale.items.length ? 'Deselect All' : 'Select All'}
              </Button>
            </div>
            <div className="border rounded-md divide-y max-h-[300px] overflow-y-auto">
              {sale.items.map((item) => (
                <div
                  key={item.id}
                  className="flex items-center space-x-3 p-3 hover:bg-accent"
                >
                  <Checkbox
                    checked={selectedItems.includes(item.id)}
                    onCheckedChange={() => handleItemToggle(item.id)}
                  />
                  <div className="flex-1">
                    <p className="font-medium">{item.product.name}</p>
                    <p className="text-sm text-muted-foreground">
                      Qty: {Number(item.quantity)} × {Number(item.unitPrice).toLocaleString()} MMK
                    </p>
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

          {/* Refund Total */}
          {selectedItems.length > 0 && (
            <div className="bg-muted p-3 rounded-md">
              <div className="flex justify-between items-center">
                <span className="font-medium">Refund Total:</span>
                <span className="text-lg font-semibold text-green-600">
                  {calculateRefundTotal().toLocaleString()} MMK
                </span>
              </div>
            </div>
          )}

          {/* Reason */}
          <div className="space-y-2">
            <Label htmlFor="reason">Reason *</Label>
            <Select value={reason} onValueChange={setReason}>
              <SelectTrigger id="reason">
                <SelectValue placeholder="Select reason" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="DEFECTIVE">Defective Product</SelectItem>
                <SelectItem value="WRONG_ITEM">Wrong Item</SelectItem>
                <SelectItem value="CUSTOMER_REQUEST">Customer Request</SelectItem>
                <SelectItem value="EXPIRED">Expired Product</SelectItem>
                <SelectItem value="OTHER">Other</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Notes */}
          <div className="space-y-2">
            <Label htmlFor="notes">Notes</Label>
            <Textarea
              id="notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Additional notes (optional)"
              rows={3}
            />
          </div>
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
            onClick={onSubmit}
            disabled={isLoading || selectedItems.length === 0 || !reason}
          >
            {isLoading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Processing...
              </>
            ) : (
              'Process Refund'
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

