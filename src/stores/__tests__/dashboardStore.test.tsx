import React, { ReactNode } from 'react'
import { act, renderHook } from '@testing-library/react'
import { Provider } from 'react-redux'
import { configureStore } from '@reduxjs/toolkit'
import { 
  store,
  useRawData, 
  useFilteredData, 
  useConnectionStatus,
  useSelectedRows,
  useFilterCriteria,
  usePerformanceMetrics,
  useIsLoading,
  useError,
  addDataPoints,
  setRawData,
  clearData,
  updateFilterCriteria,
  addFilterCondition,
  removeFilterCondition,
  clearFilters,
  setSelectedRows,
  toggleRowSelection,
  setChartZoomLevel,
  setLoading,
  setError,
  clearError,
  setConnectionStatus,
  incrementReconnectAttempts,
  resetReconnectAttempts,
  updateMetrics,
  resetMetrics,
  setMaxBufferSize
} from '../dashboardStore'
import dataReducer from '../slices/dataSlice'
import filterReducer from '../slices/filterSlice'
import uiReducer from '../slices/uiSlice'
import connectionReducer from '../slices/connectionSlice'
import performanceReducer from '../slices/performanceSlice'
import { filterMiddleware } from '../middleware/filterMiddleware'
import { DataPoint, FilterCondition, ConnectionStatus } from '../../types'

// Mock data for testing
const mockDataPoints: DataPoint[] = [
  {
    id: '1',
    timestamp: new Date('2024-01-01T10:00:00Z'),
    value: 100,
    category: 'cpu',
    source: 'server-1',
    metadata: { region: 'us-east-1' }
  },
  {
    id: '2',
    timestamp: new Date('2024-01-01T10:01:00Z'),
    value: 150,
    category: 'memory',
    source: 'server-1',
    metadata: { region: 'us-east-1' }
  },
  {
    id: '3',
    timestamp: new Date('2024-01-01T10:02:00Z'),
    value: 75,
    category: 'cpu',
    source: 'server-2',
    metadata: { region: 'us-west-1' }
  }
]

const mockFilterCondition: FilterCondition = {
  id: 'filter-1',
  field: 'category',
  operator: 'eq',
  value: 'cpu'
}

// Create a test store for each test
function createTestStore() {
  return configureStore({
    reducer: {
      data: dataReducer,
      filter: filterReducer,
      ui: uiReducer,
      connection: connectionReducer,
      performance: performanceReducer
    },
    middleware: (getDefaultMiddleware) =>
      getDefaultMiddleware({
        serializableCheck: {
          // Ignore these action types for Date objects
          ignoredActions: ['connection/setLastConnected', 'connection/setConnectionStatus', 'data/setRawData', 'data/addDataPoints', 'data/setFilteredData'],
          // Ignore these field paths in all actions
          ignoredActionsPaths: ['payload.timestamp', 'payload.lastConnected', 'payload.0.timestamp', 'payload.1.timestamp', 'payload.2.timestamp'],
          // Ignore these paths in the state
          ignoredPaths: ['connection.lastConnected', 'data.rawData', 'data.filteredData', 'data.dataBuffer']
        }
      }).prepend(filterMiddleware.middleware)
  })
}

// Test wrapper component
function TestWrapper({ children, testStore }: { children: ReactNode; testStore: any }) {
  return <Provider store={testStore}>{children}</Provider>
}

