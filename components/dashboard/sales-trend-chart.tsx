'use client'

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'

interface SalesTrendChartProps {
  data: Array<{
    date: string
    amount: number
  }>
}

export function SalesTrendChart({ data }: SalesTrendChartProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Sales Overview (Last 30 Days)</CardTitle>
        <CardDescription>Daily sales trend over the past month</CardDescription>
      </CardHeader>
      <CardContent>
        {data.length === 0 ? (
          <div className="flex items-center justify-center py-12 text-muted-foreground">
            No sales data available for the last 30 days
          </div>
        ) : (
          <ResponsiveContainer width="100%" height={350}>
            <LineChart data={data} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
              <XAxis 
                dataKey="date" 
                tick={{ fontSize: 11 }}
                angle={-45}
                textAnchor="end"
                height={70}
                interval="preserveStartEnd"
              />
              <YAxis 
                tick={{ fontSize: 11 }}
                tickFormatter={(value) => `${(value / 1000).toFixed(0)}k`}
              />
              <Tooltip 
                formatter={(value: number) => [`${value.toLocaleString()} MMK`, 'Sales']}
                labelStyle={{ color: '#000', fontWeight: 'bold', fontSize: '12px' }}
                contentStyle={{ 
                  backgroundColor: '#fff', 
                  border: '1px solid #e5e7eb',
                  borderRadius: '6px',
                  padding: '8px 12px'
                }}
              />
              <Line
                type="monotone"
                dataKey="amount"
                stroke="#3b82f6"
                strokeWidth={2}
                dot={{ fill: '#3b82f6', r: 3 }}
                activeDot={{ r: 5 }}
              />
            </LineChart>
          </ResponsiveContainer>
        )}
      </CardContent>
    </Card>
  )
}

