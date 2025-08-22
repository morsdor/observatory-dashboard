import { createSlice, PayloadAction } from '@reduxjs/toolkit'
import { ConnectionStatus } from '../../types'

interface ConnectionState {
  connectionStatus: ConnectionStatus
  lastConnected: Date | null
  reconnectAttempts: number
  maxReconnectAttempts: number
}

const initialState: ConnectionState = {
  connectionStatus: 'disconnected',
  lastConnected: null,
  reconnectAttempts: 0,
  maxReconnectAttempts: 5
}

const connectionSlice = createSlice({
  name: 'connection',
  initialState,
  reducers: {
    setConnectionStatus: (state, action: PayloadAction<ConnectionStatus>) => {
      state.connectionStatus = action.payload
      
      if (action.payload === 'connected') {
        state.lastConnected = new Date()
        state.reconnectAttempts = 0
      }
    },
    
    incrementReconnectAttempts: (state) => {
      state.reconnectAttempts += 1
    },
    
    resetReconnectAttempts: (state) => {
      state.reconnectAttempts = 0
    },
    
    setLastConnected: (state, action: PayloadAction<Date>) => {
      state.lastConnected = action.payload
    }
  }
})

export const { 
  setConnectionStatus, 
  incrementReconnectAttempts, 
  resetReconnectAttempts, 
  setLastConnected 
} = connectionSlice.actions
export default connectionSlice.reducer