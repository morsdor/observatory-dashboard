import React, { useState, useCallback, useRef, memo, useMemo } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Plus, Trash2, Copy, Parentheses, GripVertical, Download, Upload, AlertCircle } from 'lucide-react'
import { FilterCondition, FilterGroup, FieldDefinition, LogicalOperator, FilterCriteria } from '@/types'
import { useAppDispatch, useAppSelector } from '@/stores/dashboardStore'
import { addFilterGroup, removeFilterGroup, updateFilterGroup, addFilterCondition, removeFilterCondition, updateFilterCondition, setFilterCriteria } from '@/stores/slices/filterSlice'
import { generateId } from '@/lib/utils'

interface AdvancedFilterBuilderProps {
  availableFields: FieldDefinition[]
  className?: string
  onValidationChange?: (isValid: boolean, errors: string[]) => void
}

interface ValidationError {
  id: string
  message: string
  type: 'condition' | 'group' | 'general'
}

interface DragState {
  isDragging: boolean
  draggedItem: { type: 'condition' | 'group'; id: string; groupId?: string } | null
  dropTarget: { type: 'group' | 'root'; id?: string } | null
}

const AdvancedFilterBuilder = memo<AdvancedFilterBuilderProps>(function AdvancedFilterBuilder({ availableFields, className, onValidationChange }) {
  const dispatch = useAppDispatch()
  const { filterCriteria } = useAppSelector((state) => state.filter)
  const [selectedField, setSelectedField] = useState<string>('')
  const [validationErrors, setValidationErrors] = useState<ValidationError[]>([])
  const [dragState, setDragState] = useState<DragState>({
    isDragging: false,
    draggedItem: null,
    dropTarget: null
  })
  const fileInputRef = useRef<HTMLInputElement>(null)

  // Validation logic
  const validateFilterCriteria = useCallback((criteria: FilterCriteria): ValidationError[] => {
    const errors: ValidationError[] = []

    // Validate main conditions
    criteria.conditions.forEach((condition) => {
      const conditionErrors = validateCondition(condition)
      errors.push(...conditionErrors)
    })

    // Validate groups
    criteria.grouping.forEach((group) => {
      if (group.conditions.length === 0) {
        errors.push({
          id: group.id,
          message: 'Group must contain at least one condition',
          type: 'group'
        })
      }

      group.conditions.forEach((condition) => {
        const conditionErrors = validateCondition(condition, group.id)
        errors.push(...conditionErrors)
      })
    })

    return errors
  }, [])

  const validateCondition = useCallback((condition: FilterCondition, groupId?: string): ValidationError[] => {
    const errors: ValidationError[] = []
    const field = availableFields.find(f => f.name === condition.field)

    if (!field) {
      errors.push({
        id: condition.id,
        message: `Field "${condition.field}" is not available`,
        type: 'condition'
      })
      return errors
    }

    // Validate operator compatibility with field type
    const validOperators = getValidOperatorsForField(field)
    if (!validOperators.includes(condition.operator)) {
      errors.push({
        id: condition.id,
        message: `Operator "${condition.operator}" is not valid for field type "${field.type}"`,
        type: 'condition'
      })
    }

    // Validate value based on field type and operator
    if (condition.operator !== 'eq' || condition.value !== '') {
      const valueError = validateConditionValue(condition, field)
      if (valueError) {
        errors.push({
          id: condition.id,
          message: valueError,
          type: 'condition'
        })
      }
    }

    return errors
  }, [availableFields])

  const getValidOperatorsForField = useCallback((field: FieldDefinition): string[] => {
    switch (field.type) {
      case 'string':
        return ['eq', 'contains', 'in', 'not_in']
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
  }, [])

  const validateConditionValue = useCallback((condition: FilterCondition, field: FieldDefinition): string | null => {
    const { operator, value } = condition

    if (value === null || value === undefined) {
      return 'Value is required'
    }

    switch (field.type) {
      case 'number':
        if (operator === 'between') {
          if (!Array.isArray(value) || value.length !== 2) {
            return 'Between operator requires two numeric values'
          }
          if (isNaN(Number(value[0])) || isNaN(Number(value[1]))) {
            return 'Between values must be numbers'
          }
        } else if (isNaN(Number(value))) {
          return 'Value must be a number'
        }
        break

      case 'date':
        if (operator === 'between') {
          if (!Array.isArray(value) || value.length !== 2) {
            return 'Between operator requires two date values'
          }
          if (isNaN(Date.parse(value[0])) || isNaN(Date.parse(value[1]))) {
            return 'Between values must be valid dates'
          }
        } else if (isNaN(Date.parse(value))) {
          return 'Value must be a valid date'
        }
        break

      case 'category':
        if ((operator === 'in' || operator === 'not_in') && !Array.isArray(value)) {
          return 'In/Not In operators require an array of values'
        }
        if (field.options && !field.options.includes(value)) {
          return `Value must be one of: ${field.options.join(', ')}`
        }
        break
    }

    return null
  }, [])

  // Update validation when criteria changes
  React.useEffect(() => {
    const errors = validateFilterCriteria(filterCriteria)
    setValidationErrors(errors)
    onValidationChange?.(errors.length === 0, errors.map(e => e.message))
  }, [filterCriteria, validateFilterCriteria, onValidationChange])

  const handleAddCondition = useCallback((groupId?: string) => {
    if (!selectedField) return

    const field = availableFields.find(f => f.name === selectedField)
    if (!field) return

    const newCondition: FilterCondition = {
      id: generateId(),
      field: selectedField,
      operator: field.type === 'string' ? 'contains' : 'eq',
      value: field.type === 'boolean' ? false : '',
      logicalOperator: filterCriteria.conditions.length > 0 ? 'AND' : undefined
    }

    if (groupId) {
      // Add to specific group
      const group = filterCriteria.grouping.find(g => g.id === groupId)
      if (group) {
        const updatedGroup: FilterGroup = {
          ...group,
          conditions: [...group.conditions, newCondition]
        }
        dispatch(updateFilterGroup(updatedGroup))
      }
    } else {
      // Add to main conditions
      dispatch(addFilterCondition(newCondition))
    }

    setSelectedField('')
  }, [selectedField, availableFields, filterCriteria, dispatch])

  const handleAddGroup = useCallback((parentGroupId?: string) => {
    const newGroup: FilterGroup = {
      id: generateId(),
      conditions: [],
      logicalOperator: 'AND',
      parentGroupId
    }

    dispatch(addFilterGroup(newGroup))
  }, [dispatch])

  const handleRemoveGroup = useCallback((groupId: string) => {
    dispatch(removeFilterGroup(groupId))
  }, [dispatch])

  const handleUpdateGroupOperator = useCallback((groupId: string, operator: LogicalOperator) => {
    const group = filterCriteria.grouping.find(g => g.id === groupId)
    if (group) {
      const updatedGroup: FilterGroup = {
        ...group,
        logicalOperator: operator
      }
      dispatch(updateFilterGroup(updatedGroup))
    }
  }, [filterCriteria.grouping, dispatch])

  const handleRemoveCondition = useCallback((conditionId: string, groupId?: string) => {
    if (groupId) {
      const group = filterCriteria.grouping.find(g => g.id === groupId)
      if (group) {
        const updatedGroup: FilterGroup = {
          ...group,
          conditions: group.conditions.filter(c => c.id !== conditionId)
        }
        dispatch(updateFilterGroup(updatedGroup))
      }
    } else {
      dispatch(removeFilterCondition(conditionId))
    }
  }, [filterCriteria.grouping, dispatch])

  const handleUpdateCondition = useCallback((conditionId: string, updates: Partial<FilterCondition>, groupId?: string) => {
    if (groupId) {
      const group = filterCriteria.grouping.find(g => g.id === groupId)
      if (group) {
        const updatedGroup: FilterGroup = {
          ...group,
          conditions: group.conditions.map(c => 
            c.id === conditionId ? { ...c, ...updates } : c
          )
        }
        dispatch(updateFilterGroup(updatedGroup))
      }
    } else {
      const condition = filterCriteria.conditions.find(c => c.id === conditionId)
      if (condition) {
        dispatch(updateFilterCondition({ ...condition, ...updates }))
      }
    }
  }, [filterCriteria, dispatch])

  // Drag and Drop handlers
  const handleDragStart = useCallback((e: React.DragEvent, type: 'condition' | 'group', id: string, groupId?: string) => {
    setDragState({
      isDragging: true,
      draggedItem: { type, id, groupId },
      dropTarget: null
    })
    e.dataTransfer.effectAllowed = 'move'
    e.dataTransfer.setData('text/plain', JSON.stringify({ type, id, groupId }))
  }, [])

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.dataTransfer.dropEffect = 'move'
  }, [])

  const handleDragEnter = useCallback((e: React.DragEvent, targetType: 'group' | 'root', targetId?: string) => {
    e.preventDefault()
    setDragState(prev => ({
      ...prev,
      dropTarget: { type: targetType, id: targetId }
    }))
  }, [])

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    // Only clear drop target if leaving the entire drop zone
    if (!e.currentTarget.contains(e.relatedTarget as Node)) {
      setDragState(prev => ({
        ...prev,
        dropTarget: null
      }))
    }
  }, [])

  const handleDrop = useCallback((e: React.DragEvent, targetType: 'group' | 'root', targetId?: string) => {
    e.preventDefault()
    
    try {
      const dragData = JSON.parse(e.dataTransfer.getData('text/plain'))
      const { type, id, groupId } = dragData

      if (type === 'condition') {
        // Move condition to target group or root
        const condition = groupId 
          ? filterCriteria.grouping.find(g => g.id === groupId)?.conditions.find(c => c.id === id)
          : filterCriteria.conditions.find(c => c.id === id)

        if (condition) {
          // Remove from source
          handleRemoveCondition(id, groupId)
          
          // Add to target
          if (targetType === 'group' && targetId) {
            const targetGroup = filterCriteria.grouping.find(g => g.id === targetId)
            if (targetGroup) {
              const updatedGroup: FilterGroup = {
                ...targetGroup,
                conditions: [...targetGroup.conditions, condition]
              }
              dispatch(updateFilterGroup(updatedGroup))
            }
          } else {
            dispatch(addFilterCondition(condition))
          }
        }
      } else if (type === 'group') {
        // Move group to target parent
        const group = filterCriteria.grouping.find(g => g.id === id)
        if (group && targetType === 'group' && targetId !== id) {
          const updatedGroup: FilterGroup = {
            ...group,
            parentGroupId: targetId
          }
          dispatch(updateFilterGroup(updatedGroup))
        }
      }
    } catch (error) {
      console.error('Error handling drop:', error)
    }

    setDragState({
      isDragging: false,
      draggedItem: null,
      dropTarget: null
    })
  }, [filterCriteria, handleRemoveCondition, dispatch])

  // Export/Import functionality
  const handleExportFilters = useCallback(() => {
    const exportData = {
      version: '1.0',
      timestamp: new Date().toISOString(),
      filterCriteria,
      metadata: {
        totalConditions: filterCriteria.conditions.length,
        totalGroups: filterCriteria.grouping.length
      }
    }

    const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `filter-config-${new Date().toISOString().split('T')[0]}.json`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }, [filterCriteria])

  const handleImportFilters = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    const reader = new FileReader()
    reader.onload = (e) => {
      try {
        const content = e.target?.result as string
        const importData = JSON.parse(content)
        
        // Validate import data structure
        if (!importData.filterCriteria || !importData.version) {
          throw new Error('Invalid filter configuration file')
        }

        // Validate that all fields exist in available fields
        const allConditions = [
          ...importData.filterCriteria.conditions,
          ...importData.filterCriteria.grouping.flatMap((g: FilterGroup) => g.conditions)
        ]

        const invalidFields = allConditions
          .map((c: FilterCondition) => c.field)
          .filter((field: string) => !availableFields.find(f => f.name === field))

        if (invalidFields.length > 0) {
          throw new Error(`Unknown fields in import: ${invalidFields.join(', ')}`)
        }

        dispatch(setFilterCriteria(importData.filterCriteria))
      } catch (error) {
        console.error('Error importing filters:', error)
        alert(`Error importing filters: ${error instanceof Error ? error.message : 'Unknown error'}`)
      }
    }
    reader.readAsText(file)
    
    // Reset file input
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }, [availableFields, dispatch])

  const handleImportClick = useCallback(() => {
    fileInputRef.current?.click()
  }, [])

  const renderCondition = (condition: FilterCondition, groupId?: string) => {
    const field = availableFields.find(f => f.name === condition.field)
    const conditionErrors = validationErrors.filter(e => e.id === condition.id)
    const hasErrors = conditionErrors.length > 0
    const validOperators = field ? getValidOperatorsForField(field) : []

    return (
      <div 
        key={condition.id} 
        className={`flex items-center gap-2 p-3 border rounded-lg transition-colors ${
          hasErrors ? 'border-red-300 bg-red-50' : 'bg-muted/50'
        } ${
          dragState.dropTarget?.type === 'group' && dragState.dropTarget?.id === groupId 
            ? 'border-blue-300 bg-blue-50' 
            : ''
        }`}
        draggable
        onDragStart={(e) => handleDragStart(e, 'condition', condition.id, groupId)}
        onDragOver={handleDragOver}
        onDragEnter={(e) => handleDragEnter(e, 'group', groupId)}
        onDragLeave={handleDragLeave}
        onDrop={(e) => handleDrop(e, 'group', groupId)}
      >
        <GripVertical className="h-4 w-4 text-muted-foreground cursor-grab" />
        
        <div className="flex-1 grid grid-cols-3 gap-2">
          <div>
            <Label className="text-xs">Field</Label>
            <Select
              value={condition.field}
              onValueChange={(value) => handleUpdateCondition(condition.id, { field: value }, groupId)}
            >
              <SelectTrigger className="h-8">
                <SelectValue />
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
          
          <div>
            <Label className="text-xs">Operator</Label>
            <Select
              value={condition.operator}
              onValueChange={(value) => handleUpdateCondition(condition.id, { operator: value as any }, groupId)}
            >
              <SelectTrigger className="h-8">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {validOperators.map((op) => (
                  <SelectItem key={op} value={op}>
                    {op}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          
          <div>
            <Label className="text-xs">Value</Label>
            {renderConditionValueInput(condition, field, groupId)}
          </div>
        </div>

        {hasErrors && (
          <AlertCircle className="h-4 w-4 text-red-500" />
        )}
        
        <Button
          variant="ghost"
          size="sm"
          onClick={() => handleRemoveCondition(condition.id, groupId)}
        >
          <Trash2 className="h-4 w-4" />
        </Button>
      </div>
    )
  }

  const renderConditionValueInput = (condition: FilterCondition, field: FieldDefinition | undefined, groupId?: string) => {
    if (!field) return <Input className="h-8" value={String(condition.value)} readOnly />

    const updateValue = (value: any) => {
      handleUpdateCondition(condition.id, { value }, groupId)
    }

    switch (field.type) {
      case 'boolean':
        return (
          <Select value={String(condition.value)} onValueChange={(value) => updateValue(value === 'true')}>
            <SelectTrigger className="h-8">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="true">True</SelectItem>
              <SelectItem value="false">False</SelectItem>
            </SelectContent>
          </Select>
        )

      case 'category':
        if (condition.operator === 'in' || condition.operator === 'not_in') {
          // Multi-select for array values
          return (
            <div className="text-xs">
              {Array.isArray(condition.value) ? condition.value.join(', ') : condition.value}
            </div>
          )
        }
        return (
          <Select value={condition.value} onValueChange={updateValue}>
            <SelectTrigger className="h-8">
              <SelectValue />
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

      case 'date':
        if (condition.operator === 'between') {
          const values = Array.isArray(condition.value) ? condition.value : ['', '']
          return (
            <div className="flex gap-1">
              <Input
                type="date"
                className="h-8 text-xs"
                value={values[0] ? new Date(values[0]).toISOString().split('T')[0] : ''}
                onChange={(e) => updateValue([e.target.value, values[1]])}
              />
              <Input
                type="date"
                className="h-8 text-xs"
                value={values[1] ? new Date(values[1]).toISOString().split('T')[0] : ''}
                onChange={(e) => updateValue([values[0], e.target.value])}
              />
            </div>
          )
        }
        return (
          <Input
            type="date"
            className="h-8"
            value={condition.value ? new Date(condition.value).toISOString().split('T')[0] : ''}
            onChange={(e) => updateValue(e.target.value)}
          />
        )

      case 'number':
        if (condition.operator === 'between') {
          const values = Array.isArray(condition.value) ? condition.value : ['', '']
          return (
            <div className="flex gap-1">
              <Input
                type="number"
                className="h-8 text-xs"
                value={values[0]}
                onChange={(e) => updateValue([e.target.value, values[1]])}
              />
              <Input
                type="number"
                className="h-8 text-xs"
                value={values[1]}
                onChange={(e) => updateValue([values[0], e.target.value])}
              />
            </div>
          )
        }
        return (
          <Input
            type="number"
            className="h-8"
            value={condition.value}
            onChange={(e) => updateValue(e.target.value)}
          />
        )

      default:
        return (
          <Input
            className="h-8"
            value={condition.value}
            onChange={(e) => updateValue(e.target.value)}
          />
        )
    }
  }

  const renderGroup = (group: FilterGroup, level: number = 0) => {
    const groupErrors = validationErrors.filter(e => e.id === group.id)
    const hasErrors = groupErrors.length > 0
    const isDropTarget = dragState.dropTarget?.type === 'group' && dragState.dropTarget?.id === group.id

    return (
      <Card 
        key={group.id} 
        className={`ml-${level * 4} transition-colors ${
          hasErrors ? 'border-red-300' : ''
        } ${
          isDropTarget ? 'border-blue-300 bg-blue-50' : ''
        }`}
        draggable
        onDragStart={(e) => handleDragStart(e, 'group', group.id)}
        onDragOver={handleDragOver}
        onDragEnter={(e) => handleDragEnter(e, 'group', group.id)}
        onDragLeave={handleDragLeave}
        onDrop={(e) => handleDrop(e, 'group', group.id)}
      >
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <GripVertical className="h-4 w-4 text-muted-foreground cursor-grab" />
              <Parentheses className="h-4 w-4" />
              <CardTitle className="text-sm">Group</CardTitle>
              <Select
                value={group.logicalOperator}
                onValueChange={(value: LogicalOperator) => handleUpdateGroupOperator(group.id, value)}
              >
                <SelectTrigger className="w-20 h-6">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="AND">AND</SelectItem>
                  <SelectItem value="OR">OR</SelectItem>
                </SelectContent>
              </Select>
              {hasErrors && <AlertCircle className="h-4 w-4 text-red-500" />}
            </div>
            <div className="flex items-center gap-1">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => handleAddGroup(group.id)}
                title="Add nested group"
              >
                <Plus className="h-3 w-3" />
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => handleRemoveGroup(group.id)}
                title="Remove group"
              >
                <Trash2 className="h-3 w-3" />
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-2">
          {/* Drop zone for conditions */}
          <div 
            className={`min-h-[2rem] border-2 border-dashed rounded-lg transition-colors ${
              isDropTarget ? 'border-blue-400 bg-blue-100' : 'border-transparent'
            }`}
            onDragOver={handleDragOver}
            onDragEnter={(e) => handleDragEnter(e, 'group', group.id)}
            onDragLeave={handleDragLeave}
            onDrop={(e) => handleDrop(e, 'group', group.id)}
          >
            {group.conditions.length === 0 && (
              <div className="flex items-center justify-center h-8 text-xs text-muted-foreground">
                Drop conditions here or add new ones below
              </div>
            )}
            {group.conditions.map(condition => renderCondition(condition, group.id))}
          </div>
          
          {/* Child groups */}
          {filterCriteria.grouping
            .filter(g => g.parentGroupId === group.id)
            .map(childGroup => renderGroup(childGroup, level + 1))}
          
          {/* Add condition controls */}
          <div className="flex items-center gap-2 pt-2 border-t">
            <Select value={selectedField} onValueChange={setSelectedField}>
              <SelectTrigger className="flex-1">
                <SelectValue placeholder="Add condition..." />
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
            <Button
              variant="outline"
              size="sm"
              onClick={() => handleAddCondition(group.id)}
              disabled={!selectedField}
            >
              <Plus className="h-4 w-4" />
            </Button>
          </div>

          {/* Show validation errors */}
          {groupErrors.map(error => (
            <Alert key={error.id} variant="destructive" className="mt-2">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription className="text-xs">
                {error.message}
              </AlertDescription>
            </Alert>
          ))}
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className={className}>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Parentheses className="h-5 w-5" />
            Advanced Filter Builder
            {validationErrors.length > 0 && (
              <Badge variant="destructive" className="ml-2">
                {validationErrors.length} errors
              </Badge>
            )}
          </CardTitle>
          
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={handleExportFilters}
              disabled={filterCriteria.conditions.length === 0 && filterCriteria.grouping.length === 0}
            >
              <Download className="h-4 w-4 mr-1" />
              Export
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={handleImportClick}
            >
              <Upload className="h-4 w-4 mr-1" />
              Import
            </Button>
            <input
              ref={fileInputRef}
              type="file"
              accept=".json"
              onChange={handleImportFilters}
              className="hidden"
            />
          </div>
        </div>
      </CardHeader>
      
      <CardContent className="space-y-4">
        {/* Validation errors summary */}
        {validationErrors.length > 0 && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              <div className="text-sm font-medium mb-1">Filter validation errors:</div>
              <ul className="text-xs space-y-1">
                {validationErrors.slice(0, 3).map(error => (
                  <li key={error.id}>• {error.message}</li>
                ))}
                {validationErrors.length > 3 && (
                  <li>• ... and {validationErrors.length - 3} more errors</li>
                )}
              </ul>
            </AlertDescription>
          </Alert>
        )}

        {/* Main conditions */}
        {filterCriteria.conditions.length > 0 && (
          <div className="space-y-2">
            <Label className="text-sm font-medium">Main Conditions</Label>
            <div 
              className={`space-y-2 min-h-[2rem] border-2 border-dashed rounded-lg p-2 transition-colors ${
                dragState.dropTarget?.type === 'root' ? 'border-blue-400 bg-blue-100' : 'border-transparent'
              }`}
              onDragOver={handleDragOver}
              onDragEnter={(e) => handleDragEnter(e, 'root')}
              onDragLeave={handleDragLeave}
              onDrop={(e) => handleDrop(e, 'root')}
            >
              {filterCriteria.conditions.map(condition => renderCondition(condition))}
            </div>
          </div>
        )}

        {/* Root groups */}
        <div className="space-y-2">
          {filterCriteria.grouping
            .filter(group => !group.parentGroupId)
            .map(group => renderGroup(group))}
        </div>

        {/* Add controls */}
        <div className="flex items-center gap-2 pt-4 border-t">
          <Select value={selectedField} onValueChange={setSelectedField}>
            <SelectTrigger className="flex-1">
              <SelectValue placeholder="Add condition..." />
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
          <Button
            variant="outline"
            size="sm"
            onClick={() => handleAddCondition()}
            disabled={!selectedField}
          >
            <Plus className="h-4 w-4 mr-1" />
            Condition
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => handleAddGroup()}
          >
            <Parentheses className="h-4 w-4 mr-1" />
            Group
          </Button>
        </div>

        {/* Filter summary */}
        {(filterCriteria.conditions.length > 0 || filterCriteria.grouping.length > 0) && (
          <div className="pt-4 border-t">
            <Label className="text-sm font-medium">Filter Summary</Label>
            <div className="flex items-center justify-between text-xs text-muted-foreground mt-1">
              <span>
                {filterCriteria.conditions.length} conditions, {filterCriteria.grouping.length} groups
              </span>
              <span className={validationErrors.length === 0 ? 'text-green-600' : 'text-red-600'}>
                {validationErrors.length === 0 ? '✓ Valid' : `${validationErrors.length} errors`}
              </span>
            </div>
          </div>
        )}

        {/* Empty state */}
        {filterCriteria.conditions.length === 0 && filterCriteria.grouping.length === 0 && (
          <div 
            className={`flex flex-col items-center justify-center py-8 border-2 border-dashed rounded-lg transition-colors ${
              dragState.dropTarget?.type === 'root' ? 'border-blue-400 bg-blue-100' : 'border-muted-foreground/25'
            }`}
            onDragOver={handleDragOver}
            onDragEnter={(e) => handleDragEnter(e, 'root')}
            onDragLeave={handleDragLeave}
            onDrop={(e) => handleDrop(e, 'root')}
          >
            <Parentheses className="h-8 w-8 text-muted-foreground/50 mb-2" />
            <p className="text-sm text-muted-foreground mb-4">No filters configured</p>
            <p className="text-xs text-muted-foreground">Add conditions or groups to start filtering</p>
          </div>
        )}
      </CardContent>
    </Card>
  )
})

export { AdvancedFilterBuilder }
export default AdvancedFilterBuilder