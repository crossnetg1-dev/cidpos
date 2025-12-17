'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useForm, useFieldArray } from 'react-hook-form'
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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Trash2, Loader2, Search, Plus } from 'lucide-react'
import { getPurchaseById, updatePurchase, searchProductsForPurchase } from '@/actions/purchases'
import { toast } from 'sonner'
import { format } from 'date-fns'

const editPurchaseSchema = z.object({
  supplierId: z.string().optional(),
  referenceNo: z.string().optional(),
  purchaseDate: z.string().min(1, 'Purchase date is required'),
  status: z.enum(['RECEIVED', 'PENDING']),
  notes: z.string().optional().nullable(),
  items: z.array(
    z.object({
      productId: z.string().min(1, 'Product is required'),
      productName: z.string(),
      quantity: z.number().min(0.01, 'Quantity must be greater than 0'),
      unitPrice: z.number().min(0, 'Unit price must be positive'),
      expiryDate: z.string().optional().nullable(),
      currentStock: z.number(),
      unit: z.string(),
    })
  ).min(1, 'At least one item is required'),
})

type EditPurchaseFormValues = z.infer<typeof editPurchaseSchema>

interface EditPurchaseDialogProps {
  purchaseId: string
  open: boolean
  onOpenChange: (open: boolean) => void
  onSuccess?: () => void
}

