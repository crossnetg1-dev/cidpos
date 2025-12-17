'use server'

import { prisma } from '@/lib/prisma'
import { revalidatePath } from 'next/cache'

export interface CategoryFormData {
  name: string
  description?: string
  image?: string
}

export async function getCategories(includeInactive: boolean = false) {
  try {
    const categories = await prisma.category.findMany({
      where: includeInactive ? {} : { isActive: true },
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

export async function createCategory(data: CategoryFormData) {
  try {
    // Check if category with same name already exists
    const existing = await prisma.category.findUnique({
      where: { name: data.name },
    })

    if (existing) {
      return {
        success: false,
        error: 'Category with this name already exists',
      }
    }

    const category = await prisma.category.create({
      data: {
        name: data.name,
        description: data.description || null,
        image: data.image || null,
        isActive: true,
      },
    })

    revalidatePath('/categories')
    revalidatePath('/products')
    revalidatePath('/dashboard')
    revalidatePath('/pos')

    return {
      success: true,
      data: category,
    }
  } catch (error: any) {
    console.error('Error creating category:', error)
    return {
      success: false,
      error: error.message || 'Failed to create category',
    }
  }
}

export async function updateCategory(id: string, data: CategoryFormData) {
  try {
    // Check if another category with same name exists
    const existing = await prisma.category.findFirst({
      where: {
        name: data.name,
        id: { not: id },
      },
    })

    if (existing) {
      return {
        success: false,
        error: 'Category with this name already exists',
      }
    }

    const category = await prisma.category.update({
      where: { id },
      data: {
        name: data.name,
        description: data.description || null,
        image: data.image || null,
      },
    })

    revalidatePath('/categories')
    revalidatePath('/products')
    revalidatePath('/dashboard')
    revalidatePath('/pos')

    return {
      success: true,
      data: category,
    }
  } catch (error: any) {
    console.error('Error updating category:', error)
    return {
      success: false,
      error: error.message || 'Failed to update category',
    }
  }
}

export async function deleteCategory(id: string) {
  try {
    // Check if category has products
    const productsCount = await prisma.product.count({
      where: {
        categoryId: id,
        isActive: true,
      },
    })

    if (productsCount > 0) {
      return {
        success: false,
        error: `Cannot delete category. It has ${productsCount} active product(s). Please reassign or delete products first.`,
      }
    }

    // Soft delete by setting isActive to false
    await prisma.category.update({
      where: { id },
      data: {
        isActive: false,
      },
    })

    revalidatePath('/categories')
    revalidatePath('/products')
    revalidatePath('/dashboard')
    revalidatePath('/pos')

    return {
      success: true,
    }
  } catch (error: any) {
    console.error('Error deleting category:', error)
    return {
      success: false,
      error: error.message || 'Failed to delete category',
    }
  }
}

