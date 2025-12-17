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
import { Separator } from '@/components/ui/separator'
import { Loader2 } from 'lucide-react'
import { updateStoreSettings } from '@/actions/settings'
import { toast } from 'sonner'

const receiptSettingsSchema = z.object({
  taxRate: z.number().min(0, 'Tax rate must be positive').max(100, 'Tax rate cannot exceed 100%'),
  receiptFooter: z.string().optional(),
})

type ReceiptSettingsFormValues = z.infer<typeof receiptSettingsSchema>

interface ReceiptSettingsProps {
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

export function ReceiptSettings({ settings, onUpdate }: ReceiptSettingsProps) {
  const router = useRouter()
  const [isLoading, setIsLoading] = useState(false)

  const {
    register,
    handleSubmit,
    formState: { errors },
    watch,
  } = useForm<ReceiptSettingsFormValues>({
    resolver: zodResolver(receiptSettingsSchema),
    defaultValues: {
      taxRate: settings?.taxRate || 0,
      receiptFooter: settings?.receiptFooter || 'Thank you for shopping with us!',
    },
  })

  const taxRate = watch('taxRate')
  const receiptFooter = watch('receiptFooter')

  const onSubmit = async (data: ReceiptSettingsFormValues) => {
    setIsLoading(true)
    try {
      const result = await updateStoreSettings({
        storeName: settings?.storeName || 'My POS Store',
        address: settings?.address || null,
        phone: settings?.phone || null,
        currency: settings?.currency || 'MMK',
        taxRate: data.taxRate,
        receiptFooter: data.receiptFooter,
      })

      if (result.success && result.data) {
        toast.success('Receipt settings updated successfully')
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
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
      <Card>
        <CardHeader>
          <CardTitle>Receipt Configuration</CardTitle>
          <CardDescription>
            Configure tax rate and receipt footer message
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="taxRate">Tax Rate (%) *</Label>
              <Input
                id="taxRate"
                type="number"
                step="0.01"
                min="0"
                max="100"
                {...register('taxRate', {
                  valueAsNumber: true,
                })}
                placeholder="5.0"
              />
              {errors.taxRate && (
                <p className="text-sm text-destructive">{errors.taxRate.message}</p>
              )}
              <p className="text-xs text-muted-foreground">
                Default tax rate applied to all sales (can be overridden at POS)
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="receiptFooter">Footer Message</Label>
              <Textarea
                id="receiptFooter"
                {...register('receiptFooter')}
                placeholder="Thank you for shopping with us!"
                rows={3}
              />
              <p className="text-xs text-muted-foreground">
                Message displayed at the bottom of receipts
              </p>
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

      {/* Receipt Preview */}
      <Card>
        <CardHeader>
          <CardTitle>Receipt Preview</CardTitle>
          <CardDescription>
            Preview how your receipt will look
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="border-2 border-dashed border-muted-foreground/25 rounded-lg p-6 bg-muted/20">
            <div className="text-center space-y-2 mb-4">
              <h3 className="font-bold text-lg">{settings?.storeName || 'My POS Store'}</h3>
              {settings?.address && (
                <p className="text-sm text-muted-foreground">{settings.address}</p>
              )}
              {settings?.phone && (
                <p className="text-sm text-muted-foreground">{settings.phone}</p>
              )}
            </div>

            <Separator className="my-4" />

            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span>Item 1</span>
                <span>10,000 {settings?.currency || 'MMK'}</span>
              </div>
              <div className="flex justify-between">
                <span>Item 2</span>
                <span>5,000 {settings?.currency || 'MMK'}</span>
              </div>
            </div>

            <Separator className="my-4" />

            <div className="space-y-1 text-sm">
              <div className="flex justify-between">
                <span>Subtotal:</span>
                <span>15,000 {settings?.currency || 'MMK'}</span>
              </div>
              {taxRate > 0 && (
                <div className="flex justify-between">
                  <span>Tax ({taxRate}%):</span>
                  <span>{(15000 * taxRate / 100).toFixed(2)} {settings?.currency || 'MMK'}</span>
                </div>
              )}
              <div className="flex justify-between font-bold">
                <span>Total:</span>
                <span>{(15000 * (1 + taxRate / 100)).toFixed(2)} {settings?.currency || 'MMK'}</span>
              </div>
            </div>

            <Separator className="my-4" />

            <div className="text-center text-xs text-muted-foreground">
              {receiptFooter || 'Thank you for shopping with us!'}
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

