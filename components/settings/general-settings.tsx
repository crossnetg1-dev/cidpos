'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import * as z from 'zod'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
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
import { updateStoreSettings } from '@/actions/settings'
import { toast } from 'sonner'

const generalSettingsSchema = z.object({
  storeName: z.string().min(1, 'Store name is required'),
  address: z.string().optional(),
  phone: z.string().optional(),
  currency: z.string().min(1, 'Currency is required'),
})

type GeneralSettingsFormValues = z.infer<typeof generalSettingsSchema>

interface GeneralSettingsProps {
  settings: {
    id: string
    storeName: string
    address: string | null
    phone: string | null
    currency: string
    taxRate: number
    receiptFooter: string | null
  } | null
  onUpdate: (settings: typeof settings) => void
}

export function GeneralSettings({ settings, onUpdate }: GeneralSettingsProps) {
  const router = useRouter()
  const [isLoading, setIsLoading] = useState(false)

  const {
    register,
    handleSubmit,
    formState: { errors },
    setValue,
    watch,
  } = useForm<GeneralSettingsFormValues>({
    resolver: zodResolver(generalSettingsSchema),
    defaultValues: {
      storeName: settings?.storeName || '',
      address: settings?.address || '',
      phone: settings?.phone || '',
      currency: settings?.currency || 'MMK',
    },
  })

  const currency = watch('currency')

  const onSubmit = async (data: GeneralSettingsFormValues) => {
    setIsLoading(true)
    try {
      const result = await updateStoreSettings({
        storeName: data.storeName,
        address: data.address,
        phone: data.phone,
        currency: data.currency,
        taxRate: settings?.taxRate || 0,
        receiptFooter: settings?.receiptFooter || null,
      })

      if (result.success && result.data) {
        toast.success('Store settings updated successfully')
        onUpdate(result.data)
        router.refresh()
      } else {
        toast.error(result.error || 'Failed to update settings')
      }
    } catch (error) {
      toast.error('An error occurred')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Store Information</CardTitle>
        <CardDescription>
          Configure your store details and contact information
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="storeName">Store Name *</Label>
            <Input
              id="storeName"
              {...register('storeName')}
              placeholder="My POS Store"
            />
            {errors.storeName && (
              <p className="text-sm text-destructive">{errors.storeName.message}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="address">Address</Label>
            <Textarea
              id="address"
              {...register('address')}
              placeholder="Store address"
              rows={3}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="phone">Phone</Label>
            <Input
              id="phone"
              {...register('phone')}
              placeholder="+95 9XXXXXXXXX"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="currency">Currency *</Label>
            <Select
              value={currency}
              onValueChange={(value) => setValue('currency', value)}
            >
              <SelectTrigger id="currency">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="MMK">MMK (Myanmar Kyat)</SelectItem>
                <SelectItem value="USD">USD (US Dollar)</SelectItem>
                <SelectItem value="EUR">EUR (Euro)</SelectItem>
                <SelectItem value="GBP">GBP (British Pound)</SelectItem>
                <SelectItem value="THB">THB (Thai Baht)</SelectItem>
              </SelectContent>
            </Select>
            {errors.currency && (
              <p className="text-sm text-destructive">{errors.currency.message}</p>
            )}
          </div>

          <Button type="submit" disabled={isLoading}>
            {isLoading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Saving...
              </>
            ) : (
              'Save Changes'
            )}
          </Button>
        </form>
      </CardContent>
    </Card>
  )
}

