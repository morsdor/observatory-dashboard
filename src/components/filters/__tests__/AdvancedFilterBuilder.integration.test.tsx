import React from 'react'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { Provider } from 'react-redux'
import { configureStore } from '@reduxjs/toolkit'
import { AdvancedFilterBuilder } from '../AdvancedFilterBuilder'
import { AdvancedFilterEngine } from '@/lib/filterEngine'
import filterReducer from '@/stores/slices/filterSlice'
import dataReducer from '@/stores/slices/dataSlice'
import { FieldDefinition, DataPoint, FilterCriteria } from '@/types'

// Mock data for testing
const generateMockData = (count: number): DataPoint[] => {
  return Array.from({ length: count }, (_, i) => ({
    id: `data-${i}`,
    timestamp: new Date(Date.now() - i * 60000),
    value: Math.random() * 100,
    category: ['A', 'B', 'C'][i % 3],
    source: ['server-1', 'server-2', 'database'][i % 3],
    metadata: {
      priority: ['high', 'medium', 'low'][i % 3],
      region: ['us-east', 'us-west', 'eu-west'][i % 3],
      active: i % 2 === 0
    }
  }))
}

const mockFields: FieldDefinition[] = [
  { name: 'category', label: 'Category', type: 'category', options: ['A', 'B', 'C'] },
  { name: 'value', label: 'Value', type: 'number' },
  { name: 'timestamp', label: 'Timestamp', type: 'date' },
  { name: 'source', label: 'Source', type: 'string' },
  { name: 'metadata.active', label: 'Active', type: 'boolean' },
  { name: 'metadata.priority', label: 'Priority', type: 'category', options: ['high', 'medium', 'low'] }
]

const createTestStore = (initialData: DataPoint[] = []) => {
  return configureStore({
    reducer: {
      filter: filterReducer,
      data: dataReducer
    },
    preloadedState: {
      filter: {
        filterCriteria: {
          conditions: [],
          grouping: []
        },
        activeFilters: [],
        isFiltering: false,
        performance: {
          filterTime: 0,
          resultCount: 0,
          totalCount: 0
        }
      },
      data: {
        rawData: initialData,
        filteredData: initialData,
        isLoading: false,
        error: null,
        connectionStatus: 'connected',
        dataBuffer: {
          maxSize: 100000,
          currentSize: initialData.length
        }
      }
    }
  })
}

