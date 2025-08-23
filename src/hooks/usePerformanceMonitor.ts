import { useCallback, useEffect, useRef, useState } from 'react'
import { useAppDispatch } from '@/stores/dashboardStore'
import { updateMetrics } from '@/stores/dashboardStore'
import { getRealPerformanceMonitor, RealPerformanceMetrics } from '@/utils/realPerformanceMetrics'

export interface PerformanceMonitorConfig {
  enabled?: boolean
  fpsMonitoringInterval?: number
  memoryMonitoringInterval?: number
  renderTimeThreshold?: number
  memoryThreshold?: number
  networkLatencyThreshold?: number
  dataThroughputThreshold?: number
  networkMonitoringInterval?: number
}

export interface PerformanceAlert {
  type: 'fps' | 'memory' | 'render_time' | 'network_latency' | 'data_throughput'
  message: string
  value: number
  threshold: number
  timestamp: Date
}

export interface PerformanceMonitorReturn {
  // Monitoring control
  start: () => void
  stop: () => void
  reset: () => void
  
  // Performance measurement
  measureRenderTime: <T>(fn: () => T) => T
  measureAsyncRenderTime: <T>(fn: () => Promise<T>) => Promise<T>
  measureNetworkLatency: (url?: string) => Promise<number>
  
  // Memory management
  triggerMemoryCleanup: () => void
  
  // Metrics
  currentFps: number
  averageFps: number
  currentMemory: number
  peakMemory: number
  renderTimes: number[]
  networkLatency: number
  averageNetworkLatency: number
  dataThroughput: number
  averageDataThroughput: number
  
  // Alerts
  alerts: PerformanceAlert[]
  clearAlerts: () => void
  
  // Status
  isMonitoring: boolean
}

