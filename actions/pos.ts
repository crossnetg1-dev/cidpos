'use server'

import { prisma } from '@/lib/prisma'
import { getSession } from '@/lib/auth'
import { Decimal } from '@prisma/client/runtime/library'
import { revalidatePath } from 'next/cache'

export interface PosProduct {
  id: string
  name: string
  barcode: string | null
  sku: string | null
  sellingPrice: number
  stock: number
  image: string | null
  category: {
    id: string
    name: string
  }
  unit: string
}

export interface ProcessSaleData {
  items: Array<{
    productId: string
    quantity: number
    unitPrice: number
    discount: number
    tax: number
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
  notes?: string
}

export async function getPosProducts(query?: string, categoryId?: string): Promise<PosProduct[]> {
  try {
    const where: any = {
      isActive: true,
      // REMOVED stock filter - show ALL active products, even with 0 or negative stock
    }

    if (query && query.trim().length > 0) {
      const searchTerm = query.trim()
      // SQLite doesn't support mode: 'insensitive', but Prisma will handle case-insensitive search
      // For SQLite, we use contains which works case-insensitively by default in Prisma
      where.OR = [
        { name: { contains: searchTerm } },
        { barcode: { contains: searchTerm } },
        { sku: { contains: searchTerm } },
      ]
    }

    if (categoryId) {
      where.categoryId = categoryId
    }

    const products = await prisma.product.findMany({
      where,
      include: {
        category: {
          select: {
            id: true,
            name: true,
          },
        },
      },
      orderBy: {
        name: 'asc',
      },
      take: 100, // Limit to 100 products for performance
    })

    // Convert Decimal to number for serialization
    return products.map((product) => ({
      id: product.id,
      name: product.name,
      barcode: product.barcode,
      sku: product.sku,
      sellingPrice: Number(product.sellingPrice),
      stock: Number(product.stock),
      image: product.image,
      category: product.category,
      unit: product.unit,
    }))
  } catch (error) {
    console.error('Error fetching POS products:', error)
    throw new Error('Failed to fetch products')
  }
}

export async function processSale(data: ProcessSaleData) {
  const session = await getSession()
  
  if (!session) {
    throw new Error('Unauthorized')
  }

  try {
    // Use transaction to ensure data consistency
    const result = await prisma.$transaction(async (tx) => {
      // Get the next sequential invoice number
      // Find the highest invoiceNo in the database, or start from 1 if none exists
      const lastSale = await tx.sale.findFirst({
        orderBy: {
          invoiceNo: 'desc',
        },
        select: {
          invoiceNo: true,
        },
      })

      const nextInvoiceNo = lastSale?.invoiceNo ? lastSale.invoiceNo + 1 : 1

      // Generate short invoice number (INV-XXXXXX format) for display
      const generateInvoiceId = () => {
        return 'INV-' + Math.random().toString(36).substring(2, 8).toUpperCase()
      }
      const saleNumber = generateInvoiceId()

      // Determine payment status based on payment method
      const paymentStatus = data.paymentMethod === 'CREDIT' ? 'UNPAID' : 'PAID'

      // Create sale
      const sale = await tx.sale.create({
        data: {
          invoiceNo: nextInvoiceNo,
          saleNumber,
          userId: session.userId,
          customerId: data.customerId || null,
          subtotal: new Decimal(data.subtotal),
          discount: new Decimal(data.discount),
          discountPercent: new Decimal(data.discountPercent),
          tax: new Decimal(data.tax),
          total: new Decimal(data.total),
          paymentMethod: data.paymentMethod,
          paymentStatus: paymentStatus,
          saleType: 'SALE',
          cashReceived: data.cashReceived ? new Decimal(data.cashReceived) : null,
          change: data.change ? new Decimal(data.change) : null,
          status: 'COMPLETED',
          notes: data.notes || null,
        },
      })

      // Create sale items and update stock
      const saleItems = []
      const stockMovements = []

      for (const item of data.items) {
        // Fetch current product with latest stock (real-time check)
        const product = await tx.product.findUnique({
          where: { id: item.productId },
        })

        if (!product) {
          throw new Error(`Product ${item.productId} not found`)
        }

        // Get current stock as number for validation
        const currentStock = Number(product.stock)
        const requestedQuantity = item.quantity

        // Validate stock availability BEFORE decrementing
        if (currentStock < requestedQuantity) {
          throw new Error(`Insufficient stock for ${product.name}. Available: ${currentStock}, Requested: ${requestedQuantity}`)
        }

        // Calculate item total
        const itemSubtotal = item.quantity * item.unitPrice
        const itemTotal = itemSubtotal - item.discount + item.tax

        // Create sale item
        const saleItem = await tx.saleItem.create({
          data: {
            saleId: sale.id,
            productId: item.productId,
            quantity: new Decimal(item.quantity),
            unitPrice: new Decimal(item.unitPrice),
            discount: new Decimal(item.discount),
            tax: new Decimal(item.tax),
            total: new Decimal(itemTotal),
          },
        })
        saleItems.push(saleItem)

        // Decrement stock - calculate new stock value
        const newStock = currentStock - requestedQuantity
        await tx.product.update({
          where: { id: item.productId },
          data: {
            stock: new Decimal(newStock),
          },
        })

        // Create stock movement
        const stockMovement = await tx.stockMovement.create({
          data: {
            productId: item.productId,
            userId: session.userId,
            movementType: 'SALE',
            quantity: new Decimal(-item.quantity), // Negative for OUT
            referenceId: sale.id,
            referenceType: 'Sale',
            notes: `Sale ${saleNumber}`,
          },
        })
        stockMovements.push(stockMovement)
      }

      // Update customer stats if customer exists (exclude Walk-in Customer)
      if (data.customerId) {
        // Check if this is not the Walk-in Customer
        const customer = await tx.customer.findUnique({
          where: { id: data.customerId },
          select: { name: true },
        })

        // Only update stats if it's not Walk-in Customer
        if (customer && customer.name !== 'Walk-in Customer' && customer.name !== 'Walk-in') {
          // Prepare update data
          const updateData: any = {
            totalSpent: {
              increment: new Decimal(data.total),
            },
            visitCount: {
              increment: 1,
            },
          }

          // If payment method is CREDIT, increment creditBalance (debt)
          if (data.paymentMethod === 'CREDIT') {
            updateData.creditBalance = {
              increment: new Decimal(data.total),
            }
          }

          await tx.customer.update({
            where: { id: data.customerId },
            data: updateData,
          })
        }
      }

      // Handle split payments if needed
      if (data.paymentMethod === 'SPLIT' && data.cashReceived) {
        // For split payments, we'd need additional payment records
        // For now, we'll just record the cash portion
        // TODO: Implement full split payment logic
      }

      // Fetch the complete sale with items and product details for receipt
      const completeSale = await tx.sale.findUnique({
        where: { id: sale.id },
        include: {
          items: {
            include: {
              product: {
                select: {
                  id: true,
                  name: true,
                  barcode: true,
                  sku: true,
                },
              },
            },
          },
          customer: {
            select: {
              id: true,
              name: true,
            },
          },
          user: {
            select: {
              id: true,
              fullName: true,
              username: true,
            },
          },
        },
      })

      if (!completeSale) {
        throw new Error('Failed to retrieve sale details')
      }

      // Transform the sale data for the frontend
      return {
        success: true,
        data: {
          id: completeSale.id,
          saleNumber: completeSale.saleNumber,
          subtotal: Number(completeSale.subtotal),
          discount: Number(completeSale.discount),
          discountPercent: Number(completeSale.discountPercent),
          tax: Number(completeSale.tax),
          total: Number(completeSale.total),
          paymentMethod: completeSale.paymentMethod,
          cashReceived: completeSale.cashReceived ? Number(completeSale.cashReceived) : undefined,
          change: completeSale.change ? Number(completeSale.change) : undefined,
          customerId: completeSale.customerId || undefined,
          customerName: completeSale.customer?.name || undefined,
          cashierName: completeSale.user?.fullName || completeSale.user?.username || undefined,
          createdAt: completeSale.createdAt.toISOString(),
          items: completeSale.items.map((item) => ({
            productId: item.productId,
            productName: item.product.name,
            barcode: item.product.barcode || undefined,
            sku: item.product.sku || undefined,
            quantity: Number(item.quantity),
            unitPrice: Number(item.unitPrice),
            discount: Number(item.discount),
            tax: Number(item.tax),
            total: Number(item.total),
          })),
        },
      }
    })

    // Revalidate paths to update UI immediately with new stock levels
    revalidatePath('/')
    revalidatePath('/pos')
    revalidatePath('/dashboard')
    revalidatePath('/sales')
    revalidatePath('/customers')

    return result
  } catch (error: any) {
    console.error('Error processing sale:', error)
    throw new Error(error.message || 'Failed to process sale')
  }
}

export async function getCategories() {
  try {
    const categories = await prisma.category.findMany({
      where: {
        products: {
          some: {
            isActive: true,
            // REMOVED stock filter - show categories with all active products
          },
        },
      },
      orderBy: {
        name: 'asc',
      },
    })

    return categories
  } catch (error) {
    console.error('Error fetching categories:', error)
    return []
  }
}

