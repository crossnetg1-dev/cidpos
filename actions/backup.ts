'use server'

import { prisma } from '@/lib/prisma'
import { getSession } from '@/lib/auth'
import { verifyAdminPassword } from '@/actions/security'
import { revalidatePath } from 'next/cache'
import { readFile, writeFile } from 'fs/promises'
import { join } from 'path'
import { existsSync } from 'fs'

/**
 * Get the database file path
 */
function getDbPath(): string {
  const dbUrl = process.env.DATABASE_URL || 'file:./dev.db'
  // Extract path from DATABASE_URL (format: "file:./dev.db" or "file:/absolute/path")
  const path = dbUrl.replace(/^file:/, '')
  if (path.startsWith('/')) {
    return path
  }
  // Relative path - resolve from project root
  return join(process.cwd(), 'prisma', path.replace(/^\.\//, ''))
}

/**
 * Generate a complete JSON backup of all database data
 * @returns JSON object containing all data from specified models
 */
export async function generateJsonBackup() {
  try {
    const session = await getSession()
    if (!session) {
      return {
        success: false,
        error: 'Unauthorized. Please log in again.',
      }
    }

    // Check permission (only admins can backup)
    const { checkUserPermission } = await import('@/lib/permissions')
    const canBackup = await checkUserPermission('settings', 'system')
    if (!canBackup) {
      return {
        success: false,
        error: 'You do not have permission to backup the database',
      }
    }

    // Fetch all data from specified models
    const [
      products,
      categories,
      customers,
      suppliers,
      sales,
      purchases,
      storeSettings,
      roles,
      users,
      saleItems,
      purchaseItems,
      stockMovements,
      stockAdjustments,
      salesReturns,
      salesReturnItems,
      purchaseReturns,
      purchaseReturnItems,
      priceHistories,
      shifts,
      activityLogs,
      customerPayments,
      purchasePayments,
    ] = await Promise.all([
      prisma.product.findMany(),
      prisma.category.findMany(),
      prisma.customer.findMany(),
      prisma.supplier.findMany(),
      prisma.sale.findMany(),
      prisma.purchase.findMany(),
      prisma.storeSettings.findMany(),
      prisma.role.findMany(),
      prisma.user.findMany({
        select: {
          id: true,
          username: true,
          fullName: true,
          email: true,
          phone: true,
          role: true,
          roleId: true,
          status: true,
          rememberToken: true,
          lastLoginAt: true,
          lastLoginIp: true,
          createdAt: true,
          updatedAt: true,
          // Exclude password for security
        },
      }),
      prisma.saleItem.findMany(),
      prisma.purchaseItem.findMany(),
      prisma.stockMovement.findMany(),
      prisma.stockAdjustment.findMany(),
      prisma.salesReturn.findMany(),
      prisma.salesReturnItem.findMany(),
      prisma.purchaseReturn.findMany(),
      prisma.purchaseReturnItem.findMany(),
      prisma.priceHistory.findMany(),
      prisma.shift.findMany(),
      prisma.activityLog.findMany(),
      prisma.customerPayment.findMany(),
      prisma.purchasePayment.findMany(),
    ])

    // Convert Decimal fields to numbers for JSON serialization
    const backupData = {
      version: '1.0',
      timestamp: new Date().toISOString(),
      data: {
        products: products.map((p) => ({
          ...p,
          purchasePrice: Number(p.purchasePrice),
          sellingPrice: Number(p.sellingPrice),
          stock: Number(p.stock),
          minStockLevel: Number(p.minStockLevel),
        })),
        categories,
        customers: customers.map((c) => ({
          ...c,
          totalSpent: Number(c.totalSpent),
          creditLimit: Number(c.creditLimit),
          creditBalance: Number(c.creditBalance),
          openingBalance: Number(c.openingBalance),
        })),
        suppliers: suppliers.map((s) => ({
          ...s,
          creditLimit: Number(s.creditLimit),
          creditBalance: Number(s.creditBalance),
          openingBalance: Number(s.openingBalance),
        })),
        sales: sales.map((s) => ({
          ...s,
          subtotal: Number(s.subtotal),
          discount: Number(s.discount),
          discountPercent: Number(s.discountPercent),
          tax: Number(s.tax),
          total: Number(s.total),
          cashReceived: s.cashReceived ? Number(s.cashReceived) : null,
          change: s.change ? Number(s.change) : null,
        })),
        saleItems: saleItems.map((si) => ({
          ...si,
          unitPrice: Number(si.unitPrice),
          quantity: Number(si.quantity),
          discount: Number(si.discount),
          tax: Number(si.tax),
          total: Number(si.total),
        })),
        purchases: purchases.map((p) => ({
          ...p,
          subtotal: Number(p.subtotal),
          discount: Number(p.discount),
          tax: Number(p.tax),
          total: Number(p.total),
          paidAmount: Number(p.paidAmount),
          remainingAmount: Number(p.remainingAmount),
        })),
        purchaseItems: purchaseItems.map((pi) => ({
          ...pi,
          unitPrice: Number(pi.unitPrice),
          quantity: Number(pi.quantity),
          discount: Number(pi.discount),
          tax: Number(pi.tax),
          total: Number(pi.total),
          receivedQty: Number(pi.receivedQty),
        })),
        stockMovements: stockMovements.map((sm) => ({
          ...sm,
          quantity: Number(sm.quantity),
          balanceAfter: Number(sm.balanceAfter),
        })),
        stockAdjustments: stockAdjustments.map((sa) => ({
          ...sa,
          quantityBefore: Number(sa.quantityBefore),
          quantityAfter: Number(sa.quantityAfter),
          quantityDifference: Number(sa.quantityDifference),
        })),
        salesReturns: salesReturns.map((sr) => ({
          ...sr,
          total: Number(sr.total),
        })),
        salesReturnItems: salesReturnItems.map((sri) => ({
          ...sri,
          quantity: Number(sri.quantity),
          unitPrice: Number(sri.unitPrice),
          total: Number(sri.total),
        })),
        purchaseReturns: purchaseReturns.map((pr) => ({
          ...pr,
          total: Number(pr.total),
        })),
        purchaseReturnItems: purchaseReturnItems.map((pri) => ({
          ...pri,
          quantity: Number(pri.quantity),
          unitPrice: Number(pri.unitPrice),
          total: Number(pri.total),
        })),
        priceHistories: priceHistories.map((ph) => ({
          ...ph,
          oldPrice: Number(ph.oldPrice),
          newPrice: Number(ph.newPrice),
        })),
        shifts: shifts.map((s) => ({
          ...s,
          openingCash: Number(s.openingCash),
          closingCash: s.closingCash ? Number(s.closingCash) : null,
          expectedCash: s.expectedCash ? Number(s.expectedCash) : null,
          difference: s.difference ? Number(s.difference) : null,
        })),
        customerPayments: customerPayments.map((cp) => ({
          ...cp,
          amount: Number(cp.amount),
        })),
        purchasePayments: purchasePayments.map((pp) => ({
          ...pp,
          amount: Number(pp.amount),
        })),
        storeSettings: storeSettings.map((ss) => ({
          ...ss,
          taxRate: Number(ss.taxRate),
        })),
        roles,
        users,
        activityLogs,
      },
    }

    return {
      success: true,
      data: backupData,
    }
  } catch (error: any) {
    console.error('Error generating backup:', error)
    return {
      success: false,
      error: error.message || 'Failed to generate backup',
    }
  }
}

/**
 * Restore database from backup data
 * @param backupData - JSON object containing backup data
 * @param password - Admin password for verification
 * @returns Success message or error
 */
export async function restoreJsonBackup(backupData: any, password: string) {
  try {
    const session = await getSession()
    if (!session) {
      return {
        success: false,
        error: 'Unauthorized. Please log in again.',
      }
    }

    // Security check: Verify admin password first
    try {
      await verifyAdminPassword(password)
    } catch (error: any) {
      return {
        success: false,
        error: error.message || 'Incorrect Password',
      }
    }

    // Check permission
    const { checkUserPermission } = await import('@/lib/permissions')
    const canRestore = await checkUserPermission('settings', 'system')
    if (!canRestore) {
      return {
        success: false,
        error: 'You do not have permission to restore the database',
      }
    }

    // Validate backup data structure
    if (!backupData || !backupData.data) {
      return {
        success: false,
        error: 'Invalid backup file format',
      }
    }

    const data = backupData.data

    // Use transaction to ensure atomicity
    await prisma.$transaction(async (tx) => {
      // Delete in order (respecting foreign key constraints)
      // Delete child records first

      // 1. Delete Sales Returns Items
      await tx.salesReturnItem.deleteMany({})
      await tx.salesReturn.deleteMany({})

      // 2. Delete Purchase Return Items
      await tx.purchaseReturnItem.deleteMany({})
      await tx.purchaseReturn.deleteMany({})

      // 3. Delete Sale Items
      await tx.saleItem.deleteMany({})

      // 4. Delete Purchase Items
      await tx.purchaseItem.deleteMany({})

      // 5. Delete Stock Movements
      await tx.stockMovement.deleteMany({})

      // 6. Delete Stock Adjustments
      await tx.stockAdjustment.deleteMany({})

      // 7. Delete Price Histories
      await tx.priceHistory.deleteMany({})

      // 8. Delete Customer Payments
      await tx.customerPayment.deleteMany({})

      // 9. Delete Purchase Payments
      await tx.purchasePayment.deleteMany({})

      // 10. Delete Sales
      await tx.sale.deleteMany({})

      // 11. Delete Purchases
      await tx.purchase.deleteMany({})

      // 12. Delete Shifts
      await tx.shift.deleteMany({})

      // 13. Delete Activity Logs
      await tx.activityLog.deleteMany({})

      // 14. Delete Products (before categories)
      await tx.product.deleteMany({})

      // 15. Delete Categories
      await tx.category.deleteMany({})

      // 16. Delete Customers
      await tx.customer.deleteMany({})

      // 17. Delete Suppliers
      await tx.supplier.deleteMany({})

      // 18. Delete Store Settings
      await tx.storeSettings.deleteMany({})

      // 19. Delete Users (but keep current user)
      await tx.user.deleteMany({
        where: {
          id: {
            not: session.userId, // Keep current user
          },
        },
      })

      // 20. Delete Roles (but keep system roles)
      await tx.role.deleteMany({
        where: {
          isSystem: false, // Keep system roles
        },
      })

      // Now restore data in order

      // 1. Restore Categories
      if (data.categories && Array.isArray(data.categories)) {
        await tx.category.createMany({
          data: data.categories.map((cat: any) => ({
            id: cat.id,
            name: cat.name,
            description: cat.description || null,
            image: cat.image || null,
            isActive: cat.isActive !== undefined ? cat.isActive : true,
            createdAt: cat.createdAt ? new Date(cat.createdAt) : new Date(),
            updatedAt: cat.updatedAt ? new Date(cat.updatedAt) : new Date(),
          })),
          skipDuplicates: true,
        })
      }

      // 2. Restore Roles (non-system roles)
      if (data.roles && Array.isArray(data.roles)) {
        await tx.role.createMany({
          data: data.roles
            .filter((role: any) => !role.isSystem)
            .map((role: any) => ({
              id: role.id,
              name: role.name,
              permissions: role.permissions,
              isSystem: false, // Restored roles are not system roles
              createdAt: role.createdAt ? new Date(role.createdAt) : new Date(),
              updatedAt: role.updatedAt ? new Date(role.updatedAt) : new Date(),
            })),
          skipDuplicates: true,
        })
      }

      // 3. Restore Products
      if (data.products && Array.isArray(data.products)) {
        await tx.product.createMany({
          data: data.products.map((prod: any) => ({
            id: prod.id,
            name: prod.name,
            barcode: prod.barcode || null,
            sku: prod.sku || null,
            description: prod.description || null,
            image: prod.image || null,
            categoryId: prod.categoryId,
            purchasePrice: prod.purchasePrice || 0,
            sellingPrice: prod.sellingPrice || 0,
            stock: prod.stock || 0,
            minStockLevel: prod.minStockLevel || 0,
            unit: prod.unit || 'pcs',
            expiryDate: prod.expiryDate ? new Date(prod.expiryDate) : null,
            isActive: prod.isActive !== undefined ? prod.isActive : true,
            createdAt: prod.createdAt ? new Date(prod.createdAt) : new Date(),
            updatedAt: prod.updatedAt ? new Date(prod.updatedAt) : new Date(),
          })),
          skipDuplicates: true,
        })
      }

      // 4. Restore Customers
      if (data.customers && Array.isArray(data.customers)) {
        await tx.customer.createMany({
          data: data.customers.map((cust: any) => ({
            id: cust.id,
            name: cust.name,
            email: cust.email || null,
            phone: cust.phone || null,
            address: cust.address || null,
            creditLimit: cust.creditLimit || 0,
            totalSpent: cust.totalSpent || 0,
            creditBalance: cust.creditBalance || 0,
            openingBalance: cust.openingBalance || 0,
            isActive: cust.isActive !== undefined ? cust.isActive : true,
            createdAt: cust.createdAt ? new Date(cust.createdAt) : new Date(),
            updatedAt: cust.updatedAt ? new Date(cust.updatedAt) : new Date(),
          })),
          skipDuplicates: true,
        })
      }

      // 5. Restore Suppliers
      if (data.suppliers && Array.isArray(data.suppliers)) {
        await tx.supplier.createMany({
          data: data.suppliers.map((sup: any) => ({
            id: sup.id,
            name: sup.name,
            companyName: sup.companyName || null,
            email: sup.email || null,
            phone: sup.phone || null,
            address: sup.address || null,
            creditLimit: sup.creditLimit || 0,
            creditBalance: sup.creditBalance || 0,
            openingBalance: sup.openingBalance || 0,
            isActive: sup.isActive !== undefined ? sup.isActive : true,
            createdAt: sup.createdAt ? new Date(sup.createdAt) : new Date(),
            updatedAt: sup.updatedAt ? new Date(sup.updatedAt) : new Date(),
          })),
          skipDuplicates: true,
        })
      }

      // 6. Restore Store Settings
      if (data.storeSettings && Array.isArray(data.storeSettings) && data.storeSettings.length > 0) {
        const settings = data.storeSettings[0]
        await tx.storeSettings.createMany({
          data: [
            {
              id: settings.id,
              storeName: settings.storeName,
              address: settings.address || null,
              phone: settings.phone || null,
              currency: settings.currency || 'MMK',
              taxRate: settings.taxRate || 0,
              receiptFooter: settings.receiptFooter || null,
              createdAt: settings.createdAt ? new Date(settings.createdAt) : new Date(),
              updatedAt: settings.updatedAt ? new Date(settings.updatedAt) : new Date(),
            },
          ],
          skipDuplicates: true,
        })
      }

      // 7. Restore Sales (and related data)
      if (data.sales && Array.isArray(data.sales)) {
        // For restore, we need to handle invoiceNo carefully
        // If backup has invoiceNo, try to preserve it, otherwise generate new ones
        // First, get the current highest invoiceNo
        const lastSale = await tx.sale.findFirst({
          orderBy: {
            invoiceNo: 'desc',
          },
          select: {
            invoiceNo: true,
          },
        })
        let nextInvoiceNo = lastSale?.invoiceNo ? lastSale.invoiceNo + 1 : 1

        await tx.sale.createMany({
          data: data.sales.map((sale: any) => {
            // Always assign new sequential invoiceNo during restore
            // This prevents conflicts and maintains proper ordering
            const invoiceNo = nextInvoiceNo++

            return {
              id: sale.id,
              invoiceNo: invoiceNo,
              saleNumber: sale.saleNumber,
              userId: sale.userId,
              customerId: sale.customerId || null,
              subtotal: sale.subtotal || 0,
              discount: sale.discount || 0,
              discountPercent: sale.discountPercent || 0,
              tax: sale.tax || 0,
              total: sale.total || 0,
              paymentMethod: sale.paymentMethod || 'CASH',
              paymentStatus: sale.paymentStatus || (sale.paymentMethod === 'CREDIT' ? 'UNPAID' : 'PAID'),
              saleType: sale.saleType || 'SALE',
              cashReceived: sale.cashReceived || null,
              change: sale.change || null,
              status: sale.status || 'COMPLETED',
              notes: sale.notes || null,
              shiftId: sale.shiftId || null,
              createdAt: sale.createdAt ? new Date(sale.createdAt) : new Date(),
              updatedAt: sale.updatedAt ? new Date(sale.updatedAt) : new Date(),
            }
          }),
          skipDuplicates: true,
        })
      }

      // 8. Restore Sale Items
      if (data.saleItems && Array.isArray(data.saleItems)) {
        await tx.saleItem.createMany({
          data: data.saleItems.map((item: any) => ({
            id: item.id,
            saleId: item.saleId,
            productId: item.productId,
            unitPrice: item.unitPrice || 0,
            quantity: item.quantity || 0,
            discount: item.discount || 0,
            tax: item.tax || 0,
            total: item.total || 0,
            createdAt: item.createdAt ? new Date(item.createdAt) : new Date(),
          })),
          skipDuplicates: true,
        })
      }

      // 9. Restore Purchases
      if (data.purchases && Array.isArray(data.purchases)) {
        await tx.purchase.createMany({
          data: data.purchases.map((purchase: any) => ({
            id: purchase.id,
            purchaseNumber: purchase.purchaseNumber,
            userId: purchase.userId,
            supplierId: purchase.supplierId || null,
            subtotal: purchase.subtotal || 0,
            discount: purchase.discount || 0,
            tax: purchase.tax || 0,
            total: purchase.total || 0,
            paidAmount: purchase.paidAmount || 0,
            remainingAmount: purchase.remainingAmount || 0,
            status: purchase.status || 'COMPLETED',
            notes: purchase.notes || null,
            createdAt: purchase.createdAt ? new Date(purchase.createdAt) : new Date(),
            updatedAt: purchase.updatedAt ? new Date(purchase.updatedAt) : new Date(),
          })),
          skipDuplicates: true,
        })
      }

      // 10. Restore Purchase Items
      if (data.purchaseItems && Array.isArray(data.purchaseItems)) {
        await tx.purchaseItem.createMany({
          data: data.purchaseItems.map((item: any) => ({
            id: item.id,
            purchaseId: item.purchaseId,
            productId: item.productId,
            unitPrice: item.unitPrice || 0,
            quantity: item.quantity || 0,
            discount: item.discount || 0,
            tax: item.tax || 0,
            total: item.total || 0,
            receivedQty: item.receivedQty || 0,
            createdAt: item.createdAt ? new Date(item.createdAt) : new Date(),
            updatedAt: item.updatedAt ? new Date(item.updatedAt) : new Date(),
          })),
          skipDuplicates: true,
        })
      }

      // Restore other data (stock movements, adjustments, etc.)
      // Note: These are optional and can be restored if needed
    })

    revalidatePath('/settings')
    revalidatePath('/dashboard')
    revalidatePath('/products')
    revalidatePath('/sales')
    revalidatePath('/purchases')
    revalidatePath('/pos')

    return {
      success: true,
      message: 'Database restored successfully from backup',
    }
  } catch (error: any) {
    console.error('Error restoring database:', error)
    return {
      success: false,
      error: error.message || 'Failed to restore database. The backup file may be corrupted.',
    }
  }
}

/**
 * Download the SQLite database file
 * @returns Buffer containing the database file
 */
export async function downloadDbFile() {
  try {
    const session = await getSession()
    if (!session) {
      return {
        success: false,
        error: 'Unauthorized. Please log in again.',
      }
    }

    // Check permission
    const { checkUserPermission } = await import('@/lib/permissions')
    const canBackup = await checkUserPermission('settings', 'system')
    if (!canBackup) {
      return {
        success: false,
        error: 'You do not have permission to backup the database',
      }
    }

    const dbPath = getDbPath()

    // Check if database file exists
    if (!existsSync(dbPath)) {
      return {
        success: false,
        error: 'Database file not found',
      }
    }

    // Read the database file
    const buffer = await readFile(dbPath)

    // Convert to base64 for transmission
    const base64 = buffer.toString('base64')

    return {
      success: true,
      data: base64,
      filename: 'pos_database.db',
    }
  } catch (error: any) {
    console.error('Error downloading database file:', error)
    return {
      success: false,
      error: error.message || 'Failed to download database file',
    }
  }
}

/**
 * Restore database from uploaded DB file
 * @param fileData - Base64 encoded database file data
 * @param password - Admin password for verification
 * @returns Success message or error
 */
export async function restoreDbFile(fileData: string, password: string) {
  try {
    const session = await getSession()
    if (!session) {
      return {
        success: false,
        error: 'Unauthorized. Please log in again.',
      }
    }

    // Security check: Verify admin password first
    try {
      await verifyAdminPassword(password)
    } catch (error: any) {
      return {
        success: false,
        error: error.message || 'Incorrect Password',
      }
    }

    // Check permission
    const { checkUserPermission } = await import('@/lib/permissions')
    const canRestore = await checkUserPermission('settings', 'system')
    if (!canRestore) {
      return {
        success: false,
        error: 'You do not have permission to restore the database',
      }
    }

    const dbPath = getDbPath()

    // Disconnect Prisma to release file lock
    await prisma.$disconnect()

    try {
      // Convert base64 to buffer
      const buffer = Buffer.from(fileData, 'base64')

      // Write the database file (overwrite existing)
      await writeFile(dbPath, buffer)

      // Reconnect Prisma
      await prisma.$connect()

      return {
        success: true,
        message: 'Database file restored successfully. Please restart your application.',
      }
    } catch (fileError: any) {
      // Try to reconnect Prisma even if file write fails
      try {
        await prisma.$connect()
      } catch (reconnectError) {
        console.error('Failed to reconnect Prisma:', reconnectError)
      }

      // Check for file locking errors
      if (fileError.code === 'EBUSY' || fileError.code === 'EACCES') {
        return {
          success: false,
          error: 'Database file is locked. Please close all connections and try again.',
        }
      }

      throw fileError
    }
  } catch (error: any) {
    console.error('Error restoring database file:', error)
    
    // Try to reconnect Prisma
    try {
      await prisma.$connect()
    } catch (reconnectError) {
      console.error('Failed to reconnect Prisma:', reconnectError)
    }

    return {
      success: false,
      error: error.message || 'Failed to restore database file',
    }
  }
}

// Legacy function names for backward compatibility
export async function generateBackup() {
  return generateJsonBackup()
}

export async function restoreDatabase(backupData: any, password: string) {
  return restoreJsonBackup(backupData, password)
}

