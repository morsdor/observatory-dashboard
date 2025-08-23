'use client'

import React, { useMemo, useCallback, useState } from 'react'
import { TableVirtuoso } from 'react-virtuoso'
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

interface VirtualizedDataTableProps {
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

export function VirtualizedDataTable({
  data,
  columns,
  height = 600,
  onRowSelect,
  onRowDoubleClick,
  className = ''
}: VirtualizedDataTableProps) {

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
        aValue = aValue.getTime()
        bValue = bValue.getTime()
      } else if (typeof aValue === 'string' && typeof bValue === 'string') {
        aValue = aValue.toLowerCase()
        bValue = bValue.toLowerCase()
      }

      let comparison = 0
      if (aValue < bValue) comparison = -1
      else if (aValue > bValue) comparison = 1

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

  // Table header component
  const TableHeader = useCallback(() => (
    <div className="flex bg-gray-50 border-b border-gray-200 sticky top-0 z-10">
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
  ), [columns, handleSort, renderSortIcon])

  // Table row component for TableVirtuoso
  const TableRow = useCallback((index: number, item: DataPoint) => {
    const isSelected = selectedRows.includes(item.id)

    return (
      <div
        className={`
          flex border-b border-gray-100 hover:bg-gray-50 cursor-pointer
          ${isSelected ? 'bg-blue-50 border-blue-200' : ''}
        `}
        onClick={(event) => handleRowClick(item, event)}
        onDoubleClick={() => handleRowDoubleClick(item)}
      >
        {columns.map((column) => (
          <div
            key={String(column.key)}
            className="px-4 py-3 text-sm text-gray-900 truncate"
            style={{ width: column.width || 'auto', minWidth: column.width || 120 }}
            title={String(getCellValue(item, column))}
          >
            {getCellValue(item, column)}
          </div>
        ))}
      </div>
    )
  }, [selectedRows, columns, handleRowClick, handleRowDoubleClick, getCellValue])

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
          <TableVirtuoso
            data={sortedData}
            fixedHeaderContent={TableHeader}
            itemContent={TableRow}
            style={{ height: '100%' }}
            overscan={10}
          />
        )}
      </div>
    </Card>
  )
}

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
    formatter: (value: number) => {
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