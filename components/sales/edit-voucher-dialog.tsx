'use client'

import { useState, useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import * as z from 'zod'
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
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'
import { Loader2, Check, ChevronsUpDown } from 'lucide-react'
import { updateSaleMetadata } from '@/actions/sales'
import { getCustomers } from '@/actions/customers'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'

const voucherSchema = z.object({
  customerId: z.string().nullable(),
  paymentMethod: z.string(),
  notes: z.string().optional().nullable(),
})

type VoucherFormValues = z.infer<typeof voucherSchema>

interface EditVoucherDialogProps {
  sale: {
    id: string
    customerId: string | null
    paymentMethod: string
    notes: string | null
  }
  open: boolean
  onOpenChange: (open: boolean) => void
  onSuccess?: () => void
}

export function EditVoucherDialog({ sale, open, onOpenChange, onSuccess }: EditVoucherDialogProps) {
  const router = useRouter()
  const [isLoading, setIsLoading] = useState(false)
  const [customers, setCustomers] = useState<Array<{ id: string; name: string }>>([])
  const [customerOpen, setCustomerOpen] = useState(false)
  const [selectedCustomer, setSelectedCustomer] = useState<{ id: string; name: string } | null>(null)

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
    setValue,
    watch,
  } = useForm<VoucherFormValues>({
    resolver: zodResolver(voucherSchema),
    defaultValues: {
      customerId: sale.customerId || null,
      paymentMethod: sale.paymentMethod,
      notes: sale.notes || '',
    },
  })

  const paymentMethod = watch('paymentMethod')

  // Load customers
  useEffect(() => {
    if (open) {
      const loadCustomers = async () => {
        const data = await getCustomers()
        setCustomers(data)
        
        // Set selected customer
        if (sale.customerId) {
          const customer = data.find(c => c.id === sale.customerId)
          if (customer) {
            setSelectedCustomer(customer)
          }
        }
      }
      loadCustomers()
    }
  }, [open, sale.customerId])

  // Reset form when sale changes
  useEffect(() => {
    if (sale) {
      reset({
        customerId: sale.customerId || null,
        paymentMethod: sale.paymentMethod,
        notes: sale.notes || '',
      })
    }
  }, [sale, reset])

  const onSubmit = async (data: VoucherFormValues) => {
    setIsLoading(true)
    try {
      const result = await updateSaleMetadata(sale.id, {
        customerId: data.customerId || null,
        paymentMethod: data.paymentMethod,
        notes: data.notes || null,
      })

      if (result.success) {
        toast.success('Sale updated successfully')
        onOpenChange(false)
        // Force refresh to update UI
        router.refresh()
        onSuccess?.()
      } else {
        toast.error(result.error || 'Failed to update sale')
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
          <DialogTitle>Edit Voucher</DialogTitle>
          <DialogDescription>
            Update customer, payment method, or notes for this sale
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          {/* Customer Selection */}
          <div className="space-y-2">
            <Label>Customer</Label>
            <Popover open={customerOpen} onOpenChange={setCustomerOpen}>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  role="combobox"
                  className="w-full justify-between"
                >
                  {selectedCustomer ? selectedCustomer.name : 'Select customer...'}
                  <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-full p-0">
                <Command>
                  <CommandInput placeholder="Search customer..." />
                  <CommandList>
                    <CommandEmpty>No customer found.</CommandEmpty>
                    <CommandGroup>
                      <CommandItem
                        onSelect={() => {
                          setSelectedCustomer(null)
                          setValue('customerId', null)
                          setCustomerOpen(false)
                        }}
                      >
                        <Check
                          className={cn(
                            'mr-2 h-4 w-4',
                            !selectedCustomer ? 'opacity-100' : 'opacity-0'
                          )}
                        />
                        Walk-in Customer
                      </CommandItem>
                      {customers.map((customer) => (
                        <CommandItem
                          key={customer.id}
                          value={customer.name}
                          onSelect={() => {
                            setSelectedCustomer(customer)
                            setValue('customerId', customer.id)
                            setCustomerOpen(false)
                          }}
                        >
                          <Check
                            className={cn(
                              'mr-2 h-4 w-4',
                              selectedCustomer?.id === customer.id ? 'opacity-100' : 'opacity-0'
                            )}
                          />
                          {customer.name}
                        </CommandItem>
                      ))}
                    </CommandGroup>
                  </CommandList>
                </Command>
              </PopoverContent>
            </Popover>
          </div>

          {/* Payment Method */}
          <div className="space-y-2">
            <Label htmlFor="paymentMethod">Payment Method</Label>
            <Select
              value={paymentMethod}
              onValueChange={(value) => setValue('paymentMethod', value)}
            >
              <SelectTrigger id="paymentMethod">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="CASH">Cash</SelectItem>
                <SelectItem value="KBZPAY">KBZPay</SelectItem>
                <SelectItem value="WAVEPAY">WavePay</SelectItem>
                <SelectItem value="AYAPAY">AYAPay</SelectItem>
                <SelectItem value="CREDIT">Credit Sale</SelectItem>
                <SelectItem value="SPLIT">Split Payment</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Notes */}
          <div className="space-y-2">
            <Label htmlFor="notes">Notes</Label>
            <Textarea
              id="notes"
              {...register('notes')}
              placeholder="Additional notes (optional)"
              rows={3}
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
                  Updating...
                </>
              ) : (
                'Update Sale'
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

