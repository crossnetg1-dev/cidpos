'use client'

import { useState, useEffect } from 'react'
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { getStockHistory, type StockHistoryEntry } from '@/actions/stock'
import { Loader2 } from 'lucide-react'
import { format } from 'date-fns'
import { toast } from 'sonner'
import type { StockProduct } from '@/actions/stock'

interface StockHistorySheetProps {
  product: StockProduct
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function StockHistorySheet({ product, open, onOpenChange }: StockHistorySheetProps) {
  const [history, setHistory] = useState<StockHistoryEntry[]>([])
  const [isLoading, setIsLoading] = useState(false)

  useEffect(() => {
    if (open && product.id) {
      loadHistory()
    }
  }, [open, product.id])

  const loadHistory = async () => {
    setIsLoading(true)
    try {
      const data = await getStockHistory(product.id)
      setHistory(data)
    } catch (error) {
      toast.error('Failed to load stock history')
    } finally {
      setIsLoading(false)
    }
  }

  const getHistoryBadge = (entry: StockHistoryEntry) => {
    if (entry.type === 'PURCHASE') {
      return <Badge className="bg-green-100 text-green-800 hover:bg-green-100">Purchased</Badge>
    }
    if (entry.type === 'SALE') {
      return <Badge className="bg-blue-100 text-blue-800 hover:bg-blue-100">Sold</Badge>
    }
    if (entry.type === 'ADJUSTMENT') {
      if (entry.quantity > 0) {
        return <Badge className="bg-purple-100 text-purple-800 hover:bg-purple-100">Added</Badge>
      }
      return <Badge className="bg-red-100 text-red-800 hover:bg-red-100">Removed</Badge>
    }
    if (entry.type === 'RETURN') {
      return <Badge className="bg-orange-100 text-orange-800 hover:bg-orange-100">Returned</Badge>
    }
    return <Badge variant="secondary">{entry.type}</Badge>
  }

  const getQuantityDisplay = (entry: StockHistoryEntry) => {
    if (entry.quantity > 0) {
      return <span className="text-green-600 font-medium">+{entry.quantity}</span>
    }
    return <span className="text-red-600 font-medium">{entry.quantity}</span>
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:max-w-2xl overflow-y-auto">
        <SheetHeader>
          <SheetTitle>Stock History</SheetTitle>
          <SheetDescription>
            Complete movement history for {product.name}
          </SheetDescription>
        </SheetHeader>

        <div className="mt-6 space-y-4">
          {/* Current Stock Info */}
          <div className="bg-muted p-4 rounded-lg">
            <div className="flex justify-between items-center">
              <div>
                <p className="text-sm text-muted-foreground">Current Stock</p>
                <p className="text-2xl font-bold">{product.stock} {product.unit}</p>
              </div>
              <div className="text-right">
                <p className="text-sm text-muted-foreground">Total Value</p>
                <p className="text-2xl font-bold">{product.totalValue.toLocaleString()} MMK</p>
              </div>
            </div>
          </div>

          <Separator />

          {/* History Timeline */}
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin" />
            </div>
          ) : history.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <p>No stock history found</p>
            </div>
          ) : (
            <div className="space-y-4">
              <h3 className="font-semibold">Movement Timeline</h3>
              <div className="space-y-3">
                {history.map((entry) => (
                  <div
                    key={entry.id}
                    className="flex items-start gap-4 p-4 border rounded-lg hover:bg-accent transition-colors"
                  >
                    <div className="flex-shrink-0">
                      {getHistoryBadge(entry)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2">
                        <p className="font-medium">{entry.description}</p>
                        <div className="flex items-center gap-2">
                          {getQuantityDisplay(entry)}
                        </div>
                      </div>
                      <div className="flex items-center gap-4 mt-1 text-sm text-muted-foreground">
                        <span>{format(new Date(entry.date), 'MMM dd, yyyy HH:mm')}</span>
                        {entry.reference && (
                          <span className="font-mono text-xs">#{entry.reference}</span>
                        )}
                        {entry.user && (
                          <span>by {entry.user}</span>
                        )}
                        {entry.reason && (
                          <span className="capitalize">({entry.reason.toLowerCase()})</span>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </SheetContent>
    </Sheet>
  )
}

