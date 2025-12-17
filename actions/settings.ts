'use server'

import { prisma } from '@/lib/prisma'
import { getSession } from '@/lib/auth'
import { hashPassword } from '@/lib/auth'
import { Decimal } from '@prisma/client/runtime/library'
import { revalidatePath } from 'next/cache'

export interface StoreSettingsData {
  storeName: string
  address?: string
  phone?: string
  currency: string
  taxRate: number
  receiptFooter?: string
}

export interface UserFormData {
  username: string
  fullName: string
  email?: string
  phone?: string
  password: string
  roleId: string // Dynamic role ID from database
}

/**
 * Get store settings (singleton pattern)
 */
export async function getStoreSettings() {
  try {
    let settings = await prisma.storeSettings.findFirst()

    // Create default settings if none exist
    if (!settings) {
      settings = await prisma.storeSettings.create({
        data: {
          storeName: 'My POS Store',
          currency: 'MMK',
          taxRate: 0,
          receiptFooter: 'Thank you for shopping with us!',
        },
      })
    }

    return {
      success: true,
      data: {
        ...settings,
        taxRate: Number(settings.taxRate),
      },
    }
  } catch (error) {
    console.error('Error fetching store settings:', error)
    return {
      success: false,
      error: 'Failed to fetch store settings',
    }
  }
}

/**
 * Update store settings
 */
export async function updateStoreSettings(data: StoreSettingsData) {
  try {
    const session = await getSession()
    if (!session) {
      return {
        success: false,
        error: 'Unauthorized. Please log in again.',
      }
    }

    // Get or create settings
    let settings = await prisma.storeSettings.findFirst()

    if (!settings) {
      settings = await prisma.storeSettings.create({
        data: {
          storeName: data.storeName,
          address: data.address || null,
          phone: data.phone || null,
          currency: data.currency || 'MMK',
          taxRate: new Decimal(data.taxRate || 0),
          receiptFooter: data.receiptFooter || null,
        },
      })
    } else {
      settings = await prisma.storeSettings.update({
        where: { id: settings.id },
        data: {
          storeName: data.storeName,
          address: data.address || null,
          phone: data.phone || null,
          currency: data.currency || 'MMK',
          taxRate: new Decimal(data.taxRate || 0),
          receiptFooter: data.receiptFooter || null,
        },
      })
    }

    revalidatePath('/settings')
    revalidatePath('/pos')
    revalidatePath('/dashboard')
    revalidatePath('/') // Revalidate root to update sidebar and metadata

    return {
      success: true,
      data: {
        ...settings,
        taxRate: Number(settings.taxRate),
      },
    }
  } catch (error: any) {
    console.error('Error updating store settings:', error)
    return {
      success: false,
      error: error.message || 'Failed to update store settings',
    }
  }
}

/**
 * Get all users
 */
export async function getUsers() {
  try {
    const session = await getSession()
    if (!session) {
      return {
        success: false,
        error: 'Unauthorized. Please log in again.',
      }
    }

    const users = await prisma.user.findMany({
      select: {
        id: true,
        username: true,
        fullName: true,
        email: true,
        phone: true,
        role: true,
        status: true,
        createdAt: true,
        lastLoginAt: true,
      },
      orderBy: {
        createdAt: 'desc',
      },
    })

    return {
      success: true,
      data: users,
    }
  } catch (error) {
    console.error('Error fetching users:', error)
    return {
      success: false,
      error: 'Failed to fetch users',
    }
  }
}

/**
 * Create a new user
 */
export async function createUser(data: UserFormData) {
  try {
    const session = await getSession()
    if (!session) {
      return {
        success: false,
        error: 'Unauthorized. Please log in again.',
      }
    }

    // Check if username already exists
    const existing = await prisma.user.findUnique({
      where: { username: data.username },
    })

    if (existing) {
      return {
        success: false,
        error: 'Username already exists',
      }
    }

    // Hash password
    const hashedPassword = await hashPassword(data.password)

    // Verify role exists
    const role = await prisma.role.findUnique({
      where: { id: data.roleId },
    })

    if (!role) {
      return {
        success: false,
        error: 'Selected role does not exist',
      }
    }

    // Create user
    const user = await prisma.user.create({
      data: {
        username: data.username,
        fullName: data.fullName,
        email: data.email || null,
        phone: data.phone || null,
        password: hashedPassword,
        roleId: data.roleId,
        role: 'CASHIER', // Legacy field, keep for backward compatibility
        status: 'ACTIVE',
      },
      select: {
        id: true,
        username: true,
        fullName: true,
        email: true,
        phone: true,
        role: true,
        status: true,
        createdAt: true,
      },
    })

    revalidatePath('/settings')

    return {
      success: true,
      data: user,
    }
  } catch (error: any) {
    console.error('Error creating user:', error)
    return {
      success: false,
      error: error.message || 'Failed to create user',
    }
  }
}

