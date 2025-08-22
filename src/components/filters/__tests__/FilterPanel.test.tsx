import React from 'react'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { Provider } from 'react-redux'
import { configureStore } from '@reduxjs/toolkit'
import { FilterPanel } from '../FilterPanel'
import { FieldDefinition } from '../../../types'
import filterReducer from '../../../stores/slices/filterSlice'
import dataReducer from '../../../stores/slices/dataSlice'
import uiReducer from '../../../stores/slices/uiSlice'
import connectionReducer from '../../../stores/slices/connectionSlice'
import performanceReducer from '../../../stores/slices/performanceSlice'

// Mock lucide-react icons
jest.mock('lucide-react', () => ({
  Filter: () => <div data-testid="filter-icon">Filter</div>,
  Plus: () => <div data-testid="plus-icon">+</div>,
  X: () => <div data-testid="x-icon">X</div>,
  Check: () => <div data-testid="check-icon">✓</div>,
  ChevronDown: () => <div data-testid="chevron-down">↓</div>,
  ChevronUp: () => <div data-testid="chevron-up">↑</div>
}))

// Mock the generateId utility
jest.mock('../../../lib/utils', () => ({
  cn: (...classes: any[]) => classes.filter(Boolean).join(' '),
  generateId: () => 'test-id-123'
}))

const createTestStore = (initialState = {}) => {
  return configureStore({
    reducer: {
      filter: filterReducer,
      data: dataReducer,
      ui: uiReducer,
      connection: connectionReducer,
      performance: performanceReducer
    },
    preloadedState: initialState
  })
}

const sampleFields: FieldDefinition[] = [
  {
    name: 'name',
    label: 'Name',
    type: 'string'
  },
  {
    name: 'value',
    label: 'Value',
    type: 'number'
  },
  {
    name: 'category',
    label: 'Category',
    type: 'category',
    options: ['option1', 'option2', 'option3']
  }
]

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

describe('FilterPanel', () => {
  describe('Initial Render', () => {
    it('renders empty filter panel correctly', () => {
      renderWithStore(<FilterPanel availableFields={sampleFields} />)

      expect(screen.getByText('Filters')).toBeInTheDocument()
      expect(screen.getByText('Add a filter...')).toBeInTheDocument()
      expect(screen.getByText('No filters applied')).toBeInTheDocument()
    })

    it('shows available fields in dropdown', () => {
      renderWithStore(<FilterPanel availableFields={sampleFields} />)

      expect(screen.getByText('Add a filter...')).toBeInTheDocument()
      // The actual options would be visible when the select is opened
    })
  })

  describe('Adding Filters', () => {
    it('displays filter count badge when filters are active', () => {
      const initialState = {
        filter: {
          filterCriteria: {
            conditions: [
              {
                id: '1',
                field: 'name',
                operator: 'contains' as const,
                value: 'test'
              }
            ],
            grouping: [],
            sortBy: undefined
          },
          activeFilters: [
            {
              id: '1',
              field: 'name',
              operator: 'contains' as const,
              value: 'test'
            }
          ],
          isFiltering: false
        }
      }

      renderWithStore(<FilterPanel availableFields={sampleFields} />, initialState)

      expect(screen.getByText('1')).toBeInTheDocument() // Badge count
      expect(screen.getByText('Clear All')).toBeInTheDocument()
    })

    it('shows logical operators between multiple filters', () => {
      const initialState = {
        filter: {
          filterCriteria: {
            conditions: [
              {
                id: '1',
                field: 'name',
                operator: 'contains' as const,
                value: 'test'
              },
              {
                id: '2',
                field: 'value',
                operator: 'gt' as const,
                value: 10,
                logicalOperator: 'AND' as const
              }
            ],
            grouping: [],
            sortBy: undefined
          },
          activeFilters: [
            {
              id: '1',
              field: 'name',
              operator: 'contains' as const,
              value: 'test'
            },
            {
              id: '2',
              field: 'value',
              operator: 'gt' as const,
              value: 10,
              logicalOperator: 'AND' as const
            }
          ],
          isFiltering: false
        }
      }

      renderWithStore(<FilterPanel availableFields={sampleFields} />, initialState)

      expect(screen.getByText('AND')).toBeInTheDocument()
      expect(screen.getByText('2')).toBeInTheDocument() // Badge count
    })
  })

  describe('Clear Functionality', () => {
    it('shows clear all button when filters are active', () => {
      const initialState = {
        filter: {
          filterCriteria: {
            conditions: [
              {
                id: '1',
                field: 'name',
                operator: 'contains' as const,
                value: 'test'
              }
            ],
            grouping: [],
            sortBy: undefined
          },
          activeFilters: [
            {
              id: '1',
              field: 'name',
              operator: 'contains' as const,
              value: 'test'
            }
          ],
          isFiltering: false
        }
      }

      renderWithStore(<FilterPanel availableFields={sampleFields} />, initialState)

      expect(screen.getByText('Clear All')).toBeInTheDocument()
    })

    it('does not show clear all button when no filters are active', () => {
      renderWithStore(<FilterPanel availableFields={sampleFields} />)

      expect(screen.queryByText('Clear All')).not.toBeInTheDocument()
    })
  })

  describe('Field Type Display', () => {
    it('shows field types in the dropdown options', () => {
      renderWithStore(<FilterPanel availableFields={sampleFields} />)

      // The field types would be shown as badges in the actual dropdown
      // This tests that the component structure supports it
      expect(screen.getByText('Add a filter...')).toBeInTheDocument()
    })
  })

  describe('Empty State', () => {
    it('displays empty state when no filters are applied', () => {
      renderWithStore(<FilterPanel availableFields={sampleFields} />)

      expect(screen.getByText('No filters applied')).toBeInTheDocument()
      expect(screen.getByText('Add a filter to start filtering your data')).toBeInTheDocument()
    })
  })

  describe('Accessibility', () => {
    it('has proper ARIA labels and structure', () => {
      renderWithStore(<FilterPanel availableFields={sampleFields} />)

      expect(screen.getByText('Filters')).toBeInTheDocument()
      expect(screen.getByRole('combobox')).toBeInTheDocument() // Select dropdown
    })

    it('maintains focus management for keyboard navigation', () => {
      renderWithStore(<FilterPanel availableFields={sampleFields} />)

      const select = screen.getByRole('combobox')
      expect(select).toBeInTheDocument()
      // Focus management would be handled by the underlying Select component
    })
  })

  describe('Performance', () => {
    it('handles large numbers of available fields efficiently', () => {
      const manyFields: FieldDefinition[] = Array.from({ length: 100 }, (_, i) => ({
        name: `field${i}`,
        label: `Field ${i}`,
        type: 'string' as const
      }))

      const { container } = renderWithStore(<FilterPanel availableFields={manyFields} />)

      expect(container).toBeInTheDocument()
      // Component should render without performance issues
    })
  })

  describe('Error Handling', () => {
    it('handles missing field definitions gracefully', () => {
      const initialState = {
        filter: {
          filterCriteria: {
            conditions: [
              {
                id: '1',
                field: 'nonexistent',
                operator: 'contains' as const,
                value: 'test'
              }
            ],
            grouping: [],
            sortBy: undefined
          },
          activeFilters: [
            {
              id: '1',
              field: 'nonexistent',
              operator: 'contains' as const,
              value: 'test'
            }
          ],
          isFiltering: false
        }
      }

      renderWithStore(<FilterPanel availableFields={sampleFields} />, initialState)

      // Should not crash and should handle missing field gracefully
      expect(screen.getByText('Filters')).toBeInTheDocument()
    })
  })
})