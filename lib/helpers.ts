import { Decimal } from '@prisma/client/runtime/library'

// Format currency
export function formatCurrency(amount: number | Decimal | string, currency: string = 'MMK'): string {
  const numAmount = typeof amount === 'string' ? parseFloat(amount) : Number(amount)
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: currency === 'MMK' ? 'USD' : currency, // Fallback since MMK might not be available
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(numAmount).replace('$', `${currency} `)
}

// Format number
export function formatNumber(num: number | Decimal | string, decimals: number = 2): string {
  const numValue = typeof num === 'string' ? parseFloat(num) : Number(num)
  return numValue.toFixed(decimals)
}

// Generate sale number
export function generateSaleNumber(prefix: string = 'SALE'): string {
  const timestamp = Date.now()
  const random = Math.floor(Math.random() * 1000).toString().padStart(3, '0')
  return `${prefix}-${timestamp}-${random}`
}

// Generate PO number
export function generatePONumber(prefix: string = 'PO'): string {
  const timestamp = Date.now()
  const random = Math.floor(Math.random() * 1000).toString().padStart(3, '0')
  return `${prefix}-${timestamp}-${random}`
}

// Generate return number
export function generateReturnNumber(prefix: string = 'RET'): string {
  const timestamp = Date.now()
  const random = Math.floor(Math.random() * 1000).toString().padStart(3, '0')
  return `${prefix}-${timestamp}-${random}`
}

// Generate shift number
export function generateShiftNumber(prefix: string = 'SHIFT'): string {
  const date = new Date()
  const dateStr = date.toISOString().split('T')[0].replace(/-/g, '')
  const random = Math.floor(Math.random() * 100).toString().padStart(2, '0')
  return `${prefix}-${dateStr}-${random}`
}

// Calculate discount
export function calculateDiscount(subtotal: number, discountPercent: number): number {
  return (subtotal * discountPercent) / 100
}

// Calculate tax
export function calculateTax(subtotal: number, taxRate: number = 5): number {
  return (subtotal * taxRate) / 100
}

// Calculate total
export function calculateTotal(subtotal: number, discount: number, tax: number): number {
  return subtotal - discount + tax
}

// Format date
export function formatDate(date: Date | string, format: string = 'YYYY-MM-DD'): string {
  const d = typeof date === 'string' ? new Date(date) : date
  const year = d.getFullYear()
  const month = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  const hours = String(d.getHours()).padStart(2, '0')
  const minutes = String(d.getMinutes()).padStart(2, '0')
  const seconds = String(d.getSeconds()).padStart(2, '0')

  return format
    .replace('YYYY', String(year))
    .replace('MM', month)
    .replace('DD', day)
    .replace('HH', hours)
    .replace('mm', minutes)
    .replace('ss', seconds)
}

// Format time
export function formatTime(date: Date | string, format: '12h' | '24h' = '24h'): string {
  const d = typeof date === 'string' ? new Date(date) : date
  const hours = d.getHours()
  const minutes = String(d.getMinutes()).padStart(2, '0')
  const seconds = String(d.getSeconds()).padStart(2, '0')

  if (format === '12h') {
    const period = hours >= 12 ? 'PM' : 'AM'
    const displayHours = hours % 12 || 12
    return `${displayHours}:${minutes}:${seconds} ${period}`
  }

  return `${String(hours).padStart(2, '0')}:${minutes}:${seconds}`
}

// Get start of day
export function getStartOfDay(date: Date = new Date()): Date {
  const d = new Date(date)
  d.setHours(0, 0, 0, 0)
  return d
}

// Get end of day
export function getEndOfDay(date: Date = new Date()): Date {
  const d = new Date(date)
  d.setHours(23, 59, 59, 999)
  return d
}

// Check if date is today
export function isToday(date: Date | string): boolean {
  const d = typeof date === 'string' ? new Date(date) : date
  const today = new Date()
  return (
    d.getDate() === today.getDate() &&
    d.getMonth() === today.getMonth() &&
    d.getFullYear() === today.getFullYear()
  )
}

// Check if date is expired
export function isExpired(date: Date | string): boolean {
  const d = typeof date === 'string' ? new Date(date) : date
  return d < new Date()
}

// Days until expiry
export function daysUntilExpiry(date: Date | string): number {
  const d = typeof date === 'string' ? new Date(date) : date
  const today = new Date()
  const diff = d.getTime() - today.getTime()
  return Math.ceil(diff / (1000 * 60 * 60 * 24))
}

// Truncate text
export function truncate(text: string, length: number): string {
  if (text.length <= length) return text
  return text.slice(0, length) + '...'
}

// Validate barcode
export function isValidBarcode(barcode: string): boolean {
  // Basic validation - can be enhanced
  return /^[0-9A-Za-z]+$/.test(barcode) && barcode.length >= 8 && barcode.length <= 20
}

// Generate barcode
export function generateBarcode(prefix: string = 'PRD'): string {
  const timestamp = Date.now().toString().slice(-10)
  const random = Math.floor(Math.random() * 10000).toString().padStart(4, '0')
  return `${prefix}${timestamp}${random}`
}

