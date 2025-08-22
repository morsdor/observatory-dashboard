import { createSlice, PayloadAction } from '@reduxjs/toolkit'
import { FilterCriteria, FilterCondition, FilterGroup } from '../../types'

interface FilterPerformance {
  filterTime: number
  resultCount: number
  totalCount: number
  cacheHitRate?: number
}

interface FilterState {
  filterCriteria: FilterCriteria
  activeFilters: FilterCondition[]
  isFiltering: boolean
  performance: FilterPerformance
}

const defaultFilterCriteria: FilterCriteria = {
  conditions: [],
  grouping: [],
  sortBy: undefined
}

const initialState: FilterState = {
  filterCriteria: defaultFilterCriteria,
  activeFilters: [],
  isFiltering: false,
  performance: {
    filterTime: 0,
    resultCount: 0,
    totalCount: 0
  }
}

const filterSlice = createSlice({
  name: 'filter',
  initialState,
  reducers: {
    updateFilterCriteria: (state, action: PayloadAction<FilterCriteria>) => {
      state.filterCriteria = action.payload
      state.activeFilters = action.payload.conditions
    },
    
    addFilterCondition: (state, action: PayloadAction<FilterCondition>) => {
      const newConditions = [...state.filterCriteria.conditions, action.payload]
      state.filterCriteria = {
        ...state.filterCriteria,
        conditions: newConditions
      }
      state.activeFilters = newConditions
    },
    
    removeFilterCondition: (state, action: PayloadAction<string>) => {
      const conditionId = action.payload
      const newConditions = state.filterCriteria.conditions.filter(
        (condition) => condition.id !== conditionId
      )
      state.filterCriteria = {
        ...state.filterCriteria,
        conditions: newConditions
      }
      state.activeFilters = newConditions
    },
    
    clearFilters: (state) => {
      state.filterCriteria = defaultFilterCriteria
      state.activeFilters = []
    },
    
    setIsFiltering: (state, action: PayloadAction<boolean>) => {
      state.isFiltering = action.payload
    },
    
    updateFilterPerformance: (state, action: PayloadAction<FilterPerformance>) => {
      state.performance = action.payload
    },
    
    addFilterGroup: (state, action: PayloadAction<FilterGroup>) => {
      state.filterCriteria = {
        ...state.filterCriteria,
        grouping: [...state.filterCriteria.grouping, action.payload]
      }
    },
    
    removeFilterGroup: (state, action: PayloadAction<string>) => {
      const groupId = action.payload
      state.filterCriteria = {
        ...state.filterCriteria,
        grouping: state.filterCriteria.grouping.filter(group => group.id !== groupId)
      }
    },
    
    updateFilterGroup: (state, action: PayloadAction<FilterGroup>) => {
      const updatedGroup = action.payload
      state.filterCriteria = {
        ...state.filterCriteria,
        grouping: state.filterCriteria.grouping.map(group => 
          group.id === updatedGroup.id ? updatedGroup : group
        )
      }
    }
  }
})

export const { 
  updateFilterCriteria, 
  addFilterCondition, 
  removeFilterCondition, 
  clearFilters, 
  setIsFiltering,
  updateFilterPerformance,
  addFilterGroup,
  removeFilterGroup,
  updateFilterGroup
} = filterSlice.actions
export default filterSlice.reducer