export function usePerformanceMonitor(config: PerformanceMonitorConfig = {}): PerformanceMonitorReturn {
  const {
    enabled = true,
    fpsMonitoringInterval = 1000,
    memoryMonitoringInterval = 2000,
    renderTimeThreshold = 16.67, // 60fps = 16.67ms per frame
    memoryThreshold = 100, // 100MB
    networkLatencyThreshold = 200, // 200ms
    dataThroughputThreshold = 1000, // 1000 data points per second
    networkMonitoringInterval = 5000 // 5 seconds
  } = config

  const dispatch = useAppDispatch()
  
  // State
  const [isMonitoring, setIsMonitoring] = useState(false)
  const [realMetrics, setRealMetrics] = useState<RealPerformanceMetrics | null>(null)
  const [renderTimes, setRenderTimes] = useState<number[]>([])
  const [dataThroughput, setDataThroughput] = useState(0)
  const [averageDataThroughput, setAverageDataThroughput] = useState(0)
  const [alerts, setAlerts] = useState<PerformanceAlert[]>([])
  
  // Get real performance monitor instance
  const realPerformanceMonitor = getRealPerformanceMonitor()

  // Refs for monitoring
  const memoryIntervalRef = useRef<NodeJS.Timeout | null>(null)
  const networkIntervalRef = useRef<NodeJS.Timeout | null>(null)
  const frameCountRef = useRef(0)
  const lastFrameTimeRef = useRef(performance.now())
  const fpsHistoryRef = useRef<number[]>([])
  const renderTimeHistoryRef = useRef<number[]>([])
  const networkLatencyHistoryRef = useRef<number[]>([])
  const dataThroughputHistoryRef = useRef<number[]>([])
  const dataPointCountRef = useRef(0)
  const lastDataCountTimeRef = useRef(performance.now())
  const gcObserverRef = useRef<PerformanceObserver | null>(null)

  // Add performance alert
  const addAlert = useCallback((type: PerformanceAlert['type'], message: string, value: number, threshold: number) => {
    const alert: PerformanceAlert = {
      type,
      message,
      value,
      threshold,
      timestamp: new Date()
    }
    
    setAlerts(prev => [...prev.slice(-9), alert]) // Keep last 10 alerts
  }, [])

  // Clear alerts
  const clearAlerts = useCallback(() => {
    setAlerts([])
  }, [])

  // Update real metrics periodically
  const updateRealMetrics = useCallback(() => {
    if (!isMonitoring) return
    
    const metrics = realPerformanceMonitor.getCurrentMetrics()
    setRealMetrics(metrics)
    
    // Update store with real metrics
    dispatch(updateMetrics({ 
      fps: metrics.currentFps,
      memoryUsage: metrics.currentMemory
    }))
    
    // Check for performance alerts using real data
    if (metrics.currentFps < 30) {
      addAlert('fps', `Low FPS detected: ${metrics.currentFps}`, metrics.currentFps, 30)
    }
    
    if (metrics.currentMemory > memoryThreshold) {
      addAlert('memory', `High memory usage: ${metrics.currentMemory.toFixed(1)}MB`, metrics.currentMemory, memoryThreshold)
    }
    
    if (metrics.networkLatency > networkLatencyThreshold) {
      addAlert('network_latency', `High network latency: ${metrics.networkLatency.toFixed(2)}ms`, metrics.networkLatency, networkLatencyThreshold)
    }
  }, [dispatch, isMonitoring, memoryThreshold, networkLatencyThreshold, addAlert, realPerformanceMonitor])

  // This function is now handled by updateRealMetrics

  // Measure render time using real performance monitor
  const measureRenderTime = useCallback(<T>(fn: () => T): T => {
    const result = realPerformanceMonitor.measureRenderTime(() => {
      const start = performance.now()
      const fnResult = fn()
      const renderTime = performance.now() - start
      
      // Update render times
      setRenderTimes(prev => {
        const newTimes = [...prev, renderTime].slice(-100) // Keep last 100 measurements
        renderTimeHistoryRef.current = newTimes
        return newTimes
      })
      
      // Update store
      dispatch(updateMetrics({ renderTime }))
      
      // Check for render time alerts
      if (renderTime > renderTimeThreshold) {
        addAlert('render_time', `Slow render detected: ${renderTime.toFixed(2)}ms`, renderTime, renderTimeThreshold)
      }
      
      return fnResult
    })
    
    return result
  }, [dispatch, renderTimeThreshold, addAlert, realPerformanceMonitor])

  // Measure async render time
  const measureAsyncRenderTime = useCallback(async <T>(fn: () => Promise<T>): Promise<T> => {
    const start = performance.now()
    const result = await fn()
    const renderTime = performance.now() - start
    
    // Update render times
    setRenderTimes(prev => {
      const newTimes = [...prev, renderTime].slice(-100)
      renderTimeHistoryRef.current = newTimes
      return newTimes
    })
    
    // Update store
    dispatch(updateMetrics({ renderTime }))
    
    // Check for render time alerts
    if (renderTime > renderTimeThreshold) {
      addAlert('render_time', `Slow async render detected: ${renderTime.toFixed(2)}ms`, renderTime, renderTimeThreshold)
    }
    
    return result
  }, [dispatch, renderTimeThreshold, addAlert])

  // Measure network latency using real performance monitor
  const measureNetworkLatency = useCallback(async (url: string = '/api/ping'): Promise<number> => {
    try {
      const latency = await realPerformanceMonitor.measureNetworkLatency(url)
      
      // Update store
      dispatch(updateMetrics({ networkLatency: latency }))
      
      // Check for latency alerts
      if (latency > networkLatencyThreshold) {
        addAlert('network_latency', `High network latency: ${latency.toFixed(2)}ms`, latency, networkLatencyThreshold)
      }
      
      return latency
    } catch (error) {
      console.warn('Network latency measurement failed:', error)
      return -1
    }
  }, [dispatch, networkLatencyThreshold, addAlert, realPerformanceMonitor])

  // Track data throughput
  const trackDataThroughput = useCallback((dataPointCount: number) => {
    dataPointCountRef.current += dataPointCount
    
    const now = performance.now()
    const deltaTime = now - lastDataCountTimeRef.current
    
    // Calculate throughput every second
    if (deltaTime >= 1000) {
      const throughput = (dataPointCountRef.current * 1000) / deltaTime
      
      setDataThroughput(throughput)
      dataThroughputHistoryRef.current.push(throughput)
      
      // Keep only last 60 measurements
      if (dataThroughputHistoryRef.current.length > 60) {
        dataThroughputHistoryRef.current = dataThroughputHistoryRef.current.slice(-60)
      }
      
      // Calculate average throughput
      const avgThroughput = dataThroughputHistoryRef.current.reduce((sum, t) => sum + t, 0) / dataThroughputHistoryRef.current.length
      setAverageDataThroughput(avgThroughput)
      
      // Update store
      dispatch(updateMetrics({ dataPointsPerSecond: throughput }))
      
      // Check for throughput alerts
      if (throughput > dataThroughputThreshold) {
        addAlert('data_throughput', `High data throughput: ${throughput.toFixed(0)} points/sec`, throughput, dataThroughputThreshold)
      }
      
      dataPointCountRef.current = 0
      lastDataCountTimeRef.current = now
    }
  }, [dispatch, dataThroughputThreshold, addAlert])

  // Monitor network performance
  const monitorNetwork = useCallback(async () => {
    if (!isMonitoring) return
    
    // Measure network latency
    await measureNetworkLatency()
    
    // Schedule next measurement
    setTimeout(monitorNetwork, networkMonitoringInterval)
  }, [isMonitoring, measureNetworkLatency, networkMonitoringInterval])

  // Garbage collection monitoring
  const startGCMonitoring = useCallback(() => {
    if ('PerformanceObserver' in window) {
      try {
        gcObserverRef.current = new PerformanceObserver((list) => {
          const entries = list.getEntries()
          entries.forEach((entry) => {
            if (entry.entryType === 'measure' && entry.name.includes('gc')) {
              console.log('GC detected:', entry.duration, 'ms')
              addAlert('memory', `Garbage collection: ${entry.duration.toFixed(2)}ms`, entry.duration, 50)
            }
          })
        })
        
        gcObserverRef.current.observe({ entryTypes: ['measure'] })
      } catch (error) {
        console.warn('GC monitoring not supported:', error)
      }
    }
  }, [addAlert])

  // Memory cleanup strategy
  const triggerMemoryCleanup = useCallback(() => {
    // Clear old performance data
    if (fpsHistoryRef.current.length > 100) {
      fpsHistoryRef.current = fpsHistoryRef.current.slice(-50)
    }
    
    if (renderTimeHistoryRef.current.length > 100) {
      renderTimeHistoryRef.current = renderTimeHistoryRef.current.slice(-50)
    }
    
    // Suggest garbage collection if available
    if ('gc' in window && typeof (window as any).gc === 'function') {
      try {
        (window as any).gc()
        console.log('Manual garbage collection triggered')
      } catch (error) {
        console.warn('Manual GC failed:', error)
      }
    }
  }, [])

  // Start monitoring
  const start = useCallback(() => {
    if (isMonitoring) return
    
    setIsMonitoring(true)
    
    // Start real metrics monitoring
    memoryIntervalRef.current = setInterval(updateRealMetrics, fpsMonitoringInterval)
    
    // Start network monitoring
    dataPointCountRef.current = 0
    lastDataCountTimeRef.current = performance.now()
    monitorNetwork()
    
    // Start GC monitoring
    startGCMonitoring()
    
    console.log('Performance monitoring started')
  }, [isMonitoring, updateRealMetrics, fpsMonitoringInterval, monitorNetwork, startGCMonitoring])

  // Stop monitoring
  const stop = useCallback(() => {
    if (!isMonitoring) return
    
    setIsMonitoring(false)
    
    // Clear intervals
    if (memoryIntervalRef.current) {
      clearInterval(memoryIntervalRef.current)
      memoryIntervalRef.current = null
    }
    
    if (networkIntervalRef.current) {
      clearInterval(networkIntervalRef.current)
      networkIntervalRef.current = null
    }
    
    // Stop GC monitoring
    if (gcObserverRef.current) {
      gcObserverRef.current.disconnect()
      gcObserverRef.current = null
    }
    
    console.log('Performance monitoring stopped')
  }, [isMonitoring])

  // Reset metrics
  const reset = useCallback(() => {
    setRealMetrics(null)
    setRenderTimes([])
    setDataThroughput(0)
    setAverageDataThroughput(0)
    setAlerts([])
    
    renderTimeHistoryRef.current = []
    dataThroughputHistoryRef.current = []
    dataPointCountRef.current = 0
    
    // Reset real performance monitor
    realPerformanceMonitor.reset()
    
    console.log('Performance metrics reset')
  }, [realPerformanceMonitor])

  // Auto-start if enabled
  useEffect(() => {
    if (enabled) {
      start()
    }
    
    return () => {
      stop()
    }
  }, [enabled, start, stop])

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (memoryIntervalRef.current) {
        clearInterval(memoryIntervalRef.current)
      }
      if (networkIntervalRef.current) {
        clearInterval(networkIntervalRef.current)
      }
    }
  }, [])

  // Expose data throughput tracking for external use
  useEffect(() => {
    // Make trackDataThroughput available globally for WebSocket integration
    if (typeof window !== 'undefined') {
      (window as any).__performanceMonitor_trackDataThroughput = trackDataThroughput
    }
    
    return () => {
      if (typeof window !== 'undefined') {
        delete (window as any).__performanceMonitor_trackDataThroughput
      }
    }
  }, [trackDataThroughput])

  return {
    // Monitoring control
    start,
    stop,
    reset,
    
    // Performance measurement
    measureRenderTime,
    measureAsyncRenderTime,
    measureNetworkLatency,
    
    // Memory management
    triggerMemoryCleanup,
    
    // Metrics (using real data when available, fallback to defaults)
    currentFps: realMetrics?.currentFps ?? 60,
    averageFps: realMetrics?.averageFps ?? 60,
    currentMemory: realMetrics?.currentMemory ?? 0,
    peakMemory: realMetrics?.peakMemory ?? 0,
    renderTimes,
    networkLatency: realMetrics?.networkLatency ?? 0,
    averageNetworkLatency: realMetrics?.rtt ?? 0,
    dataThroughput,
    averageDataThroughput,
    
    // Alerts
    alerts,
    clearAlerts,
    
    // Status
    isMonitoring,
    
    // Real metrics object for advanced usage
    realMetrics
  }
}