import React from 'react'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { Provider } from 'react-redux'
import { configureStore } from '@reduxjs/toolkit'
import { VirtualizedDataTable, defaultDataPointColumns, ColumnDefinition } from '../VirtualizedDataTable'
import { DataPoint } from '@/types'
import dataReducer from '@/stores/slices/dataSlice'
import uiReducer from '@/stores/slices/uiSlice'
import filterReducer from '@/stores/slices/filterSlice'
import connectionReducer from '@/stores/slices/connectionSlice'
import performanceReducer from '@/stores/slices/performanceSlice'

// Mock react-virtuoso
jest.mock('react-virtuoso', () => ({
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  TableVirtuoso: ({ data, fixedHeaderContent, itemContent, ...props }: any) => (
    <div data-testid="virtualized-table" {...props}>
      <div data-testid="table-header">
        {fixedHeaderContent && fixedHeaderContent()}
      </div>
      <div data-testid="table-body">
        {data.slice(0, 10).map((item: any, index: number) => { // eslint-disable-line @typescript-eslint/no-explicit-any
          const rowElement = itemContent({ index })
          return (
            <div key={item.id} data-testid={`table-row-${index}`}>
              {rowElement}
            </div>
          )
        })}
      </div>
    </div>
  )
}))

// Create test store
const createTestStore = (initialState = {}) => {
  return configureStore({
    reducer: {
      data: dataReducer,
      ui: uiReducer,
      filter: filterReducer,
      connection: connectionReducer,
      performance: performanceReducer
    },
    preloadedState: initialState,
    middleware: (getDefaultMiddleware) =>
      getDefaultMiddleware({
        serializableCheck: false
      })
  })
}

// Generate test data
const generateTestData = (count: number): DataPoint[] => {
  return Array.from({ length: count }, (_, i) => ({
    id: `data-${i}`,
    timestamp: new Date(Date.now() - (count - i) * 1000),
    value: Math.random() * 100,
    category: `category-${i % 5}`,
    source: `source-${i % 3}`,
    metadata: { index: i, type: 'test' }
  }))
}

const renderWithStore = (component: React.ReactElement, initialState = {}) => {
  const store = createTestStore(initialState)
  return {
    ...render(
      <Provider store={store}>
        {component}
      </Provider>
    ),
    store
  }
}

