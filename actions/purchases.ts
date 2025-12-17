'use server'

import { prisma } from '@/lib/prisma'
import { getSession } from '@/lib/auth'
import { Decimal } from '@prisma/client/runtime/library'
import { revalidatePath } from 'next/cache'

export interface SupplierOption {
  id: string
  name: string
  phone: string | null
  companyName: string | null
}

export interface CreatePurchaseItem {
  productId: string
  quantity: number
  unitPrice: number
  expiryDate?: string | null
}

export interface CreatePurchaseData {
  supplierId: string // Required - must be an existing supplier
  purchaseDate: string
  referenceNo?: string
  status: 'RECEIVED' | 'PENDING'
  items: CreatePurchaseItem[]
  notes?: string
  paidAmount?: number
  paymentMethod?: string
}

/**
 * Get all active suppliers for selection
 */
export async function getSuppliers(): Promise<SupplierOption[]> {
  try {
    const suppliers = await prisma.supplier.findMany({
      where: {
        isActive: true,
      },
      select: {
        id: true,
        name: true,
        phone: true,
        companyName: true,
      },
      orderBy: {
        name: 'asc',
      },
    })

    return suppliers
  } catch (error) {
    console.error('Error fetching suppliers:', error)
    return []
  }
}

/**
 * Search products for purchase entry
 */
export async function searchProductsForPurchase(query?: string) {
  try {
    const where: any = {
      isActive: true,
    }

    if (query && query.trim().length > 0) {
      const searchTerm = query.trim()
      where.OR = [
        { name: { contains: searchTerm } },
        { barcode: { contains: searchTerm } },
        { sku: { contains: searchTerm } },
      ]
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
      take: 50,
    })

    return products.map((product) => ({
      id: product.id,
      name: product.name,
      barcode: product.barcode,
      sku: product.sku,
      purchasePrice: Number(product.purchasePrice),
      stock: Number(product.stock),
      unit: product.unit,
      category: product.category,
    }))
  } catch (error) {
    console.error('Error searching products:', error)
    return []
  }
}

/**
 * Create a new purchase with stock updates
 */
