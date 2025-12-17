'use server'

import ExcelJS from 'exceljs'
import { prisma } from '@/lib/prisma'
import { getSession } from '@/lib/auth'

export interface ColumnDefinition {
  header: string
  key: string
  required: boolean
  width?: number
}

/**
 * Product column definitions for Excel template
 */
export const PRODUCT_COLUMNS: ColumnDefinition[] = [
  {
    header: 'Barcode',
    key: 'barcode',
    required: true,
    width: 20,
  },
  {
    header: 'Name',
    key: 'name',
    required: true,
    width: 30,
  },
  {
    header: 'Category',
    key: 'category',
    required: true,
    width: 20,
  },
  {
    header: 'Cost Price',
    key: 'costPrice',
    required: true,
    width: 15,
  },
  {
    header: 'Sell Price',
    key: 'sellPrice',
    required: true,
    width: 15,
  },
  {
    header: 'Stock',
    key: 'stock',
    required: true,
    width: 12,
  },
  {
    header: 'Description',
    key: 'description',
    required: false,
    width: 40,
  },
]

/**
 * Server action to download product template
 * Note: This is a function wrapper, but the actual download happens client-side
 */
export async function downloadProductTemplate() {
  // This function is called from client, but we return the columns definition
  // The actual download is handled client-side using downloadTemplate
  return {
    success: true,
    columns: PRODUCT_COLUMNS,
  }
}

/**
 * Interface for product data used in export
 */
interface ProductExportData {
  barcode: string | null
  name: string
  category: string
  costPrice: number
  sellPrice: number
  stock: number
  description: string | null
}

/**
 * Generate Excel file for product list export
 * @param products - Array of product data with category information
 * @returns Buffer containing the Excel file
 */
async function generateProductListExcel(products: ProductExportData[]): Promise<Buffer> {
  const workbook = new ExcelJS.Workbook()
  const worksheet = workbook.addWorksheet('Products')

  // Define columns
  worksheet.columns = [
    { header: 'Barcode', key: 'barcode', width: 20 },
    { header: 'Name', key: 'name', width: 30 },
    { header: 'Category', key: 'category', width: 20 },
    { header: 'Cost Price', key: 'costPrice', width: 15 },
    { header: 'Sell Price', key: 'sellPrice', width: 15 },
    { header: 'Stock', key: 'stock', width: 12 },
    { header: 'Description', key: 'description', width: 40 },
  ]

  // Style the header row
  const headerRow = worksheet.getRow(1)
  headerRow.fill = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: 'FFDCE6F1' }, // Light Blue Background
  }
  headerRow.font = {
    bold: true,
  }
  headerRow.alignment = {
    vertical: 'middle',
    horizontal: 'center',
  }
  headerRow.height = 20

  // Add data rows
  products.forEach((product) => {
    const row = worksheet.addRow({
      barcode: product.barcode || '',
      name: product.name,
      category: product.category,
      costPrice: product.costPrice,
      sellPrice: product.sellPrice,
      stock: product.stock,
      description: product.description || '',
    })

    // Apply borders to all cells in the row
    row.eachCell((cell) => {
      cell.border = {
        top: { style: 'thin' },
        left: { style: 'thin' },
        bottom: { style: 'thin' },
        right: { style: 'thin' },
      }
    })
  })

  // Auto-calculate column widths based on content
  worksheet.columns.forEach((column) => {
    if (column.header) {
      let maxLength = column.header.length
      column.eachCell({ includeEmpty: false }, (cell) => {
        const cellValue = cell.value?.toString() || ''
        if (cellValue.length > maxLength) {
          maxLength = cellValue.length
        }
      })
      // Set width with some padding (add 2 for padding)
      column.width = Math.max(maxLength + 2, column.width || 10)
    }
  })

  // Freeze the header row
  worksheet.views = [
    {
      state: 'frozen',
      ySplit: 1,
    },
  ]

  // Generate buffer
  const buffer = await workbook.xlsx.writeBuffer()
  return Buffer.from(buffer)
}

/**
 * Export all products to Excel file
 * @returns Base64 encoded string of the Excel file
 */
export async function exportProductsData() {
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
    const canView = await checkUserPermission('products', 'view')
    if (!canView) {
      return {
        success: false,
        error: 'You do not have permission to export products',
      }
    }

    // Fetch all products with category
    const products = await prisma.product.findMany({
      include: {
        category: {
          select: {
            name: true,
          },
        },
      },
      orderBy: {
        name: 'asc',
      },
    })

    // Map products to flat structure
    const exportData: ProductExportData[] = products.map((product) => ({
      barcode: product.barcode,
      name: product.name,
      category: product.category.name,
      costPrice: Number(product.purchasePrice),
      sellPrice: Number(product.sellingPrice),
      stock: Number(product.stock),
      description: product.description,
    }))

    // Generate Excel file
    const buffer = await generateProductListExcel(exportData)

    // Convert buffer to Base64
    const base64 = buffer.toString('base64')

    return {
      success: true,
      data: base64,
    }
  } catch (error: any) {
    console.error('Error exporting products:', error)
    return {
      success: false,
      error: error.message || 'Failed to export products',
    }
  }
}