/**
 * Delete a user
 */
export async function deleteUser(userId: string) {
  try {
    const session = await getSession()
    if (!session) {
      return {
        success: false,
        error: 'Unauthorized. Please log in again.',
      }
    }

    // Prevent deleting oneself
    if (session.userId === userId) {
      return {
        success: false,
        error: 'You cannot delete your own account',
      }
    }

    // Get the first user (oldest user, excluding system user)
    const firstUser = await prisma.user.findFirst({
      where: {
        username: {
          not: 'system',
        },
      },
      orderBy: {
        createdAt: 'asc',
      },
      select: {
        id: true,
      },
    })

    // Prevent deleting or deactivating the first user (permanent admin)
    if (firstUser && firstUser.id === userId) {
      return {
        success: false,
        error: 'Cannot delete or deactivate the first administrator account. This account is permanent.',
      }
    }

    // Check if user has any sales (optional: prevent deletion if they have transactions)
    const saleCount = await prisma.sale.count({
      where: { userId },
    })

    if (saleCount > 0) {
      // Instead of deleting, deactivate the user
      await prisma.user.update({
        where: { id: userId },
        data: { status: 'INACTIVE' },
      })

      revalidatePath('/settings')

      return {
        success: true,
        message: 'User deactivated (has transaction history)',
      }
    }

    // Safe to delete
    await prisma.user.delete({
      where: { id: userId },
    })

    revalidatePath('/settings')

    return {
      success: true,
    }
  } catch (error: any) {
    console.error('Error deleting user:', error)
    return {
      success: false,
      error: error.message || 'Failed to delete user',
    }
  }
}

/**
 * Reset database (DANGER ACTION)
 * Deletes all Sales, SaleItems, StockAdjustments, Purchases
 * Keeps Products, Categories, Users, Settings
 * @param password - Admin password for verification
 */
export async function resetDatabase(password: string) {
  try {
    const session = await getSession()
    if (!session) {
      return {
        success: false,
        error: 'Unauthorized. Please log in again.',
      }
    }

    // Security check: Verify admin password first
    const { verifyAdminPassword } = await import('@/actions/security')
    try {
      await verifyAdminPassword(password)
    } catch (error: any) {
      return {
        success: false,
        error: error.message || 'Incorrect Password',
      }
    }

    // Use transaction to ensure atomicity
    await prisma.$transaction(async (tx) => {
      // Delete in order (respecting foreign key constraints)

      // 1. Delete Sales Returns and Items
      await tx.salesReturnItem.deleteMany({})
      await tx.salesReturn.deleteMany({})

      // 2. Delete Sale Items
      await tx.saleItem.deleteMany({})

      // 3. Delete Sales
      await tx.sale.deleteMany({})

      // 4. Delete Purchase Items
      await tx.purchaseItem.deleteMany({})

      // 5. Delete Purchases
      await tx.purchase.deleteMany({})

      // 6. Delete Stock Adjustments
      await tx.stockAdjustment.deleteMany({})

      // 7. Delete Stock Movements
      await tx.stockMovement.deleteMany({})

      // 8. Delete Customer Payments
      await tx.customerPayment.deleteMany({})

      // 9. Delete Purchase Payments
      await tx.purchasePayment.deleteMany({})

      // 10. Delete Purchase Returns
      await tx.purchaseReturnItem.deleteMany({})
      await tx.purchaseReturn.deleteMany({})

      // 11. Delete Price History
      await tx.priceHistory.deleteMany({})

      // 12. Reset Product Stock (optional - comment out if you want to keep stock)
      // await tx.product.updateMany({
      //   data: { stock: 0 },
      // })

      // 13. Reset Customer Stats (optional)
      await tx.customer.updateMany({
        data: {
          totalSpent: 0,
          visitCount: 0,
        },
      })
    })

    revalidatePath('/settings')
    revalidatePath('/dashboard')
    revalidatePath('/sales')
    revalidatePath('/purchases')
    revalidatePath('/pos')

    return {
      success: true,
      message: 'Database reset successfully. All transaction data has been cleared.',
    }
  } catch (error: any) {
    console.error('Error resetting database:', error)
    return {
      success: false,
      error: error.message || 'Failed to reset database',
    }
  }
}

