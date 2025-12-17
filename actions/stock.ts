'use server'

import { prisma } from '@/lib/prisma'
import { getSession } from '@/lib/auth'
import { Decimal } from '@prisma/client/runtime/library'
import { revalidatePath } from 'next/cache'

export interface StockOverview {
  totalItems: number
  totalInventoryValue: number
  lowStockItemCount: number
}

export interface StockProduct {
  id: string
  name: string
  image: string | null
  category: {
    id: string
    name: string
  }
  purchasePrice: number
  stock: number
  minStockLevel: number
  unit: string
  totalValue: number
}

export interface StockHistoryEntry {
  id: string
  type: 'PURCHASE' | 'SALE' | 'ADJUSTMENT' | 'RETURN'
  quantity: number
  date: string
  description: string
  reference?: string
  user?: string
  reason?: string
}

/**
 * Get stock overview statistics
 */
export async function getStockOverview(): Promise<StockOverview> {
  try {
    const products = await prisma.product.findMany({
      where: {
        isActive: true,
      },
      select: {
        purchasePrice: true,
        stock: true,
        minStockLevel: true,
      },
    })

    let totalInventoryValue = 0
    let lowStockItemCount = 0

    for (const product of products) {
      const costPrice = Number(product.purchasePrice)
      const stock = Number(product.stock)
      const minStock = Number(product.minStockLevel)

      totalInventoryValue += costPrice * stock

      if (stock <= minStock) {
        lowStockItemCount++
      }
    }

    return {
      totalItems: products.length,
      totalInventoryValue,
      lowStockItemCount,
    }
  } catch (error) {
    console.error('Error fetching stock overview:', error)
    return {
      totalItems: 0,
      totalInventoryValue: 0,
      lowStockItemCount: 0,
    }
  }
}

/**
 * Get products with stock information
 */
export async function getStockProducts(params: {
  query?: string
  categoryId?: string
  lowStockOnly?: boolean
}): Promise<StockProduct[]> {
  try {
    const { query, categoryId, lowStockOnly } = params

    const where: any = {
      isActive: true,
    }

    // Search by name, barcode, or SKU
    if (query && query.trim().length > 0) {
      where.OR = [
        { name: { contains: query.trim() } },
        { barcode: { contains: query.trim() } },
        { sku: { contains: query.trim() } },
      ]
    }

    // Filter by category
    if (categoryId && categoryId !== 'all') {
      where.categoryId = categoryId
    }

    // Filter low stock items
    if (lowStockOnly) {
      // We'll filter this after fetching since Prisma doesn't support field comparison directly
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
    })

    // Calculate total value and filter low stock if needed
    const stockProducts: StockProduct[] = products
      .map((product) => {
        const purchasePrice = Number(product.purchasePrice)
        const stock = Number(product.stock)
        const minStockLevel = Number(product.minStockLevel)

        return {
          id: product.id,
          name: product.name,
          image: product.image,
          category: product.category,
          purchasePrice,
          stock,
          minStockLevel,
          unit: product.unit,
          totalValue: purchasePrice * stock,
        }
      })
      .filter((product) => {
        if (lowStockOnly) {
          return product.stock <= product.minStockLevel
        }
        return true
      })

    return stockProducts
  } catch (error) {
    console.error('Error fetching stock products:', error)
    return []
  }
}

/**
 * Adjust stock for a product
 */
export async function adjustStock(
  productId: string,
  type: 'ADD' | 'REMOVE',
  quantity: number,
  reason: string,
  notes?: string
) {
  try {
    const session = await getSession()
    if (!session) {
      return {
        success: false,
        error: 'Unauthorized. Please log in again.',
      }
    }

    if (quantity <= 0) {
      return {
        success: false,
        error: 'Quantity must be greater than 0',
      }
    }

    // Use transaction
    const result = await prisma.$transaction(async (tx) => {
      // Fetch current product
      const product = await tx.product.findUnique({
        where: { id: productId },
      })

      if (!product) {
        throw new Error('Product not found')
      }

      const beforeQty = Number(product.stock)
      let afterQty: number

      if (type === 'ADD') {
        afterQty = beforeQty + quantity
      } else {
        // REMOVE
        if (beforeQty < quantity) {
          throw new Error(`Insufficient stock. Current: ${beforeQty}, Requested: ${quantity}`)
        }
        afterQty = beforeQty - quantity
      }

      const difference = afterQty - beforeQty

      // Update product stock
      await tx.product.update({
        where: { id: productId },
        data: {
          stock: new Decimal(afterQty),
        },
      })

      // Create stock adjustment record
      await tx.stockAdjustment.create({
        data: {
          productId,
          userId: session.userId,
          reason,
          beforeQty: new Decimal(beforeQty),
          afterQty: new Decimal(afterQty),
          difference: new Decimal(difference),
          notes: notes || null,
        },
      })

      // Create stock movement record
      await tx.stockMovement.create({
        data: {
          productId,
          userId: session.userId,
          movementType: reason === 'DAMAGE' ? 'DAMAGE' : reason === 'EXPIRED' ? 'EXPIRED' : reason === 'LOST' ? 'LOST' : 'ADJUSTMENT',
          quantity: new Decimal(difference),
          referenceType: 'StockAdjustment',
          notes: notes || `Stock ${type === 'ADD' ? 'added' : 'removed'}: ${reason}`,
        },
      })

      return {
        success: true,
        beforeQty,
        afterQty,
      }
    })

    revalidatePath('/stock')
    revalidatePath('/dashboard')
    revalidatePath('/products')
    revalidatePath('/pos')

    return result
  } catch (error: any) {
    console.error('Error adjusting stock:', error)
    return {
      success: false,
      error: error.message || 'Failed to adjust stock',
    }
  }
}