export async function createPurchase(data: CreatePurchaseData) {
  const session = await getSession()

  if (!session) {
    return {
      success: false,
      error: 'Unauthorized. Please log in again.',
    }
  }

  try {
    // Validate supplierId
    if (!data.supplierId) {
      return {
        success: false,
        error: 'Supplier is required',
      }
    }

    // Verify supplier exists
    const supplier = await prisma.supplier.findUnique({
      where: { id: data.supplierId },
    })

    if (!supplier) {
      return {
        success: false,
        error: 'Supplier not found',
      }
    }

    // Use transaction to ensure data consistency
    const result = await prisma.$transaction(async (tx) => {
      const supplierId = data.supplierId

      // Step 2: Generate PO Number
      const poNumber = data.referenceNo || `PO-${Date.now()}-${Math.floor(Math.random() * 1000).toString().padStart(3, '0')}`

      // Step 3: Calculate totals
      let subtotal = 0
      const purchaseItems = []

      for (const item of data.items) {
        const itemSubtotal = item.quantity * item.unitPrice
        subtotal += itemSubtotal
      }

      const discount = 0 // Can be added later
      const tax = 0 // Can be added later
      const total = subtotal - discount + tax

      // Step 4: Create Purchase record
      const purchase = await tx.purchase.create({
        data: {
          poNumber,
          supplierId,
          userId: session.userId,
          subtotal: new Decimal(subtotal),
          discount: new Decimal(discount),
          tax: new Decimal(tax),
          total: new Decimal(total),
          status: data.status,
          receivedAt: data.status === 'RECEIVED' ? new Date(data.purchaseDate) : null,
          notes: data.notes || null,
        },
      })

      // Step 5: Create Purchase Items and update stock
      for (const item of data.items) {
        const itemSubtotal = item.quantity * item.unitPrice
        const itemTotal = itemSubtotal // No discount/tax for now

        // Create Purchase Item
        await tx.purchaseItem.create({
          data: {
            purchaseId: purchase.id,
            productId: item.productId,
            quantity: new Decimal(item.quantity),
            unitPrice: new Decimal(item.unitPrice),
            discount: new Decimal(0),
            tax: new Decimal(0),
            total: new Decimal(itemTotal),
            receivedQty: data.status === 'RECEIVED' ? new Decimal(item.quantity) : new Decimal(0),
          },
        })

        // Update Product stock (increment)
        await tx.product.update({
          where: { id: item.productId },
          data: {
            stock: {
              increment: item.quantity,
            },
          },
        })

        // CRITICAL: Update cost price if different
        const product = await tx.product.findUnique({
          where: { id: item.productId },
          select: { purchasePrice: true },
        })

        if (product) {
          const currentCostPrice = Number(product.purchasePrice)
          const newCostPrice = item.unitPrice

          // If the new cost price is different, update the master Product costPrice
          if (currentCostPrice !== newCostPrice) {
            await tx.product.update({
              where: { id: item.productId },
              data: {
                purchasePrice: new Decimal(newCostPrice),
              },
            })

            // Create price history record
            await tx.priceHistory.create({
              data: {
                productId: item.productId,
                userId: session.userId,
                oldPrice: product.purchasePrice,
                newPrice: new Decimal(newCostPrice),
                priceType: 'COST',
                reason: 'Purchase Update',
              },
            })
          }

          // Update expiry date if provided
          if (item.expiryDate) {
            await tx.product.update({
              where: { id: item.productId },
              data: {
                expiryDate: new Date(item.expiryDate),
              },
            })
          }
        }

        // Create stock movement record
        await tx.stockMovement.create({
          data: {
            productId: item.productId,
            userId: session.userId,
            movementType: 'PURCHASE',
            quantity: new Decimal(item.quantity),
            referenceId: purchase.id,
            referenceType: 'Purchase',
            notes: `Purchase ${poNumber}`,
          },
        })
      }

      // Step 6: Create payment record if paid amount is provided
      if (data.paidAmount && data.paidAmount > 0) {
        await tx.purchasePayment.create({
          data: {
            purchaseId: purchase.id,
            supplierId: supplierId,
            userId: session.userId,
            amount: new Decimal(data.paidAmount),
            paymentMethod: data.paymentMethod || 'CASH',
            paymentDate: new Date(data.purchaseDate),
          },
        })

        // Update supplier credit balance
        const remainingAmount = total - data.paidAmount
        if (remainingAmount > 0) {
          await tx.supplier.update({
            where: { id: supplierId },
            data: {
              creditBalance: {
                increment: new Decimal(remainingAmount),
              },
            },
          })
        }
      } else if (data.status === 'RECEIVED') {
        // If received but not paid, add to supplier credit
        await tx.supplier.update({
          where: { id: supplierId },
          data: {
            creditBalance: {
              increment: new Decimal(total),
            },
          },
        })
      }

      return {
        success: true,
        data: {
          id: purchase.id,
          poNumber: purchase.poNumber,
        },
      }
    })

    // Revalidate paths
    revalidatePath('/purchases')
    revalidatePath('/dashboard')
    revalidatePath('/products')
    revalidatePath('/pos')

    return result
  } catch (error: any) {
    console.error('Error creating purchase:', error)
    return {
      success: false,
      error: error.message || 'Failed to create purchase',
    }
  }
}

export interface GetPurchasesParams {
  query?: string
  page?: number
  status?: string
  startDate?: string
  endDate?: string
}

export interface PurchasesResponse {
  purchases: Array<{
    id: string
    poNumber: string
    subtotal: number
    discount: number
    tax: number
    total: number
    status: string
    notes: string | null
    createdAt: string
    supplier: {
      id: string
      name: string
    }
    user: {
      id: string
      username: string
      fullName: string
    }
    purchasePayments: Array<{
      amount: number
    }>
  }>
  total: number
  page: number
  totalPages: number
}

/**
 * Get purchases with pagination and filters
 */
