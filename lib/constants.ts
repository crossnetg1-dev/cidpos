// Application constants

export const APP_NAME = 'POS System - Mini Mart'

// User roles
export const USER_ROLES = {
  OWNER: 'OWNER',
  CASHIER: 'CASHIER',
  MANAGER: 'MANAGER'
} as const

// Payment methods
export const PAYMENT_METHODS = {
  CASH: 'CASH',
  KBZPAY: 'KBZPAY',
  WAVEPAY: 'WAVEPAY',
  AYAPAY: 'AYAPAY',
  CREDIT: 'CREDIT',
  SPLIT: 'SPLIT'
} as const

// Sale statuses
export const SALE_STATUSES = {
  COMPLETED: 'COMPLETED',
  HOLD: 'HOLD',
  VOID: 'VOID',
  RETURNED: 'RETURNED'
} as const

// Purchase statuses
export const PURCHASE_STATUSES = {
  PENDING: 'PENDING',
  RECEIVED: 'RECEIVED',
  PARTIAL: 'PARTIAL',
  CANCELLED: 'CANCELLED'
} as const

// Stock movement types
export const STOCK_MOVEMENT_TYPES = {
  SALE: 'SALE',
  PURCHASE: 'PURCHASE',
  RETURN_IN: 'RETURN_IN',
  RETURN_OUT: 'RETURN_OUT',
  ADJUSTMENT: 'ADJUSTMENT',
  DAMAGE: 'DAMAGE',
  EXPIRED: 'EXPIRED',
  LOST: 'LOST',
  FOUND: 'FOUND',
  TRANSFER_IN: 'TRANSFER_IN',
  TRANSFER_OUT: 'TRANSFER_OUT'
} as const

// Adjustment reasons
export const ADJUSTMENT_REASONS = {
  COUNT: 'COUNT',
  DAMAGE: 'DAMAGE',
  EXPIRE: 'EXPIRE',
  LOST: 'LOST',
  FOUND: 'FOUND',
  CORRECTION: 'CORRECTION',
  OTHER: 'OTHER'
} as const

// Return reasons
export const RETURN_REASONS = {
  DEFECTIVE: 'DEFECTIVE',
  WRONG_ITEM: 'WRONG_ITEM',
  CUSTOMER_REQUEST: 'CUSTOMER_REQUEST',
  EXPIRED: 'EXPIRED',
  OTHER: 'OTHER'
} as const

// Notification types
export const NOTIFICATION_TYPES = {
  LOW_STOCK: 'LOW_STOCK',
  EXPIRY_WARNING: 'EXPIRY_WARNING',
  PAYMENT_DUE: 'PAYMENT_DUE',
  DAILY_SUMMARY: 'DAILY_SUMMARY',
  SYSTEM_ALERT: 'SYSTEM_ALERT'
} as const

// Default values
export const DEFAULT_TAX_RATE = 5 // 5%
export const DEFAULT_CURRENCY = 'MMK'
export const DEFAULT_DATE_FORMAT = 'YYYY-MM-DD'
export const DEFAULT_TIME_FORMAT = '24h'

// Session timeout (30 minutes)
export const SESSION_TIMEOUT = 30 * 60 * 1000

// Pagination
export const DEFAULT_PAGE_SIZE = 20
export const MAX_PAGE_SIZE = 100

// Receipt settings
export const RECEIPT_PAPER_SIZES = {
  SMALL: '58mm',
  LARGE: '80mm'
} as const

// Barcode settings
export const BARCODE_FORMATS = {
  CODE128: 'CODE128',
  EAN13: 'EAN13',
  EAN8: 'EAN8',
  UPC: 'UPC'
} as const

