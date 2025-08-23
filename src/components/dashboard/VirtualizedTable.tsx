'use client'

import React, { useMemo, useCallback, useState, memo } from 'react'
import { FixedSizeList as List } from 'react-window'
import { DataPoint } from '@/types'
import { useAppSelector, useAppDispatch, toggleRowSelection, setSelectedRows } from '@/stores/dashboardStore'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { ChevronUp, ChevronDown, ArrowUpDown } from 'lucide-react'

export interface ColumnDefinition {
  key: keyof DataPoint | string
  label: string
  width?: number
  sortable?: boolean
  formatter?: (value: unknown, row: DataPoint) => React.ReactNode
  accessor?: (row: DataPoint) => unknown
}

interface VirtualizedTableProps {
  data: DataPoint[]
  columns: ColumnDefinition[]
  height?: number
  onRowSelect?: (row: DataPoint) => void
  onRowDoubleClick?: (row: DataPoint) => void
  className?: string
}

type SortDirection = 'asc' | 'desc' | null

interface SortState {
  column: string | null
  direction: SortDirection
}

// Row component for react-window
interface RowProps {
  index: number
  style: React.CSSProperties
  data: {
    items: DataPoint[]
    columns: ColumnDefinition[]
    selectedRows: string[]
    onRowClick: (row: DataPoint, event: React.MouseEvent) => void
    onRowDoubleClick: (row: DataPoint) => void
    getCellValue: (row: DataPoint, column: ColumnDefinition) => React.ReactNode
  }
}

const TableRow = memo<RowProps>(({ index, style, data }) => {
  const { items, columns, selectedRows, onRowClick, onRowDoubleClick, getCellValue } = data
  const item = items[index]
  
  if (!item) return null

  const isSelected = selectedRows.includes(item.id)

  return (
    <div
      style={style}
      className={`
        flex border-b border-gray-100 hover:bg-gray-50 cursor-pointer
        ${isSelected ? 'bg-blue-50 border-blue-200' : ''}
      `}
      onClick={(event) => onRowClick(item, event)}
      onDoubleClick={() => onRowDoubleClick(item)}
    >
      {columns.map((column) => (
        <div
          key={String(column.key)}
          className="px-4 py-3 text-sm text-gray-900 truncate flex items-center"
          style={{ width: column.width || 'auto', minWidth: column.width || 120 }}
          title={String(getCellValue(item, column))}
        >
          {getCellValue(item, column)}
        </div>
      ))}
    </div>
  )
})

TableRow.displayName = 'TableRow'

