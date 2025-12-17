'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { TrendingUp, TrendingDown, Minus } from 'lucide-react'
import { cn } from '@/lib/utils'

interface StatsCardProps {
  title: string
  value: string
  trend?: number
  description?: string
  icon?: React.ReactNode
}

export function StatsCard({ title, value, trend, description, icon }: StatsCardProps) {
  const getTrendDisplay = () => {
    if (trend === undefined || trend === null) return null
    
    if (trend > 0) {
      return (
        <div className="flex items-center gap-1 text-green-600">
          <TrendingUp className="h-3 w-3" />
          <span className="text-xs font-medium">+{Math.abs(trend).toFixed(1)}%</span>
        </div>
      )
    } else if (trend < 0) {
      return (
        <div className="flex items-center gap-1 text-red-600">
          <TrendingDown className="h-3 w-3" />
          <span className="text-xs font-medium">-{Math.abs(trend).toFixed(1)}%</span>
        </div>
      )
    } else {
      return (
        <div className="flex items-center gap-1 text-muted-foreground">
          <Minus className="h-3 w-3" />
          <span className="text-xs font-medium">No change</span>
        </div>
      )
    }
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">{title}</CardTitle>
        {icon && <span className="text-2xl">{icon}</span>}
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold">{value}</div>
        <div className="flex items-center justify-between mt-1">
          {description && (
            <p className="text-xs text-muted-foreground">{description}</p>
          )}
          {getTrendDisplay()}
        </div>
      </CardContent>
    </Card>
  )
}

