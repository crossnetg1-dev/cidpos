'use server'

import { prisma } from '@/lib/prisma'
import { Decimal } from '@prisma/client/runtime/library'
import { format, startOfDay, endOfDay } from 'date-fns'

export interface ReportData {
  financialSummary: {
    totalRevenue: number
    totalCost: number
    netProfit: number
    profitMargin: number
  }
  salesChartData: Array<{
    date: string
    sales: number
    profit: number
  }>
  topSellingProducts: Array<{
    productId: string
    productName: string
    quantitySold: number
    revenue: number
  }>
  paymentMethodSplit: Array<{
    method: string
    amount: number
    count: number
    percentage: number
  }>
}

export interface GetReportDataParams {
  startDate: Date
  endDate: Date
}

/**
 * Get comprehensive report data for a date range
 */
export async function getReportData(params: GetReportDataParams): Promise<ReportData> {
  // Check permission
  const { getSession } = await import('@/lib/auth')
  const { checkUserPermission } = await import('@/lib/permissions')
  
  const session = await getSession()
  if (!session) {
    throw new Error('Unauthorized. Please log in again.')
  }

  const canView = await checkUserPermission('reports', 'view')
  if (!canView) {
    throw new Error('You do not have permission to view reports')
  }

  try {
    const { startDate, endDate } = params

    // Normalize dates to start and end of day
    const start = startOfDay(startDate)
    const end = endOfDay(endDate)

    // Fetch all sales in the date range
    const sales = await prisma.sale.findMany({
      where: {
        createdAt: {
          gte: start,
          lte: end,
        },
        status: {
          not: 'VOID',
        },
      },
      include: {
        items: {
          include: {
            product: {
              select: {
                id: true,
                name: true,
                purchasePrice: true,
              },
            },
          },
        },
      },
      orderBy: {
        createdAt: 'asc',
      },
    })

    // Calculate Financial Summary
    let totalRevenue = 0
    let totalCost = 0

    for (const sale of sales) {
      totalRevenue += Number(sale.total)

      // Calculate cost for each item
      for (const item of sale.items) {
        const costPrice = Number(item.product.purchasePrice)
        const quantity = Number(item.quantity)
        totalCost += costPrice * quantity
      }
    }

    const netProfit = totalRevenue - totalCost
    const profitMargin = totalRevenue > 0 ? (netProfit / totalRevenue) * 100 : 0

    // Generate Sales Chart Data (daily breakdown)
    const salesByDate = new Map<string, { sales: number; profit: number }>()

    for (const sale of sales) {
      const dateKey = format(new Date(sale.createdAt), 'MMM dd')
      
      if (!salesByDate.has(dateKey)) {
        salesByDate.set(dateKey, { sales: 0, profit: 0 })
      }

      const dayData = salesByDate.get(dateKey)!
      dayData.sales += Number(sale.total)

      // Calculate profit for this sale
      let saleCost = 0
      for (const item of sale.items) {
        const costPrice = Number(item.product.purchasePrice)
        const quantity = Number(item.quantity)
        saleCost += costPrice * quantity
      }
      dayData.profit += Number(sale.total) - saleCost
    }

    const salesChartData = Array.from(salesByDate.entries())
      .map(([date, data]) => ({
        date,
        sales: Math.round(data.sales * 100) / 100,
        profit: Math.round(data.profit * 100) / 100,
      }))
      .sort((a, b) => {
        // Sort by date
        const dateA = new Date(a.date)
        const dateB = new Date(b.date)
        return dateA.getTime() - dateB.getTime()
      })

    // Calculate Top Selling Products
    const productSales = new Map<
      string,
      { name: string; quantity: number; revenue: number }
    >()

    for (const sale of sales) {
      for (const item of sale.items) {
        const productId = item.productId
        const productName = item.product.name
        const quantity = Number(item.quantity)
        const revenue = Number(item.total)

        if (!productSales.has(productId)) {
          productSales.set(productId, {
            name: productName,
            quantity: 0,
            revenue: 0,
          })
        }

        const productData = productSales.get(productId)!
        productData.quantity += quantity
        productData.revenue += revenue
      }
    }

    const topSellingProducts = Array.from(productSales.entries())
      .map(([productId, data]) => ({
        productId,
        productName: data.name,
        quantitySold: Math.round(data.quantity * 100) / 100,
        revenue: Math.round(data.revenue * 100) / 100,
      }))
      .sort((a, b) => b.quantitySold - a.quantitySold)
      .slice(0, 5)

    // Calculate Payment Method Split
    const paymentMethods = new Map<string, { amount: number; count: number }>()

    for (const sale of sales) {
      const method = sale.paymentMethod || 'CASH'
      const amount = Number(sale.total)

      if (!paymentMethods.has(method)) {
        paymentMethods.set(method, { amount: 0, count: 0 })
      }

      const methodData = paymentMethods.get(method)!
      methodData.amount += amount
      methodData.count += 1
    }

    const paymentMethodSplit = Array.from(paymentMethods.entries())
      .map(([method, data]) => ({
        method,
        amount: Math.round(data.amount * 100) / 100,
        count: data.count,
        percentage: totalRevenue > 0 ? (data.amount / totalRevenue) * 100 : 0,
      }))
      .sort((a, b) => b.amount - a.amount)

    return {
      financialSummary: {
        totalRevenue: Math.round(totalRevenue * 100) / 100,
        totalCost: Math.round(totalCost * 100) / 100,
        netProfit: Math.round(netProfit * 100) / 100,
        profitMargin: Math.round(profitMargin * 100) / 100,
      },
      salesChartData,
      topSellingProducts,
      paymentMethodSplit,
    }
  } catch (error) {
    console.error('Error fetching report data:', error)
    return {
      financialSummary: {
        totalRevenue: 0,
        totalCost: 0,
        netProfit: 0,
        profitMargin: 0,
      },
      salesChartData: [],
      topSellingProducts: [],
      paymentMethodSplit: [],
    }
  }
}

/**
 * Get dead stock products (products with 0 sales in date range)
 */
export async function getDeadStockProducts(params: GetReportDataParams) {
  try {
    const { startDate, endDate } = params
    const start = startOfDay(startDate)
    const end = endOfDay(endDate)

    // Get all products
    const allProducts = await prisma.product.findMany({
      where: {
        isActive: true,
      },
      select: {
        id: true,
        name: true,
        stock: true,
        purchasePrice: true,
      },
    })

    // Get products that had sales in the period
    const productsWithSales = await prisma.saleItem.findMany({
      where: {
        sale: {
          createdAt: {
            gte: start,
            lte: end,
          },
          status: {
            not: 'VOID',
          },
        },
      },
      select: {
        productId: true,
      },
      distinct: ['productId'],
    })

    const soldProductIds = new Set(productsWithSales.map((item) => item.productId))

    // Find products with no sales
    const deadStock = allProducts
      .filter((product) => !soldProductIds.has(product.id))
      .map((product) => ({
        id: product.id,
        name: product.name,
        stock: Number(product.stock),
        value: Number(product.stock) * Number(product.purchasePrice),
      }))
      .sort((a, b) => b.value - a.value) // Sort by inventory value

    return deadStock
  } catch (error) {
    console.error('Error fetching dead stock:', error)
    return []
  }
}

