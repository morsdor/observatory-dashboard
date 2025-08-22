import { useCallback, useEffect, useRef, useState } from 'react'
import { useDataStream } from './useDataStream'
import { useAppDispatch, useAppSelector } from '@/stores/dashboardStore'
import { addDataPoints, setConnectionStatus, updateMetrics } from '@/stores/dashboardStore'
import { DataPoint, PerformanceMetrics } from '@/types'

export interface RealTimeIntegrationConfig {
  websocketUrl: string
  maxBufferSize?: number
  performanceMonitoringInterval?: number
  dataRateCalculationWindow?: number
  memoryMonitoringInterval?: number
  autoConnect?: boolean
}

export interface RealTimeMetrics {
  dataPointsPerSecond: number
  totalDataPoints: number
  memoryUsage: number
  bufferUtilization: number
  connectionUptime: number
  lastUpdateTime: Date | null
}

export interface RealTimeIntegrationReturn {
  // Connection control
  connect: () => void
  disconnect: () => void
  reconnect: () => void
  
  // Data access
  data: DataPoint[]
  filteredData: DataPoint[]
  
  // Metrics
  metrics: RealTimeMetrics
  performanceMetrics: PerformanceMetrics
  
  // Status
  isConnected: boolean
  connectionStatus: string
  error: string | null
  
  // Buffer management
  clearBuffer: () => void
  bufferSize: number
  isBufferFull: boolean
  
  // Performance monitoring
  startPerformanceMonitoring: () => void
  stopPerformanceMonitoring: () => void
}

