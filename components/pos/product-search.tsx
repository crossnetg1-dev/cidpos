'use client'

import { Input } from '@/components/ui/input'
import { Search } from 'lucide-react'
import { forwardRef } from 'react'

interface ProductSearchProps {
  value: string
  onChange: (value: string) => void
  onKeyDown?: (e: React.KeyboardEvent<HTMLInputElement>) => void
  placeholder?: string
  disabled?: boolean
}

export const ProductSearch = forwardRef<HTMLInputElement, ProductSearchProps>(
  ({ value, onChange, onKeyDown, placeholder = 'Search products or scan barcode...', disabled }, ref) => {
    return (
      <div className="relative">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          ref={ref}
          type="text"
          placeholder={placeholder}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onKeyDown={onKeyDown}
          className="pl-10"
          disabled={disabled}
          autoFocus
        />
      </div>
    )
  }
)

ProductSearch.displayName = 'ProductSearch'

