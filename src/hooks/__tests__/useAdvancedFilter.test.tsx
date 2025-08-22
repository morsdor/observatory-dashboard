import { renderHook, act } from '@testing-library/react'
import { Provider } from 'react-redux'
import { configureStore } from '@reduxjs/toolkit'
import { useAdvancedFilter, useDateRangeFilter, useCategoricalFilter } from '../useAdvancedFilter'
import dataReducer from '@/stores/slices/dataSlice'
import filterReducer from '@/stores/slices/filterSlice'
import uiReducer from '@/stores/slices/uiSlice'
import connectionReducer from '@/stores/slices/connectionSlice'
import performanceReducer from '@/stores/slices/performanceSlice'
import { DataPoint } from '@/types'

// Mock data for testing
const mockData: DataPoint[] = [
  {
    id: '1',
    timestamp: new Date('2024-01-01T10:00:00Z'),
    value: 25,
    category: 'cpu',
    source: 'server-1',
    metadata: { region: 'us-east' }
  },
  {
    id: '2',
    timestamp: new Date('2024-01-01T11:00:00Z'),
    value: 75,
    category: 'memory',
    source: 'server-2',
    metadata: { region: 'us-west' }
  }
]

// Create test store
function createTestStore() {
  return configureStore({
    reducer: {
      data: dataReducer,
      filter: filterReducer,
      ui: uiReducer,
      connection: connectionReducer,
      performance: performanceReducer
    },
    preloadedState: {
      data: {
        rawData: mockData,
        filteredData: mockData,
        dataBuffer: mockData,
        isLoading: false,
        error: null
      },
      filter: {
        filterCriteria: { conditions: [], grouping: [] },
        activeFilters: [],
        isFiltering: false,
        performance: { filterTime: 0, resultCount: 0, totalCount: 0 }
      },
      ui: {
        selectedRows: [],
        isLoading: false,
        error: null,
        theme: 'light'
      },
      connection: {
        connectionStatus: 'disconnected',
        lastConnected: null,
        reconnectAttempts: 0
      },
      performance: {
        metrics: {
          fps: 60,
          memoryUsage: 0,
          dataPointsPerSecond: 0,
          renderTime: 0,
          filterTime: 0
        }
      }
    }
  })
}

// Test wrapper component
function TestWrapper({ children }: { children: React.ReactNode }) {
  const store = createTestStore()
  return <Provider store={store}>{children}</Provider>
}

describe('useAdvancedFilter', () => {
  test('should initialize with correct default values', () => {
    const { result } = renderHook(() => useAdvancedFilter(), {
      wrapper: TestWrapper
    })

    expect(result.current.isFiltering).toBe(false)
    expect(result.current.filteredDataCount).toBe(2)
    expect(result.current.totalDataCount).toBe(2)
    expect(typeof result.current.addData).toBe('function')
    expect(typeof result.current.getFilterStats).toBe('function')
  })

  test('should provide filter statistics', () => {
    const { result } = renderHook(() => useAdvancedFilter(), {
      wrapper: TestWrapper
    })

    const stats = result.current.getFilterStats()
    expect(stats).toHaveProperty('dataSize')
    expect(stats).toHaveProperty('indexSize')
    expect(stats).toHaveProperty('cacheSize')
    expect(stats).toHaveProperty('indexedFields')
  })

  test('should handle adding new data', () => {
    const { result } = renderHook(() => useAdvancedFilter(), {
      wrapper: TestWrapper
    })

    const newData: DataPoint[] = [{
      id: '3',
      timestamp: new Date('2024-01-01T12:00:00Z'),
      value: 50,
      category: 'network',
      source: 'server-3',
      metadata: { region: 'eu-west' }
    }]

    act(() => {
      result.current.addData(newData)
    })

    // Should not throw and function should be callable
    expect(typeof result.current.addData).toBe('function')
  })
})

