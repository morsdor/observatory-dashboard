import React from 'react'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Button } from '@/components/ui/button'
import { X } from 'lucide-react'
import { FilterCondition, FilterOperator, FieldDefinition } from '@/types'

interface FilterInputProps {
  condition: FilterCondition
  field: FieldDefinition
  onConditionChange: (condition: FilterCondition) => void
  onRemove: () => void
}

const operatorLabels: Record<FilterOperator, string> = {
  eq: 'Equals',
  gt: 'Greater than',
  lt: 'Less than',
  gte: 'Greater than or equal',
  lte: 'Less than or equal',
  contains: 'Contains',
  between: 'Between',
  in: 'In',
  not_in: 'Not in'
}

const getOperatorsForType = (type: FieldDefinition['type']): FilterOperator[] => {
  switch (type) {
    case 'string':
      return ['eq', 'contains']
    case 'number':
      return ['eq', 'gt', 'lt', 'gte', 'lte', 'between']
    case 'date':
      return ['eq', 'gt', 'lt', 'gte', 'lte', 'between']
    case 'boolean':
      return ['eq']
    case 'category':
      return ['eq', 'in', 'not_in']
    default:
      return ['eq']
  }
}

export function FilterInput({ condition, field, onConditionChange, onRemove }: FilterInputProps) {
  const availableOperators = getOperatorsForType(field.type)

  const handleOperatorChange = (operator: FilterOperator) => {
    onConditionChange({
      ...condition,
      operator,
      value: field.type === 'boolean' ? false : ''
    })
  }

  const handleValueChange = (value: any) => {
    onConditionChange({
      ...condition,
      value
    })
  }

  const renderValueInput = () => {
    switch (field.type) {
      case 'string':
        return (
          <Input
            type="text"
            value={condition.value || ''}
            onChange={(e) => handleValueChange(e.target.value)}
            placeholder={`Enter ${field.label.toLowerCase()}`}
            className="flex-1"
          />
        )
      
      case 'number':
        if (condition.operator === 'between') {
          const [min, max] = Array.isArray(condition.value) ? condition.value : ['', '']
          return (
            <div className="flex gap-2 flex-1">
              <Input
                type="number"
                value={min}
                onChange={(e) => handleValueChange([e.target.value, max])}
                placeholder="Min"
                className="flex-1"
              />
              <Input
                type="number"
                value={max}
                onChange={(e) => handleValueChange([min, e.target.value])}
                placeholder="Max"
                className="flex-1"
              />
            </div>
          )
        }
        return (
          <Input
            type="number"
            value={condition.value || ''}
            onChange={(e) => handleValueChange(parseFloat(e.target.value) || '')}
            placeholder={`Enter ${field.label.toLowerCase()}`}
            className="flex-1"
          />
        )
      
      case 'date':
        if (condition.operator === 'between') {
          const [start, end] = Array.isArray(condition.value) ? condition.value : ['', '']
          return (
            <div className="flex gap-2 flex-1">
              <Input
                type="datetime-local"
                value={start}
                onChange={(e) => handleValueChange([e.target.value, end])}
                className="flex-1"
              />
              <Input
                type="datetime-local"
                value={end}
                onChange={(e) => handleValueChange([start, e.target.value])}
                className="flex-1"
              />
            </div>
          )
        }
        return (
          <Input
            type="datetime-local"
            value={condition.value || ''}
            onChange={(e) => handleValueChange(e.target.value)}
            className="flex-1"
          />
        )
      
      case 'boolean':
        return (
          <Select value={condition.value?.toString()} onValueChange={(value) => handleValueChange(value === 'true')}>
            <SelectTrigger className="flex-1">
              <SelectValue placeholder="Select value" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="true">True</SelectItem>
              <SelectItem value="false">False</SelectItem>
            </SelectContent>
          </Select>
        )
      
      case 'category':
        if (condition.operator === 'in' || condition.operator === 'not_in') {
          return (
            <Select 
              value={Array.isArray(condition.value) ? condition.value.join(',') : condition.value} 
              onValueChange={(value) => handleValueChange(value.split(',').filter(Boolean))}
            >
              <SelectTrigger className="flex-1">
                <SelectValue placeholder="Select values" />
              </SelectTrigger>
              <SelectContent>
                {field.options?.map((option) => (
                  <SelectItem key={option} value={option}>
                    {option}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )
        }
        return (
          <Select value={condition.value} onValueChange={handleValueChange}>
            <SelectTrigger className="flex-1">
              <SelectValue placeholder="Select value" />
            </SelectTrigger>
            <SelectContent>
              {field.options?.map((option) => (
                <SelectItem key={option} value={option}>
                  {option}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )
      
      default:
        return (
          <Input
            type="text"
            value={condition.value || ''}
            onChange={(e) => handleValueChange(e.target.value)}
            placeholder={`Enter ${field.label.toLowerCase()}`}
            className="flex-1"
          />
        )
    }
  }

  return (
    <div className="flex items-center gap-2 p-3 border rounded-lg bg-card">
      <div className="flex items-center gap-2 flex-1">
        <Label className="text-sm font-medium min-w-0 shrink-0">
          {field.label}
        </Label>
        
        <Select value={condition.operator} onValueChange={handleOperatorChange}>
          <SelectTrigger className="w-40">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {availableOperators.map((op) => (
              <SelectItem key={op} value={op}>
                {operatorLabels[op]}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        
        {renderValueInput()}
      </div>
      
      <Button
        variant="ghost"
        size="icon"
        onClick={onRemove}
        className="shrink-0"
      >
        <X className="h-4 w-4" />
      </Button>
    </div>
  )
}