export function EditPurchaseDialog({ purchaseId, open, onOpenChange, onSuccess }: EditPurchaseDialogProps) {
  const router = useRouter()
  const [isLoading, setIsLoading] = useState(false)
  const [isLoadingPurchase, setIsLoadingPurchase] = useState(false)
  const [productSearchQuery, setProductSearchQuery] = useState('')
  const [productSearchResults, setProductSearchResults] = useState<any[]>([])
  const [isSearchingProducts, setIsSearchingProducts] = useState(false)

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
    setValue,
    watch,
    control,
  } = useForm<EditPurchaseFormValues>({
    resolver: zodResolver(editPurchaseSchema),
    defaultValues: {
      referenceNo: '',
      purchaseDate: format(new Date(), 'yyyy-MM-dd'),
      status: 'PENDING',
      notes: '',
      items: [],
    },
  })

  const { fields, append, remove } = useFieldArray({
    control,
    name: 'items',
  })

  const items = watch('items')
  const status = watch('status')

  // Calculate totals
  const grandTotal = items.reduce((sum, item) => {
    return sum + (item.quantity * item.unitPrice)
  }, 0)

  useEffect(() => {
    if (open && purchaseId) {
      loadPurchase()
    }
  }, [open, purchaseId])

  // Search products
  useEffect(() => {
    if (productSearchQuery.trim().length > 0) {
      const timeoutId = setTimeout(async () => {
        setIsSearchingProducts(true)
        const results = await searchProductsForPurchase(productSearchQuery)
        setProductSearchResults(results)
        setIsSearchingProducts(false)
      }, 300)

      return () => clearTimeout(timeoutId)
    } else {
      setProductSearchResults([])
    }
  }, [productSearchQuery])

  const loadPurchase = async () => {
    setIsLoadingPurchase(true)
    try {
      const result = await getPurchaseById(purchaseId)
      if (result.success && result.data) {
        const purchase = result.data
        setValue('supplierId', purchase.supplier.id)
        setValue('referenceNo', purchase.poNumber)
        setValue('purchaseDate', format(new Date(purchase.createdAt), 'yyyy-MM-dd'))
        setValue('status', purchase.status as 'RECEIVED' | 'PENDING')
        setValue('notes', purchase.notes || '')
        
        // Load items
        setValue('items', purchase.items.map((item: any) => ({
          productId: item.product.id,
          productName: item.product.name,
          quantity: item.quantity,
          unitPrice: item.unitPrice,
          expiryDate: null,
          currentStock: 0, // Will be loaded from product
          unit: item.product.unit,
        })))
      } else {
        toast.error(result.error || 'Failed to load purchase')
        onOpenChange(false)
      }
    } catch (error) {
      toast.error('An error occurred')
      onOpenChange(false)
    } finally {
      setIsLoadingPurchase(false)
    }
  }

  const handleAddProduct = (product: any) => {
    // Check if product already exists in items
    const exists = items.some(item => item.productId === product.id)
    if (exists) {
      toast.error('Product already added')
      return
    }

    append({
      productId: product.id,
      productName: product.name,
      quantity: 1,
      unitPrice: product.purchasePrice,
      expiryDate: null,
      currentStock: product.stock,
      unit: product.unit,
    })

    setProductSearchQuery('')
    setProductSearchResults([])
  }

  const onSubmit = async (data: EditPurchaseFormValues) => {
    setIsLoading(true)
    try {
      const result = await updatePurchase(purchaseId, {
        supplierId: data.supplierId,
        referenceNo: data.referenceNo,
        purchaseDate: data.purchaseDate,
        status: data.status,
        notes: data.notes || null,
        items: data.items.map(item => ({
          productId: item.productId,
          quantity: item.quantity,
          unitPrice: item.unitPrice,
          expiryDate: item.expiryDate || null,
        })),
      })

      if (result.success) {
        toast.success('Purchase updated successfully. Stock adjusted.')
        onOpenChange(false)
        // Force refresh to update UI
        router.refresh()
        onSuccess?.()
      } else {
        toast.error(result.error || 'Failed to update purchase')
      }
    } catch (error) {
      toast.error('An error occurred')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Edit Purchase</DialogTitle>
          <DialogDescription>
            Update purchase details. Stock will be automatically adjusted.
          </DialogDescription>
        </DialogHeader>

        {isLoadingPurchase ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin" />
          </div>
        ) : (
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            {/* Metadata Section */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="referenceNo">Reference No (Invoice #)</Label>
                <Input
                  id="referenceNo"
                  placeholder="PO Number"
                  {...register('referenceNo')}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="purchaseDate">Purchase Date *</Label>
                <Input
                  id="purchaseDate"
                  type="date"
                  {...register('purchaseDate')}
                />
                {errors.purchaseDate && (
                  <p className="text-sm text-destructive">{errors.purchaseDate.message}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="status">Status *</Label>
                <Select
                  value={status}
                  onValueChange={(value) => setValue('status', value as 'RECEIVED' | 'PENDING')}
                >
                  <SelectTrigger id="status">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="PENDING">Pending</SelectItem>
                    <SelectItem value="RECEIVED">Received</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Product Entry Section */}
            <div className="space-y-2">
              <Label>Items</Label>
              {/* Product Search */}
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search products to add..."
                  value={productSearchQuery}
                  onChange={(e) => setProductSearchQuery(e.target.value)}
                  className="pl-10"
                />
                {isSearchingProducts && (
                  <Loader2 className="absolute right-3 top-1/2 transform -translate-y-1/2 h-4 w-4 animate-spin" />
                )}
                {productSearchResults.length > 0 && (
                  <div className="absolute z-10 w-full mt-1 bg-popover border rounded-md shadow-lg max-h-60 overflow-auto">
                    {productSearchResults.map((product) => (
                      <div
                        key={product.id}
                        className="p-2 hover:bg-accent cursor-pointer"
                        onClick={() => handleAddProduct(product)}
                      >
                        <div className="font-medium">{product.name}</div>
                        <div className="text-sm text-muted-foreground">
                          Stock: {product.stock} {product.unit} | Cost: {product.purchasePrice.toLocaleString()} MMK
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Items Table */}
              {fields.length > 0 ? (
                <div className="border rounded-md">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Product</TableHead>
                        <TableHead className="w-24">Quantity</TableHead>
                        <TableHead className="w-32">Unit Cost</TableHead>
                        <TableHead className="w-32">Expiry Date</TableHead>
                        <TableHead className="text-right">Subtotal</TableHead>
                        <TableHead className="w-16"></TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {fields.map((field, index) => (
                        <TableRow key={field.id}>
                          <TableCell className="font-medium">
                            {items[index]?.productName}
                          </TableCell>
                          <TableCell>
                            <Input
                              type="number"
                              step="0.01"
                              min="0.01"
                              {...register(`items.${index}.quantity`, {
                                valueAsNumber: true,
                              })}
                              className="w-24"
                            />
                          </TableCell>
                          <TableCell>
                            <Input
                              type="number"
                              step="0.01"
                              min="0"
                              {...register(`items.${index}.unitPrice`, {
                                valueAsNumber: true,
                              })}
                              className="w-32"
                            />
                          </TableCell>
                          <TableCell>
                            <Input
                              type="date"
                              {...register(`items.${index}.expiryDate`)}
                              className="w-32"
                            />
                          </TableCell>
                          <TableCell className="text-right font-medium">
                            {(items[index]?.quantity * items[index]?.unitPrice).toLocaleString()} MMK
                          </TableCell>
                          <TableCell>
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              onClick={() => remove(index)}
                            >
                              <Trash2 className="h-4 w-4 text-destructive" />
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              ) : (
                <div className="text-center py-8 text-muted-foreground border rounded-md">
                  No items added. Search and add products above.
                </div>
              )}
              {errors.items && (
                <p className="text-sm text-destructive">{errors.items.message}</p>
              )}
            </div>

            {/* Summary */}
            <div className="border-t pt-4">
              <div className="flex justify-between text-lg font-semibold">
                <span>Grand Total:</span>
                <span>{grandTotal.toLocaleString()} MMK</span>
              </div>
            </div>

            {/* Notes */}
            <div className="space-y-2">
              <Label htmlFor="notes">Notes</Label>
              <Textarea
                id="notes"
                placeholder="Additional notes (optional)"
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
              <Button type="submit" disabled={isLoading || fields.length === 0}>
                {isLoading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Updating...
                  </>
                ) : (
                  'Update Purchase'
                )}
              </Button>
            </DialogFooter>
          </form>
        )}
      </DialogContent>
    </Dialog>
  )
}
