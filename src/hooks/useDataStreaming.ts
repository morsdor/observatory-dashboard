/**
 * Data Streaming Hook
 * 
 * This hook provides a React interface to the DataStreamingService.
 * It manages state and provides reactive updates for components.
 */

import { useState, useEffect, useCallback } from 'react'
import { DataPoint } from '@/types'
import { 
  getDataStreamingService, 
  type StreamingStatus, 
  type DataScenario, 
  type StreamingMetrics,
  type StreamingConfig 
} from '@/services/dataStreamingService'

export interface UseDataStreamingOptions {
  autoConnect?: boolean
  bufferSize?: number
  config?: Partial<StreamingConfig>
}

export interface UseDataStreamingReturn {
  // Data
  data: DataPoint[]
  recentData: DataPoint[]
  
  // Status
  status: StreamingStatus
  isConnected: boolean
  isConnecting: boolean
  
  // Metrics
  metrics: StreamingMetrics | null
  
  // Controls
  connect: () => Promise<void>
  disconnect: () => void
  clearBuffer: () => void
  
  // Configuration
  changeScenario: (scenario: DataScenario) => void
  updateConfig: (config: Partial<StreamingConfig>) => void
  
  // Testing utilities
  simulateSpike: (duration?: number, multiplier?: number) => void
  injectTestData: (data: DataPoint[]) => void
}

export function useDataStreaming(options: UseDataStreamingOptions = {}): UseDataStreamingReturn {
  const {
    autoConnect = false,
    bufferSize = 1000,
    config = {}
  } = options
  
  const [data, setData] = useState<DataPoint[]>([])
  const [status, setStatus] = useState<StreamingStatus>('disconnected')
  const [metrics, setMetrics] = useState<StreamingMetrics | null>(null)
  
  const streamingService = getDataStreamingService(config)
  
  // Initialize and set up listeners
  useEffect(() => {
    // Initialize state
    setData(streamingService.getBufferedData())
    setStatus(streamingService.getStatus())
    setMetrics(streamingService.getMetrics())
    
    // Set up data listener
    const unsubscribeData = streamingService.onData((newData) => {
      setData(prevData => {
        const combined = [...prevData, ...newData]
        // Maintain buffer size
        return combined.length > bufferSize 
          ? combined.slice(-bufferSize)
          : combined
      })
    })
    
    // Set up status listener
    const unsubscribeStatus = streamingService.onStatusChange(setStatus)
    
    // Set up metrics listener
    const unsubscribeMetrics = streamingService.onMetricsUpdate(setMetrics)
    
    // Auto-connect if requested
    if (autoConnect && status === 'disconnected') {
      streamingService.connect()
    }
    
    return () => {
      unsubscribeData()
      unsubscribeStatus()
      unsubscribeMetrics()
    }
  }, [streamingService, autoConnect, bufferSize])
  
  // Control functions
  const connect = useCallback(async () => {
    await streamingService.connect()
  }, [streamingService])
  
  const disconnect = useCallback(() => {
    streamingService.disconnect()
  }, [streamingService])
  
  const clearBuffer = useCallback(() => {
    streamingService.clearBuffer()
    setData([])
  }, [streamingService])
  
  const changeScenario = useCallback((scenario: DataScenario) => {
    streamingService.changeScenario(scenario)
  }, [streamingService])
  
  const updateConfig = useCallback((newConfig: Partial<StreamingConfig>) => {
    streamingService.updateConfig(newConfig)
  }, [streamingService])
  
  const simulateSpike = useCallback((duration?: number, multiplier?: number) => {
    streamingService.simulateDataSpike(duration, multiplier)
  }, [streamingService])
  
  const injectTestData = useCallback((testData: DataPoint[]) => {
    streamingService.injectTestData(testData)
  }, [streamingService])
  
  // Derived state
  const isConnected = status === 'connected'
  const isConnecting = status === 'connecting'
  const recentData = data.slice(-100) // Last 100 points for performance
  
  return {
    // Data
    data,
    recentData,
    
    // Status
    status,
    isConnected,
    isConnecting,
    
    // Metrics
    metrics,
    
    // Controls
    connect,
    disconnect,
    clearBuffer,
    
    // Configuration
    changeScenario,
    updateConfig,
    
    // Testing utilities
    simulateSpike,
    injectTestData
  }
}

export default useDataStreaming