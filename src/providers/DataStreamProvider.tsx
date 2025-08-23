/**
 * Global Data Stream Provider
 * 
 * This provider ensures all components across the application consume
 * data from a single unified streaming source. It wraps the entire
 * application and provides consistent data access patterns.
 */

'use client'

import React, { createContext, useContext, useEffect, useState } from 'react'
import { DataPoint } from '@/types'
import { 
  getDataStreamingService, 
  type StreamingStatus, 
  type DataScenario, 
  type StreamingMetrics,
  type StreamingConfig 
} from '@/services/dataStreamingService'

interface DataStreamContextValue {
  // Data
  data: DataPoint[]
  recentData: DataPoint[]
  filteredData: DataPoint[]
  
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
  
  // Data access methods
  getDataByCategory: (category: string) => DataPoint[]
  getDataBySource: (source: string) => DataPoint[]
  getDataByTimeRange: (startTime: Date, endTime: Date) => DataPoint[]
  getLatestDataPoints: (count: number) => DataPoint[]
  
  // Testing utilities
  simulateSpike: (duration?: number, multiplier?: number) => void
  injectTestData: (data: DataPoint[]) => void
}

const DataStreamContext = createContext<DataStreamContextValue | null>(null)

interface DataStreamProviderProps {
  children: React.ReactNode
  config?: Partial<StreamingConfig>
  autoConnect?: boolean
}

export function DataStreamProvider({ 
  children, 
  config = {},
  autoConnect = false 
}: DataStreamProviderProps) {
  const [data, setData] = useState<DataPoint[]>([])
  const [status, setStatus] = useState<StreamingStatus>('disconnected')
  const [metrics, setMetrics] = useState<StreamingMetrics | null>(null)
  
  // Initialize streaming service
  const streamingService = getDataStreamingService(config)
  
  // Set up listeners and initialize
  useEffect(() => {
    // Initialize state from service
    setData(streamingService.getBufferedData())
    setStatus(streamingService.getStatus())
    setMetrics(streamingService.getMetrics())
    
    // Set up data listener
    const unsubscribeData = streamingService.onData((newData) => {
      setData(prevData => {
        const combined = [...prevData, ...newData]
        // Maintain reasonable buffer size for UI performance
        const maxUIBuffer = 50000 // Smaller than service buffer for UI performance
        return combined.length > maxUIBuffer 
          ? combined.slice(-maxUIBuffer)
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
  }, [streamingService, autoConnect])
  
  // Control functions
  const connect = async () => {
    await streamingService.connect()
  }
  
  const disconnect = () => {
    streamingService.disconnect()
  }
  
  const clearBuffer = () => {
    streamingService.clearBuffer()
    setData([])
  }
  
  const changeScenario = (scenario: DataScenario) => {
    streamingService.changeScenario(scenario)
  }
  
  const updateConfig = (newConfig: Partial<StreamingConfig>) => {
    streamingService.updateConfig(newConfig)
  }
  
  // Data access methods
  const getDataByCategory = (category: string): DataPoint[] => {
    return data.filter(point => point.category === category)
  }
  
  const getDataBySource = (source: string): DataPoint[] => {
    return data.filter(point => point.source === source)
  }
  
  const getDataByTimeRange = (startTime: Date, endTime: Date): DataPoint[] => {
    return data.filter(point => 
      point.timestamp >= startTime && point.timestamp <= endTime
    )
  }
  
  const getLatestDataPoints = (count: number): DataPoint[] => {
    return data.slice(-count)
  }
  
  // Testing utilities
  const simulateSpike = (duration?: number, multiplier?: number) => {
    streamingService.simulateDataSpike(duration, multiplier)
  }
  
  const injectTestData = (testData: DataPoint[]) => {
    streamingService.injectTestData(testData)
  }
  
  // Derived state
  const isConnected = status === 'connected'
  const isConnecting = status === 'connecting'
  const recentData = data.slice(-1000) // Last 1000 points for performance
  const filteredData = data // Can be extended with global filters
  
  const contextValue: DataStreamContextValue = {
    // Data
    data,
    recentData,
    filteredData,
    
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
    
    // Data access methods
    getDataByCategory,
    getDataBySource,
    getDataByTimeRange,
    getLatestDataPoints,
    
    // Testing utilities
    simulateSpike,
    injectTestData
  }
  
  return (
    <DataStreamContext.Provider value={contextValue}>
      {children}
    </DataStreamContext.Provider>
  )
}

// Hook to use the data stream context
export function useGlobalDataStream(): DataStreamContextValue {
  const context = useContext(DataStreamContext)
  if (!context) {
    throw new Error('useGlobalDataStream must be used within a DataStreamProvider')
  }
  return context
}

// Hook for specific data categories (convenience hook)
export function useDataByCategory(category: string): DataPoint[] {
  const { getDataByCategory } = useGlobalDataStream()
  return getDataByCategory(category)
}

// Hook for specific data sources (convenience hook)
export function useDataBySource(source: string): DataPoint[] {
  const { getDataBySource } = useGlobalDataStream()
  return getDataBySource(source)
}

// Hook for recent data (convenience hook)
export function useRecentData(count: number = 1000): DataPoint[] {
  const { getLatestDataPoints } = useGlobalDataStream()
  return getLatestDataPoints(count)
}

export default DataStreamProvider