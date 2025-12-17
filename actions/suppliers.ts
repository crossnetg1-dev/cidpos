'use server'

import { prisma } from '@/lib/prisma'
import { revalidatePath } from 'next/cache'

export interface SupplierFormData {
  name: string
  companyName?: string
  phone?: string
  email?: string
  address?: string
  creditLimit?: number
  openingBalance?: number
}

/**
 * Create a new supplier
 */
export async function createSupplier(data: SupplierFormData) {
  try {
    const supplier = await prisma.supplier.create({
      data: {
        name: data.name,
        companyName: data.companyName || null,
        phone: data.phone || null,
        email: data.email || null,
        address: data.address || null,
        creditLimit: data.creditLimit || 0,
        openingBalance: data.openingBalance || 0,
        isActive: true,
      },
    })

    revalidatePath('/purchases')
    revalidatePath('/purchases/create')

    return {
      success: true,
      data: supplier,
    }
  } catch (error: any) {
    console.error('Error creating supplier:', error)
    return {
      success: false,
      error: error.message || 'Failed to create supplier',
    }
  }
}

/**
 * Update an existing supplier
 */
export async function updateSupplier(id: string, data: SupplierFormData) {
  try {
    const supplier = await prisma.supplier.update({
      where: { id },
      data: {
        name: data.name,
        companyName: data.companyName || null,
        phone: data.phone || null,
        email: data.email || null,
        address: data.address || null,
        creditLimit: data.creditLimit || 0,
        openingBalance: data.openingBalance || 0,
      },
    })

    revalidatePath('/purchases')
    revalidatePath('/purchases/create')

    return {
      success: true,
      data: supplier,
    }
  } catch (error: any) {
    console.error('Error updating supplier:', error)
    return {
      success: false,
      error: error.message || 'Failed to update supplier',
    }
  }
}

/**
 * Delete a supplier (only if no purchases exist)
 */
export async function deleteSupplier(id: string) {
  try {
    // Check if supplier has any purchases
    const purchaseCount = await prisma.purchase.count({
      where: { supplierId: id },
    })

    if (purchaseCount > 0) {
      return {
        success: false,
        error: `Cannot delete supplier. They have ${purchaseCount} purchase record(s). Please deactivate instead.`,
      }
    }

    // Check if supplier has any payments
    const paymentCount = await prisma.purchasePayment.count({
      where: { supplierId: id },
    })

    if (paymentCount > 0) {
      return {
        success: false,
        error: `Cannot delete supplier. They have ${paymentCount} payment record(s). Please deactivate instead.`,
      }
    }

    // Safe to delete
    await prisma.supplier.delete({
      where: { id },
    })

    revalidatePath('/purchases')
    revalidatePath('/purchases/create')

    return {
      success: true,
    }
  } catch (error: any) {
    console.error('Error deleting supplier:', error)
    return {
      success: false,
      error: error.message || 'Failed to delete supplier',
    }
  }
}

/**
 * Get all suppliers (for management)
 */
export async function getAllSuppliers() {
  try {
    const suppliers = await prisma.supplier.findMany({
      orderBy: {
        name: 'asc',
      },
      select: {
        id: true,
        name: true,
        companyName: true,
        phone: true,
        email: true,
        address: true,
        isActive: true,
        createdAt: true,
      },
    })

    return suppliers
  } catch (error) {
    console.error('Error fetching suppliers:', error)
    return []
  }
}

