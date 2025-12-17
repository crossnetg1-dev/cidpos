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
import { EditVoucherDialog } from '@/components/sales/edit-voucher-dialog'
import { SaleDetailsSheet } from '@/components/sales/sale-details-sheet'
import { RefundDialog } from '@/components/sales/refund-dialog'
import { getSales, voidSale, type SalesResponse } from '@/actions/sales'
import { MoreVertical, Eye, Edit, Printer, XCircle, RefreshCw } from 'lucide-react'
import { toast } from 'sonner'
import { format } from 'date-fns'

interface SalesTableProps {
  initialData: SalesResponse
}

export function SalesTable({ initialData }: SalesTableProps) {
  const router = useRouter()
  const [sales, setSales] = useState(initialData.sales)
  const [total, setTotal] = useState(initialData.total)
  const [page, setPage] = useState(initialData.page)
  const [totalPages, setTotalPages] = useState(initialData.totalPages)
  const [isPending, startTransition] = useTransition()
  const [searchQuery, setSearchQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [paymentFilter, setPaymentFilter] = useState('all')
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')
  
  // Dialog states
  const [editingSale, setEditingSale] = useState<typeof sales[0] | null>(null)
  const [viewingSale, setViewingSale] = useState<typeof sales[0] | null>(null)
  const [voidingSale, setVoidingSale] = useState<typeof sales[0] | null>(null)
  const [refundingSale, setRefundingSale] = useState<typeof sales[0] | null>(null)

  const loadSales = async (newPage: number = page) => {
    startTransition(async () => {
      try {
        const data = await getSales({
          query: searchQuery,
          page: newPage,
          status: statusFilter,
          paymentMethod: paymentFilter,
          startDate: startDate || undefined,
          endDate: endDate || undefined,
        })
        setSales(data.sales)
        setTotal(data.total)
        setPage(data.page)
        setTotalPages(data.totalPages)
      } catch (error) {
        toast.error('Failed to load sales')
      }
    })
  }

  const handleSearch = () => {
    setPage(1)
    loadSales(1)
  }

  const handleVoid = async () => {
    if (!voidingSale) return

    startTransition(async () => {
      try {
        const result = await voidSale(voidingSale.id)
        if (result.success) {
          toast.success('Sale voided successfully')
          setVoidingSale(null)
          // Force refresh to update UI
          router.refresh()
          loadSales(page)
        } else {
          toast.error(result.error || 'Failed to void sale')
        }
      } catch (error) {
        toast.error('An error occurred')
      }
    })
  }

  const handleEditSuccess = () => {
    setEditingSale(null)
    // Force refresh to update UI
    router.refresh()
    loadSales(page)
  }

  const handleRefundSuccess = () => {
    setRefundingSale(null)
    // Force refresh to update UI
    router.refresh()
    loadSales(page)
  }

  const getStatusBadge = (status: string) => {
    const variants: Record<string, 'default' | 'secondary' | 'destructive' | 'outline'> = {
      COMPLETED: 'default',
      HOLD: 'secondary',
      VOID: 'destructive',
      RETURNED: 'outline',
    }
    return (
      <Badge variant={variants[status] || 'default'}>
        {status}
      </Badge>
    )
  }

  const getPaymentMethodBadge = (method: string) => {
    const colors: Record<string, string> = {
      CASH: 'bg-green-100 text-green-800',
      KBZPAY: 'bg-blue-100 text-blue-800',
      WAVEPAY: 'bg-purple-100 text-purple-800',
      AYAPAY: 'bg-orange-100 text-orange-800',
      CREDIT: 'bg-yellow-100 text-yellow-800',
      SPLIT: 'bg-gray-100 text-gray-800',
    }
    return (
      <span className={`px-2 py-1 rounded text-xs font-medium ${colors[method] || 'bg-gray-100 text-gray-800'}`}>
        {method}
      </span>
    )
  }

  const getPaymentStatusBadge = (status: string) => {
    const statusConfig: Record<string, { label: string; className: string }> = {
      PAID: {
        label: 'PAID',
        className: 'bg-green-100 text-green-800 hover:bg-green-100',
      },
      UNPAID: {
        label: 'UNPAID',
        className: 'bg-red-100 text-red-800 hover:bg-red-100',
      },
      PARTIAL: {
        label: 'PARTIAL',
        className: 'bg-yellow-100 text-yellow-800 hover:bg-yellow-100',
      },
    }

    const config = statusConfig[status] || {
      label: status,
      className: 'bg-gray-100 text-gray-800 hover:bg-gray-100',
    }

    return (
      <Badge className={config.className}>
        {config.label}
      </Badge>
    )
  }

  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="flex flex-col md:flex-row gap-4">
        <Input
          placeholder="Search by invoice number or customer..."
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
            <SelectItem value="COMPLETED">Completed</SelectItem>
            <SelectItem value="HOLD">Hold</SelectItem>
            <SelectItem value="VOID">Void</SelectItem>
            <SelectItem value="RETURNED">Returned</SelectItem>
          </SelectContent>
        </Select>
        <Select value={paymentFilter} onValueChange={setPaymentFilter}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Payment" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Methods</SelectItem>
            <SelectItem value="CASH">Cash</SelectItem>
            <SelectItem value="KBZPAY">KBZPay</SelectItem>
            <SelectItem value="WAVEPAY">WavePay</SelectItem>
            <SelectItem value="AYAPAY">AYAPay</SelectItem>
            <SelectItem value="CREDIT">Credit</SelectItem>
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
              <TableHead>Invoice No</TableHead>
              <TableHead>Date</TableHead>
              <TableHead>Customer</TableHead>
              <TableHead>Payment</TableHead>
              <TableHead>Payment Status</TableHead>
              <TableHead className="text-right">Total</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isPending && sales.length === 0 ? (
              <TableRow>
                <TableCell colSpan={8} className="text-center py-8">
                  Loading...
                </TableCell>
              </TableRow>
            ) : sales.length === 0 ? (
              <TableRow>
                <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                  No sales found
                </TableCell>
              </TableRow>
            ) : (
              sales.map((sale) => (
                <TableRow key={sale.id} className="cursor-pointer" onClick={() => setViewingSale(sale)}>
                  <TableCell className="font-medium">
                    {sale.saleType === 'DEBT_COLLECTION' ? (
                      <span className="text-blue-600">{sale.saleNumber}</span>
                    ) : (
                      sale.saleNumber
                    )}
                  </TableCell>
                  <TableCell>
                    {format(new Date(sale.createdAt), 'MMM dd, yyyy HH:mm')}
                  </TableCell>
                  <TableCell>{sale.customer?.name || 'Walk-in'}</TableCell>
                  <TableCell>{getPaymentMethodBadge(sale.paymentMethod)}</TableCell>
                  <TableCell>
                    {getPaymentStatusBadge(sale.paymentStatus || 'PAID')}
                  </TableCell>
                  <TableCell className="text-right font-medium">
                    {sale.total.toLocaleString()} MMK
                  </TableCell>
                  <TableCell>{getStatusBadge(sale.status)}</TableCell>
                  <TableCell className="text-right" onClick={(e) => e.stopPropagation()}>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="sm">
                          <MoreVertical className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => setViewingSale(sale)}>
                          <Eye className="h-4 w-4 mr-2" />
                          View Details
                        </DropdownMenuItem>
                        {sale.status !== 'VOID' && (
                          <>
                            <DropdownMenuItem onClick={() => setEditingSale(sale)}>
                              <Edit className="h-4 w-4 mr-2" />
                              Edit Voucher
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => window.print()}>
                              <Printer className="h-4 w-4 mr-2" />
                              Reprint
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onClick={() => setRefundingSale(sale)}
                              className="text-orange-600"
                            >
                              <RefreshCw className="h-4 w-4 mr-2" />
                              Refund
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onClick={() => setVoidingSale(sale)}
                              className="text-destructive"
                            >
                              <XCircle className="h-4 w-4 mr-2" />
                              Void Sale
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
            Showing {((page - 1) * 20) + 1} to {Math.min(page * 20, total)} of {total} sales
          </div>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => loadSales(page - 1)}
              disabled={page === 1 || isPending}
            >
              Previous
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => loadSales(page + 1)}
              disabled={page === totalPages || isPending}
            >
              Next
            </Button>
          </div>
        </div>
      )}

      {/* Edit Voucher Dialog */}
      {editingSale && (
        <EditVoucherDialog
          sale={editingSale}
          open={!!editingSale}
          onOpenChange={(open) => !open && setEditingSale(null)}
          onSuccess={handleEditSuccess}
        />
      )}

      {/* Sale Details Sheet */}
      {viewingSale && (
        <SaleDetailsSheet
          saleId={viewingSale.id}
          open={!!viewingSale}
          onOpenChange={(open) => !open && setViewingSale(null)}
        />
      )}

      {/* Void Confirmation Dialog */}
      <AlertDialog open={!!voidingSale} onOpenChange={(open) => !open && setVoidingSale(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Void Sale?</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to void sale <strong>{voidingSale?.saleNumber}</strong>?
              This will reverse the stock and cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleVoid}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isPending ? 'Voiding...' : 'Void Sale'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Refund Dialog */}
      {refundingSale && (
        <RefundDialog
          sale={refundingSale}
          open={!!refundingSale}
          onOpenChange={(open) => !open && setRefundingSale(null)}
          onSuccess={handleRefundSuccess}
        />
      )}
    </div>
  )
}