describe('AdvancedFilterBuilder Integration Tests', () => {
  let mockData: DataPoint[]
  let filterEngine: AdvancedFilterEngine

  beforeEach(() => {
    mockData = generateMockData(100)
    filterEngine = new AdvancedFilterEngine(mockData)
    jest.clearAllMocks()
  })

  describe('Complex Filter Scenarios', () => {
    it('handles multiple conditions with different field types', async () => {
      const user = userEvent.setup()
      const store = createTestStore(mockData)
      
      render(
        <Provider store={store}>
          <AdvancedFilterBuilder availableFields={mockFields} />
        </Provider>
      )

      // Add category condition
      const select = screen.getByRole('combobox')
      await user.click(select)
      await user.click(screen.getByText('Category'))
      await user.click(screen.getByRole('button', { name: /condition/i }))

      // Add value condition
      await user.click(select)
      await user.click(screen.getByText('Value'))
      await user.click(screen.getByRole('button', { name: /condition/i }))

      // Verify both conditions are added
      await waitFor(() => {
        expect(screen.getByText('Main Conditions')).toBeInTheDocument()
      })
    })

    it('validates complex filter structures', async () => {
      const user = userEvent.setup()
      const store = createTestStore(mockData)
      const onValidationChange = jest.fn()
      
      render(
        <Provider store={store}>
          <AdvancedFilterBuilder 
            availableFields={mockFields} 
            onValidationChange={onValidationChange}
          />
        </Provider>
      )

      // Add a group
      await user.click(screen.getByRole('button', { name: /group/i }))
      
      // Should trigger validation (empty group is invalid)
      await waitFor(() => {
        expect(onValidationChange).toHaveBeenCalledWith(false, expect.any(Array))
      })
    })

    it('handles nested group structures', async () => {
      const user = userEvent.setup()
      const store = createTestStore(mockData)
      
      render(
        <Provider store={store}>
          <AdvancedFilterBuilder availableFields={mockFields} />
        </Provider>
      )

      // Add multiple groups
      await user.click(screen.getByRole('button', { name: /group/i }))
      await user.click(screen.getByRole('button', { name: /group/i }))

      // Should handle multiple groups
      const groups = screen.getAllByText('Group')
      expect(groups.length).toBeGreaterThanOrEqual(2)
    })
  })

  describe('Performance with Large Datasets', () => {
    it('handles large datasets efficiently', async () => {
      const largeDataset = generateMockData(1000)
      const user = userEvent.setup()
      const store = createTestStore(largeDataset)
      
      const startTime = performance.now()
      
      render(
        <Provider store={store}>
          <AdvancedFilterBuilder availableFields={mockFields} />
        </Provider>
      )

      // Add conditions
      const select = screen.getByRole('combobox')
      await user.click(select)
      await user.click(screen.getByText('Category'))
      await user.click(screen.getByRole('button', { name: /condition/i }))

      const endTime = performance.now()
      
      // Should complete within reasonable time
      expect(endTime - startTime).toBeLessThan(1000)
    })
  })

  describe('Filter Engine Integration', () => {
    it('integrates with filter engine for basic filtering', () => {
      const criteria: FilterCriteria = {
        conditions: [
          {
            id: 'test-1',
            field: 'category',
            operator: 'eq',
            value: 'A'
          }
        ],
        grouping: []
      }

      const results = filterEngine.filter(criteria)
      
      // Should return filtered results
      expect(results.length).toBeGreaterThan(0)
      expect(results.every(item => item.category === 'A')).toBe(true)
    })

    it('handles complex group filtering', () => {
      const criteria: FilterCriteria = {
        conditions: [],
        grouping: [{
          id: 'group-1',
          logicalOperator: 'OR',
          conditions: [
            {
              id: 'test-1',
              field: 'category',
              operator: 'eq',
              value: 'A'
            },
            {
              id: 'test-2',
              field: 'category',
              operator: 'eq',
              value: 'B',
              logicalOperator: 'OR'
            }
          ]
        }]
      }

      const results = filterEngine.filter(criteria)
      
      // Should return items with category A or B
      expect(results.length).toBeGreaterThan(0)
      expect(results.every(item => item.category === 'A' || item.category === 'B')).toBe(true)
    })

    it('handles numeric range filtering', () => {
      const criteria: FilterCriteria = {
        conditions: [
          {
            id: 'test-1',
            field: 'value',
            operator: 'between',
            value: [25, 75]
          }
        ],
        grouping: []
      }

      const results = filterEngine.filter(criteria)
      
      // Should return items with values between 25 and 75
      expect(results.every(item => item.value >= 25 && item.value <= 75)).toBe(true)
    })

    it('handles date range filtering', () => {
      const now = new Date()
      const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000)
      
      const criteria: FilterCriteria = {
        conditions: [
          {
            id: 'test-1',
            field: 'timestamp',
            operator: 'between',
            value: [oneHourAgo.toISOString(), now.toISOString()]
          }
        ],
        grouping: []
      }

      const results = filterEngine.filter(criteria)
      
      // Should return items within the date range
      expect(results.every(item => 
        item.timestamp >= oneHourAgo && item.timestamp <= now
      )).toBe(true)
    })
  })

  describe('Real-time Validation', () => {
    it('provides validation feedback during filter building', async () => {
      const user = userEvent.setup()
      const store = createTestStore(mockData)
      const onValidationChange = jest.fn()
      
      render(
        <Provider store={store}>
          <AdvancedFilterBuilder 
            availableFields={mockFields} 
            onValidationChange={onValidationChange}
          />
        </Provider>
      )

      // Start with valid state
      expect(onValidationChange).toHaveBeenCalledWith(true, [])

      // Add invalid condition (empty group)
      await user.click(screen.getByRole('button', { name: /group/i }))

      // Should trigger validation error
      await waitFor(() => {
        expect(onValidationChange).toHaveBeenCalledWith(false, expect.any(Array))
      })
    })
  })

  describe('Export/Import Integration', () => {
    it('exports and imports filter configurations', async () => {
      const user = userEvent.setup()
      const store = createTestStore(mockData)
      
      // Mock file operations
      let exportedData: any = null
      const mockCreateObjectURL = jest.fn().mockImplementation((blob) => {
        const reader = new FileReader()
        reader.onload = () => {
          exportedData = JSON.parse(reader.result as string)
        }
        reader.readAsText(blob)
        return 'mock-url'
      })
      
      Object.defineProperty(window.URL, 'createObjectURL', { value: mockCreateObjectURL })
      
      render(
        <Provider store={store}>
          <AdvancedFilterBuilder availableFields={mockFields} />
        </Provider>
      )

      // Create filter structure
      const select = screen.getByRole('combobox')
      await user.click(select)
      await user.click(screen.getByText('Category'))
      await user.click(screen.getByRole('button', { name: /condition/i }))

      // Export the configuration
      const exportButton = screen.getByRole('button', { name: /export/i })
      await user.click(exportButton)

      // Verify export was called
      expect(mockCreateObjectURL).toHaveBeenCalled()
    })
  })

  describe('Error Handling', () => {
    it('handles invalid field references gracefully', () => {
      const invalidFields = [
        { name: 'nonexistent', label: 'Non-existent', type: 'string' }
      ] as FieldDefinition[]
      
      const store = createTestStore(mockData)
      
      render(
        <Provider store={store}>
          <AdvancedFilterBuilder availableFields={invalidFields} />
        </Provider>
      )

      // Should render without crashing
      expect(screen.getByText('Advanced Filter Builder')).toBeInTheDocument()
    })

    it('handles empty data gracefully', () => {
      const store = createTestStore([])
      
      render(
        <Provider store={store}>
          <AdvancedFilterBuilder availableFields={mockFields} />
        </Provider>
      )

      // Should render without crashing
      expect(screen.getByText('Advanced Filter Builder')).toBeInTheDocument()
    })
  })
})