import React, { useState, useCallback } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Plus, Trash2, Copy, Parentheses } from 'lucide-react'
import { FilterCondition, FilterGroup, FieldDefinition, LogicalOperator } from '@/types'
import { useAppDispatch, useAppSelector } from '@/stores/dashboardStore'
import { addFilterGroup, removeFilterGroup, updateFilterGroup, addFilterCondition, removeFilterCondition } from '@/stores/slices/filterSlice'
import { generateId } from '@/lib/utils'

interface AdvancedFilterBuilderProps {
  availableFields: FieldDefinition[]
  className?: string
}

export function AdvancedFilterBuilder({ availableFields, className }: AdvancedFilterBuilderProps) {
  const dispatch = useAppDispatch()
  const { filterCriteria } = useAppSelector((state) => state.filter)
  const [selectedField, setSelectedField] = useState<string>('')

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

  const renderCondition = (condition: FilterCondition, groupId?: string) => (
    <div key={condition.id} className="flex items-center gap-2 p-3 border rounded-lg bg-muted/50">
      <div className="flex-1 grid grid-cols-3 gap-2">
        <div>
          <Label className="text-xs">Field</Label>
          <div className="text-sm font-medium">{condition.field}</div>
        </div>
        <div>
          <Label className="text-xs">Operator</Label>
          <div className="text-sm">{condition.operator}</div>
        </div>
        <div>
          <Label className="text-xs">Value</Label>
          <div className="text-sm truncate">{String(condition.value)}</div>
        </div>
      </div>
      <Button
        variant="ghost"
        size="sm"
        onClick={() => handleRemoveCondition(condition.id, groupId)}
      >
        <Trash2 className="h-4 w-4" />
      </Button>
    </div>
  )

  const renderGroup = (group: FilterGroup, level: number = 0) => (
    <Card key={group.id} className={`ml-${level * 4}`}>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
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
          </div>
          <div className="flex items-center gap-1">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => handleAddGroup(group.id)}
            >
              <Plus className="h-3 w-3" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => handleRemoveGroup(group.id)}
            >
              <Trash2 className="h-3 w-3" />
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-2">
        {group.conditions.map(condition => renderCondition(condition, group.id))}
        
        {/* Child groups */}
        {filterCriteria.grouping
          .filter(g => g.parentGroupId === group.id)
          .map(childGroup => renderGroup(childGroup, level + 1))}
        
        <div className="flex items-center gap-2 pt-2">
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
      </CardContent>
    </Card>
  )

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Parentheses className="h-5 w-5" />
          Advanced Filter Builder
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Main conditions */}
        {filterCriteria.conditions.length > 0 && (
          <div className="space-y-2">
            <Label className="text-sm font-medium">Main Conditions</Label>
            {filterCriteria.conditions.map(condition => renderCondition(condition))}
          </div>
        )}

        {/* Root groups */}
        {filterCriteria.grouping
          .filter(group => !group.parentGroupId)
          .map(group => renderGroup(group))}

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
            <div className="text-xs text-muted-foreground mt-1">
              {filterCriteria.conditions.length} conditions, {filterCriteria.grouping.length} groups
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}