describe('useDateRangeFilter', () => {
  test('should create date range filter conditions', () => {
    const { result } = renderHook(() => useDateRangeFilter())

    const startDate = new Date('2024-01-01T00:00:00Z')
    const endDate = new Date('2024-01-01T23:59:59Z')

    const condition = result.current.createDateRangeFilter('timestamp', startDate, endDate)

    expect(condition).toMatchObject({
      field: 'timestamp',
      operator: 'between',
      value: [startDate.toISOString(), endDate.toISOString()]
    })
    expect(condition.id).toBeDefined()
  })

  test('should create relative date filter conditions', () => {
    const { result } = renderHook(() => useDateRangeFilter())

    const condition = result.current.createRelativeDateFilter('timestamp', 'last_day')

    expect(condition).toMatchObject({
      field: 'timestamp',
      operator: 'between'
    })
    expect(condition.id).toBeDefined()
    expect(Array.isArray(condition.value)).toBe(true)
    expect(condition.value).toHaveLength(2)
  })

  test('should handle different relative date options', () => {
    const { result } = renderHook(() => useDateRangeFilter())

    const options = ['last_hour', 'last_day', 'last_week', 'last_month'] as const

    options.forEach(option => {
      const condition = result.current.createRelativeDateFilter('timestamp', option)
      expect(condition.field).toBe('timestamp')
      expect(condition.operator).toBe('between')
      expect(Array.isArray(condition.value)).toBe(true)
    })
  })

  test('should include logical operator when provided', () => {
    const { result } = renderHook(() => useDateRangeFilter())

    const startDate = new Date('2024-01-01T00:00:00Z')
    const endDate = new Date('2024-01-01T23:59:59Z')

    const condition = result.current.createDateRangeFilter('timestamp', startDate, endDate, 'OR')

    expect(condition.logicalOperator).toBe('OR')
  })
})

describe('useCategoricalFilter', () => {
  test('should create categorical filter with multiple values', () => {
    const { result } = renderHook(() => useCategoricalFilter())

    const selectedValues = ['cpu', 'memory', 'network']
    const condition = result.current.createCategoricalFilter('category', selectedValues)

    expect(condition).toMatchObject({
      field: 'category',
      operator: 'in',
      value: selectedValues
    })
    expect(condition.id).toBeDefined()
  })

  test('should create categorical filter with exclusion', () => {
    const { result } = renderHook(() => useCategoricalFilter())

    const selectedValues = ['cpu', 'memory']
    const condition = result.current.createCategoricalFilter('category', selectedValues, 'not_in')

    expect(condition).toMatchObject({
      field: 'category',
      operator: 'not_in',
      value: selectedValues
    })
  })

  test('should create single category filter', () => {
    const { result } = renderHook(() => useCategoricalFilter())

    const condition = result.current.createSingleCategoryFilter('category', 'cpu')

    expect(condition).toMatchObject({
      field: 'category',
      operator: 'eq',
      value: 'cpu'
    })
    expect(condition.id).toBeDefined()
  })

  test('should include logical operator when provided', () => {
    const { result } = renderHook(() => useCategoricalFilter())

    const condition = result.current.createSingleCategoryFilter('category', 'cpu', 'AND')

    expect(condition.logicalOperator).toBe('AND')
  })
})

describe('Integration Tests', () => {
  test('should work together to create complex filter criteria', () => {
    const { result: dateResult } = renderHook(() => useDateRangeFilter())
    const { result: categoryResult } = renderHook(() => useCategoricalFilter())

    // Create a date range filter
    const dateCondition = dateResult.current.createRelativeDateFilter('timestamp', 'last_day')

    // Create a categorical filter
    const categoryCondition = categoryResult.current.createCategoricalFilter('category', ['cpu', 'memory'], 'in', 'AND')

    expect(dateCondition.field).toBe('timestamp')
    expect(categoryCondition.field).toBe('category')
    expect(categoryCondition.logicalOperator).toBe('AND')
  })
})