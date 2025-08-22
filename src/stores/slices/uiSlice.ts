import { createSlice, PayloadAction } from '@reduxjs/toolkit'

interface UIState {
  selectedRows: string[]
  chartZoomLevel: number
  isLoading: boolean
  error: string | null
}

const initialState: UIState = {
  selectedRows: [],
  chartZoomLevel: 1,
  isLoading: false,
  error: null
}

const uiSlice = createSlice({
  name: 'ui',
  initialState,
  reducers: {
    setSelectedRows: (state, action: PayloadAction<string[]>) => {
      state.selectedRows = action.payload
    },
    
    toggleRowSelection: (state, action: PayloadAction<string>) => {
      const rowId = action.payload
      if (state.selectedRows.includes(rowId)) {
        state.selectedRows = state.selectedRows.filter(id => id !== rowId)
      } else {
        state.selectedRows.push(rowId)
      }
    },
    
    setChartZoomLevel: (state, action: PayloadAction<number>) => {
      const level = action.payload
      state.chartZoomLevel = Math.max(0.1, Math.min(10, level))
    },
    
    setLoading: (state, action: PayloadAction<boolean>) => {
      state.isLoading = action.payload
    },
    
    setError: (state, action: PayloadAction<string | null>) => {
      state.error = action.payload
    },
    
    clearError: (state) => {
      state.error = null
    }
  }
})

export const { 
  setSelectedRows, 
  toggleRowSelection, 
  setChartZoomLevel, 
  setLoading, 
  setError, 
  clearError 
} = uiSlice.actions
export default uiSlice.reducer