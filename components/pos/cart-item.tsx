'use client'

import { Button } from '@/components/ui/button'
import { useCartStore } from '@/stores/cart-store'
import { Minus, Plus, Trash2 } from 'lucide-react'
import type { CartItem } from '@/types'

interface CartItemProps {
  item: CartItem
}

export function CartItemComponent({ item }: CartItemProps) {
  const updateQuantity = useCartStore((state) => state.updateQuantity)
  const removeItem = useCartStore((state) => state.removeItem)

  const handleIncrement = () => {
    updateQuantity(item.productId, item.quantity + 1)
  }

  const handleDecrement = () => {
    if (item.quantity > 1) {
      updateQuantity(item.productId, item.quantity - 1)
    } else {
      removeItem(item.productId)
    }
  }

  const handleRemove = () => {
    removeItem(item.productId)
  }

  return (
    <div className="flex items-center gap-3 p-3 border-b">
      <div className="flex-1 min-w-0">
        <h4 className="font-medium text-sm truncate">{item.productName}</h4>
        <p className="text-xs text-muted-foreground">
          {item.unitPrice.toLocaleString()} MMK × {item.quantity}
        </p>
      </div>
      
      <div className="flex items-center gap-2">
        {/* Quantity Controls */}
        <div className="flex items-center gap-1 border rounded-md">
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8"
            onClick={handleDecrement}
          >
            <Minus className="h-3 w-3" />
          </Button>
          <span className="px-2 text-sm font-medium min-w-[2rem] text-center">
            {item.quantity}
          </span>
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8"
            onClick={handleIncrement}
            disabled={item.quantity >= item.stock}
          >
            <Plus className="h-3 w-3" />
          </Button>
        </div>

        {/* Total */}
        <div className="text-right min-w-[5rem]">
          <p className="font-semibold text-sm">
            {item.total.toLocaleString()} MMK
          </p>
        </div>

        {/* Remove Button */}
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8 text-destructive hover:text-destructive"
          onClick={handleRemove}
        >
          <Trash2 className="h-4 w-4" />
        </Button>
      </div>
    </div>
  )
}

