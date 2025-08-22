import { useAppDispatch, useAppSelector } from './dashboardStore'
import { 
  addDataPoints as addDataPointsAction,
  setRawData as setRawDataAction,
  clearData as clearDataAction,
  setMaxBufferSize
} from './slices/dataSlice'
import {
  updateFilterCriteria as updateFilterCriteriaAction,
  addFilterCondition as addFilterConditionAction,
  removeFilterCondition as removeFilterConditionAction,
  clearFilters as clearFiltersAction,
  setIsFiltering
} from './slices/filterSlice'
import {
  setSelectedRows as setSelectedRowsAction,
  toggleRowSelection as toggleRowSelectionAction,
  setChartZoomLevel as setChartZoomLevelAction,
  setLoading as setLoadingAction,
  setError as setErrorAction,
  clearError as clearErrorAction
} from './slices/uiSlice'
import {
  setConnectionStatus as setConnectionStatusAction,
  incrementReconnectAttempts as incrementReconnectAttemptsAction,
  resetReconnectAttempts as resetReconnectAttemptsAction,
  setLastConnected as setLastConnectedAction
} from './slices/connectionSlice'
import {
  updateMetrics as updateMetricsAction,
  resetMetrics as resetMetricsAction
} from './slices/performanceSlice'
import { DataPoint, FilterCriteria, FilterCondition, ConnectionStatus, PerformanceMetrics } from '../types'

// Create a hook that mimics the Zustand store API
export const useDashboardStore = () => {
  const dispatch = useAppDispatch()
  
  // State selectors
  const rawData = useAppSelector((state) => state.data.rawData)
  const filteredData = useAppSelector((state) => state.data.filteredData)
  const dataBuffer = useAppSelector((state) => state.data.dataBuffer)
  const maxBufferSize = useAppSelector((state) => state.data.maxBufferSize)
  
  const filterCriteria = useAppSelector((state) => state.filter.filterCriteria)
  const activeFilters = useAppSelector((state) => state.filter.activeFilters)
  const isFiltering = useAppSelector((state) => state.filter.isFiltering)
  
  const selectedRows = useAppSelector((state) => state.ui.selectedRows)
  const chartZoomLevel = useAppSelector((state) => state.ui.chartZoomLevel)
  const isLoading = useAppSelector((state) => state.ui.isLoading)
  const error = useAppSelector((state) => state.ui.error)
  
  const connectionStatus = useAppSelector((state) => state.connection.connectionStatus)
  const lastConnected = useAppSelector((state) => state.connection.lastConnected)
  const reconnectAttempts = useAppSelector((state) => state.connection.reconnectAttempts)
  const maxReconnectAttempts = useAppSelector((state) => state.connection.maxReconnectAttempts)
  
  const metrics = useAppSelector((state) => state.performance.metrics)
  
  // Action creators
  const addDataPoints = (points: DataPoint[]) => dispatch(addDataPointsAction(points))
  const setRawData = (data: DataPoint[]) => dispatch(setRawDataAction(data))
  const clearData = () => dispatch(clearDataAction())
  
  const updateFilterCriteria = (criteria: FilterCriteria) => dispatch(updateFilterCriteriaAction(criteria))
  const addFilterCondition = (condition: FilterCondition) => dispatch(addFilterConditionAction(condition))
  const removeFilterCondition = (conditionId: string) => dispatch(removeFilterConditionAction(conditionId))
  const clearFilters = () => dispatch(clearFiltersAction())
  
  const setSelectedRows = (rowIds: string[]) => dispatch(setSelectedRowsAction(rowIds))
  const toggleRowSelection = (rowId: string) => dispatch(toggleRowSelectionAction(rowId))
  const setChartZoomLevel = (level: number) => dispatch(setChartZoomLevelAction(level))
  const setLoading = (loading: boolean) => dispatch(setLoadingAction(loading))
  const setError = (error: string | null) => dispatch(setErrorAction(error))
  const clearError = () => dispatch(clearErrorAction())
  
  const setConnectionStatus = (status: ConnectionStatus) => dispatch(setConnectionStatusAction(status))
  const incrementReconnectAttempts = () => dispatch(incrementReconnectAttemptsAction())
  const resetReconnectAttempts = () => dispatch(resetReconnectAttemptsAction())
  const setLastConnected = (date: Date) => dispatch(setLastConnectedAction(date))
  
  const updateMetrics = (metrics: Partial<PerformanceMetrics>) => dispatch(updateMetricsAction(metrics))
  const resetMetrics = () => dispatch(resetMetricsAction())
  
  // Return the same interface as the Zustand store
  return {
    // State
    rawData,
    filteredData,
    dataBuffer,
    maxBufferSize,
    filterCriteria,
    activeFilters,
    isFiltering,
    selectedRows,
    chartZoomLevel,
    isLoading,
    error,
    connectionStatus,
    lastConnected,
    reconnectAttempts,
    maxReconnectAttempts,
    metrics,
    
    // Actions
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
    setLastConnected,
    updateMetrics,
    resetMetrics
  }
}

// Static method to get state (for tests)
useDashboardStore.getState = () => {
  // This will be used in tests - we'll need to provide a way to access the store
  throw new Error('getState() should be replaced with store.getState() in tests')
}

// Static method to set state (for tests)
useDashboardStore.setState = (state: any) => {
  // This will be used in tests - we'll need to provide a way to dispatch actions
  throw new Error('setState() should be replaced with store.dispatch() in tests')
}