describe('DashboardStore', () => {
  let testStore: ReturnType<typeof createTestStore>

  beforeEach(() => {
    testStore = createTestStore()
  })

  describe('Data Slice', () => {
    it('should initialize with empty data arrays', () => {
      const { result } = renderHook(() => useRawData(), {
        wrapper: ({ children }) => <TestWrapper testStore={testStore}>{children}</TestWrapper>
      })
      expect(result.current).toEqual([])
    })

    it('should add data points and maintain buffer size', () => {
      act(() => {
        testStore.dispatch(addDataPoints(mockDataPoints))
      })

      const state = testStore.getState()
      expect(state.data.rawData).toHaveLength(3)
      expect(state.data.rawData).toEqual(mockDataPoints)
    })

    it('should implement sliding window when buffer exceeds max size', () => {
      // Set a small buffer size for testing
      act(() => {
        testStore.dispatch(setMaxBufferSize(2))
        testStore.dispatch(addDataPoints(mockDataPoints))
      })

      const state = testStore.getState()
      expect(state.data.rawData).toHaveLength(2)
      expect(state.data.rawData[0].id).toBe('2') // First item should be removed
      expect(state.data.rawData[1].id).toBe('3')
    })

    it('should set raw data and apply filters', () => {
      act(() => {
        testStore.dispatch(setRawData(mockDataPoints))
      })

      const state = testStore.getState()
      expect(state.data.rawData).toEqual(mockDataPoints)
      expect(state.data.filteredData).toEqual(mockDataPoints) // No filters applied
    })

    it('should clear all data', () => {
      act(() => {
        testStore.dispatch(setRawData(mockDataPoints))
        testStore.dispatch(clearData())
      })

      const state = testStore.getState()
      expect(state.data.rawData).toEqual([])
      expect(state.data.filteredData).toEqual([])
      expect(state.data.dataBuffer).toEqual([])
    })
  })

  describe('Filter Slice', () => {
    beforeEach(() => {
      // Set up data for filtering tests
      testStore.dispatch(setRawData(mockDataPoints))
    })

    it('should initialize with empty filter criteria', () => {
      const { result } = renderHook(() => useFilterCriteria(), {
        wrapper: ({ children }) => <TestWrapper testStore={testStore}>{children}</TestWrapper>
      })
      expect(result.current.conditions).toEqual([])
      expect(result.current.grouping).toEqual([])
    })

    it('should add filter condition and apply filters', () => {
      act(() => {
        testStore.dispatch(addFilterCondition(mockFilterCondition))
      })

      const state = testStore.getState()
      const cpuData = mockDataPoints.filter(point => point.category === 'cpu')
      
      expect(state.data.filteredData).toHaveLength(2)
      expect(state.data.filteredData).toEqual(cpuData)
    })

    it('should remove filter condition', () => {
      act(() => {
        testStore.dispatch(addFilterCondition(mockFilterCondition))
        testStore.dispatch(removeFilterCondition(mockFilterCondition.id))
      })

      const state = testStore.getState()
      expect(state.data.filteredData).toEqual(mockDataPoints) // All data should be visible
    })

    it('should clear all filters', () => {
      act(() => {
        testStore.dispatch(addFilterCondition(mockFilterCondition))
        testStore.dispatch(clearFilters())
      })

      const state = testStore.getState()
      expect(state.filter.filterCriteria.conditions).toEqual([])
      expect(state.filter.activeFilters).toEqual([])
      expect(state.data.filteredData).toEqual(mockDataPoints)
    })

    it('should handle numeric filters correctly', () => {
      const numericFilter: FilterCondition = {
        id: 'filter-2',
        field: 'value',
        operator: 'gt',
        value: 100
      }
      
      act(() => {
        testStore.dispatch(addFilterCondition(numericFilter))
      })

      const state = testStore.getState()
      expect(state.data.filteredData).toHaveLength(1)
      expect(state.data.filteredData[0].value).toBe(150)
    })

    it('should handle contains filter correctly', () => {
      const containsFilter: FilterCondition = {
        id: 'filter-3',
        field: 'source',
        operator: 'contains',
        value: 'server-1'
      }
      
      act(() => {
        testStore.dispatch(addFilterCondition(containsFilter))
      })

      const state = testStore.getState()
      expect(state.data.filteredData).toHaveLength(2)
      expect(state.data.filteredData.every(point => point.source.includes('server-1'))).toBe(true)
    })

    it('should handle between filter correctly', () => {
      const betweenFilter: FilterCondition = {
        id: 'filter-4',
        field: 'value',
        operator: 'between',
        value: [75, 150]
      }
      
      act(() => {
        testStore.dispatch(addFilterCondition(betweenFilter))
      })

      const state = testStore.getState()
      expect(state.data.filteredData).toHaveLength(3) // All values are between 75 and 150
    })

    it('should apply sorting when specified', () => {
      act(() => {
        // Apply sorting (data is already set in beforeEach)
        testStore.dispatch(updateFilterCriteria({
          conditions: [],
          grouping: [],
          sortBy: { field: 'value', direction: 'desc' }
        }))
      })

      const state = testStore.getState()
      expect(state.data.filteredData[0].value).toBe(150) // Highest value first
      expect(state.data.filteredData[1].value).toBe(100)
      expect(state.data.filteredData[2].value).toBe(75)
    })
  })

  describe('UI Slice', () => {
    it('should initialize with empty selected rows', () => {
      const { result } = renderHook(() => useSelectedRows(), {
        wrapper: ({ children }) => <TestWrapper testStore={testStore}>{children}</TestWrapper>
      })
      expect(result.current).toEqual([])
    })

    it('should set selected rows', () => {
      act(() => {
        testStore.dispatch(setSelectedRows(['1', '2']))
      })

      const state = testStore.getState()
      expect(state.ui.selectedRows).toEqual(['1', '2'])
    })

    it('should toggle row selection', () => {
      act(() => {
        testStore.dispatch(toggleRowSelection('1'))
      })

      let state = testStore.getState()
      expect(state.ui.selectedRows).toEqual(['1'])

      act(() => {
        testStore.dispatch(toggleRowSelection('1'))
      })

      state = testStore.getState()
      expect(state.ui.selectedRows).toEqual([])
    })

    it('should set chart zoom level with bounds', () => {
      act(() => {
        testStore.dispatch(setChartZoomLevel(5))
      })

      expect(testStore.getState().ui.chartZoomLevel).toBe(5)

      // Test upper bound
      act(() => {
        testStore.dispatch(setChartZoomLevel(15))
      })

      expect(testStore.getState().ui.chartZoomLevel).toBe(10)

      // Test lower bound
      act(() => {
        testStore.dispatch(setChartZoomLevel(0.05))
      })

      expect(testStore.getState().ui.chartZoomLevel).toBe(0.1)
    })

    it('should manage loading state', () => {
      act(() => {
        testStore.dispatch(setLoading(true))
      })

      const { result } = renderHook(() => useIsLoading(), {
        wrapper: ({ children }) => <TestWrapper testStore={testStore}>{children}</TestWrapper>
      })
      expect(result.current).toBe(true)
    })

    it('should manage error state', () => {
      const errorMessage = 'Test error'
      
      act(() => {
        testStore.dispatch(setError(errorMessage))
      })

      const { result } = renderHook(() => useError(), {
        wrapper: ({ children }) => <TestWrapper testStore={testStore}>{children}</TestWrapper>
      })
      expect(result.current).toBe(errorMessage)

      act(() => {
        testStore.dispatch(clearError())
      })

      expect(testStore.getState().ui.error).toBeNull()
    })
  })

  describe('Connection Slice', () => {
    it('should initialize with disconnected status', () => {
      const { result } = renderHook(() => useConnectionStatus(), {
        wrapper: ({ children }) => <TestWrapper testStore={testStore}>{children}</TestWrapper>
      })
      expect(result.current).toBe('disconnected')
    })

    it('should set connection status', () => {
      const statuses: ConnectionStatus[] = ['connecting', 'connected', 'error', 'disconnected']
      
      statuses.forEach(status => {
        act(() => {
          testStore.dispatch(setConnectionStatus(status))
        })

        expect(testStore.getState().connection.connectionStatus).toBe(status)
      })
    })

    it('should handle connected status with side effects', () => {
      // Set some error and reconnect attempts first
      act(() => {
        testStore.dispatch(setError('Connection failed'))
        testStore.dispatch(incrementReconnectAttempts())
        testStore.dispatch(setConnectionStatus('connected'))
      })

      const state = testStore.getState()
      expect(state.connection.connectionStatus).toBe('connected')
      expect(state.ui.error).toBeNull() // Error should be cleared by middleware
      expect(state.connection.reconnectAttempts).toBe(0) // Attempts should be reset
      expect(state.connection.lastConnected).toBeInstanceOf(Date)
    })

    it('should manage reconnect attempts', () => {
      act(() => {
        testStore.dispatch(incrementReconnectAttempts())
        testStore.dispatch(incrementReconnectAttempts())
      })

      expect(testStore.getState().connection.reconnectAttempts).toBe(2)

      act(() => {
        testStore.dispatch(resetReconnectAttempts())
      })

      expect(testStore.getState().connection.reconnectAttempts).toBe(0)
    })
  })

  describe('Performance Slice', () => {
    it('should initialize with default metrics', () => {
      const { result } = renderHook(() => usePerformanceMetrics(), {
        wrapper: ({ children }) => <TestWrapper testStore={testStore}>{children}</TestWrapper>
      })
      expect(result.current.fps).toBe(60)
      expect(result.current.memoryUsage).toBe(0)
      expect(result.current.dataPointsPerSecond).toBe(0)
    })

    it('should update performance metrics', () => {
      act(() => {
        testStore.dispatch(updateMetrics({
          fps: 45,
          memoryUsage: 1024,
          dataPointsPerSecond: 500
        }))
      })

      const state = testStore.getState()
      expect(state.performance.metrics.fps).toBe(45)
      expect(state.performance.metrics.memoryUsage).toBe(1024)
      expect(state.performance.metrics.dataPointsPerSecond).toBe(500)
      expect(state.performance.metrics.renderTime).toBe(0) // Should preserve existing values
    })

    it('should reset metrics to defaults', () => {
      act(() => {
        testStore.dispatch(updateMetrics({ fps: 30, memoryUsage: 2048 }))
        testStore.dispatch(resetMetrics())
      })

      const state = testStore.getState()
      expect(state.performance.metrics.fps).toBe(60)
      expect(state.performance.metrics.memoryUsage).toBe(0)
    })
  })

  describe('Integration Tests', () => {
    it('should handle complex filter and data operations', () => {
      act(() => {
        // Add initial data
        testStore.dispatch(setRawData(mockDataPoints))
        
        // Add filter
        testStore.dispatch(addFilterCondition(mockFilterCondition))
        
        // Add more data
        const newData: DataPoint[] = [{
          id: '4',
          timestamp: new Date('2024-01-01T10:03:00Z'),
          value: 200,
          category: 'cpu',
          source: 'server-3',
          metadata: { region: 'eu-west-1' }
        }]
        
        testStore.dispatch(addDataPoints(newData))
      })

      const state = testStore.getState()
      expect(state.data.rawData).toHaveLength(4)
      expect(state.data.filteredData).toHaveLength(3) // Only CPU data (2 original + 1 new)
      expect(state.data.filteredData.every(point => point.category === 'cpu')).toBe(true)
    })

    it('should update filter time metrics when applying filters', () => {
      act(() => {
        testStore.dispatch(setRawData(mockDataPoints))
        testStore.dispatch(addFilterCondition(mockFilterCondition))
      })

      const state = testStore.getState()
      expect(state.performance.metrics.filterTime).toBeGreaterThan(0)
    })

    it('should handle metadata field filtering', () => {
      const metadataFilter: FilterCondition = {
        id: 'filter-5',
        field: 'region',
        operator: 'eq',
        value: 'us-east-1'
      }
      
      act(() => {
        testStore.dispatch(setRawData(mockDataPoints))
        testStore.dispatch(addFilterCondition(metadataFilter))
      })

      const state = testStore.getState()
      expect(state.data.filteredData).toHaveLength(2)
      expect(state.data.filteredData.every(point => point.metadata.region === 'us-east-1')).toBe(true)
    })
  })

  describe('Selector Hooks', () => {
    it('should provide reactive selectors', () => {
      const { result: rawDataResult } = renderHook(() => useRawData(), {
        wrapper: ({ children }) => <TestWrapper testStore={testStore}>{children}</TestWrapper>
      })
      const { result: filteredDataResult } = renderHook(() => useFilteredData(), {
        wrapper: ({ children }) => <TestWrapper testStore={testStore}>{children}</TestWrapper>
      })
      
      expect(rawDataResult.current).toEqual([])
      expect(filteredDataResult.current).toEqual([])
      
      act(() => {
        testStore.dispatch(setRawData(mockDataPoints))
      })
      
      expect(rawDataResult.current).toEqual(mockDataPoints)
      expect(filteredDataResult.current).toEqual(mockDataPoints)
    })
  })
})