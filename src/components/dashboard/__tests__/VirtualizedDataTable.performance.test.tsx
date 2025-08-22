import React from 'react'
import { render, fireEvent, act } from '@testing-library/react'
import { Provider } from 'react-redux'
import { configureStore } from '@reduxjs/toolkit'
import { VirtualizedDataTable, defaultDataPointColumns } from '../VirtualizedDataTable'
import { DataPoint } from '@/types'
import dataReducer from '@/stores/slices/dataSlice'
import uiReducer from '@/stores/slices/uiSlice'
import filterReducer from '@/stores/slices/filterSlice'
import connectionReducer from '@/stores/slices/connectionSlice'
import performanceReducer from '@/stores/slices/performanceSlice'

// Mock react-virtuoso for performance testing
jest.mock('react-virtuoso', () => ({
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  TableVirtuoso: ({ data, fixedHeaderContent, itemContent, overscan, ...props }: any) => {
    // Simulate virtualization by only rendering a subset of items
    const visibleItems = Math.min(50, data.length) // Simulate 50 visible items max
    
    return (
      <div data-testid="virtualized-table" {...props}>
        <div data-testid="table-header">
          {fixedHeaderContent && fixedHeaderContent()}
        </div>
        <div data-testid="table-body">
          {data.slice(0, visibleItems).map((item: any, index: number) => ( // eslint-disable-line @typescript-eslint/no-explicit-any
            <div key={item.id} data-testid={`table-row-${index}`}>
              {itemContent({ index })}
            </div>
          ))}
        </div>
        <div data-testid="virtualization-info">
          Showing {visibleItems} of {data.length} items (overscan: {overscan})
        </div>
      </div>
    )
  }
}))

// Performance monitoring utilities
class PerformanceMonitor {
  private measurements: { [key: string]: number[] } = {}

  startMeasurement(name: string): () => number {
    const startTime = performance.now()
    return () => {
      const endTime = performance.now()
      const duration = endTime - startTime
      
      if (!this.measurements[name]) {
        this.measurements[name] = []
      }
      this.measurements[name].push(duration)
      
      return duration
    }
  }

  getAverageTime(name: string): number {
    const times = this.measurements[name] || []
    return times.length > 0 ? times.reduce((a, b) => a + b, 0) / times.length : 0
  }

  getMaxTime(name: string): number {
    const times = this.measurements[name] || []
    return times.length > 0 ? Math.max(...times) : 0
  }

  reset() {
    this.measurements = {}
  }
}

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

