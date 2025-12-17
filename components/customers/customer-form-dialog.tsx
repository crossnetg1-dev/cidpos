'use client'

import { useState, useEffect } from 'react'
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
import { Loader2 } from 'lucide-react'
import { createCustomer, updateCustomer } from '@/actions/customers'
import { toast } from 'sonner'

const customerSchema = z.object({
  name: z.string().min(1, 'Customer name is required'),
  phone: z.string().optional(),
  email: z.string().email('Invalid email').optional().or(z.literal('')),
  address: z.string().optional(),
  creditLimit: z.number().min(0, 'Credit limit must be positive').default(0),
  openingBalance: z.number().default(0),
})

type CustomerFormValues = z.infer<typeof customerSchema>

interface CustomerFormDialogProps {
  customer?: {
    id: string
    name: string
    phone: string | null
    email: string | null
    address: string | null
    creditBalance: number
  }
  open: boolean
  onOpenChange: (open: boolean) => void
  onSuccess?: () => void
}

export function CustomerFormDialog({ customer, open, onOpenChange, onSuccess }: CustomerFormDialogProps) {
  const router = useRouter()
  const [isLoading, setIsLoading] = useState(false)

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
    setValue,
  } = useForm<CustomerFormValues>({
    resolver: zodResolver(customerSchema),
    defaultValues: {
      name: '',
      phone: '',
      email: '',
      address: '',
      creditLimit: 0,
      openingBalance: 0,
    },
  })

  useEffect(() => {
    if (customer) {
      setValue('name', customer.name)
      setValue('phone', customer.phone || '')
      setValue('email', customer.email || '')
      setValue('address', customer.address || '')
      setValue('creditLimit', 0)
      setValue('openingBalance', 0)
    } else {
      reset()
    }
  }, [customer, setValue, reset])

  const onSubmit = async (data: CustomerFormValues) => {
    setIsLoading(true)
    try {
      let result
      if (customer) {
        result = await updateCustomer(customer.id, data)
      } else {
        result = await createCustomer(data)
      }

      if (result.success) {
        toast.success(customer ? 'Customer updated successfully' : 'Customer created successfully')
        onOpenChange(false)
        reset()
        // Force refresh to update UI
        router.refresh()
        onSuccess?.()
      } else {
        toast.error(result.error || 'Failed to save customer')
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
          <DialogTitle>{customer ? 'Edit Customer' : 'Add Customer'}</DialogTitle>
          <DialogDescription>
            {customer ? 'Update customer information' : 'Create a new customer profile'}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">Name *</Label>
            <Input
              id="name"
              {...register('name')}
              placeholder="Customer name"
            />
            {errors.name && (
              <p className="text-sm text-destructive">{errors.name.message}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="phone">Phone</Label>
            <Input
              id="phone"
              {...register('phone')}
              placeholder="Phone number"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              {...register('email')}
              placeholder="Email address"
            />
            {errors.email && (
              <p className="text-sm text-destructive">{errors.email.message}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="address">Address</Label>
            <Input
              id="address"
              {...register('address')}
              placeholder="Address"
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
            <Button type="submit" disabled={isLoading}>
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Saving...
                </>
              ) : (
                customer ? 'Update Customer' : 'Create Customer'
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

