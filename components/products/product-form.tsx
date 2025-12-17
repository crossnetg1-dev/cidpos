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
import { Textarea } from '@/components/ui/textarea'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Loader2, RefreshCw } from 'lucide-react'
import { createProduct, updateProduct, getCategories, type ProductFormData } from '@/actions/products'
import { getUnits } from '@/actions/units'
import { toast } from 'sonner'

const productSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  barcode: z.string().min(1, 'Barcode is required'),
  sku: z.string().optional(),
  description: z.string().optional(),
  categoryId: z.string().min(1, 'Category is required'),
  purchasePrice: z.number().min(0.01, 'Price must be greater than 0'),
  sellingPrice: z.number().min(0.01, 'Price must be greater than 0'),
  stock: z.number().min(0, 'Stock cannot be negative'),
  minStockLevel: z.number().min(0, 'Min stock level cannot be negative').default(5),
  unit: z.string().default('pcs'),
  expiryDate: z.string().optional().nullable(),
  image: z.string().optional(),
})

type ProductFormValues = z.infer<typeof productSchema>

interface ProductFormProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  product?: {
    id: string
    name: string
    barcode: string | null
    sku: string | null
    description: string | null
    categoryId: string
    purchasePrice: number
    sellingPrice: number
    stock: number
    minStockLevel: number
    unit: string
    expiryDate: Date | null
    image: string | null
  } | null
  onSuccess?: () => void
}

