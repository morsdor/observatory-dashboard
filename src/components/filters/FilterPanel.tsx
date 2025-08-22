import React, { useMemo } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { Plus, Filter, X } from 'lucide-react'
import { FilterInput } from './FilterInput'
import { useAppDispatch, useAppSelector } from '@/stores/dashboardStore'
import { addFilterCondition, removeFilterCondition, clearFilters } from '@/stores/slices/filterSlice'
import { FilterCondition, FieldDefinition } from '@/types'
import { generateId } from '@/lib/utils'

interface FilterPanelProps {
  availableFields: FieldDefinition[]
  className?: string
}

export function FilterPanel({ availableFields, className }: FilterPanelProps) {
  const dispatch = useAppDispatch()
  const { filterCriteria, activeFilters } = useAppSelector((state) => state.filter)
  
  const handleAddFilter = (fieldName: string) => {
    const field = availableFields.find(f => f.name === fieldName)
    if (!field) return

    const newCondition: FilterCondition = {
      id: generateId(),
      field: fieldName,
      operator: field.type === 'string' ? 'contains' : 'eq',
      value: field.type === 'boolean' ? false : '',
      logicalOperator: activeFilters.length > 0 ? 'AND' : undefined
    }

    dispatch(addFilterCondition(newCondition))
  }

  const handleConditionChange = (conditionId: string, updatedCondition: FilterCondition) => {
    // Remove old condition and add updated one
    dispatch(removeFilterCondition(conditionId))
    dispatch(addFilterCondition(updatedCondition))
  }

  const handleRemoveCondition = (conditionId: string) => {
    dispatch(removeFilterCondition(conditionId))
  }

  const handleClearAll = () => {
    dispatch(clearFilters())
  }

  const activeFilterCount = activeFilters.length

  const fieldsWithConditions = useMemo(() => {
    return activeFilters.map(condition => {
      const field = availableFields.find(f => f.name === condition.field)
      return { condition, field }
    }).filter(item => item.field)
  }, [activeFilters, availableFields])

  return (
    <Card className={className}>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Filter className="h-4 w-4" />
            <CardTitle className="text-lg">Filters</CardTitle>
            {activeFilterCount > 0 && (
              <Badge variant="secondary" className="ml-2">
                {activeFilterCount}
              </Badge>
            )}
          </div>
          {activeFilterCount > 0 && (
            <Button
              variant="ghost"
              size="sm"
              onClick={handleClearAll}
              className="text-muted-foreground hover:text-foreground"
            >
              <X className="h-4 w-4 mr-1" />
              Clear All
            </Button>
          )}
        </div>
      </CardHeader>
      
      <CardContent className="space-y-4">
        {/* Add Filter Dropdown */}
        <div className="flex items-center gap-2">
          <Select onValueChange={handleAddFilter}>
            <SelectTrigger className="w-full">
              <SelectValue placeholder="Add a filter..." />
            </SelectTrigger>
            <SelectContent>
              {availableFields.map((field) => (
                <SelectItem key={field.name} value={field.name}>
                  <div className="flex items-center gap-2">
                    <span>{field.label}</span>
                    <Badge variant="outline" className="text-xs">
                      {field.type}
                    </Badge>
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Active Filters */}
        {fieldsWithConditions.length > 0 && (
          <div className="space-y-3">
            {fieldsWithConditions.map(({ condition, field }, index) => (
              <div key={condition.id}>
                {index > 0 && condition.logicalOperator && (
                  <div className="flex justify-center py-1">
                    <Badge variant="outline" className="text-xs">
                      {condition.logicalOperator}
                    </Badge>
                  </div>
                )}
                <FilterInput
                  condition={condition}
                  field={field!}
                  onConditionChange={(updatedCondition) => 
                    handleConditionChange(condition.id, updatedCondition)
                  }
                  onRemove={() => handleRemoveCondition(condition.id)}
                />
              </div>
            ))}
          </div>
        )}

        {/* Empty State */}
        {activeFilterCount === 0 && (
          <div className="text-center py-8 text-muted-foreground">
            <Filter className="h-8 w-8 mx-auto mb-2 opacity-50" />
            <p className="text-sm">No filters applied</p>
            <p className="text-xs">Add a filter to start filtering your data</p>
          </div>
        )}
      </CardContent>
    </Card>
  )
}