export function useRealTimeIntegration(config: RealTimeIntegrationConfig): RealTimeIntegrationReturn {
  const {
    websocketUrl,
    maxBufferSize = 100000,
    performanceMonitoringInterval = 1000,
    dataRateCalculationWindow = 5000,
    memoryMonitoringInterval = 2000,
    autoConnect = true
  } = config

  const dispatch = useAppDispatch()
  const rawData = useAppSelector(state => state.data.rawData)
  const filteredData = useAppSelector(state => state.data.filteredData)
  const connectionStatus = useAppSelector(state => state.connection.connectionStatus)
  const performanceMetrics = useAppSelector(state => state.performance.metrics)

  // Real-time metrics state
  const [realTimeMetrics, setRealTimeMetrics] = useState<RealTimeMetrics>({
    dataPointsPerSecond: 0,
    totalDataPoints: 0,
    memoryUsage: 0,
    bufferUtilization: 0,
    connectionUptime: 0,
    lastUpdateTime: null
  })

  // Performance monitoring refs
  const performanceIntervalRef = useRef<NodeJS.Timeout | null>(null)
  const memoryIntervalRef = useRef<NodeJS.Timeout | null>(null)
  const dataRateWindowRef = useRef<{ timestamp: number; count: number }[]>([])
  const connectionStartTimeRef = useRef<Date | null>(null)
  const lastDataCountRef = useRef(0)
  const frameTimeRef = useRef<number>(0)
  const renderStartTimeRef = useRef<number>(0)

  // Initialize data stream
  const dataStream = useDataStream({
    url: websocketUrl,
    maxBufferSize,
    autoConnect
  })

  // Handle incoming data and update store
  useEffect(() => {
    if (dataStream.data.length > lastDataCountRef.current) {
      const newDataPoints = dataStream.data.slice(lastDataCountRef.current)
      
      // Measure data processing time
      const processingStart = performance.now()
      
      // Update store with new data
      dispatch(addDataPoints(newDataPoints))
      
      const processingTime = performance.now() - processingStart
      
      // Update performance metrics
      dispatch(updateMetrics({
        dataPointsPerSecond: calculateDataRate(),
        renderTime: processingTime
      }))

      // Update real-time metrics
      setRealTimeMetrics(prev => ({
        ...prev,
        totalDataPoints: dataStream.data.length,
        lastUpdateTime: new Date(),
        bufferUtilization: (dataStream.data.length / maxBufferSize) * 100
      }))

      lastDataCountRef.current = dataStream.data.length
    }
  }, [dataStream.data, dispatch, maxBufferSize])

  // Handle connection status changes
  useEffect(() => {
    dispatch(setConnectionStatus(dataStream.connectionStatus))
    
    if (dataStream.connectionStatus === 'connected' && !connectionStartTimeRef.current) {
      connectionStartTimeRef.current = new Date()
    } else if (dataStream.connectionStatus === 'disconnected') {
      connectionStartTimeRef.current = null
    }
  }, [dataStream.connectionStatus, dispatch])

  // Calculate data rate (points per second)
  const calculateDataRate = useCallback(() => {
    const now = Date.now()
    const window = dataRateWindowRef.current
    
    // Add current data point count
    window.push({ timestamp: now, count: dataStream.data.length })
    
    // Remove old entries outside the window
    const cutoff = now - dataRateCalculationWindow
    dataRateWindowRef.current = window.filter(entry => entry.timestamp > cutoff)
    
    // Calculate rate
    if (dataRateWindowRef.current.length < 2) return 0
    
    const oldest = dataRateWindowRef.current[0]
    const newest = dataRateWindowRef.current[dataRateWindowRef.current.length - 1]
    const timeDiff = (newest.timestamp - oldest.timestamp) / 1000 // Convert to seconds
    const countDiff = newest.count - oldest.count
    
    return timeDiff > 0 ? Math.round(countDiff / timeDiff) : 0
  }, [dataStream.data.length, dataRateCalculationWindow])

  // Monitor memory usage
  const monitorMemoryUsage = useCallback(() => {
    if ('memory' in performance) {
      const memInfo = (performance as any).memory
      const memoryUsage = memInfo.usedJSHeapSize / (1024 * 1024) // Convert to MB
      
      setRealTimeMetrics(prev => ({
        ...prev,
        memoryUsage
      }))
      
      dispatch(updateMetrics({ memoryUsage }))
    }
  }, [dispatch])

  // Monitor connection uptime
  const updateConnectionUptime = useCallback(() => {
    if (connectionStartTimeRef.current && dataStream.connectionStatus === 'connected') {
      const uptime = (Date.now() - connectionStartTimeRef.current.getTime()) / 1000
      setRealTimeMetrics(prev => ({
        ...prev,
        connectionUptime: uptime
      }))
    }
  }, [dataStream.connectionStatus])

  // Monitor frame rate
  const monitorFrameRate = useCallback(() => {
    const measureFrame = () => {
      const now = performance.now()
      if (frameTimeRef.current > 0) {
        const frameDuration = now - frameTimeRef.current
        const fps = Math.round(1000 / frameDuration)
        
        dispatch(updateMetrics({ fps: Math.min(fps, 60) }))
      }
      frameTimeRef.current = now
      
      if (performanceIntervalRef.current) {
        requestAnimationFrame(measureFrame)
      }
    }
    
    requestAnimationFrame(measureFrame)
  }, [dispatch])

  // Start performance monitoring
  const startPerformanceMonitoring = useCallback(() => {
    // Monitor data rate and connection uptime
    performanceIntervalRef.current = setInterval(() => {
      const dataRate = calculateDataRate()
      setRealTimeMetrics(prev => ({
        ...prev,
        dataPointsPerSecond: dataRate
      }))
      
      updateConnectionUptime()
    }, performanceMonitoringInterval)

    // Monitor memory usage
    memoryIntervalRef.current = setInterval(() => {
      monitorMemoryUsage()
    }, memoryMonitoringInterval)

    // Monitor frame rate
    monitorFrameRate()
  }, [
    calculateDataRate,
    updateConnectionUptime,
    monitorMemoryUsage,
    monitorFrameRate,
    performanceMonitoringInterval,
    memoryMonitoringInterval
  ])

  // Stop performance monitoring
  const stopPerformanceMonitoring = useCallback(() => {
    if (performanceIntervalRef.current) {
      clearInterval(performanceIntervalRef.current)
      performanceIntervalRef.current = null
    }
    
    if (memoryIntervalRef.current) {
      clearInterval(memoryIntervalRef.current)
      memoryIntervalRef.current = null
    }
  }, [])

  // Auto-start performance monitoring
  useEffect(() => {
    if (autoConnect) {
      startPerformanceMonitoring()
    }
    
    return () => {
      stopPerformanceMonitoring()
    }
  }, [autoConnect, startPerformanceMonitoring, stopPerformanceMonitoring])

  // Buffer overflow handling
  useEffect(() => {
    if (dataStream.isBufferFull) {
      console.warn('Data buffer is full, implementing sliding window')
      
      // Trigger garbage collection if available
      if ('gc' in window && typeof (window as any).gc === 'function') {
        (window as any).gc()
      }
    }
  }, [dataStream.isBufferFull])

  return {
    // Connection control
    connect: dataStream.connect,
    disconnect: dataStream.disconnect,
    reconnect: dataStream.reconnect,
    
    // Data access
    data: rawData,
    filteredData,
    
    // Metrics
    metrics: realTimeMetrics,
    performanceMetrics,
    
    // Status
    isConnected: dataStream.connectionStatus === 'connected',
    connectionStatus: dataStream.connectionStatus,
    error: dataStream.error,
    
    // Buffer management
    clearBuffer: dataStream.clearBuffer,
    bufferSize: dataStream.bufferSize,
    isBufferFull: dataStream.isBufferFull,
    
    // Performance monitoring
    startPerformanceMonitoring,
    stopPerformanceMonitoring
  }
}