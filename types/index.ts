// Common types for the POS system
import { 
  UserRole, 
  UserStatus, 
  PaymentMethod, 
  SaleStatus,
  PurchaseStatus,
  StockMovementType,
  AdjustmentReason,
  ReturnReason,
  RefundMethod,
  ShiftStatus,
  ActivityType,
  NotificationType,
  NotificationStatus
} from '@prisma/client'

// Re-export Prisma enums
export type {
  UserRole,
  UserStatus,
  PaymentMethod,
  SaleStatus,
  PurchaseStatus,
  StockMovementType,
  AdjustmentReason,
  ReturnReason,
  RefundMethod,
  ShiftStatus,
  ActivityType,
  NotificationType,
  NotificationStatus
}

// Cart item type for Zustand store
export interface CartItem {
  productId: string
  productName: string
  barcode?: string
  quantity: number
  unitPrice: number
  discount: number
  tax: number
  total: number
  stock: number
  image?: string
}

// Discount type
export type DiscountType = 'PERCENT' | 'FIXED'

// Tax type
export type TaxType = 'PERCENT' | 'FIXED'

// Cart state type
export interface CartState {
  items: CartItem[]
  subtotal: number
  discount: number
  discountPercent: number
  discountType: DiscountType
  discountValue: number
  tax: number
  taxType: TaxType
  taxValue: number
  total: number
  customerId?: string // Keep for backward compatibility
  selectedCustomerId: string | null // ID of the customer
  selectedCustomerName: string // Name to display (Default: "Walk-in Customer")
  paymentMethod: PaymentMethod
  cashReceived?: number
  change?: number
}

// Session state type
export interface SessionState {
  user: {
    id: string
    username: string
    fullName: string
    role: UserRole
    email?: string
  } | null
  isAuthenticated: boolean
  expiresAt?: Date
}

// Form types
export interface ProductFormData {
  name: string
  barcode?: string
  sku?: string
  description?: string
  categoryId: string
  purchasePrice: number
  sellingPrice: number
  stock: number
  minStockLevel: number
  unit: string
  expiryDate?: Date
  image?: string
}

export interface CustomerFormData {
  name: string
  phone?: string
  email?: string
  address?: string
  creditLimit: number
  openingBalance: number
}

export interface SupplierFormData {
  name: string
  companyName?: string
  phone?: string
  email?: string
  address?: string
  creditLimit: number
  openingBalance: number
}

// Report types
export interface SalesReport {
  date: string
  totalSales: number
  totalTransactions: number
  totalProfit: number
  totalCost: number
}

export interface ProductReport {
  productId: string
  productName: string
  totalSold: number
  totalRevenue: number
  totalProfit: number
  averagePrice: number
}

// Dashboard stats
export interface DashboardStats {
  todaySales: number
  todayTransactions: number
  todayProfit: number
  todayCost: number
  totalProducts: number
  totalCustomers: number
  totalDebt: number
  lowStockItems: number
}

