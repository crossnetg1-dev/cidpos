'use server'

import { prisma } from '@/lib/prisma'
import { 
  startOfMonth, 
  endOfMonth, 
  startOfDay, 
  endOfDay, 
  subMonths, 
  subDays,
  subWeeks,
  startOfWeek,
  endOfWeek,
  format,
  eachDayOfInterval
} from 'date-fns'

export interface DashboardAnalytics {
  // Monthly data
  thisMonthSales: number
  lastMonthSales: number
  monthlyGrowth: number
  
  // Weekly data
  thisWeekSales: number
  lastWeekSales: number
  weeklyGrowth: number
  
  // Daily data
  todaySales: number
  yesterdaySales: number
  dailyGrowth: number
  
  // 30-day trend data
  dailySalesData: Array<{
    date: string
    amount: number
  }>
}

export async function getDashboardAnalytics(): Promise<DashboardAnalytics> {
  try {
    const now = new Date()
    
    // ===== MONTHLY DATA =====
    const thisMonthStart = startOfMonth(now)
    const thisMonthEnd = endOfMonth(now)
    const lastMonthStart = startOfMonth(subMonths(now, 1))
    const lastMonthEnd = endOfMonth(subMonths(now, 1))
    
    const thisMonthSalesData = await prisma.sale.aggregate({
      where: {
        createdAt: {
          gte: thisMonthStart,
          lte: thisMonthEnd,
        },
        status: 'COMPLETED',
      },
      _sum: {
        total: true,
      },
    })
    
    const lastMonthSalesData = await prisma.sale.aggregate({
      where: {
        createdAt: {
          gte: lastMonthStart,
          lte: lastMonthEnd,
        },
        status: 'COMPLETED',
      },
      _sum: {
        total: true,
      },
    })
    
    const thisMonthSales = Number(thisMonthSalesData._sum.total || 0)
    const lastMonthSales = Number(lastMonthSalesData._sum.total || 0)
    const monthlyGrowth = lastMonthSales > 0 
      ? ((thisMonthSales - lastMonthSales) / lastMonthSales) * 100 
      : (thisMonthSales > 0 ? 100 : 0)
    
    // ===== WEEKLY DATA =====
    const thisWeekStart = startOfWeek(now, { weekStartsOn: 1 }) // Monday
    const thisWeekEnd = endOfWeek(now, { weekStartsOn: 1 })
    const lastWeekStart = startOfWeek(subWeeks(now, 1), { weekStartsOn: 1 })
    const lastWeekEnd = endOfWeek(subWeeks(now, 1), { weekStartsOn: 1 })
    
    const thisWeekSalesData = await prisma.sale.aggregate({
      where: {
        createdAt: {
          gte: thisWeekStart,
          lte: thisWeekEnd,
        },
        status: 'COMPLETED',
      },
      _sum: {
        total: true,
      },
    })
    
    const lastWeekSalesData = await prisma.sale.aggregate({
      where: {
        createdAt: {
          gte: lastWeekStart,
          lte: lastWeekEnd,
        },
        status: 'COMPLETED',
      },
      _sum: {
        total: true,
      },
    })
    
    const thisWeekSales = Number(thisWeekSalesData._sum.total || 0)
    const lastWeekSales = Number(lastWeekSalesData._sum.total || 0)
    const weeklyGrowth = lastWeekSales > 0 
      ? ((thisWeekSales - lastWeekSales) / lastWeekSales) * 100 
      : (thisWeekSales > 0 ? 100 : 0)
    
    // ===== DAILY DATA =====
    const todayStart = startOfDay(now)
    const todayEnd = endOfDay(now)
    const yesterdayStart = startOfDay(subDays(now, 1))
    const yesterdayEnd = endOfDay(subDays(now, 1))
    
    const todaySalesData = await prisma.sale.aggregate({
      where: {
        createdAt: {
          gte: todayStart,
          lte: todayEnd,
        },
        status: 'COMPLETED',
      },
      _sum: {
        total: true,
      },
    })
    
    const yesterdaySalesData = await prisma.sale.aggregate({
      where: {
        createdAt: {
          gte: yesterdayStart,
          lte: yesterdayEnd,
        },
        status: 'COMPLETED',
      },
      _sum: {
        total: true,
      },
    })
    
    const todaySales = Number(todaySalesData._sum.total || 0)
    const yesterdaySales = Number(yesterdaySalesData._sum.total || 0)
    const dailyGrowth = yesterdaySales > 0 
      ? ((todaySales - yesterdaySales) / yesterdaySales) * 100 
      : (todaySales > 0 ? 100 : 0)
    
    // ===== 30-DAY TREND DATA =====
    const thirtyDaysAgo = startOfDay(subDays(now, 29)) // Last 30 days including today
    const dateRange = eachDayOfInterval({
      start: thirtyDaysAgo,
      end: now,
    })
    
    // Fetch all sales in the last 30 days
    const salesLast30Days = await prisma.sale.findMany({
      where: {
        createdAt: {
          gte: thirtyDaysAgo,
          lte: now,
        },
        status: 'COMPLETED',
      },
      select: {
        total: true,
        createdAt: true,
      },
    })
    
    // Group sales by date with DD/MM format
    const salesByDate: { [key: string]: number } = {}
    
    // Initialize all dates with 0 using DD/MM format
    dateRange.forEach((date) => {
      const dateKey = format(date, 'dd/MM')
      salesByDate[dateKey] = 0
    })
    
    // Aggregate sales by date
    salesLast30Days.forEach((sale) => {
      const dateKey = format(sale.createdAt, 'dd/MM')
      salesByDate[dateKey] = (salesByDate[dateKey] || 0) + Number(sale.total)
    })
    
    // Convert to array format for chart with DD/MM format
    const dailySalesData = Object.entries(salesByDate)
      .map(([date, amount]) => ({
        date, // Already in DD/MM format
        amount: Math.round(amount * 100) / 100,
      }))
      .sort((a, b) => {
        // Sort by date (parse DD/MM format for proper sorting)
        const [dayA, monthA] = a.date.split('/').map(Number)
        const [dayB, monthB] = b.date.split('/').map(Number)
        if (monthA !== monthB) return monthA - monthB
        return dayA - dayB
      })
    
    return {
      thisMonthSales: Math.round(thisMonthSales * 100) / 100,
      lastMonthSales: Math.round(lastMonthSales * 100) / 100,
      monthlyGrowth: Math.round(monthlyGrowth * 100) / 100,
      thisWeekSales: Math.round(thisWeekSales * 100) / 100,
      lastWeekSales: Math.round(lastWeekSales * 100) / 100,
      weeklyGrowth: Math.round(weeklyGrowth * 100) / 100,
      todaySales: Math.round(todaySales * 100) / 100,
      yesterdaySales: Math.round(yesterdaySales * 100) / 100,
      dailyGrowth: Math.round(dailyGrowth * 100) / 100,
      dailySalesData,
    }
  } catch (error) {
    console.error('Error fetching dashboard analytics:', error)
    return {
      thisMonthSales: 0,
      lastMonthSales: 0,
      monthlyGrowth: 0,
      thisWeekSales: 0,
      lastWeekSales: 0,
      weeklyGrowth: 0,
      todaySales: 0,
      yesterdaySales: 0,
      dailyGrowth: 0,
      dailySalesData: [],
    }
  }
}

