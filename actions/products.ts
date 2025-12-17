'use server'

import { prisma } from '@/lib/prisma'
import { Decimal } from '@prisma/client/runtime/library'
import { revalidatePath } from 'next/cache'
import { getSession } from '@/lib/auth'

export interface ProductFormData {
  name: string
  barcode?: string
  sku?: string
  description?: string
  categoryId: string
  purchasePrice: number
  sellingPrice: number
  stock?: number // Optional - only used for new products, ignored on updates
  minStockLevel: number
  unit: string
  expiryDate?: Date | string | null
  image?: string
}

export interface GetProductsParams {
  query?: string
  page?: number
  categoryId?: string
}

export interface ProductsResponse {
  products: Array<{
    id: string
    name: string
    barcode: string | null
    sku: string | null
    description: string | null
    image: string | null
    purchasePrice: number
    sellingPrice: number
    stock: number
    minStockLevel: number
    unit: string
    expiryDate: Date | null
    isActive: boolean
    category: {
      id: string
      name: string
    }
  }>
  total: number
  page: number
  totalPages: number
}

export async function getProducts(params: GetProductsParams = {}): Promise<ProductsResponse> {
  try {
    const { query, page = 1, categoryId } = params
    const pageSize = 10
    const skip = (page - 1) * pageSize

    const where: any = {
      isActive: true,
    }

    // Search by name or barcode
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

    // Get total count
    const total = await prisma.product.count({ where })

    // Get products with pagination
    const products = await prisma.product.findMany({
      where,
      skip,
      take: pageSize,
      include: {
        category: {
          select: {
            id: true,
            name: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    })

    // Convert Decimal to number for serialization
    const serializedProducts = products.map((product) => ({
      id: product.id,
      name: product.name,
      barcode: product.barcode,
      sku: product.sku,
      description: product.description,
      image: product.image,
      purchasePrice: Number(product.purchasePrice),
      sellingPrice: Number(product.sellingPrice),
      stock: Number(product.stock),
      minStockLevel: Number(product.minStockLevel),
      unit: product.unit,
      expiryDate: product.expiryDate,
      isActive: product.isActive,
      category: product.category,
    }))

    return {
      products: serializedProducts,
      total,
      page,
      totalPages: Math.ceil(total / pageSize),
    }
  } catch (error) {
    console.error('Error fetching products:', error)
    return {
      products: [],
      total: 0,
      page: 1,
      totalPages: 0,
    }
  }
}

export async function createProduct(data: ProductFormData) {
  try {
    const product = await prisma.product.create({
      data: {
        name: data.name,
        barcode: data.barcode || null,
        sku: data.sku || null,
        description: data.description || null,
        categoryId: data.categoryId,
        purchasePrice: new Decimal(data.purchasePrice),
        sellingPrice: new Decimal(data.sellingPrice),
        stock: new Decimal(data.stock || 0), // Default to 0 if not provided
        minStockLevel: new Decimal(data.minStockLevel || 5),
        unit: data.unit || 'pcs',
        expiryDate: data.expiryDate ? new Date(data.expiryDate) : null,
        image: data.image || null,
        isActive: true,
      },
      include: {
        category: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    })

    revalidatePath('/products')
    revalidatePath('/dashboard')
    revalidatePath('/pos')

    return {
      success: true,
      data: {
        ...product,
        purchasePrice: Number(product.purchasePrice),
        sellingPrice: Number(product.sellingPrice),
        stock: Number(product.stock),
        minStockLevel: Number(product.minStockLevel),
      },
    }
  } catch (error: any) {
    console.error('Error creating product:', error)
    return {
      success: false,
      error: error.message || 'Failed to create product',
    }
  }
}

export async function updateProduct(id: string, data: ProductFormData) {
  try {
    // Get current session for PriceHistory tracking
    const session = await getSession()
    if (!session) {
      return {
        success: false,
        error: 'Unauthorized. Please log in again.',
      }
    }

    // Fetch current product to compare prices and validate barcode
    const currentProduct = await prisma.product.findUnique({
      where: { id },
    })

    if (!currentProduct) {
      return {
        success: false,
        error: 'Product not found',
      }
    }

    // Validate barcode uniqueness if it's being changed
    if (data.barcode && data.barcode !== currentProduct.barcode) {
      const existingProduct = await prisma.product.findUnique({
        where: { barcode: data.barcode },
      })

      if (existingProduct) {
        return {
          success: false,
          error: 'Barcode already exists. Please use a different barcode.',
        }
      }
    }

    // Prepare update data (EXCLUDE stock - it should never be updated via edit form)
    const updateData: any = {
      name: data.name,
      barcode: data.barcode || null,
      sku: data.sku || null,
      description: data.description || null,
      categoryId: data.categoryId,
      purchasePrice: new Decimal(data.purchasePrice),
      sellingPrice: new Decimal(data.sellingPrice),
      // stock is intentionally excluded - use Purchase or Stock Adjustment instead
      minStockLevel: new Decimal(data.minStockLevel || 5),
      unit: data.unit || 'pcs',
      expiryDate: data.expiryDate ? new Date(data.expiryDate) : null,
      image: data.image || null,
    }

    // Check if prices changed and create PriceHistory records
    const oldPurchasePrice = Number(currentProduct.purchasePrice)
    const oldSellingPrice = Number(currentProduct.sellingPrice)
    const newPurchasePrice = data.purchasePrice
    const newSellingPrice = data.sellingPrice

    // Update product
    const product = await prisma.product.update({
      where: { id },
      data: updateData,
      include: {
        category: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    })

    // Create PriceHistory records if prices changed
    if (oldPurchasePrice !== newPurchasePrice) {
      await prisma.priceHistory.create({
        data: {
          productId: id,
          userId: session.userId,
          oldPrice: new Decimal(oldPurchasePrice),
          newPrice: new Decimal(newPurchasePrice),
          priceType: 'purchase',
          reason: 'Manual Update',
        },
      })
    }

    if (oldSellingPrice !== newSellingPrice) {
      await prisma.priceHistory.create({
        data: {
          productId: id,
          userId: session.userId,
          oldPrice: new Decimal(oldSellingPrice),
          newPrice: new Decimal(newSellingPrice),
          priceType: 'selling',
          reason: 'Manual Update',
        },
      })
    }

    revalidatePath('/products')
    revalidatePath('/dashboard')
    revalidatePath('/pos')

    return {
      success: true,
      data: {
        ...product,
        purchasePrice: Number(product.purchasePrice),
        sellingPrice: Number(product.sellingPrice),
        stock: Number(product.stock),
        minStockLevel: Number(product.minStockLevel),
      },
    }
  } catch (error: any) {
    console.error('Error updating product:', error)
    
    // Handle Prisma unique constraint errors
    if (error.code === 'P2002') {
      if (error.meta?.target?.includes('barcode')) {
        return {
          success: false,
          error: 'Barcode already exists. Please use a different barcode.',
        }
      }
    }

    return {
      success: false,
      error: error.message || 'Failed to update product',
    }
  }
}

export async function deleteProduct(id: string) {
  try {
    const session = await getSession()
    if (!session) {
      return {
        success: false,
        error: 'Unauthorized. Please log in again.',
      }
    }

    // Get user with role permissions
    const user = await prisma.user.findUnique({
      where: { id: session.userId },
      include: {
        roleRelation: true,
      },
    })

    if (!user) {
      return {
        success: false,
        error: 'User not found',
      }
    }

    // Super Admin bypass
    if (user.roleRelation?.name === 'Super Admin') {
      // Allow deletion
    } else {
      // Check permission
      if (!user.roleRelation) {
        return {
          success: false,
          error: 'You do not have permission to delete products',
        }
      }

      const permissions = JSON.parse(user.roleRelation.permissions) as any
      const canDelete = permissions?.products?.delete === true

      if (!canDelete) {
        return {
          success: false,
          error: 'You do not have permission to delete products',
        }
      }
    }

    // Soft delete by setting isActive to false
    await prisma.product.update({
      where: { id },
      data: {
        isActive: false,
      },
    })

    revalidatePath('/products')
    revalidatePath('/dashboard')
    revalidatePath('/pos')

    return {
      success: true,
    }
  } catch (error: any) {
    console.error('Error deleting product:', error)
    return {
      success: false,
      error: error.message || 'Failed to delete product',
    }
  }
}

export async function getCategories() {
  try {
    const categories = await prisma.category.findMany({
      where: {
        isActive: true,
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

export interface BulkImportProductData {
  barcode: string
  name: string
  category: string
  costPrice: number
  sellPrice: number
  stock: number
  description?: string
}

export interface BulkImportResult {
  success: boolean
  imported: number
  updated: number
  error?: string
}

export async function bulkImportProducts(
  data: BulkImportProductData[]
): Promise<BulkImportResult> {
  try {
    const session = await getSession()
    if (!session) {
      return {
        success: false,
        imported: 0,
        updated: 0,
        error: 'Unauthorized. Please log in again.',
      }
    }

    // Check permission
    const { checkUserPermission } = await import('@/lib/permissions')
    const canCreate = await checkUserPermission('products', 'create')
    if (!canCreate) {
      return {
        success: false,
        imported: 0,
        updated: 0,
        error: 'You do not have permission to import products',
      }
    }

    let imported = 0
    let updated = 0

    // Use transaction to ensure all-or-nothing import
    await prisma.$transaction(async (tx) => {
      for (const item of data) {
        // Find or create category
        let category = await tx.category.findFirst({
          where: {
            name: {
              equals: item.category.trim(),
              mode: 'insensitive',
            },
            isActive: true,
          },
        })

        if (!category) {
          // Create new category
          category = await tx.category.create({
            data: {
              name: item.category.trim(),
              isActive: true,
            },
          })
        }

        // Check if product exists by barcode
        const existingProduct = await tx.product.findUnique({
          where: {
            barcode: item.barcode.trim(),
          },
        })

        if (existingProduct) {
          // Update existing product (upsert behavior)
          await tx.product.update({
            where: {
              id: existingProduct.id,
            },
            data: {
              name: item.name.trim(),
              categoryId: category.id,
              purchasePrice: new Decimal(item.costPrice),
              sellingPrice: new Decimal(item.sellPrice),
              stock: new Decimal(item.stock),
              description: item.description?.trim() || null,
              minStockLevel: existingProduct.minStockLevel, // Keep existing min stock level
              unit: existingProduct.unit, // Keep existing unit
            },
          })
          updated++
        } else {
          // Create new product
          await tx.product.create({
            data: {
              name: item.name.trim(),
              barcode: item.barcode.trim(),
              categoryId: category.id,
              purchasePrice: new Decimal(item.costPrice),
              sellingPrice: new Decimal(item.sellPrice),
              stock: new Decimal(item.stock),
              description: item.description?.trim() || null,
              minStockLevel: new Decimal(5), // Default min stock level
              unit: 'pcs', // Default unit
              isActive: true,
            },
          })
          imported++
        }
      }
    })

    revalidatePath('/products')
    revalidatePath('/dashboard')
    revalidatePath('/pos')

    return {
      success: true,
      imported,
      updated,
    }
  } catch (error: any) {
    console.error('Error bulk importing products:', error)
    return {
      success: false,
      imported: 0,
      updated: 0,
      error: error.message || 'Failed to import products',
    }
  }
}

