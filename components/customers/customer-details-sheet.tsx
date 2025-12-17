'use client'

import { useState, useEffect } from 'react'
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { getCustomerDetails } from '@/actions/customers'
import { Loader2, CreditCard } from 'lucide-react'
import { format } from 'date-fns'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { RepayDebtDialog } from './repay-debt-dialog'

interface CustomerDetailsSheetProps {
  customerId: string
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function CustomerDetailsSheet({ customerId, open, onOpenChange }: CustomerDetailsSheetProps) {
  const [customer, setCustomer] = useState<any>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [showRepayDialog, setShowRepayDialog] = useState(false)

  useEffect(() => {
    if (open && customerId) {
      loadCustomer()
    }
  }, [open, customerId])

  const loadCustomer = async () => {
    setIsLoading(true)
    try {
      const result = await getCustomerDetails(customerId)
      if (result.success && result.data) {
        setCustomer(result.data)
      } else {
        toast.error(result.error || 'Failed to load customer details')
        onOpenChange(false)
      }
    } catch (error) {
      toast.error('An error occurred')
      onOpenChange(false)
    } finally {
      setIsLoading(false)
    }
  }

  const getStatusBadge = (status: string) => {
    if (status === 'COMPLETED') {
      return <Badge className="bg-green-100 text-green-800 hover:bg-green-100">Completed</Badge>
    }
    if (status === 'VOID') {
      return <Badge variant="destructive">Void</Badge>
    }
    return <Badge variant="secondary">{status}</Badge>
  }

  if (!customer && !isLoading) {
    return null
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:max-w-2xl overflow-y-auto">
        <SheetHeader>
          <div className="flex items-center justify-between">
            <div>
              <SheetTitle>Customer Details</SheetTitle>
              <SheetDescription>
                View customer profile and purchase history
              </SheetDescription>
            </div>
            {customer && Number(customer.creditBalance) > 0 && (
              <Button
                onClick={() => setShowRepayDialog(true)}
                variant="default"
                size="sm"
                className="gap-2"
              >
                <CreditCard className="h-4 w-4" />
                Repay Debt
              </Button>
            )}
          </div>
        </SheetHeader>

        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin" />
          </div>
        ) : customer ? (
          <div className="space-y-6 mt-6">
            {/* Profile Summary */}
            <Card>
              <CardContent className="pt-6">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Total Spent</p>
                    <p className="text-2xl font-bold text-green-600">
                      {customer.totalSpent.toLocaleString()} MMK
                    </p>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Debt/Credit</p>
                    <p className={`text-2xl font-bold ${customer.creditBalance > 0 ? 'text-destructive' : 'text-muted-foreground'}`}>
                      {customer.creditBalance.toLocaleString()} MMK
                    </p>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Total Visits</p>
                    <p className="text-2xl font-bold">{customer.visitCount}</p>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Credit Limit</p>
                    <p className="text-2xl font-bold">{customer.creditLimit.toLocaleString()} MMK</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Separator />

            {/* Tabs */}
            <Tabs defaultValue="history" className="w-full">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="history">Purchase History</TabsTrigger>
                <TabsTrigger value="info">Contact Info</TabsTrigger>
              </TabsList>

              <TabsContent value="history" className="space-y-4">
                {customer.sales.length === 0 ? (
                  <div className="text-center py-12 text-muted-foreground">
                    <p>No purchase history found</p>
                  </div>
                ) : (
                  <div className="border rounded-md">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Date</TableHead>
                          <TableHead>Invoice #</TableHead>
                          <TableHead>Status</TableHead>
                          <TableHead className="text-right">Amount</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {customer.sales.map((sale: any) => (
                          <TableRow key={sale.id}>
                            <TableCell>
                              {format(new Date(sale.createdAt), 'MMM dd, yyyy HH:mm')}
                            </TableCell>
                            <TableCell className="font-medium">{sale.saleNumber}</TableCell>
                            <TableCell>{getStatusBadge(sale.status)}</TableCell>
                            <TableCell className="text-right font-medium">
                              {sale.total.toLocaleString()} MMK
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                )}
              </TabsContent>

              <TabsContent value="info" className="space-y-4">
                <Card>
                  <CardContent className="pt-6 space-y-4">
                    <div>
                      <p className="text-sm font-medium text-muted-foreground">Name</p>
                      <p className="text-base">{customer.name}</p>
                    </div>
                    {customer.phone && (
                      <div>
                        <p className="text-sm font-medium text-muted-foreground">Phone</p>
                        <p className="text-base">{customer.phone}</p>
                      </div>
                    )}
                    {customer.email && (
                      <div>
                        <p className="text-sm font-medium text-muted-foreground">Email</p>
                        <p className="text-base">{customer.email}</p>
                      </div>
                    )}
                    {customer.address && (
                      <div>
                        <p className="text-sm font-medium text-muted-foreground">Address</p>
                        <p className="text-base">{customer.address}</p>
                      </div>
                    )}
                    <Separator />
                    <div>
                      <p className="text-sm font-medium text-muted-foreground">Member Since</p>
                      <p className="text-base">
                        {format(new Date(customer.createdAt), 'MMM dd, yyyy')}
                      </p>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>
          </div>
        ) : null}

        {/* Repay Debt Dialog */}
        {customer && (
          <RepayDebtDialog
            open={showRepayDialog}
            onOpenChange={setShowRepayDialog}
            customerId={customerId}
            currentDebt={customer.creditBalance}
            onSuccess={loadCustomer}
          />
        )}
      </SheetContent>
    </Sheet>
  )
}

