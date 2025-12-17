'use client'

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { ScrollArea } from '@/components/ui/scroll-area'
import { useCartStore, type SavedCart } from '@/stores/cart-store'
import { format } from 'date-fns'
import { Trash2 } from 'lucide-react'

interface RetrieveCartDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSelect: (cartId: string) => void
}

export function RetrieveCartDialog({ open, onOpenChange, onSelect }: RetrieveCartDialogProps) {
  const savedCarts = useCartStore((state) => state.savedCarts)
  const removeSavedCart = useCartStore((state) => state.removeSavedCart)

  const handleSelect = (cartId: string) => {
    onSelect(cartId)
    onOpenChange(false)
  }

  const handleDelete = (e: React.MouseEvent, cartId: string) => {
    e.stopPropagation()
    removeSavedCart(cartId)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Retrieve Saved Cart</DialogTitle>
          <DialogDescription>
            Select a saved cart to restore it. The cart will be moved back to the active cart.
          </DialogDescription>
        </DialogHeader>
        <ScrollArea className="max-h-[400px]">
          {savedCarts.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-8 text-center">
              <p className="text-muted-foreground">No saved carts</p>
              <p className="text-sm text-muted-foreground mt-2">
                Hold a cart to save it for later
              </p>
            </div>
          ) : (
            <div className="space-y-2">
              {savedCarts
                .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
                .map((cart) => {
                  const cartDate = new Date(cart.timestamp)
                  return (
                    <div
                      key={cart.id}
                      className="flex items-center justify-between p-3 border rounded-lg hover:bg-accent cursor-pointer transition-colors"
                      onClick={() => handleSelect(cart.id)}
                    >
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <p className="font-medium text-sm">
                            {format(cartDate, 'HH:mm:ss')}
                          </p>
                          <span className="text-xs text-muted-foreground">
                            {format(cartDate, 'MMM dd, yyyy')}
                          </span>
                        </div>
                        {cart.note && (
                          <p className="text-xs text-muted-foreground truncate mb-1">
                            {cart.note}
                          </p>
                        )}
                        <div className="flex items-center gap-4 text-xs text-muted-foreground">
                          <span>{cart.items.length} {cart.items.length === 1 ? 'item' : 'items'}</span>
                          <span className="font-semibold text-foreground">
                            {cart.total.toLocaleString()} MMK
                          </span>
                          {cart.customerName && (
                            <span className="truncate">{cart.customerName}</span>
                          )}
                        </div>
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={(e) => handleDelete(e, cart.id)}
                        className="ml-2 text-destructive hover:text-destructive"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  )
                })}
            </div>
          )}
        </ScrollArea>
      </DialogContent>
    </Dialog>
  )
}

