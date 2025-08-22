import { useEffect, useMemo } from 'react'
import { useAppSelector, useAppDispatch } from '@/stores/dashboardStore'
import { setIsFiltering } from '@/stores/slices/filterSlice'
import { updateFilteredData } from '@/stores/slices/dataSlice'
import { DataPoint, FilterCondition, FilterOperator } from '@/types'
import { useDebounce } from './useDebounce'

/**
 * Custom hook that provides debounced filtering functionality
 * Prevents excessive re-renders during rapid filter changes
 */
export function useDebouncedFilter(debounceMs: number = 300) {
  const dispatch = useAppDispatch()
  const rawData = useAppSelector((state) => state.data.rawData)
  const filterCriteria = useAppSelector((state) => state.filter.filterCriteria)
  const isFiltering = useAppSelector((state) => state.filter.isFiltering)

  // Debounce the filter criteria to prevent excessive filtering
  const debouncedFilterCriteria = useDebounce(filterCriteria, debounceMs)

  // Memoized filter function for performance
  const filterFunction = useMemo(() => {
    return (data: DataPoint[], conditions: FilterCondition[]): DataPoint[] => {
      if (conditions.length === 0) return data

      return data.filter((item) => {
        return evaluateConditions(item, conditions)
      })
    }
  }, [])

  // Apply filters when debounced criteria changes
  useEffect(() => {
    if (!debouncedFilterCriteria) return

    const startTime = performance.now()
    dispatch(setIsFiltering(true))

    // Apply filtering in the next tick to prevent blocking
    setTimeout(() => {
      try {
        const filteredData = filterFunction(rawData, debouncedFilterCriteria.conditions)
        
        // Apply sorting if specified
        if (debouncedFilterCriteria.sortBy) {
          filteredData.sort((a, b) => {
            const { field, direction } = debouncedFilterCriteria.sortBy!
            const aValue = getNestedValue(a, field)
            const bValue = getNestedValue(b, field)
            
            if (aValue < bValue) return direction === 'asc' ? -1 : 1
            if (aValue > bValue) return direction === 'asc' ? 1 : -1
            return 0
          })
        }

        dispatch(updateFilteredData(filteredData))
        
        const endTime = performance.now()
        console.log(`Filter applied in ${endTime - startTime}ms, ${filteredData.length} results`)
      } catch (error) {
        console.error('Error applying filters:', error)
        dispatch(updateFilteredData(rawData)) // Fallback to unfiltered data
      } finally {
        dispatch(setIsFiltering(false))
      }
    }, 0)
  }, [debouncedFilterCriteria, rawData, filterFunction, dispatch])

  return {
    isFiltering,
    filteredDataCount: useAppSelector((state) => state.data.filteredData.length),
    totalDataCount: rawData.length
  }
}

/**
 * Evaluates filter conditions against a data item
 */
function evaluateConditions(item: DataPoint, conditions: FilterCondition[]): boolean {
  if (conditions.length === 0) return true

  let result = evaluateCondition(item, conditions[0])

  for (let i = 1; i < conditions.length; i++) {
    const condition = conditions[i]
    const conditionResult = evaluateCondition(item, condition)

    if (condition.logicalOperator === 'OR') {
      result = result || conditionResult
    } else {
      // Default to AND
      result = result && conditionResult
    }
  }

  return result
}

/**
 * Evaluates a single filter condition
 */
function evaluateCondition(item: DataPoint, condition: FilterCondition): boolean {
  const fieldValue = getNestedValue(item, condition.field)
  const { operator, value } = condition

  if (fieldValue === null || fieldValue === undefined) {
    return false
  }

  switch (operator) {
    case 'eq':
      return fieldValue === value

    case 'gt':
      return Number(fieldValue) > Number(value)

    case 'lt':
      return Number(fieldValue) < Number(value)

    case 'gte':
      return Number(fieldValue) >= Number(value)

    case 'lte':
      return Number(fieldValue) <= Number(value)

    case 'contains':
      return String(fieldValue).toLowerCase().includes(String(value).toLowerCase())

    case 'between':
      if (Array.isArray(value) && value.length === 2) {
        const numValue = Number(fieldValue)
        return numValue >= Number(value[0]) && numValue <= Number(value[1])
      }
      return false

    case 'in':
      return Array.isArray(value) && value.includes(fieldValue)

    case 'not_in':
      return Array.isArray(value) && !value.includes(fieldValue)

    default:
      return false
  }
}

/**
 * Gets nested value from object using dot notation
 */
function getNestedValue(obj: any, path: string): any {
  return path.split('.').reduce((current, key) => {
    return current && current[key] !== undefined ? current[key] : null
  }, obj)
}