'use server'

import { prisma } from '@/lib/prisma'
import { Decimal } from '@prisma/client/runtime/library'
import { startOfDay, endOfDay, startOfHour, subDays } from 'date-fns'

export interface DashboardStats {
  todaySales: number
  todayTransactions: number
  todayProfit: number
  totalProducts: number
  totalCustomers: number
  lowStockItems: number
}

export interface HourlySales {
  hour: string
  amount: number
}

export interface PaymentMethodData {
  name: string
  value: number
}

export interface RecentSale {
  id: string
  saleNumber: string
  total: number
  paymentMethod: string
  createdAt: Date
  user: {
    fullName: string
    username: string
  }
  customer?: {
    name: string
  } | null
}

export interface LowStockProduct {
  id: string
  name: string
  stock: number
  minStockLevel: number
  unit: string
}

export async function getDashboardStats(): Promise<DashboardStats> {
  try {
    const today = new Date()
    const startToday = startOfDay(today)
    const endToday = endOfDay(today)
    const yesterday = startOfDay(subDays(today, 1))

    // Today's sales
    const todaySalesData = await prisma.sale.aggregate({
      where: {
        createdAt: {
          gte: startToday,
          lte: endToday,
        },
        status: 'COMPLETED',
      },
      _sum: {
        total: true,
      },
      _count: {
        id: true,
      },
    })

    // Calculate profit (total - cost)
    const todaySalesWithItems = await prisma.sale.findMany({
      where: {
        createdAt: {
          gte: startToday,
          lte: endToday,
        },
        status: 'COMPLETED',
      },
      include: {
        items: {
          include: {
            product: {
              select: {
                purchasePrice: true,
                sellingPrice: true,
              },
            },
          },
        },
      },
    })

    let todayProfit = 0
    for (const sale of todaySalesWithItems) {
      for (const item of sale.items) {
        const profit = (Number(item.product.sellingPrice) - Number(item.product.purchasePrice)) * Number(item.quantity)
        todayProfit += profit
      }
    }

    // Total products
    const totalProducts = await prisma.product.count({
      where: {
        isActive: true,
      },
    })

    // Low stock items - we need to fetch and filter manually since Prisma doesn't support comparing two fields directly
    const allProducts = await prisma.product.findMany({
      where: {
        isActive: true,
      },
      select: {
        stock: true,
        minStockLevel: true,
      },
    })
    
    const lowStockItems = allProducts.filter(
      (p) => Number(p.stock) <= Number(p.minStockLevel)
    ).length

    // Total customers
    const totalCustomers = await prisma.customer.count({
      where: {
        isActive: true,
      },
    })

    return {
      todaySales: Number(todaySalesData._sum.total || 0),
      todayTransactions: todaySalesData._count.id,
      todayProfit: Math.round(todayProfit * 100) / 100,
      totalProducts,
      totalCustomers,
      lowStockItems,
    }
  } catch (error) {
    console.error('Error fetching dashboard stats:', error)
    return {
      todaySales: 0,
      todayTransactions: 0,
      todayProfit: 0,
      totalProducts: 0,
      totalCustomers: 0,
      lowStockItems: 0,
    }
  }
}

export async function getHourlySales(): Promise<HourlySales[]> {
  try {
    const today = new Date()
    const startToday = startOfDay(today)
    const endToday = endOfDay(today)

    const sales = await prisma.sale.findMany({
      where: {
        createdAt: {
          gte: startToday,
          lte: endToday,
        },
        status: 'COMPLETED',
      },
      select: {
        total: true,
        createdAt: true,
      },
    })

    // Group by hour
    const hourlyData: { [key: string]: number } = {}
    
    // Initialize all 24 hours with 0
    for (let i = 0; i < 24; i++) {
      hourlyData[`${i.toString().padStart(2, '0')}:00`] = 0
    }

    // Aggregate sales by hour
    for (const sale of sales) {
      const hour = sale.createdAt.getHours()
      const hourKey = `${hour.toString().padStart(2, '0')}:00`
      hourlyData[hourKey] = (hourlyData[hourKey] || 0) + Number(sale.total)
    }

    return Object.entries(hourlyData).map(([hour, amount]) => ({
      hour,
      amount: Math.round(amount * 100) / 100,
    }))
  } catch (error) {
    console.error('Error fetching hourly sales:', error)
    return []
  }
}

export async function getPaymentMethodDistribution(): Promise<PaymentMethodData[]> {
  try {
    const today = new Date()
    const startToday = startOfDay(today)
    const endToday = endOfDay(today)

    const sales = await prisma.sale.findMany({
      where: {
        createdAt: {
          gte: startToday,
          lte: endToday,
        },
        status: 'COMPLETED',
      },
      select: {
        total: true,
        paymentMethod: true,
      },
    })

    // Group by payment method
    const methodData: { [key: string]: number } = {}

    for (const sale of sales) {
      const method = sale.paymentMethod || 'CASH'
      methodData[method] = (methodData[method] || 0) + Number(sale.total)
    }

    return Object.entries(methodData)
      .map(([name, value]) => ({
        name,
        value: Math.round(value * 100) / 100,
      }))
      .sort((a, b) => b.value - a.value)
  } catch (error) {
    console.error('Error fetching payment method distribution:', error)
    return []
  }
}

export async function getRecentSales(limit: number = 5): Promise<RecentSale[]> {
  try {
    const sales = await prisma.sale.findMany({
      where: {
        status: 'COMPLETED',
      },
      take: limit,
      orderBy: {
        createdAt: 'desc',
      },
      include: {
        user: {
          select: {
            fullName: true,
            username: true,
          },
        },
        customer: {
          select: {
            name: true,
          },
        },
      },
    })

    return sales.map((sale) => ({
      id: sale.id,
      saleNumber: sale.saleNumber,
      total: Number(sale.total),
      paymentMethod: sale.paymentMethod,
      createdAt: sale.createdAt,
      user: sale.user,
      customer: sale.customer,
    }))
  } catch (error) {
    console.error('Error fetching recent sales:', error)
    return []
  }
}

export async function getLowStockProducts(): Promise<LowStockProduct[]> {
  try {
    const products = await prisma.product.findMany({
      where: {
        isActive: true,
      },
      select: {
        id: true,
        name: true,
        stock: true,
        minStockLevel: true,
        unit: true,
      },
      orderBy: {
        stock: 'asc',
      },
    })

    return products
      .filter((product) => Number(product.stock) <= Number(product.minStockLevel))
      .map((product) => ({
        id: product.id,
        name: product.name,
        stock: Number(product.stock),
        minStockLevel: Number(product.minStockLevel),
        unit: product.unit,
      }))
  } catch (error) {
    console.error('Error fetching low stock products:', error)
    return []
  }
}

