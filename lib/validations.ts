import { z } from 'zod'

// User validations
export const loginSchema = z.object({
  username: z.string().min(1, 'Username is required'),
  password: z.string().min(1, 'Password is required'),
  rememberMe: z.boolean().optional()
})

export const userSchema = z.object({
  username: z.string().min(3, 'Username must be at least 3 characters'),
  password: z.string().min(6, 'Password must be at least 6 characters').optional(),
  fullName: z.string().min(1, 'Full name is required'),
  email: z.string().email('Invalid email').optional().or(z.literal('')),
  phone: z.string().optional(),
  role: z.enum(['OWNER', 'CASHIER', 'MANAGER']),
  status: z.enum(['ACTIVE', 'INACTIVE'])
})

// Product validations
export const productSchema = z.object({
  name: z.string().min(1, 'Product name is required'),
  barcode: z.string().optional(),
  sku: z.string().optional(),
  description: z.string().optional(),
  categoryId: z.string().min(1, 'Category is required'),
  purchasePrice: z.number().min(0, 'Purchase price must be positive'),
  sellingPrice: z.number().min(0, 'Selling price must be positive'),
  stock: z.number().min(0, 'Stock must be positive'),
  minStockLevel: z.number().min(0, 'Min stock level must be positive'),
  unit: z.string().default('pcs'),
  expiryDate: z.date().optional(),
  image: z.string().optional()
})

// Category validations
export const categorySchema = z.object({
  name: z.string().min(1, 'Category name is required'),
  description: z.string().optional(),
  image: z.string().optional()
})

// Customer validations
export const customerSchema = z.object({
  name: z.string().min(1, 'Customer name is required'),
  phone: z.string().optional(),
  email: z.string().email('Invalid email').optional().or(z.literal('')),
  address: z.string().optional(),
  creditLimit: z.number().min(0, 'Credit limit must be positive').default(0),
  openingBalance: z.number().default(0)
})

// Supplier validations
export const supplierSchema = z.object({
  name: z.string().min(1, 'Supplier name is required'),
  companyName: z.string().optional(),
  phone: z.string().optional(),
  email: z.string().email('Invalid email').optional().or(z.literal('')),
  address: z.string().optional(),
  creditLimit: z.number().min(0, 'Credit limit must be positive').default(0),
  openingBalance: z.number().default(0)
})

// Sale validations
export const saleSchema = z.object({
  customerId: z.string().optional(),
  items: z.array(z.object({
    productId: z.string(),
    quantity: z.number().min(0.01, 'Quantity must be greater than 0'),
    unitPrice: z.number().min(0),
    discount: z.number().min(0).default(0),
    tax: z.number().min(0).default(0)
  })).min(1, 'At least one item is required'),
  subtotal: z.number().min(0),
  discount: z.number().min(0).default(0),
  discountPercent: z.number().min(0).max(100).default(0),
  tax: z.number().min(0).default(0),
  total: z.number().min(0),
  paymentMethod: z.enum(['CASH', 'KBZPAY', 'WAVEPAY', 'AYAPAY', 'CREDIT', 'SPLIT']),
  cashReceived: z.number().optional(),
  change: z.number().optional(),
  notes: z.string().optional()
})

// Purchase validations
export const purchaseSchema = z.object({
  supplierId: z.string().min(1, 'Supplier is required'),
  items: z.array(z.object({
    productId: z.string(),
    quantity: z.number().min(0.01, 'Quantity must be greater than 0'),
    unitPrice: z.number().min(0),
    discount: z.number().min(0).default(0),
    tax: z.number().min(0).default(0)
  })).min(1, 'At least one item is required'),
  subtotal: z.number().min(0),
  discount: z.number().min(0).default(0),
  tax: z.number().min(0).default(0),
  total: z.number().min(0),
  notes: z.string().optional()
})

// Stock adjustment validations
export const stockAdjustmentSchema = z.object({
  productId: z.string().min(1, 'Product is required'),
  reason: z.enum(['COUNT', 'DAMAGE', 'EXPIRE', 'LOST', 'FOUND', 'CORRECTION', 'OTHER']),
  beforeQty: z.number().min(0),
  afterQty: z.number().min(0),
  notes: z.string().optional()
})

// Settings validations
export const settingsSchema = z.object({
  storeName: z.string().min(1, 'Store name is required'),
  storeAddress: z.string().optional(),
  storePhone: z.string().optional(),
  storeEmail: z.string().email('Invalid email').optional().or(z.literal('')),
  taxRate: z.number().min(0).max(100).default(5),
  currency: z.string().default('MMK'),
  dateFormat: z.string().default('YYYY-MM-DD'),
  timeFormat: z.string().default('24h')
})

export type LoginInput = z.infer<typeof loginSchema>
export type UserInput = z.infer<typeof userSchema>
export type ProductInput = z.infer<typeof productSchema>
export type CategoryInput = z.infer<typeof categorySchema>
export type CustomerInput = z.infer<typeof customerSchema>
export type SupplierInput = z.infer<typeof supplierSchema>
export type SaleInput = z.infer<typeof saleSchema>
export type PurchaseInput = z.infer<typeof purchaseSchema>
export type StockAdjustmentInput = z.infer<typeof stockAdjustmentSchema>
export type SettingsInput = z.infer<typeof settingsSchema>

