import { createSlice, PayloadAction } from '@reduxjs/toolkit'
import { FilterCriteria, FilterCondition } from '../../types'

interface FilterState {
  filterCriteria: FilterCriteria
  activeFilters: FilterCondition[]
  isFiltering: boolean
}

const defaultFilterCriteria: FilterCriteria = {
  conditions: [],
  grouping: [],
  sortBy: undefined
}

const initialState: FilterState = {
  filterCriteria: defaultFilterCriteria,
  activeFilters: [],
  isFiltering: false
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
    }
  }
})

export const { 
  updateFilterCriteria, 
  addFilterCondition, 
  removeFilterCondition, 
  clearFilters, 
  setIsFiltering 
} = filterSlice.actions
export default filterSlice.reducer