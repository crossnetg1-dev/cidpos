import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { CartItem, CartState, PaymentMethod, DiscountType, TaxType } from '@/types'

export interface SavedCart {
  id: string
  timestamp: string // ISO string for serialization
  note?: string
  items: CartItem[]
  subtotal: number
  discount: number
  discountPercent: number
  tax: number
  total: number
  customerId?: string
  customerName?: string
  paymentMethod: PaymentMethod
}

interface CartStore extends CartState {
  savedCarts: SavedCart[]
  // Actions
  addItem: (item: Omit<CartItem, 'total'>) => void
  updateQuantity: (productId: string, quantity: number) => void
  removeItem: (productId: string) => void
  clearCart: () => void
  setCustomer: (id: string, name: string) => void
  resetCustomer: () => void // Reset to Walk-in
  setPaymentMethod: (method: PaymentMethod) => void
  setCashReceived: (amount: number) => void
  setDiscount: (type: DiscountType, value: number) => void
  removeDiscount: () => void
  setTax: (type: TaxType, value: number) => void
  resetTax: () => void
  calculateTotals: () => void
  holdCart: (note?: string) => void
  retrieveCart: (cartId: string) => void
  removeSavedCart: (cartId: string) => void
}

const calculateItemTotal = (item: CartItem): number => {
  // Use proper rounding to avoid floating point errors
  const subtotal = Math.round((item.quantity * item.unitPrice) * 100) / 100
  const discountAmount = Math.round(item.discount * 100) / 100
  const taxAmount = Math.round(item.tax * 100) / 100
  return Math.round((subtotal - discountAmount + taxAmount) * 100) / 100
}

