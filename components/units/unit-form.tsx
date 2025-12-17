'use client'

import { useState, useEffect } from 'react'
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
import { Loader2 } from 'lucide-react'
import { createUnit, updateUnit, type UnitFormData } from '@/actions/units'
import { toast } from 'sonner'

const unitSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  shortName: z.string().min(1, 'Short name is required').max(10, 'Short name must be 10 characters or less'),
})

type UnitFormValues = z.infer<typeof unitSchema>

interface UnitFormProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  unit?: {
    id: string
    name: string
    shortName: string
  } | null
  onSuccess?: () => void
}

export function UnitForm({ open, onOpenChange, unit, onSuccess }: UnitFormProps) {
  const [isLoading, setIsLoading] = useState(false)

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
  } = useForm<UnitFormValues>({
    resolver: zodResolver(unitSchema),
    defaultValues: {
      name: '',
      shortName: '',
    },
  })

  // Reset form when unit changes
  useEffect(() => {
    if (unit) {
      reset({
        name: unit.name,
        shortName: unit.shortName,
      })
    } else {
      reset({
        name: '',
        shortName: '',
      })
    }
  }, [unit, reset])

  const onSubmit = async (data: UnitFormValues) => {
    setIsLoading(true)
    try {
      const formData: UnitFormData = {
        name: data.name,
        shortName: data.shortName,
      }

      let result
      if (unit) {
        result = await updateUnit(unit.id, formData)
      } else {
        result = await createUnit(formData)
      }

      if (result.success) {
        toast.success(unit ? 'Unit updated successfully' : 'Unit created successfully')
        onOpenChange(false)
        onSuccess?.()
      } else {
        toast.error(result.error || 'Failed to save unit')
      }
    } catch (error) {
      toast.error('An error occurred')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>{unit ? 'Edit Unit' : 'Add New Unit'}</DialogTitle>
          <DialogDescription>
            {unit ? 'Update unit information' : 'Create a new measurement unit'}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">Name *</Label>
            <Input
              id="name"
              {...register('name')}
              placeholder="e.g., Kilogram, Piece, Box"
            />
            {errors.name && (
              <p className="text-sm text-destructive">{errors.name.message}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="shortName">Short Name *</Label>
            <Input
              id="shortName"
              {...register('shortName')}
              placeholder="e.g., kg, pcs, box"
              maxLength={10}
            />
            {errors.shortName && (
              <p className="text-sm text-destructive">{errors.shortName.message}</p>
            )}
            <p className="text-xs text-muted-foreground">
              Short abbreviation for the unit (max 10 characters)
            </p>
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
            <Button type="submit" disabled={isLoading}>
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  {unit ? 'Updating...' : 'Creating...'}
                </>
              ) : (
                unit ? 'Update Unit' : 'Create Unit'
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

