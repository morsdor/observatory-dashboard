import { createSlice, PayloadAction } from '@reduxjs/toolkit'
import { DataPoint } from '../../types'

interface DataState {
  rawData: DataPoint[]
  filteredData: DataPoint[]
  dataBuffer: DataPoint[]
  maxBufferSize: number
}

const initialState: DataState = {
  rawData: [],
  filteredData: [],
  dataBuffer: [],
  maxBufferSize: 100000
}

const dataSlice = createSlice({
  name: 'data',
  initialState,
  reducers: {
    addDataPoints: (state, action: PayloadAction<DataPoint[]>) => {
      const points = action.payload
      const newBuffer = [...state.dataBuffer, ...points]
      
      // Implement sliding window if buffer exceeds max size
      state.dataBuffer = newBuffer.length > state.maxBufferSize
        ? newBuffer.slice(-state.maxBufferSize)
        : newBuffer
      
      const newRawData = [...state.rawData, ...points]
      state.rawData = newRawData.length > state.maxBufferSize
        ? newRawData.slice(-state.maxBufferSize)
        : newRawData
    },
    
    setRawData: (state, action: PayloadAction<DataPoint[]>) => {
      state.rawData = action.payload
      state.dataBuffer = action.payload
    },
    
    clearData: (state) => {
      state.rawData = []
      state.filteredData = []
      state.dataBuffer = []
    },
    
    setFilteredData: (state, action: PayloadAction<DataPoint[]>) => {
      state.filteredData = action.payload
    },
    
    setMaxBufferSize: (state, action: PayloadAction<number>) => {
      state.maxBufferSize = action.payload
    }
  }
})

export const { addDataPoints, setRawData, clearData, setFilteredData, setMaxBufferSize } = dataSlice.actions
export default dataSlice.reducer