export async function getPurchases(params: GetPurchasesParams = {}): Promise<PurchasesResponse> {
  try {
    const { query, page = 1, status, startDate, endDate } = params
    const pageSize = 20
    const skip = (page - 1) * pageSize

    const where: any = {}

    // Search by PO number or supplier name
    if (query && query.trim().length > 0) {
      where.OR = [
        { poNumber: { contains: query.trim() } },
        { supplier: { name: { contains: query.trim() } } },
      ]
    }

    // Filter by status
    if (status && status !== 'all') {
      where.status = status
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
    const total = await prisma.purchase.count({ where })

    // Get purchases with relations
    const purchases = await prisma.purchase.findMany({
      where,
      skip,
      take: pageSize,
      include: {
        supplier: {
          select: {
            id: true,
            name: true,
          },
        },
        user: {
          select: {
            id: true,
            username: true,
            fullName: true,
          },
        },
        purchasePayments: {
          select: {
            amount: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    })

    // Serialize Decimal to number
    const serializedPurchases = purchases.map((purchase) => ({
      id: purchase.id,
      poNumber: purchase.poNumber,
      subtotal: Number(purchase.subtotal),
      discount: Number(purchase.discount),
      tax: Number(purchase.tax),
      total: Number(purchase.total),
      status: purchase.status,
      notes: purchase.notes,
      createdAt: purchase.createdAt.toISOString(),
      supplier: purchase.supplier,
      user: purchase.user,
      purchasePayments: purchase.purchasePayments.map((payment) => ({
        amount: Number(payment.amount),
      })),
    }))

    return {
      purchases: serializedPurchases,
      total,
      page,
      totalPages: Math.ceil(total / pageSize),
    }
  } catch (error) {
    console.error('Error fetching purchases:', error)
    return {
      purchases: [],
      total: 0,
      page: 1,
      totalPages: 0,
    }
  }
}

/**
 * Get purchase details by ID
 */
export async function getPurchaseById(purchaseId: string) {
  try {
    const purchase = await prisma.purchase.findUnique({
      where: { id: purchaseId },
      include: {
        supplier: {
          select: {
            id: true,
            name: true,
            phone: true,
            address: true,
          },
        },
        user: {
          select: {
            id: true,
            username: true,
            fullName: true,
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
                unit: true,
              },
            },
          },
        },
        purchasePayments: {
          select: {
            amount: true,
            paymentMethod: true,
            paymentDate: true,
          },
        },
      },
    })

    if (!purchase) {
      return {
        success: false,
        error: 'Purchase not found',
      }
    }

    // Calculate paid amount
    const paidAmount = purchase.purchasePayments.reduce(
      (sum, payment) => sum + Number(payment.amount),
      0
    )

    return {
      success: true,
      data: {
        ...purchase,
        subtotal: Number(purchase.subtotal),
        discount: Number(purchase.discount),
        tax: Number(purchase.tax),
        total: Number(purchase.total),
        paidAmount,
        items: purchase.items.map((item) => ({
          ...item,
          quantity: Number(item.quantity),
          unitPrice: Number(item.unitPrice),
          discount: Number(item.discount),
          tax: Number(item.tax),
          total: Number(item.total),
          receivedQty: Number(item.receivedQty),
        })),
        purchasePayments: purchase.purchasePayments.map((payment) => ({
          ...payment,
          amount: Number(payment.amount),
          paymentDate: payment.paymentDate.toISOString(),
        })),
      },
    }
  } catch (error: any) {
    console.error('Error fetching purchase:', error)
    return {
      success: false,
      error: error.message || 'Failed to fetch purchase',
    }
  }
}

/**
 * Void a purchase and reverse stock
 */
export async function voidPurchase(purchaseId: string) {
  try {
    const session = await getSession()
    if (!session) {
      return {
        success: false,
        error: 'Unauthorized. Please log in again.',
      }
    }

    // Fetch purchase with items
    const purchase = await prisma.purchase.findUnique({
      where: { id: purchaseId },
      include: {
        items: {
          include: {
            product: true,
          },
        },
      },
    })

    if (!purchase) {
      return {
        success: false,
        error: 'Purchase not found',
      }
    }

    if (purchase.status === 'CANCELLED') {
      return {
        success: false,
        error: 'Purchase is already voided',
      }
    }

    // Use transaction to ensure atomicity
    await prisma.$transaction(async (tx) => {
      // Update purchase status to CANCELLED
      await tx.purchase.update({
        where: { id: purchaseId },
        data: {
          status: 'CANCELLED',
        },
      })

      // Reverse stock for each item (decrement)
      for (const item of purchase.items) {
        await tx.product.update({
          where: { id: item.productId },
          data: {
            stock: {
              decrement: item.quantity,
            },
          },
        })

        // Create stock movement record
        await tx.stockMovement.create({
          data: {
            productId: item.productId,
            userId: session.userId,
            movementType: 'ADJUSTMENT',
            quantity: new Decimal(-Number(item.quantity)), // Negative for reversal
            referenceId: purchaseId,
            referenceType: 'Purchase',
            notes: `Stock reversed from voided purchase ${purchase.poNumber}`,
          },
        })
      }

      // Reverse supplier credit balance if applicable
      if (purchase.status === 'RECEIVED' || purchase.status === 'PENDING') {
        const totalAmount = Number(purchase.total)
        const payments = await tx.purchasePayment.findMany({
          where: { purchaseId },
        })
        const paidAmount = payments.reduce((sum, p) => sum + Number(p.amount), 0)
        const creditAmount = totalAmount - paidAmount

        if (creditAmount > 0) {
          await tx.supplier.update({
            where: { id: purchase.supplierId },
            data: {
              creditBalance: {
                decrement: new Decimal(creditAmount),
              },
            },
          })
        }
      }
    })

    revalidatePath('/purchases')
    revalidatePath('/dashboard')
    revalidatePath('/products')

    return {
      success: true,
    }
  } catch (error: any) {
    console.error('Error voiding purchase:', error)
    return {
      success: false,
      error: error.message || 'Failed to void purchase',
    }
  }
}

/**
 * Mark purchase as paid
 */
export async function markPurchaseAsPaid(purchaseId: string) {
  try {
    const session = await getSession()
    if (!session) {
      return {
        success: false,
        error: 'Unauthorized. Please log in again.',
      }
    }

    // Fetch purchase
    const purchase = await prisma.purchase.findUnique({
      where: { id: purchaseId },
      include: {
        purchasePayments: true,
      },
    })

    if (!purchase) {
      return {
        success: false,
        error: 'Purchase not found',
      }
    }

    if (purchase.status === 'CANCELLED') {
      return {
        success: false,
        error: 'Cannot mark a cancelled purchase as paid',
      }
    }

    const totalAmount = Number(purchase.total)
    const paidAmount = purchase.purchasePayments.reduce(
      (sum, payment) => sum + Number(payment.amount),
      0
    )
    const remainingAmount = totalAmount - paidAmount

    if (remainingAmount <= 0) {
      return {
        success: false,
        error: 'Purchase is already fully paid',
      }
    }

    // Use transaction
    await prisma.$transaction(async (tx) => {
      // Create payment record for remaining amount
      await tx.purchasePayment.create({
        data: {
          purchaseId: purchase.id,
          supplierId: purchase.supplierId,
          userId: session.userId,
          amount: new Decimal(remainingAmount),
          paymentMethod: 'CASH',
          paymentDate: new Date(),
        },
      })

      // Update purchase status to RECEIVED
      await tx.purchase.update({
        where: { id: purchaseId },
        data: {
          status: 'RECEIVED',
          receivedAt: new Date(),
        },
      })

      // Update supplier credit balance (reduce by remaining amount)
      await tx.supplier.update({
        where: { id: purchase.supplierId },
        data: {
          creditBalance: {
            decrement: new Decimal(remainingAmount),
          },
        },
      })
    })

    revalidatePath('/purchases')
    revalidatePath('/dashboard')

    return {
      success: true,
    }
  } catch (error: any) {
    console.error('Error marking purchase as paid:', error)
    return {
      success: false,
      error: error.message || 'Failed to mark purchase as paid',
    }
  }
}

export interface UpdatePurchaseItem {
  productId: string
  quantity: number
  unitPrice: number
  expiryDate?: string | null
}

export interface UpdatePurchaseData {
  supplierId?: string
  referenceNo?: string
  purchaseDate?: string
  status?: 'RECEIVED' | 'PENDING'
  notes?: string | null
  items?: UpdatePurchaseItem[]
  paidAmount?: number
  paymentMethod?: string
}

/**
 * Update purchase with full editing (metadata + items + stock updates)
 */
export async function updatePurchase(purchaseId: string, data: UpdatePurchaseData) {
  try {
    const session = await getSession()
    if (!session) {
      return {
        success: false,
        error: 'Unauthorized. Please log in again.',
      }
    }

    // Use transaction to ensure atomicity
    const result = await prisma.$transaction(async (tx) => {
      // 1. Fetch the EXISTING purchase with items
      const oldPurchase = await tx.purchase.findUnique({
        where: { id: purchaseId },
        include: {
          items: {
            include: {
              product: {
                select: {
                  id: true,
                  purchasePrice: true,
                },
              },
            },
          },
        },
      })

      if (!oldPurchase) {
        throw new Error('Purchase not found')
      }

      if (oldPurchase.status === 'CANCELLED') {
        throw new Error('Cannot update a cancelled purchase')
      }

      // 2. REVERT Stock (Undo the old purchase effect)
      for (const item of oldPurchase.items) {
        await tx.product.update({
          where: { id: item.productId },
          data: {
            stock: {
              decrement: item.quantity,
            },
          },
        })

        // Create stock movement record for reversal
        await tx.stockMovement.create({
          data: {
            productId: item.productId,
            userId: session.userId,
            movementType: 'ADJUSTMENT',
            quantity: new Decimal(-Number(item.quantity)),
            referenceId: purchaseId,
            referenceType: 'Purchase',
            notes: `Stock reversed from purchase edit ${oldPurchase.poNumber}`,
          },
        })
      }

      // 3. DELETE old items
      await tx.purchaseItem.deleteMany({
        where: { purchaseId: purchaseId },
      })

      // 4. Calculate new totals if items are provided
      let newSubtotal = Number(oldPurchase.subtotal)
      let newTotal = Number(oldPurchase.total)

      if (data.items && data.items.length > 0) {
        newSubtotal = data.items.reduce((sum, item) => sum + (item.quantity * item.unitPrice), 0)
        const discount = Number(oldPurchase.discount)
        const tax = Number(oldPurchase.tax)
        newTotal = newSubtotal - discount + tax

        // 5. APPLY New Stock (Apply the new purchase effect)
        for (const item of data.items) {
          // Update product stock
          await tx.product.update({
            where: { id: item.productId },
            data: {
              stock: {
                increment: item.quantity,
              },
            },
          })

          // Update cost price if different
          const product = await tx.product.findUnique({
            where: { id: item.productId },
            select: { purchasePrice: true },
          })

          if (product) {
            const currentCostPrice = Number(product.purchasePrice)
            const newCostPrice = item.unitPrice

            if (currentCostPrice !== newCostPrice) {
              await tx.product.update({
                where: { id: item.productId },
                data: {
                  purchasePrice: new Decimal(newCostPrice),
                },
              })

              // Create price history record
              await tx.priceHistory.create({
                data: {
                  productId: item.productId,
                  userId: session.userId,
                  oldPrice: product.purchasePrice,
                  newPrice: new Decimal(newCostPrice),
                  priceType: 'purchase',
                  reason: 'Purchase Edit Update',
                },
              })
            }

            // Update expiry date if provided
            if (item.expiryDate) {
              await tx.product.update({
                where: { id: item.productId },
                data: {
                  expiryDate: new Date(item.expiryDate),
                },
              })
            }
          }

          // Create stock movement record
          await tx.stockMovement.create({
            data: {
              productId: item.productId,
              userId: session.userId,
              movementType: 'PURCHASE',
              quantity: new Decimal(item.quantity),
              referenceId: purchaseId,
              referenceType: 'Purchase',
              notes: `Purchase edit ${oldPurchase.poNumber}`,
            },
          })
        }

        // 6. CREATE new purchase items
        for (const item of data.items) {
          const itemSubtotal = item.quantity * item.unitPrice
          const itemTotal = itemSubtotal // No discount/tax for now

          await tx.purchaseItem.create({
            data: {
              purchaseId: purchaseId,
              productId: item.productId,
              quantity: new Decimal(item.quantity),
              unitPrice: new Decimal(item.unitPrice),
              discount: new Decimal(0),
              tax: new Decimal(0),
              total: new Decimal(itemTotal),
              receivedQty: data.status === 'RECEIVED' ? new Decimal(item.quantity) : new Decimal(0),
            },
          })
        }
      }

      // 7. UPDATE Purchase Record
      const updateData: any = {
        subtotal: new Decimal(newSubtotal),
        total: new Decimal(newTotal),
      }

      if (data.supplierId) {
        updateData.supplierId = data.supplierId
      }

      if (data.referenceNo !== undefined) {
        updateData.poNumber = data.referenceNo || oldPurchase.poNumber
      }

      if (data.notes !== undefined) {
        updateData.notes = data.notes || null
      }

      if (data.status && data.status !== oldPurchase.status) {
        updateData.status = data.status
        if (data.status === 'RECEIVED' && !oldPurchase.receivedAt) {
          updateData.receivedAt = data.purchaseDate ? new Date(data.purchaseDate) : new Date()
        }
      }

      const updatedPurchase = await tx.purchase.update({
        where: { id: purchaseId },
        data: updateData,
      })

      return updatedPurchase
    })

    revalidatePath('/purchases')
    revalidatePath('/dashboard')
    revalidatePath('/products')
    revalidatePath('/pos')

    return {
      success: true,
      data: result,
    }
  } catch (error: any) {
    console.error('Error updating purchase:', error)
    return {
      success: false,
      error: error.message || 'Failed to update purchase',
    }
  }
}

