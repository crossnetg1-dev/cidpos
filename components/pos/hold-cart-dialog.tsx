'use client'

import { useState } from 'react'
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

interface HoldCartDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onConfirm: (note?: string) => void
}

export function HoldCartDialog({ open, onOpenChange, onConfirm }: HoldCartDialogProps) {
  const [note, setNote] = useState('')

  const handleConfirm = () => {
    onConfirm(note.trim() || undefined)
    setNote('')
    onOpenChange(false)
  }

  const handleCancel = () => {
    setNote('')
    onOpenChange(false)
  }

  return (
    <Dialog open={open} onOpenChange={handleCancel}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Hold Cart</DialogTitle>
          <DialogDescription>
            Save this cart temporarily. You can retrieve it later to continue the sale.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="note">Reference Note (Optional)</Label>
            <Textarea
              id="note"
              placeholder="e.g., Customer name, phone number, or any reference..."
              value={note}
              onChange={(e) => setNote(e.target.value)}
              rows={3}
              maxLength={200}
            />
            <p className="text-xs text-muted-foreground">
              {note.length}/200 characters
            </p>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={handleCancel}>
            Cancel
          </Button>
          <Button onClick={handleConfirm}>
            Hold Cart
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

