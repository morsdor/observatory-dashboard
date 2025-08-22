import { configureStore } from '@reduxjs/toolkit'
import { useSelector, useDispatch } from 'react-redux'
import type { TypedUseSelectorHook } from 'react-redux'

import dataReducer from './slices/dataSlice'
import filterReducer from './slices/filterSlice'
import uiReducer from './slices/uiSlice'
import connectionReducer from './slices/connectionSlice'
import performanceReducer from './slices/performanceSlice'
import { filterMiddleware } from './middleware/filterMiddleware'

export const store = configureStore({
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
        ignoredActions: ['connection/setLastConnected', 'connection/setConnectionStatus'],
        // Ignore these field paths in all actions
        ignoredActionsPaths: ['payload.timestamp', 'payload.lastConnected'],
        // Ignore these paths in the state
        ignoredPaths: ['connection.lastConnected', 'data.rawData', 'data.filteredData', 'data.dataBuffer']
      }
    }).prepend(filterMiddleware.middleware)
})

export type RootState = ReturnType<typeof store.getState>
export type AppDispatch = typeof store.dispatch

// Use throughout your app instead of plain `useDispatch` and `useSelector`
export const useAppDispatch: () => AppDispatch = useDispatch
export const useAppSelector: TypedUseSelectorHook<RootState> = useSelector

// Selector hooks for better performance (maintaining same API as Zustand version)
export const useRawData = () => useAppSelector((state) => state.data.rawData)
export const useFilteredData = () => useAppSelector((state) => state.data.filteredData)
export const useConnectionStatus = () => useAppSelector((state) => state.connection.connectionStatus)
export const useSelectedRows = () => useAppSelector((state) => state.ui.selectedRows)
export const useFilterCriteria = () => useAppSelector((state) => state.filter.filterCriteria)
export const usePerformanceMetrics = () => useAppSelector((state) => state.performance.metrics)
export const useIsLoading = () => useAppSelector((state) => state.ui.isLoading)
export const useError = () => useAppSelector((state) => state.ui.error)

// Export all actions for easy access
export * from './slices/dataSlice'
export * from './slices/filterSlice'
export * from './slices/uiSlice'
export * from './slices/connectionSlice'
export * from './slices/performanceSlice'

// Export compatibility hook
export { useDashboardStore } from './hooks'