'use server'

import { prisma } from '@/lib/prisma'
import { Decimal } from '@prisma/client/runtime/library'
import { revalidatePath } from 'next/cache'
import { getSession } from '@/lib/auth'

export interface GetSalesParams {
  query?: string
  page?: number
  status?: string
  paymentMethod?: string
  startDate?: string
  endDate?: string
}

export interface SalesResponse {
  sales: Array<{
    id: string
    saleNumber: string
    subtotal: number
    discount: number
    discountPercent: number
    tax: number
    total: number
    paymentMethod: string
    paymentStatus: string
    saleType: string
    cashReceived: number | null
    change: number | null
    status: string
    notes: string | null
    createdAt: string
    user: {
      id: string
      username: string
      fullName: string
    }
    customer: {
      id: string
      name: string
    } | null
    items: Array<{
      id: string
      quantity: number
      unitPrice: number
      discount: number
      tax: number
      total: number
      product: {
        id: string
        name: string
        barcode: string | null
      }
    }>
  }>
  total: number
  page: number
  totalPages: number
}

export async function getSales(params: GetSalesParams = {}): Promise<SalesResponse> {
  try {
    const { query, page = 1, status, paymentMethod, startDate, endDate } = params
    const pageSize = 20
    const skip = (page - 1) * pageSize

    const where: any = {}

    // Search by sale number or customer name
    if (query && query.trim().length > 0) {
      where.OR = [
        { saleNumber: { contains: query.trim() } },
        { customer: { name: { contains: query.trim() } } },
      ]
    }

    // Filter by status
    if (status && status !== 'all') {
      where.status = status
    }

    // Filter by payment method
    if (paymentMethod && paymentMethod !== 'all') {
      where.paymentMethod = paymentMethod
    }

    // Filter by date range
    if (startDate || endDate) {
      where.createdAt = {}
      if (startDate) {
        where.createdAt.gte = new Date(startDate)
      }
      if (endDate) {
        const end = new Date(endDate)
        end.setHours(23, 59, 59, 999)
        where.createdAt.lte = end
      }
    }

    // Get total count
    const total = await prisma.sale.count({ where })

    // Get sales with relations
    const sales = await prisma.sale.findMany({
      where,
      skip,
      take: pageSize,
      include: {
        user: {
          select: {
            id: true,
            username: true,
            fullName: true,
          },
        },
        customer: {
          select: {
            id: true,
            name: true,
          },
        },
        items: {
          include: {
            product: {
              select: {
                id: true,
                name: true,
                barcode: true,
              },
            },
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    })

    // Serialize Decimal to number
    const serializedSales = sales.map((sale) => ({
      id: sale.id,
      saleNumber: sale.saleNumber,
      subtotal: Number(sale.subtotal),
      discount: Number(sale.discount),
      discountPercent: Number(sale.discountPercent),
      tax: Number(sale.tax),
      total: Number(sale.total),
      paymentMethod: sale.paymentMethod,
      paymentStatus: (sale as any).paymentStatus || 'PAID', // Default to PAID for existing records
      saleType: (sale as any).saleType || 'SALE', // Default to SALE for existing records
      cashReceived: sale.cashReceived ? Number(sale.cashReceived) : null,
      change: sale.change ? Number(sale.change) : null,
      status: sale.status,
      notes: sale.notes,
      createdAt: sale.createdAt.toISOString(),
      user: sale.user,
      customer: sale.customer,
      items: sale.items.map((item) => ({
        id: item.id,
        quantity: Number(item.quantity),
        unitPrice: Number(item.unitPrice),
        discount: Number(item.discount),
        tax: Number(item.tax),
        total: Number(item.total),
        product: item.product,
      })),
    }))

    return {
      sales: serializedSales,
      total,
      page,
      totalPages: Math.ceil(total / pageSize),
    }
  } catch (error) {
    console.error('Error fetching sales:', error)
    return {
      sales: [],
      total: 0,
      page: 1,
      totalPages: 0,
    }
  }
}

export async function getSaleById(saleId: string) {
  try {
    const sale = await prisma.sale.findUnique({
      where: { id: saleId },
      include: {
        user: {
          select: {
            id: true,
            username: true,
            fullName: true,
          },
        },
        customer: {
          select: {
            id: true,
            name: true,
            phone: true,
            email: true,
          },
        },
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
      },
    })

    if (!sale) {
      return {
        success: false,
        error: 'Sale not found',
      }
    }

    return {
      success: true,
      data: {
        ...sale,
        subtotal: Number(sale.subtotal),
        discount: Number(sale.discount),
        discountPercent: Number(sale.discountPercent),
        tax: Number(sale.tax),
        total: Number(sale.total),
        paymentStatus: (sale as any).paymentStatus || 'PAID',
        saleType: (sale as any).saleType || 'SALE',
        cashReceived: sale.cashReceived ? Number(sale.cashReceived) : null,
        change: sale.change ? Number(sale.change) : null,
        items: sale.items.map((item) => ({
          ...item,
          quantity: Number(item.quantity),
          unitPrice: Number(item.unitPrice),
          discount: Number(item.discount),
          tax: Number(item.tax),
          total: Number(item.total),
        })),
      },
    }
  } catch (error: any) {
    console.error('Error fetching sale:', error)
    return {
      success: false,
      error: error.message || 'Failed to fetch sale',
    }
  }
}

export interface UpdateSaleMetadataData {
  customerId?: string | null
  paymentMethod?: string
  notes?: string | null
}

export async function updateSaleMetadata(saleId: string, data: UpdateSaleMetadataData) {
  try {
    const session = await getSession()
    if (!session) {
      return {
        success: false,
        error: 'Unauthorized. Please log in again.',
      }
    }

    // Check if sale exists and is not void
    const sale = await prisma.sale.findUnique({
      where: { id: saleId },
    })

    if (!sale) {
      return {
        success: false,
        error: 'Sale not found',
      }
    }

    if (sale.status === 'VOID') {
      return {
        success: false,
        error: 'Cannot update a voided sale',
      }
    }

    // Update only allowed fields
    const updateData: any = {}
    if (data.customerId !== undefined) {
      updateData.customerId = data.customerId || null
    }
    if (data.paymentMethod !== undefined) {
      updateData.paymentMethod = data.paymentMethod
    }
    if (data.notes !== undefined) {
      updateData.notes = data.notes || null
    }

    await prisma.sale.update({
      where: { id: saleId },
      data: updateData,
    })

    revalidatePath('/sales')
    revalidatePath('/dashboard')

    return {
      success: true,
    }
  } catch (error: any) {
    console.error('Error updating sale metadata:', error)
    return {
      success: false,
      error: error.message || 'Failed to update sale',
    }
  }
}

export async function voidSale(saleId: string) {
  try {
    const session = await getSession()
    if (!session) {
      return {
        success: false,
        error: 'Unauthorized. Please log in again.',
      }
    }

    // Fetch sale with items
    const sale = await prisma.sale.findUnique({
      where: { id: saleId },
      include: {
        items: {
          include: {
            product: true,
          },
        },
      },
    })

    if (!sale) {
      return {
        success: false,
        error: 'Sale not found',
      }
    }

    if (sale.status === 'VOID') {
      return {
        success: false,
        error: 'Sale is already voided',
      }
    }

    // Use transaction to ensure atomicity
    await prisma.$transaction(async (tx) => {
      // Update sale status to VOID
      await tx.sale.update({
        where: { id: saleId },
        data: {
          status: 'VOID',
        },
      })

      // Reverse customer stats if customer exists (exclude Walk-in Customer)
      if (sale.customerId) {
        // Check if this is not the Walk-in Customer
        const customer = await tx.customer.findUnique({
          where: { id: sale.customerId },
          select: { name: true },
        })

        // Only reverse stats if it's not Walk-in Customer
        if (customer && customer.name !== 'Walk-in Customer' && customer.name !== 'Walk-in') {
          await tx.customer.update({
            where: { id: sale.customerId },
            data: {
              totalSpent: {
                decrement: sale.total,
              },
              visitCount: {
                decrement: 1,
              },
            },
          })
        }
      }

      // Reverse stock for each item
      for (const item of sale.items) {
        await tx.product.update({
          where: { id: item.productId },
          data: {
            stock: {
              increment: item.quantity,
            },
          },
        })

        // Create stock movement record
        await tx.stockMovement.create({
          data: {
            productId: item.productId,
            userId: session.userId,
            movementType: 'RETURN_IN',
            quantity: item.quantity,
            referenceId: saleId,
            referenceType: 'Sale',
            notes: `Stock reversed from voided sale ${sale.saleNumber}`,
          },
        })
      }
    })

    revalidatePath('/sales')
    revalidatePath('/dashboard')
    revalidatePath('/products')
    revalidatePath('/customers')

    return {
      success: true,
    }
  } catch (error: any) {
    console.error('Error voiding sale:', error)
    return {
      success: false,
      error: error.message || 'Failed to void sale',
    }
  }
}

export interface ProcessRefundData {
  saleId: string
  itemIds: string[]
  reason: string
  notes?: string
}

export async function processRefund(data: ProcessRefundData) {
  try {
    const session = await getSession()
    if (!session) {
      return {
        success: false,
        error: 'Unauthorized. Please log in again.',
      }
    }

    // Fetch sale with items
    const sale = await prisma.sale.findUnique({
      where: { id: data.saleId },
      include: {
        items: {
          include: {
            product: true,
          },
        },
        customer: true,
      },
    })

    if (!sale) {
      return {
        success: false,
        error: 'Sale not found',
      }
    }

    if (sale.status === 'VOID') {
      return {
        success: false,
        error: 'Cannot refund a voided sale',
      }
    }

    // Filter items to refund
    const itemsToRefund = sale.items.filter((item) => data.itemIds.includes(item.id))

    if (itemsToRefund.length === 0) {
      return {
        success: false,
        error: 'No items selected for refund',
      }
    }

    // Calculate refund total
    const refundTotal = itemsToRefund.reduce((sum, item) => sum + Number(item.total), 0)

    // Generate return number
    const returnNumber = `RET-${Date.now()}`

    // Use transaction
    await prisma.$transaction(async (tx) => {
      // Create sales return
      const salesReturn = await tx.salesReturn.create({
        data: {
          saleId: data.saleId,
          customerId: sale.customerId || null,
          returnNumber,
          total: new Decimal(refundTotal),
          refundMethod: 'CASH',
          reason: data.reason,
          notes: data.notes || null,
        },
      })

      // Create return items and restock products
      for (const item of itemsToRefund) {
        await tx.salesReturnItem.create({
          data: {
            salesReturnId: salesReturn.id,
            productId: item.productId,
            quantity: item.quantity,
            unitPrice: item.unitPrice,
            total: item.total,
            reason: data.reason,
          },
        })

        // Restock product
        await tx.product.update({
          where: { id: item.productId },
          data: {
            stock: {
              increment: item.quantity,
            },
          },
        })

        // Create stock movement
        await tx.stockMovement.create({
          data: {
            productId: item.productId,
            userId: session.userId,
            movementType: 'RETURN_IN',
            quantity: item.quantity,
            referenceId: salesReturn.id,
            referenceType: 'SalesReturn',
            notes: `Stock returned from refund ${returnNumber}`,
          },
        })
      }

      // Update sale status if all items are refunded
      const remainingItems = sale.items.filter((item) => !data.itemIds.includes(item.id))
      if (remainingItems.length === 0) {
        await tx.sale.update({
          where: { id: data.saleId },
          data: {
            status: 'RETURNED',
          },
        })
      }

      // Decrement customer totalSpent for refund (but not visitCount for partial refunds)
      if (sale.customerId) {
        // Check if this is not the Walk-in Customer
        const customer = await tx.customer.findUnique({
          where: { id: sale.customerId },
          select: { name: true },
        })

        // Only update stats if it's not Walk-in Customer
        if (customer && customer.name !== 'Walk-in Customer' && customer.name !== 'Walk-in') {
          await tx.customer.update({
            where: { id: sale.customerId },
            data: {
              totalSpent: {
                decrement: new Decimal(refundTotal),
              },
              // Note: visitCount is NOT decremented for partial refunds
            },
          })
        }
      }
    })

    revalidatePath('/sales')
    revalidatePath('/dashboard')
    revalidatePath('/products')
    revalidatePath('/customers')

    return {
      success: true,
      data: {
        returnNumber,
        refundTotal,
      },
    }
  } catch (error: any) {
    console.error('Error processing refund:', error)
    return {
      success: false,
      error: error.message || 'Failed to process refund',
    }
  }
}

