'use client'

import { useState, useTransition } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { DatePickerWithRange } from '@/components/reports/date-picker-with-range'
import { FinancialOverview } from '@/components/reports/financial-overview'
import { ProductPerformance } from '@/components/reports/product-performance'
import { getReportData, getDeadStockProducts, type ReportData } from '@/actions/reports'
import { Download, Calendar, TrendingUp, DollarSign, Package, AlertTriangle } from 'lucide-react'
import { toast } from 'sonner'
import { format, startOfDay, endOfDay, subDays, startOfMonth, endOfMonth, subMonths } from 'date-fns'
import type { DateRange } from 'react-day-picker'

interface ReportsClientProps {
  initialData: ReportData
  initialDeadStock: Array<{
    id: string
    name: string
    stock: number
    value: number
  }>
  initialStartDate: Date
  initialEndDate: Date
}

export function ReportsClient({
  initialData,
  initialDeadStock,
  initialStartDate,
  initialEndDate,
}: ReportsClientProps) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [isPending, startTransition] = useTransition()
  const [reportData, setReportData] = useState(initialData)
  const [deadStock, setDeadStock] = useState(initialDeadStock)
  const [dateRange, setDateRange] = useState<DateRange | undefined>({
    from: initialStartDate,
    to: initialEndDate,
  })

  const handleDateRangeChange = (range: DateRange | undefined) => {
    if (!range?.from || !range?.to) return

    setDateRange(range)
    
    startTransition(async () => {
      try {
        const start = startOfDay(range.from!)
        const end = endOfDay(range.to!)

        const [newData, newDeadStock] = await Promise.all([
          getReportData({ startDate: start, endDate: end }),
          getDeadStockProducts({ startDate: start, endDate: end }),
        ])

        setReportData(newData)
        setDeadStock(newDeadStock)

        // Update URL params
        const params = new URLSearchParams(searchParams.toString())
        params.set('startDate', format(start, 'yyyy-MM-dd'))
        params.set('endDate', format(end, 'yyyy-MM-dd'))
        router.push(`/reports?${params.toString()}`)
      } catch (error) {
        toast.error('Failed to load report data')
      }
    })
  }

  const handleQuickFilter = (filter: 'today' | 'last7' | 'thisMonth' | 'lastMonth') => {
    let start: Date
    let end: Date = endOfDay(new Date())

    switch (filter) {
      case 'today':
        start = startOfDay(new Date())
        break
      case 'last7':
        start = startOfDay(subDays(new Date(), 7))
        break
      case 'thisMonth':
        start = startOfMonth(new Date())
        end = endOfMonth(new Date())
        break
      case 'lastMonth':
        const lastMonth = subMonths(new Date(), 1)
        start = startOfMonth(lastMonth)
        end = endOfMonth(lastMonth)
        break
    }

    handleDateRangeChange({ from: start, to: end })
  }

  const handleExportCSV = () => {
    try {
      // Create CSV content
      const headers = ['Date', 'Sales (MMK)', 'Profit (MMK)']
      const rows = reportData.salesChartData.map((item) => [
        item.date,
        item.sales.toFixed(2),
        item.profit.toFixed(2),
      ])

      const csvContent = [
        headers.join(','),
        ...rows.map((row) => row.join(',')),
        '',
        'Summary',
        `Total Revenue,${reportData.financialSummary.totalRevenue.toFixed(2)}`,
        `Total Cost,${reportData.financialSummary.totalCost.toFixed(2)}`,
        `Net Profit,${reportData.financialSummary.netProfit.toFixed(2)}`,
        `Profit Margin,${reportData.financialSummary.profitMargin.toFixed(2)}%`,
      ].join('\n')

      // Create blob and download
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
      const link = document.createElement('a')
      const url = URL.createObjectURL(blob)
      link.setAttribute('href', url)
      link.setAttribute(
        'download',
        `Sales_Report_${format(dateRange?.from || new Date(), 'yyyy-MM-dd')}_to_${format(dateRange?.to || new Date(), 'yyyy-MM-dd')}.csv`
      )
      link.style.visibility = 'hidden'
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)

      toast.success('Report exported successfully')
    } catch (error) {
      toast.error('Failed to export report')
    }
  }

  return (
    <div className="space-y-6">
      {/* Header Controls */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <Calendar className="h-5 w-5" />
              Date Range
            </CardTitle>
            <Button onClick={handleExportCSV} variant="outline">
              <Download className="h-4 w-4 mr-2" />
              Download CSV
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1">
              <DatePickerWithRange
                date={dateRange}
                onDateChange={handleDateRangeChange}
              />
            </div>
            <div className="flex gap-2 flex-wrap">
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleQuickFilter('today')}
                disabled={isPending}
              >
                Today
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleQuickFilter('last7')}
                disabled={isPending}
              >
                Last 7 Days
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleQuickFilter('thisMonth')}
                disabled={isPending}
              >
                This Month
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleQuickFilter('lastMonth')}
                disabled={isPending}
              >
                Last Month
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Tabs */}
      <Tabs defaultValue="financial" className="space-y-4">
        <TabsList>
          <TabsTrigger value="financial">
            <DollarSign className="h-4 w-4 mr-2" />
            Financial Overview
          </TabsTrigger>
          <TabsTrigger value="products">
            <Package className="h-4 w-4 mr-2" />
            Product Performance
          </TabsTrigger>
        </TabsList>

        <TabsContent value="financial" className="space-y-4">
          <FinancialOverview data={reportData} />
        </TabsContent>

        <TabsContent value="products" className="space-y-4">
          <ProductPerformance
            topProducts={reportData.topSellingProducts}
            deadStock={deadStock}
          />
        </TabsContent>
      </Tabs>
    </div>
  )
}

