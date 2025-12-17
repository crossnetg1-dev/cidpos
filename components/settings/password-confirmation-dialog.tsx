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
import { AlertTriangle, Lock } from 'lucide-react'

interface PasswordConfirmationDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onConfirm: (password: string) => Promise<void>
  title?: string
  description?: string
  confirmButtonText?: string
  isLoading?: boolean
}

export function PasswordConfirmationDialog({
  open,
  onOpenChange,
  onConfirm,
  title = 'Confirm Action',
  description = 'Enter your password to confirm this action.',
  confirmButtonText = 'Confirm',
  isLoading = false,
}: PasswordConfirmationDialogProps) {
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)

  const handleConfirm = async () => {
    if (!password.trim()) {
      setError('Password is required')
      return
    }

    setError(null)
    try {
      await onConfirm(password)
      setPassword('')
      onOpenChange(false)
    } catch (err: any) {
      setError(err.message || 'Incorrect password')
    }
  }

  const handleOpenChange = (newOpen: boolean) => {
    if (!newOpen) {
      setPassword('')
      setError(null)
    }
    onOpenChange(newOpen)
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Lock className="h-5 w-5 text-destructive" />
            {title}
          </DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="password">Admin Password</Label>
            <Input
              id="password"
              type="password"
              value={password}
              onChange={(e) => {
                setPassword(e.target.value)
                setError(null)
              }}
              placeholder="Enter your password"
              onKeyDown={(e) => {
                if (e.key === 'Enter' && password.trim()) {
                  handleConfirm()
                }
              }}
              className={error ? 'border-destructive' : ''}
            />
            {error && (
              <p className="text-sm text-destructive flex items-center gap-1">
                <AlertTriangle className="h-4 w-4" />
                {error}
              </p>
            )}
          </div>
        </div>

        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            onClick={() => handleOpenChange(false)}
            disabled={isLoading}
          >
            Cancel
          </Button>
          <Button
            type="button"
            onClick={handleConfirm}
            disabled={isLoading || !password.trim()}
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
          >
            {isLoading ? 'Verifying...' : confirmButtonText}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

