'use client'

import { useState, useEffect, useTransition, useRef, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { getPosProducts, getCategories } from '@/actions/pos'
import { ProductCard } from '@/components/pos/product-card'
import { CartSidebar } from '@/components/pos/cart-sidebar'
import { ProductSearch } from '@/components/pos/product-search'
import { Button } from '@/components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { CheckoutDialog } from '@/components/pos/checkout-dialog'
import { ShoppingBag, Loader2 } from 'lucide-react'
import { useCartStore } from '@/stores/cart-store'
import { useDebounce } from '@/hooks/use-debounce'
import { useScanDetection } from '@/hooks/use-scan-detection'
import { ReceiptTemplate } from '@/components/pos/receipt-template'
import { toast } from 'sonner'
import { getOrCreateWalkInCustomer } from '@/actions/customers'
import { getStoreSettings } from '@/actions/settings'
import type { PosProduct } from '@/actions/pos'
import type { CartItem } from '@/types'

export default function POSPage() {
  const router = useRouter()
  const [products, setProducts] = useState<PosProduct[]>([])
  const [categories, setCategories] = useState<Array<{ id: string; name: string }>>([])
  const [selectedCategory, setSelectedCategory] = useState<string>('all')
  // Separate display state (immediate) from search state (debounced)
  const [inputValue, setInputValue] = useState('') // Immediate input value - updates on every keystroke
  const [debouncedQuery, setDebouncedQuery] = useState('') // Debounced query - only updates when user stops typing
  const [isLoading, setIsLoading] = useState(true)
  const [isPending, startTransition] = useTransition()
  const [showCheckout, setShowCheckout] = useState(false)
  const [receiptData, setReceiptData] = useState<{
    id: string
    saleNumber: string
    items: Array<{
      productId: string
      productName: string
      barcode?: string
      sku?: string
      quantity: number
      unitPrice: number
      discount: number
      tax: number
      total: number
    }>
    subtotal: number
    discount: number
    discountPercent: number
    tax: number
    total: number
    paymentMethod: string
    cashReceived?: number
    change?: number
    customerId?: string
    customerName?: string
    cashierName?: string
    createdAt: string
  } | null>(null)
  const [storeSettings, setStoreSettings] = useState<{
    storeName?: string
    address?: string
    phone?: string
    receiptFooter?: string
  } | null>(null)
  const items = useCartStore((state) => state.items)
  const addItem = useCartStore((state) => state.addItem)
  const searchInputRef = useRef<HTMLInputElement>(null)

  // Barcode scanner detection
  const handleBarcodeScan = useCallback(async (barcode: string) => {
    try {
      // Search for product by barcode
      const products = await getPosProducts(barcode)
      
      if (products.length === 0) {
        toast.error('Product not found', {
          description: `No product found with barcode: ${barcode}`,
        })
        return
      }

      // If multiple products found, use the first one
      // In a real scenario, you might want to show a selection dialog
      const product = products[0]

      // Check stock
      if (product.stock <= 0) {
        toast.error('Out of stock', {
          description: `${product.name} is out of stock`,
        })
        return
      }

      // Add to cart
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

      toast.success('Product added', {
        description: product.name,
      })
    } catch (error) {
      console.error('Error scanning barcode:', error)
      toast.error('Failed to scan barcode')
    }
  }, [addItem])

  // Enable barcode scanner detection (only when checkout is not open)
  useScanDetection({
    onScan: handleBarcodeScan,
    enabled: !showCheckout,
    minLength: 3,
    maxLength: 50,
    timeThreshold: 100,
  })

  // Debounce the input value - this updates debouncedQuery after user stops typing
  const debouncedInputValue = useDebounce(inputValue, 300)

  const loadProducts = useCallback(async (query?: string, categoryId?: string) => {
    setIsLoading(true)
    try {
      const data = await getPosProducts(query, categoryId === 'all' ? undefined : categoryId)
      setProducts(data)
    } catch (error) {
      console.error('Error loading products:', error)
    } finally {
      setIsLoading(false)
    }
  }, [])

  const loadCategories = useCallback(async () => {
    try {
      const data = await getCategories()
      setCategories(data)
    } catch (error) {
      console.error('Error loading categories:', error)
    }
  }, [])

  // Load initial data
  useEffect(() => {
    loadProducts()
    loadCategories()
    
    // Load store settings for receipt
    getStoreSettings().then((result) => {
      if (result.success && result.data) {
        setStoreSettings({
          storeName: result.data.storeName,
          address: result.data.address || undefined,
          phone: result.data.phone || undefined,
          receiptFooter: result.data.receiptFooter || undefined,
        })
      }
    })
  }, [loadProducts, loadCategories])

  // Helper function to focus search input (only called after adding product or on mount)
  const focusSearchInput = useCallback(() => {
    if (!showCheckout && searchInputRef.current) {
      // Use requestAnimationFrame to ensure DOM is ready
      requestAnimationFrame(() => {
        searchInputRef.current?.focus()
      })
    }
  }, [showCheckout])

  // Auto-focus on mount (only once)
  useEffect(() => {
    // Focus search input when component mounts
    const timer = setTimeout(() => {
      searchInputRef.current?.focus()
    }, 100)
    return () => clearTimeout(timer)
  }, [])

  // Update debouncedQuery when debouncedInputValue changes (user stopped typing)
  useEffect(() => {
    setDebouncedQuery(debouncedInputValue)
  }, [debouncedInputValue])

  // Effect to trigger search ONLY when debouncedQuery changes (not on every keystroke)
  useEffect(() => {
    startTransition(() => {
      loadProducts(debouncedQuery, selectedCategory === 'all' ? undefined : selectedCategory)
    })
  }, [debouncedQuery, selectedCategory, loadProducts])

  // Auto-add feature: If exactly one product found and input looks like barcode scan
  useEffect(() => {
    // Only auto-add if:
    // 1. Exactly one product found
    // 2. Input is 8+ characters (typical barcode length)
    // 3. Not currently loading
    // 4. Use debouncedQuery to avoid triggering while user is still typing
    const shouldAutoAdd = 
      products.length === 1 && 
      debouncedQuery.length >= 8 &&
      debouncedQuery.trim().length > 0 &&
      (!isPending && !isLoading)

    if (shouldAutoAdd) {
      const product = products[0]
      // Verify the barcode matches (either exact match or input is part of barcode)
      const barcodeMatch = product.barcode && (
        product.barcode === debouncedQuery.trim() || 
        product.barcode.includes(debouncedQuery.trim())
      )
      
      if (barcodeMatch) {
        // Check if product is out of stock
        if (product.stock <= 0) {
          toast.error('This item is out of stock.')
          // Clear input and refocus for next scan
          setInputValue('')
          setDebouncedQuery('')
          setTimeout(() => {
            searchInputRef.current?.focus()
          }, 50)
          return
        }

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
        
        // Clear input and refocus for next scan
        setInputValue('')
        setDebouncedQuery('')
        // Use setTimeout to ensure focus happens after state update
        setTimeout(() => {
          searchInputRef.current?.focus()
        }, 50)
      }
    }
  }, [products, debouncedQuery, addItem, isPending, isLoading])

  // Global key listener: Auto-focus search input when typing starts (only if not already focused)
  useEffect(() => {
    if (showCheckout) return // Disable when checkout dialog is open

    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't interfere if user is typing in an input/textarea
      const activeElement = document.activeElement
      const isInputFocused = 
        activeElement?.tagName === 'INPUT' || 
        activeElement?.tagName === 'TEXTAREA' ||
        activeElement?.getAttribute('contenteditable') === 'true'

      // If search input is already focused, do nothing (let normal typing work)
      if (activeElement === searchInputRef.current) {
        return
      }

      // If user is typing in another input (like checkout dialog), don't interfere
      if (isInputFocused && activeElement !== searchInputRef.current) {
        return
      }

      // If it's a printable character (not modifier keys), focus search input
      if (e.key.length === 1 && !e.ctrlKey && !e.metaKey && !e.altKey) {
        // Don't focus if it's a special key like Escape, Tab, etc.
        if (!['Escape', 'Tab', 'Enter', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.key)) {
          // Focus the input - the browser will naturally insert the character
          // when the input receives focus, triggering onChange
          searchInputRef.current?.focus()
        }
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => {
      window.removeEventListener('keydown', handleKeyDown)
    }
  }, [showCheckout])

  // Click handler: Focus search input when clicking on background
  useEffect(() => {
    if (showCheckout) return // Disable when checkout dialog is open

    const handleClick = (e: MouseEvent) => {
      const target = e.target as HTMLElement
      
      // Don't focus if clicking on:
      // - Inputs, buttons, links, or interactive elements
      // - Product cards (they have their own click handlers)
      // - Cart items
      const isInteractiveElement = 
        target.tagName === 'INPUT' ||
        target.tagName === 'BUTTON' ||
        target.tagName === 'A' ||
        target.closest('button') ||
        target.closest('a') ||
        target.closest('[role="button"]') ||
        target.closest('[data-product-card]') ||
        target.closest('[data-cart-item]') ||
        target.closest('[data-dialog]') ||
        target.closest('[role="dialog"]')

      // If clicking on background (not interactive), focus search input
      if (!isInteractiveElement && searchInputRef.current !== document.activeElement) {
        focusSearchInput()
      }
    }

    document.addEventListener('click', handleClick)
    return () => {
      document.removeEventListener('click', handleClick)
    }
  }, [showCheckout, focusSearchInput])

  const handleInputChange = (value: string) => {
    // Update immediately - no debouncing here, this is the display state
    setInputValue(value)
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    // If Enter is pressed and exactly one product found, add it
    if (e.key === 'Enter' && products.length === 1) {
      e.preventDefault()
      const product = products[0]
      
      // Check if product is out of stock
      if (product.stock <= 0) {
        toast.error('This item is out of stock.')
        // Clear input and refocus
        setInputValue('')
        setDebouncedQuery('')
        setTimeout(() => {
          searchInputRef.current?.focus()
        }, 50)
        return
      }

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
      
      // Clear input and refocus
      setInputValue('')
      setDebouncedQuery('')
      // Use setTimeout to ensure focus happens after state update
      setTimeout(() => {
        searchInputRef.current?.focus()
      }, 50)
    }
  }

  const handleCategoryChange = (categoryId: string) => {
    setSelectedCategory(categoryId)
    // Search will be triggered by the useEffect watching debouncedSearchQuery
  }

  // handlePrint is no longer needed - print is triggered from CheckoutDialog

  const handleSaleComplete = useCallback((saleData: {
    id: string
    saleNumber: string
    items: Array<{
      productId: string
      productName: string
      barcode?: string
      sku?: string
      quantity: number
      unitPrice: number
      discount: number
      tax: number
      total: number
    }>
    subtotal: number
    discount: number
    discountPercent: number
    tax: number
    total: number
    paymentMethod: string
    cashReceived?: number
    change?: number
    customerId?: string
    customerName?: string
    cashierName?: string
    createdAt: string
  }, shouldPrint: boolean = false) => {
    // Set receipt data (saleData already contains all needed info from server)
    setReceiptData(saleData)

    // Show success toast
    toast.success('Sale completed successfully!', {
      description: `Sale #${saleData.saleNumber}`,
      duration: 3000,
    })

    // Force refresh to update product stock and other cached data
    router.refresh()

    // Print is handled in CheckoutDialog after state update
    // No need to call handlePrint here as it's triggered from CheckoutDialog
  }, [router])

  return (
    <div className="flex h-full">
      {/* Product Selection Area - Left Side */}
      <div className="flex-1 flex flex-col overflow-hidden">
        <div className="p-4 border-b bg-card space-y-4">
          <div className="flex items-center gap-2">
            <ShoppingBag className="h-5 w-5" />
            <h1 className="text-2xl font-bold">Point of Sale</h1>
          </div>
          
          <div className="flex gap-4">
            <div className="flex-1">
              <ProductSearch
                ref={searchInputRef}
                value={inputValue}
                onChange={handleInputChange}
                onKeyDown={handleKeyDown}
                disabled={false}
              />
            </div>
            <Select value={selectedCategory} onValueChange={handleCategoryChange}>
              <SelectTrigger className="w-[200px]">
                <SelectValue placeholder="All Categories" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Categories</SelectItem>
                {categories.map((category) => (
                  <SelectItem key={category.id} value={category.id}>
                    {category.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Product Grid */}
        <div className="flex-1 overflow-y-auto p-4">
          {isLoading || isPending ? (
            <div className="flex items-center justify-center h-full">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : products.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-center">
              <ShoppingBag className="h-16 w-16 text-muted-foreground mb-4" />
              <p className="text-lg font-semibold">No products found</p>
              <p className="text-sm text-muted-foreground mt-2">
                {debouncedQuery ? 'Try a different search term' : 'No products available'}
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
              {products.map((product) => (
                <ProductCard 
                  key={product.id} 
                  product={product}
                  onAddToCart={focusSearchInput}
                />
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Cart Area - Right Side */}
      <div className="w-full border-l bg-muted/50 md:w-96 flex flex-col">
        <CartSidebar />
        <div className="p-4 border-t bg-card">
          <Button
            className="w-full"
            size="lg"
            onClick={() => setShowCheckout(true)}
            disabled={items.length === 0}
          >
            Pay Now
          </Button>
        </div>
      </div>

      {/* Checkout Dialog */}
      <CheckoutDialog
        open={showCheckout}
        onOpenChange={setShowCheckout}
        onSaleComplete={handleSaleComplete}
      />

      {/* Receipt Template (Hidden on screen, visible when printing) */}
      {receiptData && (
        <ReceiptTemplate
          saleNumber={receiptData.saleNumber}
          date={new Date(receiptData.createdAt).toLocaleString('en-US', {
            year: 'numeric',
            month: '2-digit',
            day: '2-digit',
            hour: '2-digit',
            minute: '2-digit',
          })}
          items={receiptData.items.map(item => ({
            productId: item.productId,
            productName: item.productName,
            barcode: item.barcode,
            quantity: item.quantity,
            unitPrice: item.unitPrice,
            discount: item.discount,
            tax: item.tax,
            total: item.total,
            stock: 0, // Not needed for receipt
            image: undefined, // Not needed for receipt
          }))}
          subtotal={receiptData.subtotal}
          discount={receiptData.discount}
          discountPercent={receiptData.discountPercent}
          tax={receiptData.tax}
          total={receiptData.total}
          paymentMethod={receiptData.paymentMethod}
          cashReceived={receiptData.cashReceived}
          change={receiptData.change}
          customerName={receiptData.customerName}
          cashierName={receiptData.cashierName}
          storeName={storeSettings?.storeName}
          storeAddress={storeSettings?.address}
          storePhone={storeSettings?.phone}
          receiptFooter={storeSettings?.receiptFooter}
        />
      )}
    </div>
  )
}
