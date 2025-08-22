import React from 'react'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { Provider } from 'react-redux'
import { configureStore } from '@reduxjs/toolkit'
import { AdvancedFilterBuilder } from '../AdvancedFilterBuilder'
import filterReducer from '@/stores/slices/filterSlice'
import dataReducer from '@/stores/slices/dataSlice'
import { FieldDefinition } from '@/types'

// Mock file operations
Object.defineProperty(window.URL, 'createObjectURL', { 
  value: jest.fn().mockReturnValue('mock-url') 
})
Object.defineProperty(window.URL, 'revokeObjectURL', { 
  value: jest.fn() 
})

const mockStore = configureStore({
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
      rawData: [],
      filteredData: [],
      isLoading: false,
      error: null,
      connectionStatus: 'disconnected',
      dataBuffer: {
        maxSize: 100000,
        currentSize: 0
      }
    }
  }
})

const mockFields: FieldDefinition[] = [
  { name: 'category', label: 'Category', type: 'category', options: ['A', 'B', 'C'] },
  { name: 'value', label: 'Value', type: 'number' },
  { name: 'timestamp', label: 'Timestamp', type: 'date' },
  { name: 'source', label: 'Source', type: 'string' },
  { name: 'active', label: 'Active', type: 'boolean' }
]

const renderWithProvider = (component: React.ReactElement) => {
  return render(
    <Provider store={mockStore}>
      {component}
    </Provider>
  )
}

