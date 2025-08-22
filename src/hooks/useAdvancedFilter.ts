import { useEffect, useMemo, useCallback, useRef } from 'react'
import { useAppSelector, useAppDispatch } from '@/stores/dashboardStore'
import { setIsFiltering, updateFilterPerformance } from '@/stores/slices/filterSlice'
import { updateFilteredData } from '@/stores/slices/dataSlice'
import { DataPoint, FilterCriteria } from '@/types'
import { useDebounce } from './useDebounce'
import { AdvancedFilterEngine } from '@/lib/filterEngine'

/**
 * Advanced filtering hook with high-performance indexing and caching
 */
export function useAdvancedFilter(debounceMs: number = 300) {
  const dispatch = useAppDispatch()
  const rawData = useAppSelector((state) => state.data.rawData)
  const filterCriteria = useAppSelector((state) => state.filter.filterCriteria)
  const isFiltering = useAppSelector((state) => state.filter.isFiltering)
  
  const filterEngineRef = useRef<AdvancedFilterEngine | null>(null)

  // Initialize filter engine
  useEffect(() => {
    if (!filterEngineRef.current) {
      filterEngineRef.current = new AdvancedFilterEngine(rawData)
    } else {
      filterEngineRef.current.setData(rawData)
    }
  }, [rawData])

  // Debounce the filter criteria to prevent excessive filtering
  const debouncedFilterCriteria = useDebounce(filterCriteria, debounceMs)

  // Memoized filter function
  const applyFilter = useCallback((criteria: FilterCriteria): DataPoint[] => {
    if (!filterEngineRef.current) {
      return rawData
    }

    const startTime = performance.now()
    const result = filterEngineRef.current.filter(criteria)
    const endTime = performance.now()

    // Dispatch performance metrics
    dispatch(updateFilterPerformance({
      filterTime: endTime - startTime,
      resultCount: result.length,
      totalCount: rawData.length
    }))

    return result
  }, [rawData, dispatch])

  // Apply filters when debounced criteria changes
  useEffect(() => {
    if (!debouncedFilterCriteria || !filterEngineRef.current) return

    dispatch(setIsFiltering(true))

    // Apply filtering in the next tick to prevent blocking
    const timeoutId = setTimeout(() => {
      try {
        const filteredData = applyFilter(debouncedFilterCriteria)
        dispatch(updateFilteredData(filteredData))
      } catch (error) {
        console.error('Error applying advanced filters:', error)
        dispatch(updateFilteredData(rawData)) // Fallback to unfiltered data
      } finally {
        dispatch(setIsFiltering(false))
      }
    }, 0)

    return () => clearTimeout(timeoutId)
  }, [debouncedFilterCriteria, applyFilter, rawData, dispatch])

  // Add new data incrementally
  const addData = useCallback((newData: DataPoint[]) => {
    if (filterEngineRef.current) {
      filterEngineRef.current.addData(newData)
    }
  }, [])

  // Get filter engine statistics
  const getFilterStats = useCallback(() => {
    return filterEngineRef.current?.getStats() || {
      dataSize: 0,
      indexSize: 0,
      cacheSize: 0,
      indexedFields: []
    }
  }, [])

  return {
    isFiltering,
    filteredDataCount: useAppSelector((state) => state.data.filteredData.length),
    totalDataCount: rawData.length,
    addData,
    getFilterStats,
    filterPerformance: useAppSelector((state) => state.filter.performance)
  }
}

/**
 * Hook for building complex filter criteria with validation
 */
export function useFilterBuilder() {
  const dispatch = useAppDispatch()
  const filterCriteria = useAppSelector((state) => state.filter.filterCriteria)

  const addConditionGroup = useCallback((groupId: string, parentGroupId?: string) => {
    // Implementation for adding condition groups
    // This would be used by the visual filter builder
  }, [dispatch])

  const removeConditionGroup = useCallback((groupId: string) => {
    // Implementation for removing condition groups
  }, [dispatch])

  const validateFilterCriteria = useCallback((criteria: FilterCriteria): { isValid: boolean; errors: string[] } => {
    const errors: string[] = []

    // Validate conditions
    criteria.conditions.forEach((condition, index) => {
      if (!condition.field) {
        errors.push(`Condition ${index + 1}: Field is required`)
      }
      if (!condition.operator) {
        errors.push(`Condition ${index + 1}: Operator is required`)
      }
      if (condition.value === null || condition.value === undefined || condition.value === '') {
        if (condition.operator !== 'eq') { // Allow empty values for equality checks
          errors.push(`Condition ${index + 1}: Value is required`)
        }
      }
    })

    // Validate groups
    criteria.grouping.forEach((group, index) => {
      if (group.conditions.length === 0) {
        errors.push(`Group ${index + 1}: At least one condition is required`)
      }
    })

    return {
      isValid: errors.length === 0,
      errors
    }
  }, [])

  return {
    filterCriteria,
    addConditionGroup,
    removeConditionGroup,
    validateFilterCriteria
  }
}

/**
 * Hook for date range filtering with optimizations
 */
export function useDateRangeFilter() {
  const dispatch = useAppDispatch()

  const createDateRangeFilter = useCallback((
    field: string,
    startDate: Date,
    endDate: Date,
    logicalOperator?: 'AND' | 'OR'
  ) => {
    return {
      id: `date-range-${Date.now()}`,
      field,
      operator: 'between' as const,
      value: [startDate.toISOString(), endDate.toISOString()],
      logicalOperator
    }
  }, [])

  const createRelativeDateFilter = useCallback((
    field: string,
    relativeValue: 'last_hour' | 'last_day' | 'last_week' | 'last_month',
    logicalOperator?: 'AND' | 'OR'
  ) => {
    const now = new Date()
    let startDate: Date

    switch (relativeValue) {
      case 'last_hour':
        startDate = new Date(now.getTime() - 60 * 60 * 1000)
        break
      case 'last_day':
        startDate = new Date(now.getTime() - 24 * 60 * 60 * 1000)
        break
      case 'last_week':
        startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
        break
      case 'last_month':
        startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)
        break
      default:
        startDate = new Date(now.getTime() - 24 * 60 * 60 * 1000)
    }

    return createDateRangeFilter(field, startDate, now, logicalOperator)
  }, [createDateRangeFilter])

  return {
    createDateRangeFilter,
    createRelativeDateFilter
  }
}

/**
 * Hook for categorical filtering with multi-select support
 */
export function useCategoricalFilter() {
  const createCategoricalFilter = useCallback((
    field: string,
    selectedValues: string[],
    operator: 'in' | 'not_in' = 'in',
    logicalOperator?: 'AND' | 'OR'
  ) => {
    return {
      id: `categorical-${field}-${Date.now()}`,
      field,
      operator,
      value: selectedValues,
      logicalOperator
    }
  }, [])

  const createSingleCategoryFilter = useCallback((
    field: string,
    value: string,
    logicalOperator?: 'AND' | 'OR'
  ) => {
    return {
      id: `category-${field}-${Date.now()}`,
      field,
      operator: 'eq' as const,
      value,
      logicalOperator
    }
  }, [])

  return {
    createCategoricalFilter,
    createSingleCategoryFilter
  }
}