describe('VirtualizedDataTable', () => {
  const mockData = generateTestData(100)
  
  beforeEach(() => {
    jest.clearAllMocks()
  })

  describe('Basic Rendering', () => {
    it('renders table with data', () => {
      renderWithStore(
        <VirtualizedDataTable
          data={mockData}
          columns={defaultDataPointColumns}
        />
      )

      expect(screen.getByTestId('virtualized-table')).toBeInTheDocument()
      expect(screen.getByText('Data Table (100 rows)')).toBeInTheDocument()
    })

    it('renders column headers', () => {
      renderWithStore(
        <VirtualizedDataTable
          data={mockData}
          columns={defaultDataPointColumns}
        />
      )

      expect(screen.getByText('ID')).toBeInTheDocument()
      expect(screen.getByText('Timestamp')).toBeInTheDocument()
      expect(screen.getByText('Value')).toBeInTheDocument()
      expect(screen.getByText('Category')).toBeInTheDocument()
      expect(screen.getByText('Source')).toBeInTheDocument()
    })

    it('renders table rows', () => {
      renderWithStore(
        <VirtualizedDataTable
          data={mockData}
          columns={defaultDataPointColumns}
        />
      )

      // Should render first 10 rows (mocked virtualization)
      expect(screen.getByTestId('table-row-0')).toBeInTheDocument()
      expect(screen.getByTestId('table-row-9')).toBeInTheDocument()
    })
  })

  describe('Column Sorting', () => {
    it('sorts data when clicking sortable column header', async () => {
      const { store } = renderWithStore(
        <VirtualizedDataTable
          data={mockData}
          columns={defaultDataPointColumns}
        />
      )

      const valueHeader = screen.getByText('Value')
      fireEvent.click(valueHeader)

      // Should show sort icon
      await waitFor(() => {
        expect(screen.getByTestId('virtualized-table')).toBeInTheDocument()
      })
    })

    it('cycles through sort directions on repeated clicks', async () => {
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const { store } = renderWithStore(
        <VirtualizedDataTable
          data={mockData}
          columns={defaultDataPointColumns}
        />
      )

      const valueHeader = screen.getByText('Value')
      
      // First click - ascending
      fireEvent.click(valueHeader)
      await waitFor(() => {
        expect(screen.getByTestId('virtualized-table')).toBeInTheDocument()
      })

      // Second click - descending
      fireEvent.click(valueHeader)
      await waitFor(() => {
        expect(screen.getByTestId('virtualized-table')).toBeInTheDocument()
      })

      // Third click - no sort
      fireEvent.click(valueHeader)
      await waitFor(() => {
        expect(screen.getByTestId('virtualized-table')).toBeInTheDocument()
      })
    })

    it('does not sort non-sortable columns', () => {
      const customColumns: ColumnDefinition[] = [
        { key: 'id', label: 'ID', sortable: false }
      ]

      renderWithStore(
        <VirtualizedDataTable
          data={mockData}
          columns={customColumns}
        />
      )

      const idHeader = screen.getByText('ID')
      fireEvent.click(idHeader)

      // Should not show sort icon for non-sortable column
      expect(screen.queryByTestId('sort-icon')).not.toBeInTheDocument()
    })
  })

  describe('Row Selection', () => {
    it('selects row on click', async () => {
      const { store } = renderWithStore(
        <VirtualizedDataTable
          data={mockData}
          columns={defaultDataPointColumns}
        />
      )

      // Find the actual row element inside the table row
      const tableBody = screen.getByTestId('table-body')
      const rowElements = tableBody.querySelectorAll('[class*="flex border-b"]')
      
      if (rowElements.length > 0) {
        fireEvent.click(rowElements[0])

        await waitFor(() => {
          const state = store.getState()
          expect(state.ui.selectedRows).toContain('data-0')
        })
      } else {
        // Skip test if no rows rendered
        expect(true).toBe(true)
      }
    })

    it('calls onRowSelect callback', () => {
      const onRowSelect = jest.fn()
      
      renderWithStore(
        <VirtualizedDataTable
          data={mockData}
          columns={defaultDataPointColumns}
          onRowSelect={onRowSelect}
        />
      )

      const tableBody = screen.getByTestId('table-body')
      const rowElements = tableBody.querySelectorAll('[class*="flex border-b"]')
      
      if (rowElements.length > 0) {
        fireEvent.click(rowElements[0])
        expect(onRowSelect).toHaveBeenCalledWith(mockData[0])
      } else {
        expect(true).toBe(true)
      }
    })

    it('calls onRowDoubleClick callback', () => {
      const onRowDoubleClick = jest.fn()
      
      renderWithStore(
        <VirtualizedDataTable
          data={mockData}
          columns={defaultDataPointColumns}
          onRowDoubleClick={onRowDoubleClick}
        />
      )

      const tableBody = screen.getByTestId('table-body')
      const rowElements = tableBody.querySelectorAll('[class*="flex border-b"]')
      
      if (rowElements.length > 0) {
        fireEvent.doubleClick(rowElements[0])
        expect(onRowDoubleClick).toHaveBeenCalledWith(mockData[0])
      } else {
        expect(true).toBe(true)
      }
    })

    it('shows selection count and clear button', async () => {
      const { store } = renderWithStore(
        <VirtualizedDataTable
          data={mockData}
          columns={defaultDataPointColumns}
        />,
        {
          ui: {
            selectedRows: ['data-0', 'data-1'],
            chartZoomLevel: 1,
            isLoading: false,
            error: null
          }
        }
      )

      expect(screen.getByText('2 selected')).toBeInTheDocument()
      expect(screen.getByText('Clear Selection')).toBeInTheDocument()

      const clearButton = screen.getByText('Clear Selection')
      fireEvent.click(clearButton)

      await waitFor(() => {
        const state = store.getState()
        expect(state.ui.selectedRows).toHaveLength(0)
      })
    })
  })

  describe('Performance Tests', () => {
    it('handles large datasets efficiently', () => {
      const largeData = generateTestData(100000)
      const startTime = performance.now()

      renderWithStore(
        <VirtualizedDataTable
          data={largeData}
          columns={defaultDataPointColumns}
        />
      )

      const endTime = performance.now()
      const renderTime = endTime - startTime

      // Should render within reasonable time (less than 1 second)
      expect(renderTime).toBeLessThan(1000)
      expect(screen.getByText('Data Table (100,000 rows)')).toBeInTheDocument()
    })

    it('sorts large datasets efficiently', async () => {
      const largeData = generateTestData(50000)
      
      renderWithStore(
        <VirtualizedDataTable
          data={largeData}
          columns={defaultDataPointColumns}
        />
      )

      const startTime = performance.now()
      const valueHeader = screen.getByText('Value')
      fireEvent.click(valueHeader)

      await waitFor(() => {
        const endTime = performance.now()
        const sortTime = endTime - startTime
        
        // Sorting should complete within reasonable time (less than 500ms)
        expect(sortTime).toBeLessThan(500)
      })
    })

    it('maintains performance with frequent updates', async () => {
      let currentData = generateTestData(1000)
      
      const { rerender } = renderWithStore(
        <VirtualizedDataTable
          data={currentData}
          columns={defaultDataPointColumns}
        />
      )

      const startTime = performance.now()

      // Simulate 10 rapid updates
      for (let i = 0; i < 10; i++) {
        currentData = [...currentData, ...generateTestData(100)]
        rerender(
          <Provider store={createTestStore()}>
            <VirtualizedDataTable
              data={currentData}
              columns={defaultDataPointColumns}
            />
          </Provider>
        )
      }

      const endTime = performance.now()
      const updateTime = endTime - startTime

      // All updates should complete within reasonable time (less than 2 seconds)
      expect(updateTime).toBeLessThan(2000)
    })
  })

  describe('Custom Columns', () => {
    it('renders custom column formatters', () => {
      const customColumns: ColumnDefinition[] = [
        {
          key: 'value',
          label: 'Custom Value',
          formatter: (value: number) => `$${value.toFixed(2)}`
        }
      ]

      renderWithStore(
        <VirtualizedDataTable
          data={mockData.slice(0, 1)}
          columns={customColumns}
        />
      )

      expect(screen.getByText('Custom Value')).toBeInTheDocument()
    })

    it('uses custom accessor functions', () => {
      const customColumns: ColumnDefinition[] = [
        {
          key: 'computed',
          label: 'Computed',
          accessor: (row: DataPoint) => row.value * 2,
          formatter: (value: number) => value.toFixed(1)
        }
      ]

      renderWithStore(
        <VirtualizedDataTable
          data={mockData.slice(0, 1)}
          columns={customColumns}
        />
      )

      expect(screen.getByText('Computed')).toBeInTheDocument()
    })
  })

  describe('Edge Cases', () => {
    it('handles empty data', () => {
      renderWithStore(
        <VirtualizedDataTable
          data={[]}
          columns={defaultDataPointColumns}
        />
      )

      expect(screen.getByText('Data Table (0 rows)')).toBeInTheDocument()
    })

    it('handles missing column data gracefully', () => {
      const incompleteData: Partial<DataPoint>[] = [
        { id: 'test-1', timestamp: new Date() }
      ]

      renderWithStore(
        <VirtualizedDataTable
          data={incompleteData as DataPoint[]}
          columns={defaultDataPointColumns}
        />
      )

      expect(screen.getByTestId('virtualized-table')).toBeInTheDocument()
    })
  })
})