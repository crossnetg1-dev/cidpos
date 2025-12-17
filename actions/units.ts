'use server'

import { prisma } from '@/lib/prisma'
import { revalidatePath } from 'next/cache'

export interface UnitFormData {
  name: string
  shortName: string
}

export async function getUnits(includeInactive: boolean = false) {
  try {
    const units = await prisma.unit.findMany({
      where: includeInactive ? {} : { isActive: true },
      orderBy: {
        name: 'asc',
      },
    })

    return units
  } catch (error) {
    console.error('Error fetching units:', error)
    return []
  }
}

export async function createUnit(data: UnitFormData) {
  try {
    // Check if unit with same name or shortName already exists
    const existingName = await prisma.unit.findUnique({
      where: { name: data.name },
    })

    if (existingName) {
      return {
        success: false,
        error: 'Unit with this name already exists',
      }
    }

    const existingShortName = await prisma.unit.findUnique({
      where: { shortName: data.shortName },
    })

    if (existingShortName) {
      return {
        success: false,
        error: 'Unit with this short name already exists',
      }
    }

    const unit = await prisma.unit.create({
      data: {
        name: data.name,
        shortName: data.shortName,
        isActive: true,
      },
    })

    revalidatePath('/units')
    revalidatePath('/products')

    return {
      success: true,
      data: unit,
    }
  } catch (error: any) {
    console.error('Error creating unit:', error)
    return {
      success: false,
      error: error.message || 'Failed to create unit',
    }
  }
}

export async function updateUnit(id: string, data: UnitFormData) {
  try {
    // Check if another unit with same name exists
    const existingName = await prisma.unit.findFirst({
      where: {
        name: data.name,
        id: { not: id },
      },
    })

    if (existingName) {
      return {
        success: false,
        error: 'Unit with this name already exists',
      }
    }

    // Check if another unit with same shortName exists
    const existingShortName = await prisma.unit.findFirst({
      where: {
        shortName: data.shortName,
        id: { not: id },
      },
    })

    if (existingShortName) {
      return {
        success: false,
        error: 'Unit with this short name already exists',
      }
    }

    const unit = await prisma.unit.update({
      where: { id },
      data: {
        name: data.name,
        shortName: data.shortName,
      },
    })

    revalidatePath('/units')
    revalidatePath('/products')

    return {
      success: true,
      data: unit,
    }
  } catch (error: any) {
    console.error('Error updating unit:', error)
    return {
      success: false,
      error: error.message || 'Failed to update unit',
    }
  }
}

export async function deleteUnit(id: string) {
  try {
    // Check if unit is used in any products
    const productsCount = await prisma.product.count({
      where: {
        unit: {
          // Since unit is stored as string in Product, we need to check differently
          // For now, we'll just soft delete
        },
        isActive: true,
      },
    })

    // Note: Since Product.unit is a string field, we can't easily check usage
    // We'll just soft delete the unit
    await prisma.unit.update({
      where: { id },
      data: {
        isActive: false,
      },
    })

    revalidatePath('/units')
    revalidatePath('/products')

    return {
      success: true,
    }
  } catch (error: any) {
    console.error('Error deleting unit:', error)
    return {
      success: false,
      error: error.message || 'Failed to delete unit',
    }
  }
}

