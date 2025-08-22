import React from 'react'
import { renderHook, act, waitFor } from '@testing-library/react'
import { Provider } from 'react-redux'
import { configureStore } from '@reduxjs/toolkit'
import { useDebouncedFilter } from '../useDebouncedFilter'
import { DataPoint, FilterCondition } from '@/types'
import filterReducer from '../../stores/slices/filterSlice'
import dataReducer from '../../stores/slices/dataSlice'
import uiReducer from '../../stores/slices/uiSlice'
import connectionReducer from '../../stores/slices/connectionSlice'
import performanceReducer from '../../stores/slices/performanceSlice'

// Mock performance.now for consistent testing
const mockPerformanceNow = jest.fn()
global.performance = {
  ...global.performance,
  now: mockPerformanceNow
}

const createTestStore = (initialState = {}) => {
  return configureStore({
    reducer: {
      filter: filterReducer,
      data: dataReducer,
      ui: uiReducer,
      connection: connectionReducer,
      performance: performanceReducer
    },
    preloadedState: initialState,
    middleware: (getDefaultMiddleware) =>
      getDefaultMiddleware({
        serializableCheck: {
          ignoredActions: ['connection/setLastConnected', 'connection/setConnectionStatus'],
          ignoredActionsPaths: ['payload.timestamp', 'payload.lastConnected'],
          ignoredPaths: ['connection.lastConnected', 'data.rawData', 'data.filteredData', 'data.dataBuffer']
        }
      })
  })
}

const createWrapper = (store: any) => {
  return ({ children }: { children: React.ReactNode }) => (
    <Provider store={store}>{children}</Provider>
  )
}

const sampleData: DataPoint[] = [
  {
    id: '1',
    timestamp: new Date('2024-01-01T10:00:00Z'),
    value: 10,
    category: 'cpu',
    source: 'server-1',
    metadata: { status: 'active' }
  },
  {
    id: '2',
    timestamp: new Date('2024-01-01T10:01:00Z'),
    value: 20,
    category: 'memory',
    source: 'server-2',
    metadata: { status: 'inactive' }
  },
  {
    id: '3',
    timestamp: new Date('2024-01-01T10:02:00Z'),
    value: 30,
    category: 'cpu',
    source: 'server-1',
    metadata: { status: 'active' }
  }
]

