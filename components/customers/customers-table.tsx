'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Badge } from '@/components/ui/badge'
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
import { CustomerFormDialog } from '@/components/customers/customer-form-dialog'
import { CustomerDetailsSheet } from '@/components/customers/customer-details-sheet'
import { getCustomersList, deleteCustomer, type CustomersResponse } from '@/actions/customers'
import { MoreVertical, Edit, Trash2, History, RefreshCw, Plus } from 'lucide-react'
import { toast } from 'sonner'
import { format } from 'date-fns'

interface CustomersTableProps {
  initialData: CustomersResponse
}

export function CustomersTable({ initialData }: CustomersTableProps) {
  const router = useRouter()
  const [customers, setCustomers] = useState(initialData.customers)
  const [total, setTotal] = useState(initialData.total)
  const [page, setPage] = useState(initialData.page)
  const [totalPages, setTotalPages] = useState(initialData.totalPages)
  const [isPending, startTransition] = useTransition()
  const [searchQuery, setSearchQuery] = useState('')
  
  // Dialog states
  const [editingCustomer, setEditingCustomer] = useState<typeof customers[0] | null>(null)
  const [viewingCustomer, setViewingCustomer] = useState<typeof customers[0] | null>(null)
  const [deletingCustomer, setDeletingCustomer] = useState<typeof customers[0] | null>(null)
  const [showAddDialog, setShowAddDialog] = useState(false)

  const loadCustomers = async (newPage: number = page) => {
    startTransition(async () => {
      try {
        const data = await getCustomersList({
          query: searchQuery,
          page: newPage,
        })
        setCustomers(data.customers)
        setTotal(data.total)
        setPage(data.page)
        setTotalPages(data.totalPages)
      } catch (error) {
        toast.error('Failed to load customers')
      }
    })
  }

  const handleSearch = () => {
    setPage(1)
    loadCustomers(1)
  }

  const handleDelete = async () => {
    if (!deletingCustomer) return

    startTransition(async () => {
      try {
        const result = await deleteCustomer(deletingCustomer.id)
        if (result.success) {
          toast.success('Customer deleted successfully')
          setDeletingCustomer(null)
          // Force refresh to update UI
          router.refresh()
          loadCustomers(page)
        } else {
          // Show destructive toast with error message
          toast.error(result.error || 'Failed to delete customer', {
            duration: 5000,
          })
        }
      } catch (error: any) {
        toast.error(error.message || 'An error occurred', {
          duration: 5000,
        })
      }
    })
  }

  const handleEditSuccess = () => {
    setEditingCustomer(null)
    router.refresh()
    loadCustomers(page)
  }

  const handleAddSuccess = () => {
    setShowAddDialog(false)
    router.refresh()
    loadCustomers(1)
  }

  return (
    <div className="space-y-4">
      {/* Header and Filters */}
      <div className="flex items-center justify-between">
        <div className="flex-1">
          <Input
            placeholder="Search by name or phone..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
            className="max-w-sm"
          />
        </div>
        <div className="flex gap-2">
          <Button onClick={handleSearch} disabled={isPending} variant="outline">
            <RefreshCw className={`h-4 w-4 mr-2 ${isPending ? 'animate-spin' : ''}`} />
            Search
          </Button>
          <Button onClick={() => setShowAddDialog(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Add Customer
          </Button>
        </div>
      </div>

      {/* Table */}
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name & Contact</TableHead>
              <TableHead className="text-right">Total Spent</TableHead>
              <TableHead className="text-right">Visits</TableHead>
              <TableHead className="text-right">Debt/Credit</TableHead>
              <TableHead>Last Visit</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isPending && customers.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center py-8">
                  Loading...
                </TableCell>
              </TableRow>
            ) : customers.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                  No customers found
                </TableCell>
              </TableRow>
            ) : (
              customers.map((customer) => (
                <TableRow
                  key={customer.id}
                  className="cursor-pointer"
                  onClick={() => setViewingCustomer(customer)}
                >
                  <TableCell>
                    <div>
                      <div className="flex items-center gap-2">
                        <p className="font-medium">{customer.name}</p>
                        {customer.totalSpent >= 1000000 && (
                          <Badge className="bg-yellow-100 text-yellow-800 hover:bg-yellow-100">
                            🏆 VIP
                          </Badge>
                        )}
                        {customer.totalSpent >= 500000 && customer.totalSpent < 1000000 && (
                          <Badge className="bg-blue-100 text-blue-800 hover:bg-blue-100">
                            ⭐ Loyal
                          </Badge>
                        )}
                      </div>
                      {customer.phone && (
                        <p className="text-sm text-muted-foreground">{customer.phone}</p>
                      )}
                      {customer.email && (
                        <p className="text-xs text-muted-foreground">{customer.email}</p>
                      )}
                    </div>
                  </TableCell>
                  <TableCell className="text-right">
                    <Badge className="bg-green-100 text-green-800 hover:bg-green-100">
                      {customer.totalSpent.toLocaleString()} MMK
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">{customer.visitCount}</TableCell>
                  <TableCell className="text-right">
                    {customer.creditBalance > 0 ? (
                      <span className="text-destructive font-medium">
                        {customer.creditBalance.toLocaleString()} MMK
                      </span>
                    ) : (
                      <span className="text-muted-foreground">0 MMK</span>
                    )}
                  </TableCell>
                  <TableCell>
                    {customer.lastVisit
                      ? format(new Date(customer.lastVisit), 'MMM dd, yyyy')
                      : 'Never'}
                  </TableCell>
                  <TableCell className="text-right" onClick={(e) => e.stopPropagation()}>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="sm">
                          <MoreVertical className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => setViewingCustomer(customer)}>
                          <History className="h-4 w-4 mr-2" />
                          View History
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => setEditingCustomer(customer)}>
                          <Edit className="h-4 w-4 mr-2" />
                          Edit
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          onClick={() => setDeletingCustomer(customer)}
                          className="text-destructive"
                        >
                          <Trash2 className="h-4 w-4 mr-2" />
                          Delete
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between">
          <div className="text-sm text-muted-foreground">
            Showing {((page - 1) * 20) + 1} to {Math.min(page * 20, total)} of {total} customers
          </div>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => loadCustomers(page - 1)}
              disabled={page === 1 || isPending}
            >
              Previous
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => loadCustomers(page + 1)}
              disabled={page === totalPages || isPending}
            >
              Next
            </Button>
          </div>
        </div>
      )}

      {/* Add Customer Dialog */}
      {showAddDialog && (
        <CustomerFormDialog
          open={showAddDialog}
          onOpenChange={setShowAddDialog}
          onSuccess={handleAddSuccess}
        />
      )}

      {/* Edit Customer Dialog */}
      {editingCustomer && (
        <CustomerFormDialog
          customer={editingCustomer}
          open={!!editingCustomer}
          onOpenChange={(open) => !open && setEditingCustomer(null)}
          onSuccess={handleEditSuccess}
        />
      )}

      {/* Customer Details Sheet */}
      {viewingCustomer && (
        <CustomerDetailsSheet
          customerId={viewingCustomer.id}
          open={!!viewingCustomer}
          onOpenChange={(open) => !open && setViewingCustomer(null)}
        />
      )}

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={!!deletingCustomer} onOpenChange={(open) => !open && setDeletingCustomer(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Customer?</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete <strong>{deletingCustomer?.name}</strong>?
              This action cannot be undone. Customers with purchase history cannot be deleted.
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

