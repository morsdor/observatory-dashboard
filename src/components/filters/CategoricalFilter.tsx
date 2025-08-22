import React, { useState, useCallback, useMemo } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Checkbox } from '@/components/ui/checkbox'
import { Search, Filter, X, Check } from 'lucide-react'
import { FilterCondition, FieldDefinition } from '@/types'
import { useCategoricalFilter } from '@/hooks/useAdvancedFilter'
import { useAppDispatch } from '@/stores/dashboardStore'
import { addFilterCondition } from '@/stores/slices/filterSlice'

interface CategoricalFilterProps {
  field: FieldDefinition
  availableValues: string[]
  onFilterChange?: (condition: FilterCondition) => void
  className?: string
}

export function CategoricalFilter({ field, availableValues, onFilterChange, className }: CategoricalFilterProps) {
  const dispatch = useAppDispatch()
  const { createCategoricalFilter } = useCategoricalFilter()
  
  const [selectedValues, setSelectedValues] = useState<Set<string>>(new Set())
  const [searchTerm, setSearchTerm] = useState('')
  const [filterMode, setFilterMode] = useState<'include' | 'exclude'>('include')

  // Filter available values based on search term
  const filteredValues = useMemo(() => {
    if (!searchTerm) return availableValues
    return availableValues.filter(value => 
      value.toLowerCase().includes(searchTerm.toLowerCase())
    )
  }, [availableValues, searchTerm])

  const handleValueToggle = useCallback((value: string) => {
    const newSelected = new Set(selectedValues)
    if (newSelected.has(value)) {
      newSelected.delete(value)
    } else {
      newSelected.add(value)
    }
    setSelectedValues(newSelected)
  }, [selectedValues])

  const handleSelectAll = useCallback(() => {
    setSelectedValues(new Set(filteredValues))
  }, [filteredValues])

  const handleClearAll = useCallback(() => {
    setSelectedValues(new Set())
  }, [])

  const handleApplyFilter = useCallback(() => {
    if (selectedValues.size === 0) return

    const operator = filterMode === 'include' ? 'in' : 'not_in'
    const condition = createCategoricalFilter(
      field.name,
      Array.from(selectedValues),
      operator
    )

    if (onFilterChange) {
      onFilterChange(condition)
    } else {
      dispatch(addFilterCondition(condition))
    }
  }, [selectedValues, filterMode, field.name, createCategoricalFilter, onFilterChange, dispatch])

  const selectedCount = selectedValues.size
  const totalCount = availableValues.length

  return (
    <Card className={className}>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-sm">
            <Filter className="h-4 w-4" />
            {field.label}
          </CardTitle>
          {selectedCount > 0 && (
            <Badge variant="secondary">
              {selectedCount} selected
            </Badge>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Filter mode toggle */}
        <div className="flex items-center gap-2">
          <Button
            variant={filterMode === 'include' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setFilterMode('include')}
          >
            Include
          </Button>
          <Button
            variant={filterMode === 'exclude' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setFilterMode('exclude')}
          >
            Exclude
          </Button>
        </div>

        {/* Search input */}
        <div className="relative">
          <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search values..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-8"
          />
        </div>

        {/* Select all/clear controls */}
        <div className="flex items-center justify-between text-sm">
          <Button
            variant="ghost"
            size="sm"
            onClick={handleSelectAll}
            disabled={filteredValues.length === 0}
          >
            Select All ({filteredValues.length})
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={handleClearAll}
            disabled={selectedCount === 0}
          >
            Clear All
          </Button>
        </div>

        {/* Values list */}
        <div className="max-h-60 overflow-y-auto space-y-2">
          {filteredValues.length === 0 ? (
            <div className="text-center text-muted-foreground py-4">
              No values found
            </div>
          ) : (
            filteredValues.map((value) => (
              <div key={value} className="flex items-center space-x-2">
                <Checkbox
                  id={`${field.name}-${value}`}
                  checked={selectedValues.has(value)}
                  onCheckedChange={() => handleValueToggle(value)}
                />
                <Label
                  htmlFor={`${field.name}-${value}`}
                  className="flex-1 text-sm cursor-pointer truncate"
                  title={value}
                >
                  {value}
                </Label>
              </div>
            ))
          )}
        </div>

        {/* Apply button */}
        <Button 
          onClick={handleApplyFilter}
          disabled={selectedCount === 0}
          className="w-full"
        >
          <Check className="h-4 w-4 mr-2" />
          Apply Filter ({selectedCount} values)
        </Button>

        {/* Summary */}
        {selectedCount > 0 && (
          <div className="text-xs text-muted-foreground">
            {filterMode === 'include' ? 'Including' : 'Excluding'} {selectedCount} of {totalCount} values
          </div>
        )}
      </CardContent>
    </Card>
  )
}

/**
 * Compact categorical filter for inline use
 */
export function CompactCategoricalFilter({ 
  field, 
  availableValues, 
  onFilterChange 
}: { 
  field: string
  availableValues: string[]
  onFilterChange: (condition: FilterCondition) => void 
}) {
  const { createSingleCategoryFilter } = useCategoricalFilter()
  const [isOpen, setIsOpen] = useState(false)

  const handleValueSelect = (value: string) => {
    const condition = createSingleCategoryFilter(field, value)
    onFilterChange(condition)
    setIsOpen(false)
  }

  return (
    <div className="relative">
      <Button
        variant="outline"
        size="sm"
        onClick={() => setIsOpen(!isOpen)}
        className="w-40"
      >
        <Filter className="h-4 w-4 mr-2" />
        Filter by {field}
      </Button>
      
      {isOpen && (
        <Card className="absolute top-full left-0 z-50 w-64 mt-1">
          <CardContent className="p-3">
            <div className="max-h-40 overflow-y-auto space-y-1">
              {availableValues.map((value) => (
                <Button
                  key={value}
                  variant="ghost"
                  size="sm"
                  onClick={() => handleValueSelect(value)}
                  className="w-full justify-start text-left"
                >
                  {value}
                </Button>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}