/**
 * Get unified stock history for a product
 */
export async function getStockHistory(productId: string): Promise<StockHistoryEntry[]> {
  try {
    const history: StockHistoryEntry[] = []

    // Fetch purchases
    const purchaseItems = await prisma.purchaseItem.findMany({
      where: {
        productId,
        purchase: {
          status: {
            not: 'CANCELLED',
          },
        },
      },
      include: {
        purchase: {
          select: {
            poNumber: true,
            createdAt: true,
          },
        },
        product: {
          select: {
            unit: true,
          },
        },
      },
      orderBy: {
        purchase: {
          createdAt: 'desc',
        },
      },
      take: 50,
    })

    for (const item of purchaseItems) {
      history.push({
        id: item.id,
        type: 'PURCHASE',
        quantity: Number(item.quantity),
        date: item.purchase.createdAt.toISOString(),
        description: `Purchased ${Number(item.quantity)} ${item.product.unit || 'units'}`,
        reference: item.purchase.poNumber,
      })
    }

    // Fetch sales
    const saleItems = await prisma.saleItem.findMany({
      where: {
        productId,
        sale: {
          status: {
            not: 'VOID',
          },
        },
      },
      include: {
        sale: {
          select: {
            saleNumber: true,
            createdAt: true,
          },
        },
        product: {
          select: {
            unit: true,
          },
        },
      },
      orderBy: {
        sale: {
          createdAt: 'desc',
        },
      },
      take: 50,
    })

    for (const item of saleItems) {
      history.push({
        id: item.id,
        type: 'SALE',
        quantity: -Number(item.quantity), // Negative for sales
        date: item.sale.createdAt.toISOString(),
        description: `Sold ${Number(item.quantity)} ${item.product.unit || 'units'}`,
        reference: item.sale.saleNumber,
      })
    }

    // Fetch stock adjustments
    const adjustments = await prisma.stockAdjustment.findMany({
      where: {
        productId,
      },
      include: {
        user: {
          select: {
            fullName: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
      take: 50,
    })

    for (const adjustment of adjustments) {
      const reasonMap: Record<string, string> = {
        DAMAGE: 'Damaged',
        EXPIRE: 'Expired',
        LOST: 'Lost',
        FOUND: 'Found',
        COUNT: 'Audit Correction',
        CORRECTION: 'Correction',
        OTHER: 'Other',
      }

      history.push({
        id: adjustment.id,
        type: 'ADJUSTMENT',
        quantity: Number(adjustment.difference),
        date: adjustment.createdAt.toISOString(),
        description: `${reasonMap[adjustment.reason] || adjustment.reason}: ${Number(adjustment.difference) > 0 ? '+' : ''}${Number(adjustment.difference)}`,
        reason: adjustment.reason,
        user: adjustment.user.fullName,
      })
    }

    // Fetch sales returns
    const salesReturns = await prisma.salesReturnItem.findMany({
      where: {
        productId,
      },
      include: {
        salesReturn: {
          select: {
            returnNumber: true,
            createdAt: true,
          },
        },
        product: {
          select: {
            unit: true,
          },
        },
      },
      orderBy: {
        salesReturn: {
          createdAt: 'desc',
        },
      },
      take: 50,
    })

    for (const item of salesReturns) {
      history.push({
        id: item.id,
        type: 'RETURN',
        quantity: Number(item.quantity),
        date: item.salesReturn.createdAt.toISOString(),
        description: `Returned ${Number(item.quantity)} ${item.product.unit || 'units'}`,
        reference: item.salesReturn.returnNumber,
      })
    }

    // Sort by date (latest first)
    history.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())

    return history.slice(0, 100) // Limit to 100 most recent
  } catch (error) {
    console.error('Error fetching stock history:', error)
    return []
  }
}

