'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  ComposedChart,
  Bar,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from 'recharts'
import type { ReportData } from '@/actions/reports'
import { TrendingUp, TrendingDown, DollarSign, ShoppingCart } from 'lucide-react'

interface FinancialOverviewProps {
  data: ReportData
}

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8']

export function FinancialOverview({ data }: FinancialOverviewProps) {
  const { financialSummary, salesChartData, paymentMethodSplit } = data

  return (
    <div className="space-y-4">
      {/* Metric Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Revenue</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              {financialSummary.totalRevenue.toLocaleString()} MMK
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Cost of Goods</CardTitle>
            <ShoppingCart className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">
              {financialSummary.totalCost.toLocaleString()} MMK
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Net Profit</CardTitle>
            {financialSummary.netProfit >= 0 ? (
              <TrendingUp className="h-4 w-4 text-green-600" />
            ) : (
              <TrendingDown className="h-4 w-4 text-red-600" />
            )}
          </CardHeader>
          <CardContent>
            <div
              className={`text-2xl font-bold ${
                financialSummary.netProfit >= 0
                  ? 'text-green-600'
                  : 'text-red-600'
              }`}
            >
              {financialSummary.netProfit.toLocaleString()} MMK
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Profit Margin</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div
              className={`text-2xl font-bold ${
                financialSummary.profitMargin >= 0
                  ? 'text-green-600'
                  : 'text-red-600'
              }`}
            >
              {financialSummary.profitMargin.toFixed(2)}%
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Sales & Profit Chart */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Sales & Profit Trend</CardTitle>
          </CardHeader>
          <CardContent>
            {salesChartData.length > 0 ? (
              <ResponsiveContainer width="100%" height={300}>
                <ComposedChart data={salesChartData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="date" />
                  <YAxis yAxisId="left" />
                  <YAxis yAxisId="right" orientation="right" />
                  <Tooltip
                    formatter={(value: number, name: string) => [
                      `${value.toLocaleString()} MMK`,
                      name,
                    ]}
                  />
                  <Legend />
                  <Bar
                    yAxisId="left"
                    dataKey="sales"
                    fill="#0088FE"
                    name="Sales"
                  />
                  <Line
                    yAxisId="right"
                    type="monotone"
                    dataKey="profit"
                    stroke="#00C49F"
                    strokeWidth={2}
                    name="Profit"
                  />
                </ComposedChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex items-center justify-center h-[300px] text-muted-foreground">
                No data available for the selected period
              </div>
            )}
          </CardContent>
        </Card>

        {/* Payment Method Distribution */}
        <Card>
          <CardHeader>
            <CardTitle>Payment Methods</CardTitle>
          </CardHeader>
          <CardContent>
            {paymentMethodSplit.length > 0 ? (
              <>
                <ResponsiveContainer width="100%" height={200}>
                  <PieChart>
                    <Pie
                      data={paymentMethodSplit}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={({ method, percentage }) =>
                        `${method}: ${percentage.toFixed(1)}%`
                      }
                      outerRadius={80}
                      fill="#8884d8"
                      dataKey="amount"
                    >
                      {paymentMethodSplit.map((entry, index) => (
                        <Cell
                          key={`cell-${index}`}
                          fill={COLORS[index % COLORS.length]}
                        />
                      ))}
                    </Pie>
                    <Tooltip
                      formatter={(value: number) => [
                        `${value.toLocaleString()} MMK`,
                        'Amount',
                      ]}
                    />
                  </PieChart>
                </ResponsiveContainer>
                <div className="mt-4 space-y-2">
                  {paymentMethodSplit.map((item, index) => (
                    <div
                      key={item.method}
                      className="flex items-center justify-between text-sm"
                    >
                      <div className="flex items-center gap-2">
                        <div
                          className="w-3 h-3 rounded-full"
                          style={{
                            backgroundColor: COLORS[index % COLORS.length],
                          }}
                        />
                        <span>{item.method}</span>
                      </div>
                      <div className="text-right">
                        <div className="font-medium">
                          {item.amount.toLocaleString()} MMK
                        </div>
                        <div className="text-xs text-muted-foreground">
                          {item.count} transactions
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </>
            ) : (
              <div className="flex items-center justify-center h-[200px] text-muted-foreground">
                No payment data available
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

