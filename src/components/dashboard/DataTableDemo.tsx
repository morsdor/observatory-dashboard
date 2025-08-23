'use client'

import React, { useEffect, useState } from 'react'
import { VirtualizedDataTable, ColumnDefinition } from './VirtualizedDataTable'
import { DataPoint } from '@/types'
import { useAppSelector, useAppDispatch, addDataPoints, setRawData } from '@/stores/dashboardStore'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'

// Generate realistic mock data
const generateMockData = (count: number, startIndex = 0): DataPoint[] => {
  const categories = ['cpu', 'memory', 'network', 'disk', 'temperature']
  const sources = ['server-1', 'server-2', 'server-3', 'database', 'cache', 'load-balancer']
  
  return Array.from({ length: count }, (_, i) => {
    const index = startIndex + i
    const timestamp = new Date(Date.now() - (count - i) * 1000)
    const category = categories[index % categories.length]
    const source = sources[index % sources.length]
    
    // Generate realistic values based on category
    let value: number
    let unit: string
    
    switch (category) {
      case 'cpu':
        value = Math.random() * 100
        unit = '%'
        break
      case 'memory':
        value = 50 + Math.random() * 40 // 50-90% usage
        unit = '%'
        break
      case 'network':
        value = Math.random() * 1000 // MB/s
        unit = 'MB/s'
        break
      case 'disk':
        value = Math.random() * 500 // IOPS
        unit = 'IOPS'
        break
      case 'temperature':
        value = 20 + Math.random() * 60 // 20-80°C
        unit = '°C'
        break
      default:
        value = Math.random() * 100
        unit = ''
    }

    return {
      id: `${category}-${source}-${index}`,
      timestamp: timestamp.toISOString(),
      value: Math.round(value * 100) / 100,
      category,
      source,
      metadata: {
        index,
        unit,
        region: index % 3 === 0 ? 'us-east' : index % 3 === 1 ? 'us-west' : 'eu-central',
        environment: index % 2 === 0 ? 'production' : 'staging',
        alert_level: value > 80 ? 'high' : value > 60 ? 'medium' : 'low',
        host: `host-${Math.floor(index / 10) + 1}`
      }
    }
  })
}

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
  const dispatch = useAppDispatch()
  const rawData = useAppSelector((state) => state.data.rawData)
  const selectedRows = useAppSelector((state) => state.ui.selectedRows)
  const [isStreaming, setIsStreaming] = useState(false)
  const [dataCount, setDataCount] = useState(0)

  // Initialize with sample data
  useEffect(() => {
    const initialData = generateMockData(10000)
    dispatch(setRawData(initialData))
    setDataCount(initialData.length)
  }, [dispatch])

  // Simulate real-time data streaming
  useEffect(() => {
    if (!isStreaming) return

    const interval = setInterval(() => {
      const newData = generateMockData(50, dataCount) // Add 50 new points
      newData
      dispatch(addDataPoints(newData))
      setDataCount(prev => prev + 50)
    }, 1000) // Every second

    return () => clearInterval(interval)
  }, [isStreaming, dataCount, dispatch])

  const handleRowSelect = (row: DataPoint) => {
    console.log('Selected row:', row)
  }

  const handleRowDoubleClick = (row: DataPoint) => {
    console.log('Double-clicked row:', row)
    // Could open a detail modal or navigate to detail view
  }

  const loadLargeDataset = () => {
    const largeData = generateMockData(100000)
    dispatch(setRawData(largeData))
    setDataCount(largeData.length)
  }

  const clearData = () => {
    dispatch(setRawData([]))
    setDataCount(0)
    setIsStreaming(false)
  }

  return (
    <div className="space-y-4">
      <Card className="p-4">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-xl font-semibold">Virtualized Data Table Demo</h2>
            <p className="text-sm text-gray-600">
              Demonstrating high-performance data visualization with {rawData.length.toLocaleString()} rows
            </p>
          </div>
          
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsStreaming(!isStreaming)}
              className={isStreaming ? 'bg-green-50 border-green-200' : ''}
            >
              {isStreaming ? 'Stop Streaming' : 'Start Streaming'}
            </Button>
            
            <Button
              variant="outline"
              size="sm"
              onClick={loadLargeDataset}
            >
              Load 100k Rows
            </Button>
            
            <Button
              variant="outline"
              size="sm"
              onClick={clearData}
            >
              Clear Data
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-4 gap-4 mb-4">
          <div className="text-center">
            <div className="text-2xl font-bold text-blue-600">
              {rawData.length.toLocaleString()}
            </div>
            <div className="text-sm text-gray-600">Total Rows</div>
          </div>
          
          <div className="text-center">
            <div className="text-2xl font-bold text-green-600">
              {selectedRows.length.toLocaleString()}
            </div>
            <div className="text-sm text-gray-600">Selected</div>
          </div>
          
          <div className="text-center">
            <div className="text-2xl font-bold text-purple-600">
              {new Set(rawData.map(d => d.category)).size}
            </div>
            <div className="text-sm text-gray-600">Categories</div>
          </div>
          
          <div className="text-center">
            <div className="text-2xl font-bold text-orange-600">
              {new Set(rawData.map(d => d.source)).size}
            </div>
            <div className="text-sm text-gray-600">Sources</div>
          </div>
        </div>

        {isStreaming && (
          <div className="mb-4 p-3 bg-green-50 border border-green-200 rounded-lg">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
              <span className="text-sm text-green-700">
                Live streaming active - Adding 50 rows per second
              </span>
            </div>
          </div>
        )}
      </Card>

      <VirtualizedDataTable
        data={rawData}
        columns={enhancedColumns}
        height={600}
        onRowSelect={handleRowSelect}
        onRowDoubleClick={handleRowDoubleClick}
        className="shadow-lg"
      />

      {selectedRows.length > 0 && (
        <Card className="p-4">
          <h3 className="font-semibold mb-2">Selection Details</h3>
          <p className="text-sm text-gray-600">
            {selectedRows.length} row(s) selected. 
            Use Ctrl+Click for multi-select, Shift+Click for range selection.
          </p>
          <div className="mt-2 flex flex-wrap gap-1">
            {selectedRows.slice(0, 10).map(id => (
              <Badge key={id} variant="outline" className="text-xs">
                {id}
              </Badge>
            ))}
            {selectedRows.length > 10 && (
              <Badge variant="secondary" className="text-xs">
                +{selectedRows.length - 10} more
              </Badge>
            )}
          </div>
        </Card>
      )}
    </div>
  )
}