export const useCartStore = create<CartStore>()(
  persist(
    (set, get) => ({
      items: [],
      subtotal: 0,
      discount: 0,
      discountPercent: 0,
      discountType: 'FIXED' as DiscountType,
      discountValue: 0,
      tax: 0,
      taxType: 'PERCENT' as TaxType,
      taxValue: 5, // Default 5%
      total: 0,
      customerId: undefined, // Keep for backward compatibility
      selectedCustomerId: null,
      selectedCustomerName: 'Walk-in Customer',
      paymentMethod: 'CASH' as PaymentMethod,
      cashReceived: undefined,
      change: undefined,
      savedCarts: [],

      addItem: (item) => {
        const state = get()
        const existingItem = state.items.find(i => i.productId === item.productId)

        if (existingItem) {
          // Update quantity if item exists, but check stock limit
          const newQuantity = existingItem.quantity + item.quantity
          if (newQuantity > item.stock) {
            // Don't exceed stock
            get().updateQuantity(item.productId, item.stock)
          } else {
            get().updateQuantity(item.productId, newQuantity)
          }
        } else {
          // Add new item, but check stock limit
          const quantityToAdd = item.quantity > item.stock ? item.stock : item.quantity
          if (quantityToAdd <= 0) {
            return // No stock available
          }
          
          const newItem: CartItem = {
            ...item,
            quantity: quantityToAdd,
            total: calculateItemTotal({ ...item, quantity: quantityToAdd, total: 0 })
          }
          set((state) => ({
            items: [...state.items, newItem]
          }))
          get().calculateTotals()
        }
      },

      updateQuantity: (productId, quantity) => {
        if (quantity <= 0) {
          get().removeItem(productId)
          return
        }

        set((state) => ({
          items: state.items.map(item => {
            if (item.productId === productId) {
              // Don't allow quantity to exceed stock
              const finalQuantity = quantity > item.stock ? item.stock : quantity
              const updatedItem = { ...item, quantity: finalQuantity }
              return {
                ...updatedItem,
                total: calculateItemTotal(updatedItem)
              }
            }
            return item
          })
        }))
        get().calculateTotals()
      },

      removeItem: (productId) => {
        set((state) => ({
          items: state.items.filter(item => item.productId !== productId)
        }))
        get().calculateTotals()
      },

      clearCart: () => {
        set({
          items: [],
          subtotal: 0,
          discount: 0,
          discountPercent: 0,
          discountType: 'FIXED' as DiscountType,
          discountValue: 0,
          tax: 0,
          taxType: 'PERCENT' as TaxType,
          taxValue: 5, // Reset to default 5%
          total: 0,
          customerId: undefined,
          selectedCustomerId: null,
          selectedCustomerName: 'Walk-in Customer',
          paymentMethod: 'CASH' as PaymentMethod,
          cashReceived: undefined,
          change: undefined
        })
      },

      setCustomer: (id, name) => {
        set({ 
          selectedCustomerId: id,
          selectedCustomerName: name,
          customerId: id // Keep for backward compatibility
        })
      },

      resetCustomer: () => {
        set({ 
          selectedCustomerId: null,
          selectedCustomerName: 'Walk-in Customer',
          customerId: undefined // Keep for backward compatibility
        })
      },

      setPaymentMethod: (method) => {
        set({ 
          paymentMethod: method,
          cashReceived: method === 'CASH' ? get().cashReceived : undefined,
          change: method === 'CASH' ? get().change : undefined
        })
      },

      setCashReceived: (amount) => {
        const state = get()
        // Round to avoid floating point errors
        const roundedAmount = Math.round(amount * 100) / 100
        const change = Math.round((roundedAmount - state.total) * 100) / 100
        set({ 
          cashReceived: roundedAmount,
          change: change >= 0 ? change : 0
        })
      },

      setDiscount: (type, value) => {
        set({ 
          discountType: type,
          discountValue: value
        })
        get().calculateTotals()
      },

      removeDiscount: () => {
        set({ 
          discountType: 'FIXED' as DiscountType,
          discountValue: 0,
          discount: 0,
          discountPercent: 0
        })
        get().calculateTotals()
      },

      setTax: (type, value) => {
        set({ 
          taxType: type,
          taxValue: value
        })
        get().calculateTotals()
      },

      resetTax: () => {
        set({ 
          taxType: 'PERCENT' as TaxType,
          taxValue: 5,
          tax: 0
        })
        get().calculateTotals()
      },

      calculateTotals: () => {
        const state = get()
        // Calculate subtotal from items (unitPrice * quantity)
        // Use proper rounding to avoid floating point errors
        const subtotal = state.items.reduce((sum, item) => {
          const itemSubtotal = item.quantity * item.unitPrice
          // Round to 2 decimals to avoid floating point errors
          return Math.round((sum + itemSubtotal) * 100) / 100
        }, 0)
        
        // Calculate discount amount based on type
        let discountAmount = 0
        let discountPercent = 0
        
        if (state.discountValue > 0) {
          if (state.discountType === 'PERCENT') {
            // Percentage discount
            discountPercent = state.discountValue
            discountAmount = Math.round((subtotal * discountPercent / 100) * 100) / 100
            // Ensure discount doesn't exceed subtotal
            discountAmount = Math.min(discountAmount, subtotal)
          } else {
            // Fixed amount discount
            discountAmount = Math.round(state.discountValue * 100) / 100
            // Ensure discount doesn't exceed subtotal
            discountAmount = Math.min(discountAmount, subtotal)
            // Calculate percentage for display
            if (subtotal > 0) {
              discountPercent = Math.round((discountAmount / subtotal * 100) * 100) / 100
            }
          }
        }
        
        // Calculate taxable amount (subtotal after discount)
        const taxableAmount = Math.round((subtotal - discountAmount) * 100) / 100
        
        // Calculate tax amount based on type
        let taxAmount = 0
        if (state.taxValue > 0) {
          if (state.taxType === 'PERCENT') {
            // Percentage tax
            taxAmount = Math.round((taxableAmount * state.taxValue / 100) * 100) / 100
          } else {
            // Fixed amount tax
            taxAmount = Math.round(state.taxValue * 100) / 100
          }
        }
        
        // Calculate total (taxable amount + tax)
        const total = Math.max(0, Math.round((taxableAmount + taxAmount) * 100) / 100) // Ensure total never goes below 0

        set({
          subtotal: Math.round(subtotal * 100) / 100,
          discount: discountAmount,
          discountPercent: discountPercent,
          tax: taxAmount,
          total
        })

        // Recalculate change if cash received
        if (state.cashReceived !== undefined) {
          get().setCashReceived(state.cashReceived)
        }
      },

      holdCart: (note?: string) => {
        const state = get()
        if (state.items.length === 0) {
          return // Don't save empty carts
        }

        const savedCart: SavedCart = {
          id: `cart-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
          timestamp: new Date().toISOString(),
          note: note || undefined,
          items: [...state.items],
          subtotal: state.subtotal,
          discount: state.discount,
          discountPercent: state.discountPercent,
          tax: state.tax,
          total: state.total,
          customerId: state.selectedCustomerId || undefined,
          customerName: state.selectedCustomerName !== 'Walk-in Customer' ? state.selectedCustomerName : undefined,
          paymentMethod: state.paymentMethod,
        }

        set((prevState) => ({
          savedCarts: [...prevState.savedCarts, savedCart],
        }))

        // Clear current cart
        get().clearCart()
      },

      retrieveCart: (cartId: string) => {
        const state = get()
        const savedCart = state.savedCarts.find((cart) => cart.id === cartId)

        if (!savedCart) {
          return
        }

        // Restore cart state
        set({
          items: [...savedCart.items],
          subtotal: savedCart.subtotal,
          discount: savedCart.discount,
          discountPercent: savedCart.discountPercent,
          tax: savedCart.tax,
          total: savedCart.total,
          selectedCustomerId: savedCart.customerId || null,
          selectedCustomerName: savedCart.customerName || 'Walk-in Customer',
          customerId: savedCart.customerId,
          paymentMethod: savedCart.paymentMethod,
          cashReceived: undefined,
          change: undefined,
        })

        // Remove from saved carts
        get().removeSavedCart(cartId)
      },

      removeSavedCart: (cartId: string) => {
        set((state) => ({
          savedCarts: state.savedCarts.filter((cart) => cart.id !== cartId),
        }))
      },
    }),
    {
      name: 'pos-cart-storage',
    }
  )
)