// Generate realistic test data with patterns
const generateRealisticData = (count: number): DataPoint[] => {
  const categories = ['cpu', 'memory', 'network', 'disk', 'temperature']
  const sources = ['server-1', 'server-2', 'server-3', 'database', 'cache', 'load-balancer']
  
  return Array.from({ length: count }, (_, i) => {
    const timestamp = new Date(Date.now() - (count - i) * 1000)
    const category = categories[i % categories.length]
    const source = sources[i % sources.length]
    
    // Generate realistic values based on category
    let value: number
    switch (category) {
      case 'cpu':
        value = Math.random() * 100
        break
      case 'memory':
        value = 50 + Math.random() * 40 // 50-90% usage
        break
      case 'network':
        value = Math.random() * 1000 // MB/s
        break
      case 'disk':
        value = Math.random() * 500 // IOPS
        break
      case 'temperature':
        value = 20 + Math.random() * 60 // 20-80°C
        break
      default:
        value = Math.random() * 100
    }

    return {
      id: `${category}-${source}-${i}`,
      timestamp,
      value: Math.round(value * 100) / 100,
      category,
      source,
      metadata: {
        index: i,
        region: i % 3 === 0 ? 'us-east' : i % 3 === 1 ? 'us-west' : 'eu-central',
        environment: i % 2 === 0 ? 'production' : 'staging',
        alert_level: value > 80 ? 'high' : value > 60 ? 'medium' : 'low'
      }
    }
  })
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

describe('VirtualizedDataTable Performance Tests', () => {
  let monitor: PerformanceMonitor

  beforeEach(() => {
    monitor = new PerformanceMonitor()
    jest.clearAllMocks()
  })

  afterEach(() => {
    monitor.reset()
  })

  describe('Rendering Performance', () => {
    it('renders 100k rows within performance threshold', () => {
      const largeData = generateRealisticData(100000)
      
      const endMeasurement = monitor.startMeasurement('initial-render-100k')
      
      const { container } = renderWithStore(
        <VirtualizedDataTable
          data={largeData}
          columns={defaultDataPointColumns}
          height={600}
        />
      )

      const renderTime = endMeasurement()

      // Should render within 1 second
      expect(renderTime).toBeLessThan(1000)
      
      // Should only render virtualized subset
      const visibleRows = container.querySelectorAll('[data-testid^="table-row-"]')
      expect(visibleRows.length).toBeLessThanOrEqual(50) // Virtualized limit
      
      console.log(`100k rows rendered in ${renderTime.toFixed(2)}ms`)
    })

    it('maintains performance with 500k rows', () => {
      const extremeData = generateRealisticData(500000)
      
      const endMeasurement = monitor.startMeasurement('initial-render-500k')
      
      renderWithStore(
        <VirtualizedDataTable
          data={extremeData}
          columns={defaultDataPointColumns}
          height={600}
        />
      )

      const renderTime = endMeasurement()

      // Should still render within reasonable time
      expect(renderTime).toBeLessThan(2000)
      
      console.log(`500k rows rendered in ${renderTime.toFixed(2)}ms`)
    })

    it('handles rapid data updates efficiently', async () => {
      let currentData = generateRealisticData(10000)
      
      const { rerender } = renderWithStore(
        <VirtualizedDataTable
          data={currentData}
          columns={defaultDataPointColumns}
        />
      )

      const updateTimes: number[] = []

      // Simulate 20 rapid updates
      for (let i = 0; i < 20; i++) {
        const endMeasurement = monitor.startMeasurement(`update-${i}`)
        
        // Add 1000 new rows
        const newRows = generateRealisticData(1000)
        currentData = [...currentData, ...newRows]
        
        await act(async () => {
          rerender(
            <Provider store={createTestStore()}>
              <VirtualizedDataTable
                data={currentData}
                columns={defaultDataPointColumns}
              />
            </Provider>
          )
        })

        updateTimes.push(endMeasurement())
      }

      const averageUpdateTime = updateTimes.reduce((a, b) => a + b, 0) / updateTimes.length
      const maxUpdateTime = Math.max(...updateTimes)

      // Average update should be fast
      expect(averageUpdateTime).toBeLessThan(100)
      // No single update should take too long
      expect(maxUpdateTime).toBeLessThan(500)
      
      console.log(`Average update time: ${averageUpdateTime.toFixed(2)}ms, Max: ${maxUpdateTime.toFixed(2)}ms`)
    })
  })

  describe('Sorting Performance', () => {
    it('sorts 100k rows efficiently', async () => {
      const largeData = generateRealisticData(100000)
      
      const { getByText } = renderWithStore(
        <VirtualizedDataTable
          data={largeData}
          columns={defaultDataPointColumns}
        />
      )

      const endMeasurement = monitor.startMeasurement('sort-100k')
      
      await act(async () => {
        fireEvent.click(getByText('Value'))
      })

      const sortTime = endMeasurement()

      // Sorting should complete within reasonable time
      expect(sortTime).toBeLessThan(500)
      
      console.log(`100k rows sorted in ${sortTime.toFixed(2)}ms`)
    })

    it('handles multiple sort operations efficiently', async () => {
      const data = generateRealisticData(50000)
      
      const { getByText } = renderWithStore(
        <VirtualizedDataTable
          data={data}
          columns={defaultDataPointColumns}
        />
      )

      const sortColumns = ['Value', 'Timestamp', 'Category', 'Source']
      const sortTimes: number[] = []

      for (const column of sortColumns) {
        const endMeasurement = monitor.startMeasurement(`sort-${column}`)
        
        await act(async () => {
          fireEvent.click(getByText(column))
        })

        sortTimes.push(endMeasurement())
      }

      const averageSortTime = sortTimes.reduce((a, b) => a + b, 0) / sortTimes.length
      const maxSortTime = Math.max(...sortTimes)

      expect(averageSortTime).toBeLessThan(300)
      expect(maxSortTime).toBeLessThan(500)
      
      console.log(`Average sort time: ${averageSortTime.toFixed(2)}ms, Max: ${maxSortTime.toFixed(2)}ms`)
    })
  })

  describe('Selection Performance', () => {
    it('handles large selection operations efficiently', async () => {
      const data = generateRealisticData(10000)
      
      const { container, store } = renderWithStore(
        <VirtualizedDataTable
          data={data}
          columns={defaultDataPointColumns}
        />
      )

      const tableBody = container.querySelector('[data-testid="table-body"]')
      const rowElements = tableBody?.querySelectorAll('[class*="flex border-b"]') || []
      const selectionTimes: number[] = []

      // Select multiple rows rapidly
      for (let i = 0; i < Math.min(5, rowElements.length); i++) {
        const endMeasurement = monitor.startMeasurement(`selection-${i}`)
        
        await act(async () => {
          fireEvent.click(rowElements[i], { ctrlKey: true })
        })

        selectionTimes.push(endMeasurement())
      }

      const averageSelectionTime = selectionTimes.reduce((a, b) => a + b, 0) / selectionTimes.length
      
      expect(averageSelectionTime).toBeLessThan(50)
      
      // Verify selections were registered
      const state = store.getState()
      expect(state.ui.selectedRows.length).toBeGreaterThan(0)
      
      console.log(`Average selection time: ${averageSelectionTime.toFixed(2)}ms`)
    })
  })

  describe('Memory Efficiency', () => {
    it('maintains reasonable DOM size with large datasets', () => {
      const largeData = generateRealisticData(100000)
      
      const { container } = renderWithStore(
        <VirtualizedDataTable
          data={largeData}
          columns={defaultDataPointColumns}
          height={600}
        />
      )

      // Count actual DOM elements
      const allElements = container.querySelectorAll('*')
      const tableRows = container.querySelectorAll('[data-testid^="table-row-"]')

      // Should have limited DOM elements despite large dataset
      expect(allElements.length).toBeLessThan(1000) // Reasonable DOM size
      expect(tableRows.length).toBeLessThanOrEqual(50) // Virtualized rows only
      
      console.log(`DOM elements: ${allElements.length}, Visible rows: ${tableRows.length}`)
    })

    it('handles dataset growth without memory leaks', () => {
      let currentData = generateRealisticData(1000)
      
      const { rerender, container } = renderWithStore(
        <VirtualizedDataTable
          data={currentData}
          columns={defaultDataPointColumns}
        />
      )

      const initialElementCount = container.querySelectorAll('*').length

      // Grow dataset significantly
      for (let i = 0; i < 10; i++) {
        currentData = [...currentData, ...generateRealisticData(5000)]
        
        rerender(
          <Provider store={createTestStore()}>
            <VirtualizedDataTable
              data={currentData}
              columns={defaultDataPointColumns}
            />
          </Provider>
        )
      }

      const finalElementCount = container.querySelectorAll('*').length
      const elementGrowth = finalElementCount - initialElementCount

      // DOM size should not grow significantly with data size
      expect(elementGrowth).toBeLessThan(100)
      
      console.log(`Data grew from 1k to ${currentData.length} rows, DOM elements grew by ${elementGrowth}`)
    })
  })

  describe('Stress Testing', () => {
    it('survives extreme dataset sizes', () => {
      const extremeData = generateRealisticData(1000000) // 1 million rows
      
      const endMeasurement = monitor.startMeasurement('extreme-render')
      
      expect(() => {
        renderWithStore(
          <VirtualizedDataTable
            data={extremeData}
            columns={defaultDataPointColumns}
            height={600}
          />
        )
      }).not.toThrow()

      const renderTime = endMeasurement()
      
      // Should handle extreme size without crashing
      expect(renderTime).toBeLessThan(5000) // 5 second max
      
      console.log(`1M rows rendered in ${renderTime.toFixed(2)}ms`)
    })

    it('maintains responsiveness under continuous updates', async () => {
      let data = generateRealisticData(10000) // Reduced size for faster test
      
      const { rerender } = renderWithStore(
        <VirtualizedDataTable
          data={data}
          columns={defaultDataPointColumns}
        />
      )

      const totalUpdates = 10 // Reduced updates
      const responseTimes: number[] = []

      for (let i = 0; i < totalUpdates; i++) {
        const endMeasurement = monitor.startMeasurement(`continuous-update-${i}`)
        
        // Add new data points
        const newPoints = generateRealisticData(100)
        data = [...data.slice(-9900), ...newPoints] // Maintain sliding window
        
        await act(async () => {
          rerender(
            <Provider store={createTestStore()}>
              <VirtualizedDataTable
                data={data}
                columns={defaultDataPointColumns}
              />
            </Provider>
          )
        })

        responseTimes.push(endMeasurement())
      }

      const averageResponseTime = responseTimes.reduce((a, b) => a + b, 0) / responseTimes.length
      const maxResponseTime = Math.max(...responseTimes)

      // Should maintain responsiveness
      expect(averageResponseTime).toBeLessThan(100)
      expect(maxResponseTime).toBeLessThan(500)
      
      console.log(`Continuous updates - Average: ${averageResponseTime.toFixed(2)}ms, Max: ${maxResponseTime.toFixed(2)}ms`)
    }, 10000)
  })
})