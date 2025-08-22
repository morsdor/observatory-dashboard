import { createSlice, PayloadAction } from '@reduxjs/toolkit'
import { PerformanceMetrics } from '../../types'

interface PerformanceState {
  metrics: PerformanceMetrics
}

const defaultMetrics: PerformanceMetrics = {
  fps: 60,
  memoryUsage: 0,
  dataPointsPerSecond: 0,
  renderTime: 0,
  filterTime: 0
}

const initialState: PerformanceState = {
  metrics: defaultMetrics
}

const performanceSlice = createSlice({
  name: 'performance',
  initialState,
  reducers: {
    updateMetrics: (state, action: PayloadAction<Partial<PerformanceMetrics>>) => {
      state.metrics = { ...state.metrics, ...action.payload }
    },
    
    resetMetrics: (state) => {
      state.metrics = defaultMetrics
    }
  }
})

export const { updateMetrics, resetMetrics } = performanceSlice.actions
export default performanceSlice.reducer