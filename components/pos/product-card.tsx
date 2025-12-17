'use client'

import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { useCartStore } from '@/stores/cart-store'
import { Package, Plus } from 'lucide-react'
import type { PosProduct } from '@/actions/pos'
import Image from 'next/image'

interface ProductCardProps {
  product: PosProduct
  onAddToCart?: () => void // Callback to refocus search input after adding
}

export function ProductCard({ product, onAddToCart }: ProductCardProps) {
  const addItem = useCartStore((state) => state.addItem)

  const handleAddToCart = () => {
    addItem({
      productId: product.id,
      productName: product.name,
      barcode: product.barcode || undefined,
      quantity: 1,
      unitPrice: product.sellingPrice,
      discount: 0,
      tax: 0,
      stock: product.stock,
      image: product.image || undefined,
    })
    // Call callback to refocus search input
    onAddToCart?.()
  }

  const isOutOfStock = product.stock <= 0

  const handleCardClick = (e: React.MouseEvent) => {
    // Prevent any interaction if out of stock
    if (isOutOfStock) {
      e.preventDefault()
      e.stopPropagation()
      return
    }
  }

  return (
    <Card 
      className={`group transition-shadow relative ${isOutOfStock ? 'opacity-60 cursor-not-allowed' : 'hover:shadow-md'}`}
      data-product-card
      onClick={handleCardClick}
    >
      {/* Out of Stock Badge Overlay */}
      {isOutOfStock && (
        <div className="absolute top-2 right-2 z-10 bg-destructive text-destructive-foreground px-2 py-1 rounded-md text-xs font-semibold shadow-lg">
          Out of Stock
        </div>
      )}
      <CardContent className="p-4">
        <div className="flex flex-col h-full">
          {/* Product Image */}
          <div className="relative w-full aspect-square mb-3 bg-muted rounded-lg overflow-hidden">
            {product.image ? (
              <Image
                src={product.image}
                alt={product.name}
                fill
                className="object-cover"
              />
            ) : (
              <div className="flex items-center justify-center h-full">
                <Package className="h-12 w-12 text-muted-foreground" />
              </div>
            )}
            {isOutOfStock && (
              <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                <span className="text-white font-semibold">Out of Stock</span>
              </div>
            )}
          </div>

          {/* Product Info */}
          <div className="flex-1 flex flex-col">
            <h3 className="font-semibold text-sm mb-1 line-clamp-2 min-h-[2.5rem]">
              {product.name}
            </h3>
            <p className="text-xs text-muted-foreground mb-2">
              {product.category.name}
            </p>
            
            {/* Price and Stock */}
            <div className="flex items-center justify-between mb-3">
              <span className="text-lg font-bold text-primary">
                {product.sellingPrice.toLocaleString()} MMK
              </span>
              <span className="text-xs text-muted-foreground">
                Stock: {product.stock} {product.unit}
              </span>
            </div>

            {/* Add Button */}
            <Button
              onClick={isOutOfStock ? undefined : handleAddToCart}
              disabled={isOutOfStock}
              className="w-full"
              size="sm"
            >
              <Plus className="h-4 w-4 mr-2" />
              Add to Cart
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