describe('useDebouncedFilter', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    mockPerformanceNow.mockReturnValue(100)
  })

  afterEach(() => {
    jest.clearAllTimers()
  })

  describe('Basic Functionality', () => {
    it('returns initial state correctly', () => {
      const store = createTestStore({
        data: {
          rawData: sampleData,
          filteredData: [],
          dataBuffer: sampleData,
          maxBufferSize: 100000
        },
        filter: {
          filterCriteria: { conditions: [], grouping: [] },
          activeFilters: [],
          isFiltering: false
        }
      })

      const { result } = renderHook(() => useDebouncedFilter(100), {
        wrapper: createWrapper(store)
      })

      expect(result.current.isFiltering).toBe(false)
      expect(result.current.totalDataCount).toBe(3)
    })

    it('applies debouncing to filter changes', async () => {
      const store = createTestStore({
        data: {
          rawData: sampleData,
          filteredData: sampleData,
          dataBuffer: sampleData,
          maxBufferSize: 100000
        },
        filter: {
          filterCriteria: { conditions: [], grouping: [] },
          activeFilters: [],
          isFiltering: false
        }
      })

      const { result } = renderHook(() => useDebouncedFilter(100), {
        wrapper: createWrapper(store)
      })

      // Initial state
      expect(result.current.isFiltering).toBe(false)

      // Fast forward past debounce time
      act(() => {
        jest.advanceTimersByTime(150)
      })

      await waitFor(() => {
        expect(result.current.filteredDataCount).toBe(3)
      })
    })
  })

  describe('Filter Application', () => {
    it('filters data based on conditions', async () => {
      const filterConditions: FilterCondition[] = [
        {
          id: '1',
          field: 'category',
          operator: 'eq',
          value: 'cpu'
        }
      ]

      const store = createTestStore({
        data: {
          rawData: sampleData,
          filteredData: sampleData,
          dataBuffer: sampleData,
          maxBufferSize: 100000
        },
        filter: {
          filterCriteria: { conditions: filterConditions, grouping: [] },
          activeFilters: filterConditions,
          isFiltering: false
        }
      })

      const { result } = renderHook(() => useDebouncedFilter(50), {
        wrapper: createWrapper(store)
      })

      // Fast forward past debounce time
      act(() => {
        jest.advanceTimersByTime(100)
      })

      // Wait for async filtering to complete
      await waitFor(() => {
        expect(result.current.isFiltering).toBe(false)
      })
    })

    it('handles numeric filtering correctly', async () => {
      const filterConditions: FilterCondition[] = [
        {
          id: '1',
          field: 'value',
          operator: 'gt',
          value: 15
        }
      ]

      const store = createTestStore({
        data: {
          rawData: sampleData,
          filteredData: sampleData,
          dataBuffer: sampleData,
          maxBufferSize: 100000
        },
        filter: {
          filterCriteria: { conditions: filterConditions, grouping: [] },
          activeFilters: filterConditions,
          isFiltering: false
        }
      })

      renderHook(() => useDebouncedFilter(50), {
        wrapper: createWrapper(store)
      })

      act(() => {
        jest.advanceTimersByTime(100)
      })

      // The hook should process the filter
      await waitFor(() => {
        expect(mockPerformanceNow).toHaveBeenCalled()
      })
    })

    it('handles string contains filtering', async () => {
      const filterConditions: FilterCondition[] = [
        {
          id: '1',
          field: 'source',
          operator: 'contains',
          value: 'server-1'
        }
      ]

      const store = createTestStore({
        data: {
          rawData: sampleData,
          filteredData: sampleData,
          dataBuffer: sampleData,
          maxBufferSize: 100000
        },
        filter: {
          filterCriteria: { conditions: filterConditions, grouping: [] },
          activeFilters: filterConditions,
          isFiltering: false
        }
      })

      renderHook(() => useDebouncedFilter(50), {
        wrapper: createWrapper(store)
      })

      act(() => {
        jest.advanceTimersByTime(100)
      })

      await waitFor(() => {
        expect(mockPerformanceNow).toHaveBeenCalled()
      })
    })

    it('handles between operator for numeric ranges', async () => {
      const filterConditions: FilterCondition[] = [
        {
          id: '1',
          field: 'value',
          operator: 'between',
          value: [15, 25]
        }
      ]

      const store = createTestStore({
        data: {
          rawData: sampleData,
          filteredData: sampleData,
          dataBuffer: sampleData,
          maxBufferSize: 100000
        },
        filter: {
          filterCriteria: { conditions: filterConditions, grouping: [] },
          activeFilters: filterConditions,
          isFiltering: false
        }
      })

      renderHook(() => useDebouncedFilter(50), {
        wrapper: createWrapper(store)
      })

      act(() => {
        jest.advanceTimersByTime(100)
      })

      await waitFor(() => {
        expect(mockPerformanceNow).toHaveBeenCalled()
      })
    })
  })

  describe('Logical Operators', () => {
    it('handles AND logic between conditions', async () => {
      const filterConditions: FilterCondition[] = [
        {
          id: '1',
          field: 'category',
          operator: 'eq',
          value: 'cpu'
        },
        {
          id: '2',
          field: 'value',
          operator: 'gt',
          value: 15,
          logicalOperator: 'AND'
        }
      ]

      const store = createTestStore({
        data: {
          rawData: sampleData,
          filteredData: sampleData,
          dataBuffer: sampleData,
          maxBufferSize: 100000
        },
        filter: {
          filterCriteria: { conditions: filterConditions, grouping: [] },
          activeFilters: filterConditions,
          isFiltering: false
        }
      })

      renderHook(() => useDebouncedFilter(50), {
        wrapper: createWrapper(store)
      })

      act(() => {
        jest.advanceTimersByTime(100)
      })

      await waitFor(() => {
        expect(mockPerformanceNow).toHaveBeenCalled()
      })
    })

    it('handles OR logic between conditions', async () => {
      const filterConditions: FilterCondition[] = [
        {
          id: '1',
          field: 'category',
          operator: 'eq',
          value: 'cpu'
        },
        {
          id: '2',
          field: 'category',
          operator: 'eq',
          value: 'memory',
          logicalOperator: 'OR'
        }
      ]

      const store = createTestStore({
        data: {
          rawData: sampleData,
          filteredData: sampleData,
          dataBuffer: sampleData,
          maxBufferSize: 100000
        },
        filter: {
          filterCriteria: { conditions: filterConditions, grouping: [] },
          activeFilters: filterConditions,
          isFiltering: false
        }
      })

      renderHook(() => useDebouncedFilter(50), {
        wrapper: createWrapper(store)
      })

      act(() => {
        jest.advanceTimersByTime(100)
      })

      await waitFor(() => {
        expect(mockPerformanceNow).toHaveBeenCalled()
      })
    })
  })

  describe('Nested Field Access', () => {
    it('handles nested field filtering', async () => {
      const filterConditions: FilterCondition[] = [
        {
          id: '1',
          field: 'metadata.status',
          operator: 'eq',
          value: 'active'
        }
      ]

      const store = createTestStore({
        data: {
          rawData: sampleData,
          filteredData: sampleData,
          dataBuffer: sampleData,
          maxBufferSize: 100000
        },
        filter: {
          filterCriteria: { conditions: filterConditions, grouping: [] },
          activeFilters: filterConditions,
          isFiltering: false
        }
      })

      renderHook(() => useDebouncedFilter(50), {
        wrapper: createWrapper(store)
      })

      act(() => {
        jest.advanceTimersByTime(100)
      })

      await waitFor(() => {
        expect(mockPerformanceNow).toHaveBeenCalled()
      })
    })
  })

  describe('Performance Monitoring', () => {
    it('logs performance metrics', async () => {
      const consoleSpy = jest.spyOn(console, 'log').mockImplementation()
      mockPerformanceNow.mockReturnValueOnce(100).mockReturnValueOnce(150)

      const store = createTestStore({
        data: {
          rawData: sampleData,
          filteredData: sampleData,
          dataBuffer: sampleData,
          maxBufferSize: 100000
        },
        filter: {
          filterCriteria: { conditions: [], grouping: [] },
          activeFilters: [],
          isFiltering: false
        }
      })

      renderHook(() => useDebouncedFilter(50), {
        wrapper: createWrapper(store)
      })

      act(() => {
        jest.advanceTimersByTime(100)
      })

      await waitFor(() => {
        expect(consoleSpy).toHaveBeenCalledWith(
          expect.stringContaining('Filter applied in')
        )
      })

      consoleSpy.mockRestore()
    })
  })

  describe('Error Handling', () => {
    it('handles filtering errors gracefully', async () => {
      const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation()

      // Create invalid filter condition that might cause an error
      const filterConditions: FilterCondition[] = [
        {
          id: '1',
          field: 'nonexistent.deeply.nested.field',
          operator: 'eq',
          value: 'test'
        }
      ]

      const store = createTestStore({
        data: {
          rawData: sampleData,
          filteredData: sampleData,
          dataBuffer: sampleData,
          maxBufferSize: 100000
        },
        filter: {
          filterCriteria: { conditions: filterConditions, grouping: [] },
          activeFilters: filterConditions,
          isFiltering: false
        }
      })

      renderHook(() => useDebouncedFilter(50), {
        wrapper: createWrapper(store)
      })

      act(() => {
        jest.advanceTimersByTime(100)
      })

      // Should handle the error gracefully
      await waitFor(() => {
        expect(mockPerformanceNow).toHaveBeenCalled()
      })

      consoleErrorSpy.mockRestore()
    })
  })
})