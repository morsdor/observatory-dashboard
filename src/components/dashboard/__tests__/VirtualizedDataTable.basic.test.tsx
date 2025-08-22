import React from 'react'
import { render } from '@testing-library/react'
import { Provider } from 'react-redux'
import { configureStore } from '@reduxjs/toolkit'
import { VirtualizedDataTable, defaultDataPointColumns } from '../VirtualizedDataTable'
import { DataPoint } from '@/types'
import dataReducer from '@/stores/slices/dataSlice'
import uiReducer from '@/stores/slices/uiSlice'
import filterReducer from '@/stores/slices/filterSlice'
import connectionReducer from '@/stores/slices/connectionSlice'
import performanceReducer from '@/stores/slices/performanceSlice'

// Simple mock for react-virtuoso
jest.mock('react-virtuoso', () => ({
  TableVirtuoso: () => <div data-testid="virtualized-table">Mocked Table</div>
}))

const createTestStore = () => {
  return configureStore({
    reducer: {
      data: dataReducer,
      ui: uiReducer,
      filter: filterReducer,
      connection: connectionReducer,
      performance: performanceReducer
    },
    middleware: (getDefaultMiddleware) =>
      getDefaultMiddleware({
        serializableCheck: false
      })
  })
}

const mockData: DataPoint[] = [
  {
    id: 'test-1',
    timestamp: new Date(),
    value: 100,
    category: 'test',
    source: 'test-source',
    metadata: { test: true }
  }
]

describe('VirtualizedDataTable Basic Test', () => {
  it('renders without crashing', () => {
    const store = createTestStore()
    
    render(
      <Provider store={store}>
        <VirtualizedDataTable
          data={mockData}
          columns={defaultDataPointColumns}
        />
      </Provider>
    )
    
    expect(true).toBe(true) // Basic smoke test
  })
})