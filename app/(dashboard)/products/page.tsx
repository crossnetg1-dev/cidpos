'use client'

import { useState, useEffect, useTransition } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { ProductForm } from '@/components/products/product-form'
import { ProductImportDialog } from '@/components/products/product-import-dialog'
import { getProducts, deleteProduct, getCategories, type ProductsResponse } from '@/actions/products'
import { exportProductsData } from '@/actions/product-excel'
import { Plus, Search, Edit, Trash2, Package, Image as ImageIcon, Upload, Download } from 'lucide-react'
import { toast } from 'sonner'
import { Badge } from '@/components/ui/badge'
import Image from 'next/image'
import { usePermission } from '@/hooks/use-permission'

export default function ProductsPage() {
  const { canCreate, canDelete, canEdit, isLoading: permissionsLoading } = usePermission('products')
  const [products, setProducts] = useState<ProductsResponse['products']>([])
  const [categories, setCategories] = useState<Array<{ id: string; name: string }>>([])
  const [totalPages, setTotalPages] = useState(1)
  const [currentPage, setCurrentPage] = useState(1)
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedCategory, setSelectedCategory] = useState<string>('all')
  const [isPending, startTransition] = useTransition()
  const [isFormOpen, setIsFormOpen] = useState(false)
  const [isImportDialogOpen, setIsImportDialogOpen] = useState(false)
  const [isExporting, setIsExporting] = useState(false)
  const [editingProduct, setEditingProduct] = useState<ProductsResponse['products'][0] | null>(null)
  const [deletingProduct, setDeletingProduct] = useState<ProductsResponse['products'][0] | null>(null)

  const loadProducts = async (page: number = 1, query: string = '', categoryId: string = 'all') => {
    startTransition(async () => {
      try {
        const result = await getProducts({
          query,
          page,
          categoryId: categoryId === 'all' ? undefined : categoryId,
        })
        setProducts(result.products)
        setTotalPages(result.totalPages)
        setCurrentPage(result.page)
      } catch (error) {
        toast.error('Failed to load products')
      }
    })
  }

  const loadCategories = async () => {
    try {
      const data = await getCategories()
      setCategories(data)
    } catch (error) {
      console.error('Error loading categories:', error)
    }
  }

  useEffect(() => {
    loadProducts(currentPage, searchQuery, selectedCategory)
  }, [currentPage])

  useEffect(() => {
    loadCategories()
  }, [])

  const handleSearch = (value: string) => {
    setSearchQuery(value)
    setCurrentPage(1)
    loadProducts(1, value, selectedCategory)
  }

  const handleCategoryChange = (value: string) => {
    setSelectedCategory(value)
    setCurrentPage(1)
    loadProducts(1, searchQuery, value)
  }

  const handleDelete = async () => {
    if (!deletingProduct) return

    startTransition(async () => {
      try {
        const result = await deleteProduct(deletingProduct.id)
        if (result.success) {
          toast.success('Product deleted successfully')
          setDeletingProduct(null)
          loadProducts(currentPage, searchQuery, selectedCategory)
        } else {
          toast.error(result.error || 'Failed to delete product')
        }
      } catch (error) {
        toast.error('An error occurred')
      }
    })
  }

  const handleEdit = (product: ProductsResponse['products'][0]) => {
    setEditingProduct(product)
    setIsFormOpen(true)
  }

  const handleAdd = () => {
    setEditingProduct(null)
    setIsFormOpen(true)
  }

  const handleFormSuccess = () => {
    setIsFormOpen(false)
    setEditingProduct(null)
    loadProducts(currentPage, searchQuery, selectedCategory)
  }

  const handleExport = async () => {
    setIsExporting(true)
    try {
      const result = await exportProductsData()
      if (result.success && result.data) {
        // Convert Base64 to Blob
        const binaryString = atob(result.data)
        const bytes = new Uint8Array(binaryString.length)
        for (let i = 0; i < binaryString.length; i++) {
          bytes[i] = binaryString.charCodeAt(i)
        }
        const blob = new Blob([bytes], {
          type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        })

        // Create download link
        const url = URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        const date = new Date().toISOString().split('T')[0]
        a.download = `Inventory_Current_${date}.xlsx`
        document.body.appendChild(a)
        a.click()
        document.body.removeChild(a)
        URL.revokeObjectURL(url)

        toast.success('Export generated successfully')
      } else {
        toast.error(result.error || 'Failed to export products')
      }
    } catch (error) {
      console.error('Export error:', error)
      toast.error('An error occurred while exporting products')
    } finally {
      setIsExporting(false)
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Products</h1>
          <p className="text-muted-foreground">Manage your product inventory</p>
        </div>
        {canCreate && (
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              onClick={handleExport}
              disabled={isExporting}
            >
              <Download className="mr-2 h-4 w-4" />
              {isExporting ? 'Exporting...' : 'Export Data'}
            </Button>
            <Button variant="outline" onClick={() => setIsImportDialogOpen(true)}>
              <Upload className="mr-2 h-4 w-4" />
              Import Products
            </Button>
            <Button onClick={handleAdd}>
              <Plus className="mr-2 h-4 w-4" />
              Add Product
            </Button>
          </div>
        )}
      </div>

      {/* Filters */}
      <div className="flex gap-4">
        <div className="flex-1">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search by name, barcode, or SKU..."
              value={searchQuery}
              onChange={(e) => handleSearch(e.target.value)}
              className="pl-9"
            />
          </div>
        </div>
        <Select value={selectedCategory} onValueChange={handleCategoryChange}>
          <SelectTrigger className="w-[200px]">
            <SelectValue placeholder="All Categories" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Categories</SelectItem>
            {categories.map((category) => (
              <SelectItem key={category.id} value={category.id}>
                {category.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Products Table */}
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[80px]">Image</TableHead>
              <TableHead>Name & Description</TableHead>
              <TableHead>Category</TableHead>
              <TableHead>Price</TableHead>
              <TableHead>Stock</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isPending && products.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center py-8">
                  Loading...
                </TableCell>
              </TableRow>
            ) : products.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                  No products found
                </TableCell>
              </TableRow>
            ) : (
              products.map((product) => {
                const isLowStock = product.stock <= product.minStockLevel
                return (
                  <TableRow key={product.id}>
                    <TableCell>
                      {product.image ? (
                        <div className="relative h-12 w-12 rounded-md overflow-hidden bg-muted">
                          <Image
                            src={product.image}
                            alt={product.name}
                            fill
                            className="object-cover"
                          />
                        </div>
                      ) : (
                        <div className="h-12 w-12 rounded-md bg-muted flex items-center justify-center">
                          <Package className="h-6 w-6 text-muted-foreground" />
                        </div>
                      )}
                    </TableCell>
                    <TableCell>
                      <div>
                        <div className="font-medium">{product.name}</div>
                        {product.description && (
                          <div className="text-sm text-muted-foreground line-clamp-1">
                            {product.description}
                          </div>
                        )}
                        {product.barcode && (
                          <div className="text-xs text-muted-foreground mt-1">
                            Barcode: {product.barcode}
                          </div>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline">{product.category.name}</Badge>
                    </TableCell>
                    <TableCell>
                      <div className="space-y-1">
                        <div className="font-medium">{product.sellingPrice.toLocaleString()} MMK</div>
                        <div className="text-xs text-muted-foreground">
                          Cost: {product.purchasePrice.toLocaleString()} MMK
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <span className={isLowStock ? 'font-semibold text-red-600' : 'font-medium'}>
                          {product.stock} {product.unit}
                        </span>
                        {isLowStock && (
                          <Badge variant="destructive" className="text-xs">
                            Low Stock
                          </Badge>
                        )}
                      </div>
                      {product.minStockLevel > 0 && (
                        <div className="text-xs text-muted-foreground">
                          Min: {product.minStockLevel} {product.unit}
                        </div>
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        {canEdit && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleEdit(product)}
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                        )}
                        {canDelete && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setDeletingProduct(product)}
                            className="text-destructive hover:text-destructive"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        )}
                        {!canEdit && !canDelete && (
                          <span className="text-xs text-muted-foreground">No actions</span>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                )
              })
            )}
          </TableBody>
        </Table>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between">
          <div className="text-sm text-muted-foreground">
            Page {currentPage} of {totalPages}
          </div>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              disabled={currentPage === 1 || isPending}
            >
              Previous
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
              disabled={currentPage === totalPages || isPending}
            >
              Next
            </Button>
          </div>
        </div>
      )}

      {/* Product Form Dialog */}
      <ProductForm
        open={isFormOpen}
        onOpenChange={setIsFormOpen}
        product={editingProduct}
        onSuccess={handleFormSuccess}
      />

      {/* Import Products Dialog */}
      <ProductImportDialog
        open={isImportDialogOpen}
        onOpenChange={setIsImportDialogOpen}
        onSuccess={handleFormSuccess}
      />

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={!!deletingProduct} onOpenChange={(open) => !open && setDeletingProduct(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This will delete the product "{deletingProduct?.name}". This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isPending ? 'Deleting...' : 'Delete'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}