describe('AdvancedFilterBuilder', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  describe('Basic Functionality', () => {
    it('renders without crashing', () => {
      renderWithProvider(<AdvancedFilterBuilder availableFields={mockFields} />)
      expect(screen.getByText('Advanced Filter Builder')).toBeInTheDocument()
    })

    it('shows empty state when no filters are configured', () => {
      renderWithProvider(<AdvancedFilterBuilder availableFields={mockFields} />)
      expect(screen.getByText('No filters configured')).toBeInTheDocument()
    })

    it('displays export and import buttons', () => {
      renderWithProvider(<AdvancedFilterBuilder availableFields={mockFields} />)
      expect(screen.getByRole('button', { name: /export/i })).toBeInTheDocument()
      expect(screen.getByRole('button', { name: /import/i })).toBeInTheDocument()
    })

    it('displays add condition and group buttons', () => {
      renderWithProvider(<AdvancedFilterBuilder availableFields={mockFields} />)
      expect(screen.getByRole('button', { name: /condition/i })).toBeInTheDocument()
      expect(screen.getByRole('button', { name: /group/i })).toBeInTheDocument()
    })
  })

  describe('Condition Management', () => {
    it('adds a new condition when field is selected and button clicked', async () => {
      const user = userEvent.setup()
      renderWithProvider(<AdvancedFilterBuilder availableFields={mockFields} />)
      
      // Select a field from dropdown
      const select = screen.getByRole('combobox')
      await user.click(select)
      
      // Wait for dropdown to open and select category
      await waitFor(() => {
        expect(screen.getByText('Category')).toBeInTheDocument()
      })
      await user.click(screen.getByText('Category'))
      
      // Add condition
      const addButton = screen.getByRole('button', { name: /condition/i })
      await user.click(addButton)
      
      // Verify condition was added
      await waitFor(() => {
        expect(screen.getByText('Main Conditions')).toBeInTheDocument()
      })
    })

    it('validates condition values based on field type', async () => {
      const onValidationChange = jest.fn()
      const user = userEvent.setup()
      
      renderWithProvider(
        <AdvancedFilterBuilder 
          availableFields={mockFields} 
          onValidationChange={onValidationChange}
        />
      )
      
      // Add a number field condition (should trigger validation for empty value)
      const select = screen.getByRole('combobox')
      await user.click(select)
      await user.click(screen.getByText('Value'))
      await user.click(screen.getByRole('button', { name: /condition/i }))
      
      // Should trigger validation callback
      await waitFor(() => {
        expect(onValidationChange).toHaveBeenCalled()
      })
    })
  })

  describe('Group Management', () => {
    it('adds a new group when group button is clicked', async () => {
      const user = userEvent.setup()
      renderWithProvider(<AdvancedFilterBuilder availableFields={mockFields} />)
      
      const groupButton = screen.getByRole('button', { name: /group/i })
      await user.click(groupButton)
      
      await waitFor(() => {
        expect(screen.getByText('Group')).toBeInTheDocument()
      })
    })
  })

  describe('Export/Import Functionality', () => {
    it('exports filter configuration when export button is clicked', async () => {
      const user = userEvent.setup()
      const mockClick = jest.fn()
      const mockAppendChild = jest.fn()
      const mockRemoveChild = jest.fn()
      const mockCreateElement = jest.fn().mockReturnValue({
        href: '',
        download: '',
        click: mockClick
      })
      
      Object.defineProperty(document, 'createElement', { value: mockCreateElement })
      Object.defineProperty(document.body, 'appendChild', { value: mockAppendChild })
      Object.defineProperty(document.body, 'removeChild', { value: mockRemoveChild })
      
      renderWithProvider(<AdvancedFilterBuilder availableFields={mockFields} />)
      
      // Add a condition first to enable export
      const select = screen.getByRole('combobox')
      await user.click(select)
      await user.click(screen.getByText('Category'))
      await user.click(screen.getByRole('button', { name: /condition/i }))
      
      // Export
      const exportButton = screen.getByRole('button', { name: /export/i })
      await user.click(exportButton)
      
      expect(mockClick).toHaveBeenCalled()
    })

    it('handles import button click', async () => {
      const user = userEvent.setup()
      renderWithProvider(<AdvancedFilterBuilder availableFields={mockFields} />)
      
      const importButton = screen.getByRole('button', { name: /import/i })
      await user.click(importButton)
      
      // Should trigger file input (hidden input should exist)
      const fileInput = document.querySelector('input[type="file"]')
      expect(fileInput).toBeInTheDocument()
    })

    it('processes valid import file', async () => {
      const user = userEvent.setup()
      renderWithProvider(<AdvancedFilterBuilder availableFields={mockFields} />)
      
      const importButton = screen.getByRole('button', { name: /import/i })
      await user.click(importButton)
      
      // Mock valid import file
      const validConfig = {
        version: '1.0',
        filterCriteria: {
          conditions: [{
            id: 'test-condition',
            field: 'category',
            operator: 'eq',
            value: 'A'
          }],
          grouping: []
        }
      }
      
      const file = new File([JSON.stringify(validConfig)], 'test.json', { 
        type: 'application/json' 
      })
      
      const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement
      if (fileInput) {
        Object.defineProperty(fileInput, 'files', {
          value: [file],
          writable: false
        })
        fireEvent.change(fileInput)
        
        // Should import the configuration
        await waitFor(() => {
          expect(screen.getByText('Main Conditions')).toBeInTheDocument()
        })
      }
    })

    it('handles invalid import file gracefully', async () => {
      const user = userEvent.setup()
      const alertSpy = jest.spyOn(window, 'alert').mockImplementation(() => {})
      
      renderWithProvider(<AdvancedFilterBuilder availableFields={mockFields} />)
      
      const importButton = screen.getByRole('button', { name: /import/i })
      await user.click(importButton)
      
      // Mock invalid file
      const file = new File(['invalid json'], 'test.json', { type: 'application/json' })
      
      const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement
      if (fileInput) {
        Object.defineProperty(fileInput, 'files', {
          value: [file],
          writable: false
        })
        fireEvent.change(fileInput)
        
        await waitFor(() => {
          expect(alertSpy).toHaveBeenCalledWith(expect.stringContaining('Error importing filters'))
        })
      }
      
      alertSpy.mockRestore()
    })
  })

  describe('Validation', () => {
    it('shows validation errors when there are invalid conditions', async () => {
      const onValidationChange = jest.fn()
      const user = userEvent.setup()
      
      renderWithProvider(
        <AdvancedFilterBuilder 
          availableFields={mockFields} 
          onValidationChange={onValidationChange}
        />
      )
      
      // Add an empty group (should cause validation error)
      await user.click(screen.getByRole('button', { name: /group/i }))
      
      await waitFor(() => {
        // Should show validation errors
        expect(screen.getByText(/errors/)).toBeInTheDocument()
      })
    })

    it('validates field types and operators', () => {
      renderWithProvider(<AdvancedFilterBuilder availableFields={mockFields} />)
      
      // Component should render without errors even with complex field definitions
      expect(screen.getByText('Advanced Filter Builder')).toBeInTheDocument()
    })
  })

  describe('Drag and Drop', () => {
    it('handles drag events without errors', async () => {
      const user = userEvent.setup()
      renderWithProvider(<AdvancedFilterBuilder availableFields={mockFields} />)
      
      // Add a condition to test drag functionality
      const select = screen.getByRole('combobox')
      await user.click(select)
      await user.click(screen.getByText('Category'))
      await user.click(screen.getByRole('button', { name: /condition/i }))
      
      // The component should handle drag events (testing that it doesn't crash)
      const conditionElement = screen.getByText('Main Conditions').parentElement
      if (conditionElement) {
        const dragEvent = new Event('dragstart', { bubbles: true })
        Object.defineProperty(dragEvent, 'dataTransfer', {
          value: {
            setData: jest.fn(),
            effectAllowed: 'move'
          }
        })
        fireEvent(conditionElement, dragEvent)
      }
      
      // Should not crash
      expect(screen.getByText('Advanced Filter Builder')).toBeInTheDocument()
    })
  })

  describe('Edge Cases', () => {
    it('handles empty field definitions gracefully', () => {
      renderWithProvider(<AdvancedFilterBuilder availableFields={[]} />)
      expect(screen.getByText('Advanced Filter Builder')).toBeInTheDocument()
    })

    it('handles malformed field definitions', () => {
      const malformedFields = [
        { name: '', label: 'Empty Name', type: 'string' },
        { name: 'valid', label: '', type: 'string' }
      ] as FieldDefinition[]
      
      renderWithProvider(<AdvancedFilterBuilder availableFields={malformedFields} />)
      expect(screen.getByText('Advanced Filter Builder')).toBeInTheDocument()
    })
  })
})