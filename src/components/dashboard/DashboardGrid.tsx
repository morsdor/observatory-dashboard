'use client'

import React from 'react'
import { Card } from '@/components/ui/card'

interface GridItem {
  id: string
  title: string
  component: React.ReactNode
  colSpan?: number
  rowSpan?: number
}

interface DashboardGridProps {
  items: GridItem[]
  className?: string
}

export function DashboardGrid({ items, className = '' }: DashboardGridProps) {
  return (
    <div className={`grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 p-4 ${className}`}>
      {items.map((item) => (
        <Card
          key={item.id}
          className={`
            ${item.colSpan ? `md:col-span-${item.colSpan}` : ''}
            ${item.rowSpan ? `md:row-span-${item.rowSpan}` : ''}
            min-h-[300px] flex flex-col
          `}
        >
          <div className="p-4 border-b">
            <h3 className="text-lg font-semibold text-gray-900">{item.title}</h3>
          </div>
          <div className="flex-1 p-4">
            {item.component}
          </div>
        </Card>
      ))}
    </div>
  )
}

// Predefined grid layouts for different screen sizes
export const GridLayouts = {
  overview: [
    { id: 'metrics-summary', title: 'Metrics Summary', colSpan: 2 },
    { id: 'connection-status', title: 'Connection Status', colSpan: 1 },
    { id: 'data-rate', title: 'Data Rate', colSpan: 1 },
    { id: 'main-chart', title: 'Time Series Chart', colSpan: 3, rowSpan: 2 },
    { id: 'mini-chart-1', title: 'CPU Usage', colSpan: 1 },
    { id: 'mini-chart-2', title: 'Memory Usage', colSpan: 1 },
    { id: 'mini-chart-3', title: 'Network I/O', colSpan: 1 }
  ],
  charts: [
    { id: 'primary-chart', title: 'Primary Chart', colSpan: 4, rowSpan: 2 },
    { id: 'secondary-chart-1', title: 'Secondary Chart 1', colSpan: 2 },
    { id: 'secondary-chart-2', title: 'Secondary Chart 2', colSpan: 2 }
  ],
  dataGrid: [
    { id: 'data-table', title: 'Data Table', colSpan: 4, rowSpan: 3 }
  ]
}