import { useCallback, useEffect, useState } from 'react'
import { useWebSocket, WebSocketConfig } from './useWebSocket'
import { useDataBuffer, DataBufferConfig, DataBufferMetrics } from './useDataBuffer'
import { ConnectionStatus, DataPoint } from '@/types'

export interface DataStreamConfig extends WebSocketConfig, DataBufferConfig {
  autoConnect?: boolean
}

export interface DataStreamHookReturn {
  // Data
  data: DataPoint[]
  
  // Connection
  connectionStatus: ConnectionStatus
  connect: () => void
  disconnect: () => void
  reconnect: () => void
  
  // Buffer management
  clearBuffer: () => void
  bufferSize: number
  isBufferFull: boolean
  
  // Metrics and monitoring
  getMetrics: () => DataBufferMetrics
  error: string | null
  reconnectAttempts: number
  
  // Manual data injection (for testing)
  injectData: (points: DataPoint[]) => void
}

export function useDataStream(config: DataStreamConfig): DataStreamHookReturn {
  const {
    autoConnect = true,
    ...wsConfig
  } = config

  const [isConnected, setIsConnected] = useState(false)

  // Initialize WebSocket connection
  const {
    connectionStatus,
    lastMessage,
    sendMessage,
    reconnect: wsReconnect,
    disconnect: wsDisconnect,
    error,
    reconnectAttempts
  } = useWebSocket(wsConfig)

  // Initialize data buffer
  const {
    data,
    addData,
    clearBuffer,
    getMetrics,
    bufferSize,
    isBufferFull
  } = useDataBuffer(config)

  // Handle incoming WebSocket messages
  useEffect(() => {
    if (lastMessage && lastMessage.length > 0) {
      addData(lastMessage)
    }
  }, [lastMessage, addData])

  // Track connection status
  useEffect(() => {
    setIsConnected(connectionStatus === 'connected')
  }, [connectionStatus])

  // Auto-connect on mount if enabled
  useEffect(() => {
    if (autoConnect && connectionStatus === 'disconnected') {
      // The useWebSocket hook handles initial connection
    }
  }, [autoConnect, connectionStatus])

  const connect = useCallback(() => {
    wsReconnect()
  }, [wsReconnect])

  const disconnect = useCallback(() => {
    wsDisconnect()
  }, [wsDisconnect])

  const reconnect = useCallback(() => {
    wsReconnect()
  }, [wsReconnect])

  const injectData = useCallback((points: DataPoint[]) => {
    addData(points)
  }, [addData])

  return {
    // Data
    data,
    
    // Connection
    connectionStatus,
    connect,
    disconnect,
    reconnect,
    
    // Buffer management
    clearBuffer,
    bufferSize,
    isBufferFull,
    
    // Metrics and monitoring
    getMetrics,
    error,
    reconnectAttempts,
    
    // Manual data injection
    injectData
  }
}