export const VirtualizedTable = memo<VirtualizedTableProps>(function VirtualizedTable({
  data,
  columns,
  height = 600,
  onRowSelect,
  onRowDoubleClick,
  className = ''
}) {
  const dispatch = useAppDispatch()
  const selectedRows = useAppSelector((state) => state.ui.selectedRows)
  
  const [sortState, setSortState] = useState<SortState>({
    column: null,
    direction: null
  })

  // Sort data based on current sort state
  const sortedData = useMemo(() => {
    if (!sortState.column || !sortState.direction) {
      return data
    }

    const column = columns.find(col => col.key === sortState.column)
    if (!column) return data

    return [...data].sort((a, b) => {
      let aValue: unknown
      let bValue: unknown

      if (column.accessor) {
        aValue = column.accessor(a)
        bValue = column.accessor(b)
      } else {
        aValue = a[column.key as keyof DataPoint]
        bValue = b[column.key as keyof DataPoint]
      }

      // Handle different data types
      if (aValue instanceof Date && bValue instanceof Date) {
        const aTime = aValue.getTime()
        const bTime = bValue.getTime()
        const comparison = aTime < bTime ? -1 : aTime > bTime ? 1 : 0
        return sortState.direction === 'desc' ? -comparison : comparison
      } 
      
      if (typeof aValue === 'string' && typeof bValue === 'string') {
        const aStr = aValue.toLowerCase()
        const bStr = bValue.toLowerCase()
        const comparison = aStr < bStr ? -1 : aStr > bStr ? 1 : 0
        return sortState.direction === 'desc' ? -comparison : comparison
      }

      if (typeof aValue === 'number' && typeof bValue === 'number') {
        const comparison = aValue < bValue ? -1 : aValue > bValue ? 1 : 0
        return sortState.direction === 'desc' ? -comparison : comparison
      }

      // Fallback to string comparison
      const aStr = String(aValue || '').toLowerCase()
      const bStr = String(bValue || '').toLowerCase()
      const comparison = aStr < bStr ? -1 : aStr > bStr ? 1 : 0
      return sortState.direction === 'desc' ? -comparison : comparison
    })
  }, [data, sortState, columns])

  // Handle column sorting
  const handleSort = useCallback((columnKey: string) => {
    const column = columns.find(col => col.key === columnKey)
    if (!column?.sortable) return

    setSortState(prev => {
      if (prev.column === columnKey) {
        // Cycle through: asc -> desc -> null
        const nextDirection: SortDirection =
          prev.direction === 'asc' ? 'desc' :
            prev.direction === 'desc' ? null : 'asc'

        return {
          column: nextDirection ? columnKey : null,
          direction: nextDirection
        }
      } else {
        return {
          column: columnKey,
          direction: 'asc'
        }
      }
    })
  }, [columns])

  // Handle row selection
  const handleRowClick = useCallback((row: DataPoint, event: React.MouseEvent) => {
    if (event.ctrlKey || event.metaKey) {
      // Multi-select with Ctrl/Cmd
      dispatch(toggleRowSelection(row.id))
    } else if (event.shiftKey && selectedRows.length > 0) {
      // Range select with Shift
      const lastSelectedIndex = sortedData.findIndex(item => item.id === selectedRows[selectedRows.length - 1])
      const currentIndex = sortedData.findIndex(item => item.id === row.id)

      if (lastSelectedIndex !== -1 && currentIndex !== -1) {
        const start = Math.min(lastSelectedIndex, currentIndex)
        const end = Math.max(lastSelectedIndex, currentIndex)
        const rangeIds = sortedData.slice(start, end + 1).map(item => item.id)

        const newSelection = [...new Set([...selectedRows, ...rangeIds])]
        dispatch(setSelectedRows(newSelection))
      }
    } else {
      // Single select
      dispatch(setSelectedRows([row.id]))
    }

    onRowSelect?.(row)
  }, [dispatch, selectedRows, sortedData, onRowSelect])

  // Handle row double click
  const handleRowDoubleClick = useCallback((row: DataPoint) => {
    onRowDoubleClick?.(row)
  }, [onRowDoubleClick])

  // Get cell value with formatter
  const getCellValue = useCallback((row: DataPoint, column: ColumnDefinition) => {
    let value: unknown

    if (column.accessor) {
      value = column.accessor(row)
    } else {
      value = row[column.key as keyof DataPoint]
    }

    if (column.formatter) {
      return column.formatter(value, row)
    }

    // Default formatting
    if (value instanceof Date) {
      return value.toLocaleString()
    }

    if (typeof value === 'number') {
      return value.toLocaleString()
    }

    if (typeof value === 'object' && value !== null) {
      return JSON.stringify(value)
    }

    return String(value || '')
  }, [])

  // Render sort icon
  const renderSortIcon = useCallback((columnKey: string) => {
    if (sortState.column !== columnKey) {
      return <ArrowUpDown className="w-4 h-4 text-gray-400" />
    }

    return sortState.direction === 'asc' ?
      <ChevronUp className="w-4 h-4 text-blue-600" /> :
      <ChevronDown className="w-4 h-4 text-blue-600" />
  }, [sortState])

  // Prepare data for react-window
  const itemData = useMemo(() => ({
    items: sortedData,
    columns,
    selectedRows,
    onRowClick: handleRowClick,
    onRowDoubleClick: handleRowDoubleClick,
    getCellValue
  }), [sortedData, columns, selectedRows, handleRowClick, handleRowDoubleClick, getCellValue])

  const ROW_HEIGHT = 50
  const HEADER_HEIGHT = 60

  return (
    <Card className={`flex flex-col ${className}`}>
      <div className="p-4 border-b">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold text-gray-900">
            Data Table ({sortedData.length.toLocaleString()} rows)
          </h3>
          <div className="flex items-center gap-2">
            {selectedRows.length > 0 && (
              <>
                <span className="text-sm text-gray-600">
                  {selectedRows.length} selected
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => dispatch(setSelectedRows([]))}
                >
                  Clear Selection
                </Button>
              </>
            )}
          </div>
        </div>
      </div>

      <div className="flex-1" style={{ height }}>
        {sortedData.length === 0 ? (
          <div className="flex items-center justify-center h-full text-gray-500">
            <div className="text-center">
              <p>No data to display</p>
              <p className="text-sm">Waiting for data...</p>
            </div>
          </div>
        ) : (
          <div className="h-full flex flex-col">
            {/* Fixed Header */}
            <div 
              className="flex bg-gray-50 border-b border-gray-200 sticky top-0 z-10"
              style={{ height: HEADER_HEIGHT }}
            >
              {columns.map((column) => (
                <div
                  key={String(column.key)}
                  className={`
                    flex items-center justify-between px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider
                    ${column.sortable ? 'cursor-pointer hover:bg-gray-100' : ''}
                  `}
                  style={{ width: column.width || 'auto', minWidth: column.width || 120 }}
                  onClick={() => column.sortable && handleSort(String(column.key))}
                >
                  <span className="truncate">{column.label}</span>
                  {column.sortable && renderSortIcon(String(column.key))}
                </div>
              ))}
            </div>

            {/* Virtualized Body */}
            <div className="flex-1">
              <List
                height={height - HEADER_HEIGHT - 80} // Account for header and padding
                itemCount={sortedData.length}
                itemSize={ROW_HEIGHT}
                itemData={itemData}
                overscanCount={5}
              >
                {TableRow}
              </List>
            </div>
          </div>
        )}
      </div>
    </Card>
  )
})

// Default column definitions for DataPoint
export const defaultDataPointColumns: ColumnDefinition[] = [
  {
    key: 'id',
    label: 'ID',
    width: 120,
    sortable: true
  },
  {
    key: 'timestamp',
    label: 'Timestamp',
    width: 180,
    sortable: true,
    formatter: (value: unknown) => {
      const date = value instanceof Date ? value : new Date(String(value))
      return date.toLocaleString()
    }
  },
  {
    key: 'value',
    label: 'Value',
    width: 120,
    sortable: true,
    formatter: (value: unknown) => {
      if (typeof value !== 'number' || isNaN(value)) return 'N/A'
      return value.toLocaleString(undefined, {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
      })
    }
  },
  {
    key: 'category',
    label: 'Category',
    width: 120,
    sortable: true
  },
  {
    key: 'source',
    label: 'Source',
    width: 120,
    sortable: true
  },
  {
    key: 'metadata',
    label: 'Metadata',
    width: 200,
    sortable: false,
    formatter: (value: unknown) => {
      if (!value || typeof value !== 'object' || value === null) return 'N/A'
      return (
        <span className="text-xs text-gray-500 font-mono">
          {Object.keys(value as Record<string, unknown>).length} properties
        </span>
      )
    }
  }
]