export function ProductForm({ open, onOpenChange, product, onSuccess }: ProductFormProps) {
  const [categories, setCategories] = useState<Array<{ id: string; name: string }>>([])
  const [units, setUnits] = useState<Array<{ id: string; name: string; shortName: string }>>([])
  const [isLoading, setIsLoading] = useState(false)
  const [isGeneratingBarcode, setIsGeneratingBarcode] = useState(false)

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
    setValue,
    watch,
  } = useForm<ProductFormValues>({
    resolver: zodResolver(productSchema),
    defaultValues: {
      name: '',
      barcode: '',
      sku: '',
      description: '',
      categoryId: '',
      purchasePrice: 0,
      sellingPrice: 0,
      stock: 0,
      minStockLevel: 5,
      unit: 'pcs',
      expiryDate: null,
      image: '',
    },
  })

  const barcodeValue = watch('barcode')

  // Load categories and units
  useEffect(() => {
    const loadData = async () => {
      const [categoriesData, unitsData] = await Promise.all([
        getCategories(),
        getUnits(),
      ])
      setCategories(categoriesData)
      setUnits(unitsData)
    }
    loadData()
  }, [])

  // Reset form when product changes
  useEffect(() => {
    if (product) {
      reset({
        name: product.name,
        barcode: product.barcode || '',
        sku: product.sku || '',
        description: product.description || '',
        categoryId: product.categoryId,
        purchasePrice: product.purchasePrice,
        sellingPrice: product.sellingPrice,
        stock: product.stock,
        minStockLevel: product.minStockLevel,
        unit: product.unit,
        expiryDate: product.expiryDate ? new Date(product.expiryDate).toISOString().split('T')[0] : null,
        image: product.image || '',
      })
    } else {
      reset({
        name: '',
        barcode: '',
        sku: '',
        description: '',
        categoryId: '',
        purchasePrice: 0,
        sellingPrice: 0,
        stock: 0,
        minStockLevel: 5,
        unit: 'pcs',
        expiryDate: null,
        image: '',
      })
    }
  }, [product, reset])

  const generateBarcode = () => {
    setIsGeneratingBarcode(true)
    // Generate a unique 12-digit barcode starting with 885
    const randomPart = Math.floor(Math.random() * 1000000000).toString().padStart(9, '0')
    const barcode = `885${randomPart}`
    setValue('barcode', barcode)
    setIsGeneratingBarcode(false)
  }

  const onSubmit = async (data: ProductFormValues) => {
    setIsLoading(true)
    try {
      // When editing, exclude stock from the payload (stock should only be changed via Purchase/Stock Adjustment)
      const formData: ProductFormData = {
        ...data,
        expiryDate: data.expiryDate ? new Date(data.expiryDate) : null,
        // Stock is included for new products, but backend will ignore it for updates
      }

      let result
      if (product) {
        // Explicitly remove stock when editing (backend also ignores it, but this is extra safety)
        const { stock, ...updateData } = formData
        result = await updateProduct(product.id, updateData as ProductFormData)
      } else {
        result = await createProduct(formData)
      }

      if (result.success) {
        toast.success(product ? 'Product updated successfully' : 'Product created successfully')
        onOpenChange(false)
        onSuccess?.()
      } else {
        toast.error(result.error || 'Failed to save product')
      }
    } catch (error) {
      toast.error('An error occurred')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{product ? 'Edit Product' : 'Add New Product'}</DialogTitle>
          <DialogDescription>
            {product ? 'Update product information' : 'Create a new product in your inventory'}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="name">Name *</Label>
              <Input
                id="name"
                {...register('name')}
                placeholder="Product name"
              />
              {errors.name && (
                <p className="text-sm text-destructive">{errors.name.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="barcode">Barcode *</Label>
              <div className="flex gap-2">
                <Input
                  id="barcode"
                  {...register('barcode')}
                  placeholder="Barcode"
                />
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  onClick={generateBarcode}
                  disabled={isGeneratingBarcode}
                  title="Generate Random Barcode"
                >
                  <RefreshCw className={`h-4 w-4 ${isGeneratingBarcode ? 'animate-spin' : ''}`} />
                </Button>
              </div>
              {errors.barcode && (
                <p className="text-sm text-destructive">{errors.barcode.message}</p>
              )}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="sku">SKU</Label>
              <Input
                id="sku"
                {...register('sku')}
                placeholder="SKU (optional)"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="categoryId">Category *</Label>
              <Select
                value={watch('categoryId')}
                onValueChange={(value) => setValue('categoryId', value)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select category" />
                </SelectTrigger>
                <SelectContent>
                  {categories.map((category) => (
                    <SelectItem key={category.id} value={category.id}>
                      {category.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {errors.categoryId && (
                <p className="text-sm text-destructive">{errors.categoryId.message}</p>
              )}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="purchasePrice">Cost Price (MMK) *</Label>
              <Input
                id="purchasePrice"
                type="number"
                step="0.01"
                {...register('purchasePrice', { valueAsNumber: true })}
                placeholder="0.00"
              />
              {errors.purchasePrice && (
                <p className="text-sm text-destructive">{errors.purchasePrice.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="sellingPrice">Selling Price (MMK) *</Label>
              <Input
                id="sellingPrice"
                type="number"
                step="0.01"
                {...register('sellingPrice', { valueAsNumber: true })}
                placeholder="0.00"
              />
              {errors.sellingPrice && (
                <p className="text-sm text-destructive">{errors.sellingPrice.message}</p>
              )}
            </div>
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label htmlFor="stock">Stock Quantity *</Label>
              <Input
                id="stock"
                type="number"
                step="0.01"
                {...register('stock', { valueAsNumber: true })}
                placeholder="0"
                disabled={!!product}
              />
              {errors.stock && (
                <p className="text-sm text-destructive">{errors.stock.message}</p>
              )}
              {product && (
                <p className="text-xs text-muted-foreground">
                  To change stock, use Purchase or Stock Adjustment.
                </p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="minStockLevel">Min Stock Level *</Label>
              <Input
                id="minStockLevel"
                type="number"
                step="0.01"
                {...register('minStockLevel', { valueAsNumber: true })}
                placeholder="5"
              />
              {errors.minStockLevel && (
                <p className="text-sm text-destructive">{errors.minStockLevel.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="unit">Unit</Label>
              <Select
                value={watch('unit')}
                onValueChange={(value) => setValue('unit', value)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select unit" />
                </SelectTrigger>
                <SelectContent>
                  {units.length === 0 ? (
                    <SelectItem value="pcs" disabled>Loading units...</SelectItem>
                  ) : (
                    units.map((unit) => (
                      <SelectItem key={unit.id} value={unit.shortName}>
                        {unit.name} ({unit.shortName})
                      </SelectItem>
                    ))
                  )}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              {...register('description')}
              placeholder="Product description (optional)"
              rows={3}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="expiryDate">Expiry Date</Label>
              <Input
                id="expiryDate"
                type="date"
                {...register('expiryDate')}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="image">Image URL</Label>
              <Input
                id="image"
                {...register('image')}
                placeholder="https://example.com/image.jpg"
              />
            </div>
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
                  {product ? 'Updating...' : 'Creating...'}
                </>
              ) : (
                product ? 'Update Product' : 'Create Product'
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

