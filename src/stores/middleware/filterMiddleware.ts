import { createListenerMiddleware } from '@reduxjs/toolkit'
import { RootState } from '../dashboardStore'
import {
  addDataPoints,
  setRawData,
  setFilteredData
} from '../slices/dataSlice'
import {
  updateFilterCriteria,
  addFilterCondition,
  removeFilterCondition,
  clearFilters,
  setIsFiltering
} from '../slices/filterSlice'
import { updateMetrics } from '../slices/performanceSlice'
import { clearError } from '../slices/uiSlice'
import { DataPoint, FilterCondition, FilterOperator } from '../../types'

// Create the listener middleware
export const filterMiddleware = createListenerMiddleware()

// Helper functions for filtering
function getFieldValue(dataPoint: DataPoint, field: string): any {
  switch (field) {
    case 'id':
      return dataPoint.id
    case 'timestamp':
      return dataPoint.timestamp
    case 'value':
      return dataPoint.value
    case 'category':
      return dataPoint.category
    case 'source':
      return dataPoint.source
    default:
      // Check metadata for custom fields
      return dataPoint.metadata[field]
  }
}

function evaluateCondition(fieldValue: any, condition: FilterCondition): boolean {
  const { operator, value } = condition

  switch (operator) {
    case 'eq':
      return fieldValue === value
    case 'gt':
      return fieldValue > value
    case 'lt':
      return fieldValue < value
    case 'gte':
      return fieldValue >= value
    case 'lte':
      return fieldValue <= value
    case 'contains':
      return String(fieldValue).toLowerCase().includes(String(value).toLowerCase())
    case 'between':
      return Array.isArray(value) && fieldValue >= value[0] && fieldValue <= value[1]
    case 'in':
      return Array.isArray(value) && value.includes(fieldValue)
    case 'not_in':
      return Array.isArray(value) && !value.includes(fieldValue)
    default:
      return false
  }
}

function applyFilters(state: RootState, dispatch: any) {
  const { rawData } = state.data
  const { filterCriteria } = state.filter

  dispatch(setIsFiltering(true))

  const startTime = performance.now()

  // Apply filter conditions
  let filtered = filterCriteria.conditions.length === 0
    ? [...rawData] // Create a copy even when no filters
    : rawData.filter((dataPoint) => {
      return filterCriteria.conditions.every((condition) => {
        const fieldValue = getFieldValue(dataPoint, condition.field)
        return evaluateCondition(fieldValue, condition)
      })
    })

  // Apply sorting if specified
  if (filterCriteria.sortBy) {
    const { field, direction } = filterCriteria.sortBy
    filtered = filtered.sort((a, b) => {
      const aValue = getFieldValue(a, field)
      const bValue = getFieldValue(b, field)

      // Handle different data types
      if (typeof aValue === 'number' && typeof bValue === 'number') {
        return direction === 'asc' ? aValue - bValue : bValue - aValue
      }

      // Handle dates
      if (aValue instanceof Date && bValue instanceof Date) {
        return direction === 'asc'
          ? aValue.getTime() - bValue.getTime()
          : bValue.getTime() - aValue.getTime()
      }

      // Handle strings and other types
      const aStr = String(aValue)
      const bStr = String(bValue)

      if (aStr < bStr) return direction === 'asc' ? -1 : 1
      if (aStr > bStr) return direction === 'asc' ? 1 : -1
      return 0
    })
  }

  const filterTime = performance.now() - startTime

  dispatch(setFilteredData(filtered))
  dispatch(setIsFiltering(false))
  dispatch(updateMetrics({ filterTime }))
}

// Listen for actions that should trigger filter application
filterMiddleware.startListening({
  actionCreator: addDataPoints,
  effect: (action, listenerApi) => {
    const state = listenerApi.getState() as RootState
    applyFilters(state, listenerApi.dispatch)
  }
})

filterMiddleware.startListening({
  actionCreator: setRawData,
  effect: (action, listenerApi) => {
    const state = listenerApi.getState() as RootState
    applyFilters(state, listenerApi.dispatch)
  }
})

filterMiddleware.startListening({
  actionCreator: updateFilterCriteria,
  effect: (action, listenerApi) => {
    const state = listenerApi.getState() as RootState
    applyFilters(state, listenerApi.dispatch)
  }
})

filterMiddleware.startListening({
  actionCreator: addFilterCondition,
  effect: (action, listenerApi) => {
    const state = listenerApi.getState() as RootState
    applyFilters(state, listenerApi.dispatch)
  }
})

filterMiddleware.startListening({
  actionCreator: removeFilterCondition,
  effect: (action, listenerApi) => {
    const state = listenerApi.getState() as RootState
    applyFilters(state, listenerApi.dispatch)
  }
})

filterMiddleware.startListening({
  actionCreator: clearFilters,
  effect: (action, listenerApi) => {
    const state = listenerApi.getState() as RootState
    applyFilters(state, listenerApi.dispatch)
  }
})

// Listen for successful connection to clear errors
filterMiddleware.startListening({
  predicate: (action) => {
    return action.type === 'connection/setConnectionStatus' && action.payload === 'connected'
  },
  effect: (action, listenerApi) => {
    listenerApi.dispatch(clearError())
  }
})