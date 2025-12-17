'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useForm, useFieldArray } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import * as z from 'zod'
import { format } from 'date-fns'
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
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Plus, Trash2, Loader2, Search } from 'lucide-react'
import { getSuppliers, searchProductsForPurchase, createPurchase } from '@/actions/purchases'
import { toast } from 'sonner'

const purchaseSchema = z.object({
  supplierId: z.string().min(1, 'Supplier is required'),
  purchaseDate: z.string().min(1, 'Purchase date is required'),
  referenceNo: z.string().optional(),
  status: z.enum(['RECEIVED', 'PENDING']),
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
  notes: z.string().optional(),
  paidAmount: z.number().min(0).optional(),
  paymentMethod: z.string().optional(),
})

type PurchaseFormValues = z.infer<typeof purchaseSchema>

export default function CreatePurchasePage() {
  const router = useRouter()
  const [isLoading, setIsLoading] = useState(false)
  const [suppliers, setSuppliers] = useState<Array<{ id: string; name: string; phone: string | null; companyName: string | null }>>([])
  const [productSearchQuery, setProductSearchQuery] = useState('')
  const [productSearchResults, setProductSearchResults] = useState<any[]>([])
  const [isSearchingProducts, setIsSearchingProducts] = useState(false)

  const {
    register,
    handleSubmit,
    formState: { errors },
    control,
    watch,
    setValue,
    reset,
  } = useForm<PurchaseFormValues>({
    resolver: zodResolver(purchaseSchema),
    defaultValues: {
      purchaseDate: format(new Date(), 'yyyy-MM-dd'),
      status: 'RECEIVED',
      items: [],
      paidAmount: 0,
      paymentMethod: 'CASH',
    },
  })

  const { fields, append, remove } = useFieldArray({
    control,
    name: 'items',
  })

  const items = watch('items')
  const purchaseDate = watch('purchaseDate')
  const status = watch('status')
  const paidAmount = watch('paidAmount') || 0
  const supplierId = watch('supplierId')

  // Calculate totals
  const grandTotal = items.reduce((sum, item) => {
    return sum + (item.quantity * item.unitPrice)
  }, 0)

  const dueAmount = grandTotal - paidAmount

  // Load suppliers
  useEffect(() => {
    const loadSuppliers = async () => {
      const data = await getSuppliers()
      setSuppliers(data)
    }
    loadSuppliers()
  }, [])

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

  const onSubmit = async (data: PurchaseFormValues) => {
    setIsLoading(true)
    try {
      const result = await createPurchase({
        supplierId: data.supplierId,
        purchaseDate: data.purchaseDate,
        referenceNo: data.referenceNo,
        status: data.status,
        items: data.items.map(item => ({
          productId: item.productId,
          quantity: item.quantity,
          unitPrice: item.unitPrice,
          expiryDate: item.expiryDate || null,
        })),
        notes: data.notes,
        paidAmount: data.paidAmount,
        paymentMethod: data.paymentMethod,
      })

      if (result.success) {
        toast.success('Purchase created successfully! Stock updated.')
        router.push('/purchases')
      } else {
        toast.error(result.error || 'Failed to create purchase')
      }
    } catch (error) {
      toast.error('An error occurred')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Create Purchase</h1>
        <p className="text-muted-foreground">Record inventory purchase from supplier</p>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        {/* Supplier Section */}
        <Card>
          <CardHeader>
            <CardTitle>Supplier Information</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Supplier Selection */}
              <div className="space-y-2">
                <Label htmlFor="supplierId">Supplier *</Label>
                <Select
                  value={supplierId || ''}
                  onValueChange={(value) => setValue('supplierId', value)}
                >
                  <SelectTrigger id="supplierId">
                    <SelectValue placeholder="Select supplier..." />
                  </SelectTrigger>
                  <SelectContent>
                    {suppliers.length === 0 ? (
                      <div className="py-6 text-center text-sm text-muted-foreground">
                        No suppliers found
                      </div>
                    ) : (
                      suppliers.map((supplier) => (
                        <SelectItem key={supplier.id} value={supplier.id}>
                          {supplier.companyName ? `${supplier.name} (${supplier.companyName})` : supplier.name}
                        </SelectItem>
                      ))
                    )}
                  </SelectContent>
                </Select>
                {errors.supplierId && (
                  <p className="text-sm text-destructive">{errors.supplierId.message}</p>
                )}
              </div>

              {/* Purchase Date */}
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

              {/* Reference Number */}
              <div className="space-y-2">
                <Label htmlFor="referenceNo">Reference No (Invoice #)</Label>
                <Input
                  id="referenceNo"
                  placeholder="Optional"
                  {...register('referenceNo')}
                />
              </div>

              {/* Status */}
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
                    <SelectItem value="RECEIVED">Received</SelectItem>
                    <SelectItem value="PENDING">Pending</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Product Entry Section */}
        <Card>
          <CardHeader>
            <CardTitle>Product Entry</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Product Search */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Scan barcode or search by name..."
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
                      <TableHead>Current Stock</TableHead>
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
                        <TableCell className="text-sm text-muted-foreground">
                          {items[index]?.currentStock} {items[index]?.unit}
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
              <div className="text-center py-8 text-muted-foreground">
                No products added. Search and add products above.
              </div>
            )}
            {errors.items && (
              <p className="text-sm text-destructive">{errors.items.message}</p>
            )}
          </CardContent>
        </Card>

        {/* Summary Section */}
        <Card>
          <CardHeader>
            <CardTitle>Summary</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <div className="flex justify-between text-lg font-semibold">
                <span>Grand Total:</span>
                <span>{grandTotal.toLocaleString()} MMK</span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-4">
                <div className="space-y-2">
                  <Label htmlFor="paidAmount">Paid Amount</Label>
                  <Input
                    id="paidAmount"
                    type="number"
                    step="0.01"
                    min="0"
                    {...register('paidAmount', {
                      valueAsNumber: true,
                    })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="paymentMethod">Payment Method</Label>
                  <Select
                    value={watch('paymentMethod') || 'CASH'}
                    onValueChange={(value) => setValue('paymentMethod', value)}
                  >
                    <SelectTrigger id="paymentMethod">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="CASH">Cash</SelectItem>
                      <SelectItem value="BANK">Bank Transfer</SelectItem>
                      <SelectItem value="CREDIT">Credit</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="flex justify-between text-lg font-semibold pt-2 border-t">
                <span>Due Amount:</span>
                <span className={dueAmount > 0 ? 'text-orange-600' : 'text-green-600'}>
                  {dueAmount.toLocaleString()} MMK
                </span>
              </div>

              <div className="space-y-2">
                <Label htmlFor="notes">Notes</Label>
                <Textarea
                  id="notes"
                  placeholder="Additional notes (optional)"
                  rows={3}
                  {...register('notes')}
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Actions */}
        <div className="flex justify-end gap-4">
          <Button
            type="button"
            variant="outline"
            onClick={() => router.back()}
            disabled={isLoading}
          >
            Cancel
          </Button>
          <Button type="submit" disabled={isLoading || fields.length === 0}>
            {isLoading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Saving...
              </>
            ) : (
              'Save Purchase'
            )}
          </Button>
        </div>
      </form>
    </div>
  )
}

