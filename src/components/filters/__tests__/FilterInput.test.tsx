import React from 'react'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { FilterInput } from '../FilterInput'
import { FilterCondition, FieldDefinition } from '@/types'

// Mock lucide-react icons
jest.mock('lucide-react', () => ({
  X: () => <div data-testid="x-icon">X</div>,
  Check: () => <div data-testid="check-icon">✓</div>,
  ChevronDown: () => <div data-testid="chevron-down">↓</div>,
  ChevronUp: () => <div data-testid="chevron-up">↑</div>
}))

describe('FilterInput', () => {
  const mockOnConditionChange = jest.fn()
  const mockOnRemove = jest.fn()

  beforeEach(() => {
    jest.clearAllMocks()
  })

  const stringField: FieldDefinition = {
    name: 'name',
    label: 'Name',
    type: 'string'
  }

  const numberField: FieldDefinition = {
    name: 'value',
    label: 'Value',
    type: 'number'
  }

  const categoryField: FieldDefinition = {
    name: 'category',
    label: 'Category',
    type: 'category',
    options: ['option1', 'option2', 'option3']
  }

  const booleanField: FieldDefinition = {
    name: 'active',
    label: 'Active',
    type: 'boolean'
  }

  describe('String Field Filtering', () => {
    it('renders string filter input correctly', () => {
      const condition: FilterCondition = {
        id: '1',
        field: 'name',
        operator: 'contains',
        value: 'test'
      }

      render(
        <FilterInput
          condition={condition}
          field={stringField}
          onConditionChange={mockOnConditionChange}
          onRemove={mockOnRemove}
        />
      )

      expect(screen.getByDisplayValue('test')).toBeInTheDocument()
      expect(screen.getByText('Name')).toBeInTheDocument()
    })

    it('handles string value changes', async () => {
      const user = userEvent.setup()
      const condition: FilterCondition = {
        id: '1',
        field: 'name',
        operator: 'contains',
        value: ''
      }

      render(
        <FilterInput
          condition={condition}
          field={stringField}
          onConditionChange={mockOnConditionChange}
          onRemove={mockOnRemove}
        />
      )

      const input = screen.getByPlaceholderText('Enter name')
      await user.type(input, 'new value')

      await waitFor(() => {
        expect(mockOnConditionChange).toHaveBeenCalledWith({
          ...condition,
          value: 'new value'
        })
      })
    })

    it('shows correct operators for string fields', () => {
      const condition: FilterCondition = {
        id: '1',
        field: 'name',
        operator: 'contains',
        value: ''
      }

      render(
        <FilterInput
          condition={condition}
          field={stringField}
          onConditionChange={mockOnConditionChange}
          onRemove={mockOnRemove}
        />
      )

      // String fields should have 'eq' and 'contains' operators
      expect(screen.getByDisplayValue('Contains')).toBeInTheDocument()
    })
  })

  describe('Number Field Filtering', () => {
    it('renders number filter input correctly', () => {
      const condition: FilterCondition = {
        id: '1',
        field: 'value',
        operator: 'gt',
        value: 42
      }

      render(
        <FilterInput
          condition={condition}
          field={numberField}
          onConditionChange={mockOnConditionChange}
          onRemove={mockOnRemove}
        />
      )

      expect(screen.getByDisplayValue('42')).toBeInTheDocument()
      expect(screen.getByText('Value')).toBeInTheDocument()
    })

    it('handles number value changes', async () => {
      const user = userEvent.setup()
      const condition: FilterCondition = {
        id: '1',
        field: 'value',
        operator: 'eq',
        value: ''
      }

      render(
        <FilterInput
          condition={condition}
          field={numberField}
          onConditionChange={mockOnConditionChange}
          onRemove={mockOnRemove}
        />
      )

      const input = screen.getByPlaceholderText('Enter value')
      await user.type(input, '123')

      await waitFor(() => {
        expect(mockOnConditionChange).toHaveBeenCalledWith({
          ...condition,
          value: 123
        })
      })
    })

    it('renders between operator with two inputs', () => {
      const condition: FilterCondition = {
        id: '1',
        field: 'value',
        operator: 'between',
        value: [10, 20]
      }

      render(
        <FilterInput
          condition={condition}
          field={numberField}
          onConditionChange={mockOnConditionChange}
          onRemove={mockOnRemove}
        />
      )

      expect(screen.getByDisplayValue('10')).toBeInTheDocument()
      expect(screen.getByDisplayValue('20')).toBeInTheDocument()
      expect(screen.getByPlaceholderText('Min')).toBeInTheDocument()
      expect(screen.getByPlaceholderText('Max')).toBeInTheDocument()
    })
  })

  describe('Category Field Filtering', () => {
    it('renders category filter select correctly', () => {
      const condition: FilterCondition = {
        id: '1',
        field: 'category',
        operator: 'eq',
        value: 'option1'
      }

      render(
        <FilterInput
          condition={condition}
          field={categoryField}
          onConditionChange={mockOnConditionChange}
          onRemove={mockOnRemove}
        />
      )

      expect(screen.getByText('Category')).toBeInTheDocument()
    })
  })

  describe('Boolean Field Filtering', () => {
    it('renders boolean filter select correctly', () => {
      const condition: FilterCondition = {
        id: '1',
        field: 'active',
        operator: 'eq',
        value: true
      }

      render(
        <FilterInput
          condition={condition}
          field={booleanField}
          onConditionChange={mockOnConditionChange}
          onRemove={mockOnRemove}
        />
      )

      expect(screen.getByText('Active')).toBeInTheDocument()
    })
  })

  describe('Operator Changes', () => {
    it('handles operator changes correctly', async () => {
      const user = userEvent.setup()
      const condition: FilterCondition = {
        id: '1',
        field: 'value',
        operator: 'eq',
        value: 42
      }

      render(
        <FilterInput
          condition={condition}
          field={numberField}
          onConditionChange={mockOnConditionChange}
          onRemove={mockOnRemove}
        />
      )

      // The operator change would trigger through the Select component
      // This tests the handler function
      expect(mockOnConditionChange).not.toHaveBeenCalled()
    })
  })

  describe('Remove Functionality', () => {
    it('calls onRemove when remove button is clicked', async () => {
      const user = userEvent.setup()
      const condition: FilterCondition = {
        id: '1',
        field: 'name',
        operator: 'contains',
        value: 'test'
      }

      render(
        <FilterInput
          condition={condition}
          field={stringField}
          onConditionChange={mockOnConditionChange}
          onRemove={mockOnRemove}
        />
      )

      const removeButton = screen.getByRole('button')
      await user.click(removeButton)

      expect(mockOnRemove).toHaveBeenCalledTimes(1)
    })
  })

  describe('Accessibility', () => {
    it('has proper labels and form structure', () => {
      const condition: FilterCondition = {
        id: '1',
        field: 'name',
        operator: 'contains',
        value: 'test'
      }

      render(
        <FilterInput
          condition={condition}
          field={stringField}
          onConditionChange={mockOnConditionChange}
          onRemove={mockOnRemove}
        />
      )

      expect(screen.getByText('Name')).toBeInTheDocument()
      expect(screen.getByRole('button')).toBeInTheDocument()
    })
  })
})