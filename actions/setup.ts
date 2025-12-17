'use server'

import { prisma } from '@/lib/prisma'
import { hashPassword, createSession } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { revalidatePath } from 'next/cache'

export interface SetupFormData {
  username: string
  password: string
  confirmPassword: string
  storeName: string
}

export async function initializeSystem(formData: FormData) {
  try {
    // Double check: Ensure no users exist (Security check)
    const userCount = await prisma.user.count()
    if (userCount > 0) {
      return {
        success: false,
        error: 'System has already been initialized. Please log in instead.',
      }
    }

    // Extract form data
    const username = formData.get('username') as string
    const password = formData.get('password') as string
    const confirmPassword = formData.get('confirmPassword') as string
    const storeName = formData.get('storeName') as string

    // Validation
    if (!username || !password || !confirmPassword || !storeName) {
      return {
        success: false,
        error: 'All fields are required.',
      }
    }

    if (username.length < 3) {
      return {
        success: false,
        error: 'Username must be at least 3 characters long.',
      }
    }

    if (password.length < 6) {
      return {
        success: false,
        error: 'Password must be at least 6 characters long.',
      }
    }

    if (password !== confirmPassword) {
      return {
        success: false,
        error: 'Passwords do not match.',
      }
    }

    if (storeName.trim().length < 2) {
      return {
        success: false,
        error: 'Store name must be at least 2 characters long.',
      }
    }

    // Check if username already exists (shouldn't happen, but safety check)
    const existingUser = await prisma.user.findUnique({
      where: { username },
    })

    if (existingUser) {
      return {
        success: false,
        error: 'Username already exists. Please choose a different username.',
      }
    }

    // Use transaction to ensure atomicity
    const result = await prisma.$transaction(async (tx) => {
      // 1. Create default Roles
      const superAdminPermissions = {
        dashboard: { view: true },
        pos: { access: true, discount: true, void: true },
        products: { view: true, create: true, edit: true, delete: true },
        categories: { view: true, create: true, edit: true, delete: true },
        purchases: { view: true, create: true, edit: true, delete: true },
        sales: { view: true, edit: true, void: true, refund: true },
        stock: { view: true, adjust: true },
        customers: { view: true, create: true, edit: true, delete: true },
        reports: { view: true, export: true },
        settings: { view: true, edit: true, system: true },
      }

      const cashierPermissions = {
        dashboard: { view: true },
        pos: { access: true, discount: false, void: false },
        products: { view: true, create: false, edit: false, delete: false },
        categories: { view: false, create: false, edit: false, delete: false },
        purchases: { view: false, create: false, edit: false, delete: false },
        sales: { view: true, edit: false, void: false, refund: false },
        stock: { view: true, adjust: false },
        customers: { view: true, create: true, edit: false, delete: false },
        reports: { view: false, export: false },
        settings: { view: false, edit: false, system: false },
      }

      const superAdminRole = await tx.role.create({
        data: {
          name: 'Super Admin',
          permissions: JSON.stringify(superAdminPermissions),
          isSystem: true,
        },
      })

      const cashierRole = await tx.role.create({
        data: {
          name: 'Cashier',
          permissions: JSON.stringify(cashierPermissions),
          isSystem: true,
        },
      })

      // 2. Create the Super Admin User (first user)
      const hashedPassword = await hashPassword(password)
      const adminUser = await tx.user.create({
        data: {
          username,
          password: hashedPassword,
          fullName: 'Administrator',
          role: 'OWNER',
          roleId: superAdminRole.id,
          status: 'ACTIVE',
        },
      })

      // 3. Create default Settings
      await tx.setting.upsert({
        where: { key: 'storeName' },
        update: {
          value: JSON.stringify(storeName),
          category: 'store',
        },
        create: {
          key: 'storeName',
          value: JSON.stringify(storeName),
          category: 'store',
        },
      })

      // Create other default settings
      await tx.setting.upsert({
        where: { key: 'storeAddress' },
        update: {},
        create: {
          key: 'storeAddress',
          value: JSON.stringify(''),
          category: 'store',
        },
      })

      await tx.setting.upsert({
        where: { key: 'storePhone' },
        update: {},
        create: {
          key: 'storePhone',
          value: JSON.stringify(''),
          category: 'store',
        },
      })

      await tx.setting.upsert({
        where: { key: 'storeEmail' },
        update: {},
        create: {
          key: 'storeEmail',
          value: JSON.stringify(''),
          category: 'store',
        },
      })

      // 4. Create basic Units
      const units = [
        { name: 'Piece', shortName: 'pcs' },
        { name: 'Kilogram', shortName: 'kg' },
      ]

      for (const unit of units) {
        await tx.unit.upsert({
          where: { shortName: unit.shortName },
          update: {},
          create: unit,
        })
      }

      // 5. Create default Category
      await tx.category.upsert({
        where: { name: 'General' },
        update: {},
        create: {
          name: 'General',
          description: 'General category for products',
        },
      })

      // 6. Create system user for activity logs
      await tx.user.upsert({
        where: { username: 'system' },
        update: {},
        create: {
          username: 'system',
          password: hashedPassword, // Dummy password, won't be used for login
          fullName: 'System',
          role: 'CASHIER',
          status: 'INACTIVE', // System user is inactive
        },
      })

      return { adminUser, superAdminRole }
    })

    // Create session and log in the admin user
    await createSession(result.adminUser.id)

    revalidatePath('/')
    revalidatePath('/dashboard')

    // Redirect to dashboard
    redirect('/dashboard')
  } catch (error: any) {
    console.error('Error initializing system:', error)
    return {
      success: false,
      error: error.message || 'Failed to initialize system. Please try again.',
    }
  }
}

/**
 * Check if system is already initialized (has users)
 */
export async function isSystemInitialized() {
  try {
    const userCount = await prisma.user.count({
      where: {
        username: {
          not: 'system', // Exclude system user
        },
      },
    })
    return userCount > 0
  } catch (error) {
    console.error('Error checking system initialization:', error)
    return true // Assume initialized on error (fail safe)
  }
}

