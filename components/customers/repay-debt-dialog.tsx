'use client'

import { useState, useTransition } from 'react'
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
import { repayDebt } from '@/actions/customers'
import { Loader2 } from 'lucide-react'
import { toast } from 'sonner'

interface RepayDebtDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  customerId: string
  currentDebt: number
  onSuccess: () => void
}

export function RepayDebtDialog({
  open,
  onOpenChange,
  customerId,
  currentDebt,
  onSuccess,
}: RepayDebtDialogProps) {
  const [amount, setAmount] = useState('')
  const [isPending, startTransition] = useTransition()

  const handleSubmit = () => {
    const repaymentAmount = parseFloat(amount)

    if (!amount || isNaN(repaymentAmount) || repaymentAmount <= 0) {
      toast.error('Please enter a valid amount')
      return
    }

    if (repaymentAmount > currentDebt) {
      toast.error(`Repayment amount cannot exceed current debt of ${currentDebt.toLocaleString()} MMK`)
      return
    }

    startTransition(async () => {
      try {
        const result = await repayDebt(customerId, repaymentAmount)

        if (result.success) {
          toast.success(result.message || 'Debt repayment recorded successfully')
          setAmount('')
          onOpenChange(false)
          onSuccess() // Refresh customer data
        } else {
          toast.error(result.error || 'Failed to record debt repayment')
        }
      } catch (error) {
        toast.error('An error occurred while processing the repayment')
      }
    })
  }

  const handleClose = () => {
    if (!isPending) {
      setAmount('')
      onOpenChange(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Repay Debt</DialogTitle>
          <DialogDescription>
            Record a debt repayment for this customer
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="current-debt">Current Debt</Label>
            <div className="text-2xl font-bold text-destructive">
              {currentDebt.toLocaleString()} MMK
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="amount">Repayment Amount (MMK)</Label>
            <Input
              id="amount"
              type="number"
              placeholder="0"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              onFocus={(e) => e.target.select()}
              disabled={isPending}
              min="0"
              max={currentDebt}
              step="0.01"
            />
            <p className="text-xs text-muted-foreground">
              Maximum: {currentDebt.toLocaleString()} MMK
            </p>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={handleClose} disabled={isPending}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={isPending || !amount || parseFloat(amount) <= 0}>
            {isPending ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Processing...
              </>
            ) : (
              'Record Repayment'
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

