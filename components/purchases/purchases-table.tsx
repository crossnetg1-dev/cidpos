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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
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
import { PurchaseDetailsSheet } from '@/components/purchases/purchase-details-sheet'
import { EditPurchaseDialog } from '@/components/purchases/edit-purchase-dialog'
import { ManageSuppliersDialog } from '@/components/purchases/manage-suppliers-dialog'
import { getPurchases, voidPurchase, type PurchasesResponse } from '@/actions/purchases'
import { MoreVertical, Eye, XCircle, RefreshCw, Edit, Plus, Users } from 'lucide-react'
import { toast } from 'sonner'
import { format } from 'date-fns'
import Link from 'next/link'

interface PurchasesTableProps {
  initialData: PurchasesResponse
}

export function PurchasesTable({ initialData }: PurchasesTableProps) {
  const router = useRouter()
  const [purchases, setPurchases] = useState(initialData.purchases)
  const [total, setTotal] = useState(initialData.total)
  const [page, setPage] = useState(initialData.page)
  const [totalPages, setTotalPages] = useState(initialData.totalPages)
  const [isPending, startTransition] = useTransition()
  const [searchQuery, setSearchQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')
  
  // Dialog states
  const [viewingPurchase, setViewingPurchase] = useState<typeof purchases[0] | null>(null)
  const [voidingPurchase, setVoidingPurchase] = useState<typeof purchases[0] | null>(null)
  const [editingPurchase, setEditingPurchase] = useState<typeof purchases[0] | null>(null)
  const [showManageSuppliers, setShowManageSuppliers] = useState(false)

  const loadPurchases = async (newPage: number = page) => {
    startTransition(async () => {
      try {
        const data = await getPurchases({
          query: searchQuery,
          page: newPage,
          status: statusFilter,
          startDate: startDate || undefined,
          endDate: endDate || undefined,
        })
        setPurchases(data.purchases)
        setTotal(data.total)
        setPage(data.page)
        setTotalPages(data.totalPages)
      } catch (error) {
        toast.error('Failed to load purchases')
      }
    })
  }

  const handleSearch = () => {
    setPage(1)
    loadPurchases(1)
  }

  const handleVoid = async () => {
    if (!voidingPurchase) return

    startTransition(async () => {
      try {
        const result = await voidPurchase(voidingPurchase.id)
        if (result.success) {
          toast.success('Purchase voided successfully. Stock reversed.')
          setVoidingPurchase(null)
          // Force refresh to update UI
          router.refresh()
          loadPurchases(page)
        } else {
          toast.error(result.error || 'Failed to void purchase')
        }
      } catch (error) {
        toast.error('An error occurred')
      }
    })
  }

  const getStatusBadge = (status: string) => {
    if (status === 'RECEIVED') {
      return <Badge className="bg-green-100 text-green-800 hover:bg-green-100">Received</Badge>
    }
    if (status === 'PENDING') {
      return <Badge className="bg-orange-100 text-orange-800 hover:bg-orange-100">Pending</Badge>
    }
    if (status === 'CANCELLED') {
      return <Badge variant="destructive">Cancelled</Badge>
    }
    return <Badge variant="secondary">{status}</Badge>
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Purchases</h1>
          <p className="text-muted-foreground">View and manage all purchase transactions</p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={() => setShowManageSuppliers(true)}
          >
            <Users className="h-4 w-4 mr-2" />
            Manage Suppliers
          </Button>
          <Link href="/purchases/create">
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              New Purchase
            </Button>
          </Link>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-col md:flex-row gap-4">
        <Input
          placeholder="Search by PO number or supplier..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
          className="flex-1"
        />
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Status</SelectItem>
            <SelectItem value="RECEIVED">Received</SelectItem>
            <SelectItem value="PENDING">Pending</SelectItem>
            <SelectItem value="CANCELLED">Cancelled</SelectItem>
          </SelectContent>
        </Select>
        <Input
          type="date"
          value={startDate}
          onChange={(e) => setStartDate(e.target.value)}
          placeholder="Start Date"
          className="w-[150px]"
        />
        <Input
          type="date"
          value={endDate}
          onChange={(e) => setEndDate(e.target.value)}
          placeholder="End Date"
          className="w-[150px]"
        />
        <Button onClick={handleSearch} disabled={isPending}>
          <RefreshCw className={`h-4 w-4 mr-2 ${isPending ? 'animate-spin' : ''}`} />
          Search
        </Button>
      </div>

      {/* Table */}
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Date</TableHead>
              <TableHead>PO Number</TableHead>
              <TableHead>Supplier</TableHead>
              <TableHead>Reference No</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Total Amount</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isPending && purchases.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center py-8">
                  Loading...
                </TableCell>
              </TableRow>
            ) : purchases.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                  No purchases found
                </TableCell>
              </TableRow>
            ) : (
              purchases.map((purchase) => (
                <TableRow key={purchase.id} className="cursor-pointer" onClick={() => setViewingPurchase(purchase)}>
                  <TableCell>
                    {format(new Date(purchase.createdAt), 'MMM dd, yyyy')}
                  </TableCell>
                  <TableCell className="font-medium">{purchase.poNumber}</TableCell>
                  <TableCell>{purchase.supplier.name}</TableCell>
                  <TableCell className="text-muted-foreground">-</TableCell>
                  <TableCell>{getStatusBadge(purchase.status)}</TableCell>
                  <TableCell className="text-right font-medium">
                    {purchase.total.toLocaleString()} MMK
                  </TableCell>
                  <TableCell className="text-right" onClick={(e) => e.stopPropagation()}>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="sm">
                          <MoreVertical className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => setViewingPurchase(purchase)}>
                          <Eye className="h-4 w-4 mr-2" />
                          View Details
                        </DropdownMenuItem>
                        {purchase.status !== 'CANCELLED' && (
                          <>
                            <DropdownMenuItem onClick={() => setEditingPurchase(purchase)}>
                              <Edit className="h-4 w-4 mr-2" />
                              Edit Purchase
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onClick={() => setVoidingPurchase(purchase)}
                              className="text-destructive"
                            >
                              <XCircle className="h-4 w-4 mr-2" />
                              Void Purchase
                            </DropdownMenuItem>
                          </>
                        )}
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
            Showing {((page - 1) * 20) + 1} to {Math.min(page * 20, total)} of {total} purchases
          </div>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => loadPurchases(page - 1)}
              disabled={page === 1 || isPending}
            >
              Previous
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => loadPurchases(page + 1)}
              disabled={page === totalPages || isPending}
            >
              Next
            </Button>
          </div>
        </div>
      )}

      {/* Purchase Details Sheet */}
      {viewingPurchase && (
        <PurchaseDetailsSheet
          purchaseId={viewingPurchase.id}
          open={!!viewingPurchase}
          onOpenChange={(open) => !open && setViewingPurchase(null)}
        />
      )}

      {/* Edit Purchase Dialog */}
      {editingPurchase && (
        <EditPurchaseDialog
          purchaseId={editingPurchase.id}
          open={!!editingPurchase}
          onOpenChange={(open) => !open && setEditingPurchase(null)}
          onSuccess={() => {
            setEditingPurchase(null)
            loadPurchases(page)
          }}
        />
      )}

      {/* Manage Suppliers Dialog */}
      <ManageSuppliersDialog
        open={showManageSuppliers}
        onOpenChange={setShowManageSuppliers}
      />

      {/* Void Confirmation Dialog */}
      <AlertDialog open={!!voidingPurchase} onOpenChange={(open) => !open && setVoidingPurchase(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Void Purchase?</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to void purchase <strong>{voidingPurchase?.poNumber}</strong>?
              This will reverse the stock and cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleVoid}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isPending ? 'Voiding...' : 'Void Purchase'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}

