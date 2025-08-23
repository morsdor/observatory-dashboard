'use client'

import React, { useMemo } from 'react'
import { VirtualizedTable, ColumnDefinition } from './VirtualizedTable'
import { DataPoint } from '@/types'
import { useGlobalDataStream } from '@/providers/DataStreamProvider'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'



// Custom columns with enhanced formatting
const enhancedColumns: ColumnDefinition[] = [
  {
    key: 'id',
    label: 'ID',
    width: 180,
    sortable: true,
    formatter: (value: unknown) => (
      <span className="font-mono text-xs text-gray-600">{String(value)}</span>
    )
  },
  {
    key: 'timestamp',
    label: 'Timestamp',
    width: 160,
    sortable: true,
    formatter: (value: unknown) => {
      const date = value instanceof Date ? value : new Date(String(value))
      return (
        <span className="text-sm">
          {date.toLocaleTimeString()}
        </span>
      )
    }
  },
  {
    key: 'value',
    label: 'Value',
    width: 120,
    sortable: true,
    formatter: (value: unknown, row: DataPoint) => {
      const numValue = typeof value === 'number' ? value : parseFloat(String(value)) || 0
      const unit = row.metadata?.unit || ''
      const alertLevel = row.metadata?.alert_level || 'low'
      
      const colorClass = 
        alertLevel === 'high' ? 'text-red-600' :
        alertLevel === 'medium' ? 'text-yellow-600' :
        'text-green-600'
      
      return (
        <span className={`font-semibold ${colorClass}`}>
          {numValue.toFixed(2)} {unit}
        </span>
      )
    }
  },
  {
    key: 'category',
    label: 'Category',
    width: 100,
    sortable: true,
    formatter: (value: unknown) => (
      <Badge variant="secondary" className="text-xs">
        {String(value)}
      </Badge>
    )
  },
  {
    key: 'source',
    label: 'Source',
    width: 120,
    sortable: true,
    formatter: (value: unknown) => (
      <span className="font-medium text-blue-600">{String(value)}</span>
    )
  },
  {
    key: 'environment',
    label: 'Environment',
    width: 100,
    sortable: true,
    accessor: (row: DataPoint) => row.metadata?.environment,
    formatter: (value: unknown) => {
      const strValue = String(value || '')
      return (
        <Badge variant={strValue === 'production' ? 'default' : 'outline'} className="text-xs">
          {strValue}
        </Badge>
      )
    }
  },
  {
    key: 'region',
    label: 'Region',
    width: 100,
    sortable: true,
    accessor: (row: DataPoint) => row.metadata?.region,
    formatter: (value: unknown) => (
      <span className="text-sm text-gray-600">{String(value || '')}</span>
    )
  },
  {
    key: 'alert_level',
    label: 'Alert Level',
    width: 100,
    sortable: true,
    accessor: (row: DataPoint) => row.metadata?.alert_level,
    formatter: (value: unknown) => {
      const strValue = String(value || 'low')
      const variant = 
        strValue === 'high' ? 'destructive' :
        strValue === 'medium' ? 'secondary' :
        'outline'
      
      return (
        <Badge variant={variant} className="text-xs">
          {strValue}
        </Badge>
      )
    }
  }
]

export function DataTableDemo() {
  // Use global data stream
  const { data: rawData, status, metrics, isConnected } = useGlobalDataStream()
  
  // Calculate statistics from real data
  const stats = useMemo(() => ({
    totalRows: rawData.length,
    categories: new Set(rawData.map(d => d.category)).size,
    sources: new Set(rawData.map(d => d.source)).size,
    dataRate: metrics ? Math.round(metrics.dataPointsPerSecond) : 0
  }), [rawData, metrics])

  const handleRowSelect = (row: DataPoint) => {
    console.log('Selected row:', row)
  }

  const handleRowDoubleClick = (row: DataPoint) => {
    console.log('Double-clicked row:', row)
    // Could open a detail modal or navigate to detail view
  }

  return (
    <div className="space-y-4">
      <Card className="p-4">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-xl font-semibold">Virtualized Data Table Demo</h2>
            <p className="text-sm text-gray-600">
              Demonstrating high-performance data visualization with {stats.totalRows.toLocaleString()} rows from global stream
            </p>
            <div className="mt-1 text-xs text-blue-600">
              Status: {status} | Rate: {stats.dataRate}/s | Connected: {isConnected ? 'Yes' : 'No'}
            </div>
          </div>
        </div>

        <div className="grid grid-cols-4 gap-4 mb-4">
          <div className="text-center">
            <div className="text-2xl font-bold text-blue-600">
              {stats.totalRows.toLocaleString()}
            </div>
            <div className="text-sm text-gray-600">Total Rows</div>
          </div>
          
          <div className="text-center">
            <div className="text-2xl font-bold text-green-600">
              {stats.dataRate}
            </div>
            <div className="text-sm text-gray-600">Points/sec</div>
          </div>
          
          <div className="text-center">
            <div className="text-2xl font-bold text-purple-600">
              {stats.categories}
            </div>
            <div className="text-sm text-gray-600">Categories</div>
          </div>
          
          <div className="text-center">
            <div className="text-2xl font-bold text-orange-600">
              {stats.sources}
            </div>
            <div className="text-sm text-gray-600">Sources</div>
          </div>
        </div>

        {isConnected && (
          <div className="mb-4 p-3 bg-green-50 border border-green-200 rounded-lg">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
              <span className="text-sm text-green-700">
                Live streaming active - Data from global stream
              </span>
            </div>
          </div>
        )}

        {!isConnected && rawData.length === 0 && (
          <div className="mb-4 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 bg-yellow-500 rounded-full"></div>
              <span className="text-sm text-yellow-700">
                No data available - Start streaming from the global control to see data
              </span>
            </div>
          </div>
        )}
      </Card>

      <VirtualizedTable
        data={rawData}
        columns={enhancedColumns}
        height={600}
        onRowSelect={handleRowSelect}
        onRowDoubleClick={handleRowDoubleClick}
        className="shadow-lg"
      />

      {rawData.length === 0 && (
        <Card className="p-8">
          <div className="text-center text-gray-500">
            <p className="text-lg font-medium">No Data Available</p>
            <p className="text-sm mt-2">
              Use the global streaming control at the top of the page to start data streaming.
            </p>
          </div>
        </Card>
      )}
    </div>
  )
}