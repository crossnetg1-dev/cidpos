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
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
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
import { Pencil, Trash2, Plus, Loader2, Search } from 'lucide-react'
import { getAllSuppliers, createSupplier, updateSupplier, deleteSupplier } from '@/actions/suppliers'
import { toast } from 'sonner'

const supplierSchema = z.object({
  name: z.string().min(1, 'Supplier name is required'),
  companyName: z.string().optional(),
  phone: z.string().optional(),
  email: z.string().email('Invalid email').optional().or(z.literal('')),
  address: z.string().optional(),
})

type SupplierFormValues = z.infer<typeof supplierSchema>

interface ManageSuppliersDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function ManageSuppliersDialog({ open, onOpenChange }: ManageSuppliersDialogProps) {
  const router = useRouter()
  const [suppliers, setSuppliers] = useState<any[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [editingSupplier, setEditingSupplier] = useState<any | null>(null)
  const [deletingSupplier, setDeletingSupplier] = useState<any | null>(null)
  const [showAddForm, setShowAddForm] = useState(false)

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
    setValue,
  } = useForm<SupplierFormValues>({
    resolver: zodResolver(supplierSchema),
    defaultValues: {
      name: '',
      companyName: '',
      phone: '',
      email: '',
      address: '',
    },
  })

  useEffect(() => {
    if (open) {
      loadSuppliers()
    }
  }, [open])

  const loadSuppliers = async () => {
    setIsLoading(true)
    try {
      const data = await getAllSuppliers()
      setSuppliers(data)
    } catch (error) {
      toast.error('Failed to load suppliers')
    } finally {
      setIsLoading(false)
    }
  }

  const handleEdit = (supplier: any) => {
    setEditingSupplier(supplier)
    setShowAddForm(false)
    setValue('name', supplier.name)
    setValue('companyName', supplier.companyName || '')
    setValue('phone', supplier.phone || '')
    setValue('email', supplier.email || '')
    setValue('address', supplier.address || '')
  }

  const handleCancel = () => {
    setEditingSupplier(null)
    setShowAddForm(false)
    reset()
  }

  const onSubmit = async (data: SupplierFormValues) => {
    setIsLoading(true)
    try {
      let result
      if (editingSupplier) {
        result = await updateSupplier(editingSupplier.id, data)
      } else {
        result = await createSupplier(data)
      }

      if (result.success) {
        toast.success(editingSupplier ? 'Supplier updated successfully' : 'Supplier created successfully')
        handleCancel()
        // Force refresh to update UI
        router.refresh()
        loadSuppliers()
      } else {
        toast.error(result.error || 'Failed to save supplier')
      }
    } catch (error) {
      toast.error('An error occurred')
    } finally {
      setIsLoading(false)
    }
  }

  const handleDelete = async () => {
    if (!deletingSupplier) return

    setIsLoading(true)
    try {
      const result = await deleteSupplier(deletingSupplier.id)
      if (result.success) {
        toast.success('Supplier deleted successfully')
        setDeletingSupplier(null)
        // Force refresh to update UI
        router.refresh()
        loadSuppliers()
      } else {
        toast.error(result.error || 'Failed to delete supplier')
      }
    } catch (error) {
      toast.error('An error occurred')
    } finally {
      setIsLoading(false)
    }
  }

  const filteredSuppliers = suppliers.filter((supplier) =>
    supplier.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (supplier.phone && supplier.phone.toLowerCase().includes(searchQuery.toLowerCase()))
  )

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Manage Suppliers</DialogTitle>
            <DialogDescription>
              Add, edit, or remove suppliers from your system
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            {/* Search and Add Button */}
            <div className="flex gap-4">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search suppliers..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>
              <Button
                onClick={() => {
                  setShowAddForm(true)
                  setEditingSupplier(null)
                  reset()
                }}
                disabled={showAddForm || !!editingSupplier}
              >
                <Plus className="h-4 w-4 mr-2" />
                Add New Supplier
              </Button>
            </div>

            {/* Add/Edit Form */}
            {(showAddForm || editingSupplier) && (
              <div className="border rounded-lg p-4 bg-muted/50">
                <h3 className="font-semibold mb-4">
                  {editingSupplier ? 'Edit Supplier' : 'Add New Supplier'}
                </h3>
                <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="name">Name *</Label>
                      <Input id="name" {...register('name')} />
                      {errors.name && (
                        <p className="text-sm text-destructive">{errors.name.message}</p>
                      )}
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="companyName">Company Name</Label>
                      <Input id="companyName" {...register('companyName')} />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="phone">Phone</Label>
                      <Input id="phone" {...register('phone')} />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="email">Email</Label>
                      <Input id="email" type="email" {...register('email')} />
                      {errors.email && (
                        <p className="text-sm text-destructive">{errors.email.message}</p>
                      )}
                    </div>
                    <div className="space-y-2 col-span-2">
                      <Label htmlFor="address">Address</Label>
                      <Input id="address" {...register('address')} />
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Button type="submit" disabled={isLoading}>
                      {isLoading ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Saving...
                        </>
                      ) : (
                        editingSupplier ? 'Update Supplier' : 'Create Supplier'
                      )}
                    </Button>
                    <Button type="button" variant="outline" onClick={handleCancel}>
                      Cancel
                    </Button>
                  </div>
                </form>
              </div>
            )}

            {/* Suppliers List */}
            <div className="border rounded-md">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Company</TableHead>
                    <TableHead>Phone</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {isLoading && filteredSuppliers.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center py-8">
                        <Loader2 className="h-6 w-6 animate-spin mx-auto" />
                      </TableCell>
                    </TableRow>
                  ) : filteredSuppliers.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                        No suppliers found
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredSuppliers.map((supplier) => (
                      <TableRow key={supplier.id}>
                        <TableCell className="font-medium">{supplier.name}</TableCell>
                        <TableCell>{supplier.companyName || '-'}</TableCell>
                        <TableCell>{supplier.phone || '-'}</TableCell>
                        <TableCell>
                          {supplier.isActive ? (
                            <span className="text-green-600 text-sm">Active</span>
                          ) : (
                            <span className="text-gray-500 text-sm">Inactive</span>
                          )}
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-2">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleEdit(supplier)}
                              disabled={showAddForm || !!editingSupplier}
                            >
                              <Pencil className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => setDeletingSupplier(supplier)}
                              disabled={showAddForm || !!editingSupplier}
                            >
                              <Trash2 className="h-4 w-4 text-destructive" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={!!deletingSupplier} onOpenChange={(open) => !open && setDeletingSupplier(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Supplier?</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete <strong>{deletingSupplier?.name}</strong>?
              This action cannot be undone. Suppliers with purchase records cannot be deleted.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isLoading ? 'Deleting...' : 'Delete'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}

