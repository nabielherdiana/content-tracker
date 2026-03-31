'use client'

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { cn } from '@/lib/utils'
import { Bar, BarChart, CartesianGrid, LabelList, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'

type Props = {
  title: string
  description: string
  data: Array<{ name: string; total: number }>
  emptyText?: string
  compactWhenEmpty?: boolean
  className?: string
  minDataHeight?: number
  maxDataHeight?: number
}

export function ChartOverview({
  title,
  description,
  data,
  emptyText,
  compactWhenEmpty = false,
  className,
  minDataHeight = 140,
  maxDataHeight = 360,
}: Props) {
  const safeData = data
    .filter((item) => item.total > 0)
    .sort((a, b) => b.total - a.total)
    .slice(0, 10)
  const hasData = safeData.length > 0
  const barSize = safeData.length <= 2 ? 34 : 26
  const dynamicHeight = safeData.length <= 2 ? safeData.length * 58 + 8 : safeData.length * 44 + 18
  const chartHeight = Math.max(minDataHeight, Math.min(maxDataHeight, dynamicHeight))
  const emptyHeightClass = compactWhenEmpty ? 'h-[104px]' : 'h-[148px]'
  const yAxisWidth = safeData.reduce((max, item) => Math.max(max, item.name.length), 0) > 14 ? 128 : 96

  return (
    <Card className={cn('shadow-sm border-border/50', className)}>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
      <CardContent className="px-4 pb-4 pt-0">
        {!hasData ? (
          <div className={cn('flex items-center justify-center text-sm text-muted-foreground', emptyHeightClass)}>
            {emptyText ?? 'No data to display yet.'}
          </div>
        ) : (
          <div className="w-full" style={{ height: chartHeight }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={safeData}
                layout="vertical"
                margin={{ top: 8, right: 18, left: 0, bottom: 0 }}
                barCategoryGap={safeData.length <= 2 ? '30%' : '22%'}
              >
                <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="var(--border)" strokeOpacity={0.55} />
                <XAxis
                  type="number"
                  tick={{ fill: 'var(--muted-foreground)', fontSize: 12 }}
                  tickLine={false}
                  axisLine={false}
                  allowDecimals={false}
                  domain={[0, (dataMax: number) => Math.max(dataMax, 1)]}
                />
                <YAxis
                  dataKey="name"
                  type="category"
                  tickFormatter={(value: string) => (value.length > 18 ? `${value.slice(0, 16)}...` : value)}
                  tick={{ fill: 'var(--muted-foreground)', fontSize: 12 }}
                  tickLine={false}
                  axisLine={false}
                  width={yAxisWidth}
                />
                <Tooltip
                  cursor={false}
                  animationDuration={120}
                  contentStyle={{
                    borderRadius: 'var(--radius)',
                    border: '1px solid var(--border)',
                    backgroundColor: 'var(--card)',
                    color: 'var(--foreground)',
                    boxShadow: 'var(--shadow-md)',
                    fontSize: '12px',
                    padding: '8px 10px',
                  }}
                  labelStyle={{ color: 'var(--muted-foreground)', marginBottom: '2px' }}
                  itemStyle={{ color: 'var(--foreground)', fontWeight: 600, padding: 0 }}
                />
                <Bar
                  dataKey="total"
                  name="Total"
                  fill="var(--primary)"
                  radius={[0, 8, 8, 0]}
                  barSize={barSize}
                  maxBarSize={42}
                  animationDuration={420}
                  animationEasing="ease-out"
                  activeBar={{
                    fill: 'var(--primary)',
                    fillOpacity: 0.8,
                    stroke: 'var(--ring)',
                    strokeWidth: 1.5,
                  }}
                >
                  <LabelList
                    dataKey="total"
                    position="right"
                    style={{ fill: 'var(--muted-foreground)', fontSize: 12, fontWeight: 600 }}
                  />
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
