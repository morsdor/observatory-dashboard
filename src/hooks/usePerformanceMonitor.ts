import { useCallback, useEffect, useRef, useState } from 'react'
import { useAppDispatch } from '@/stores/dashboardStore'
import { updateMetrics } from '@/stores/dashboardStore'

export interface PerformanceMonitorConfig {
  enabled?: boolean
  fpsMonitoringInterval?: number
  memoryMonitoringInterval?: number
  renderTimeThreshold?: number
  memoryThreshold?: number
}

export interface PerformanceAlert {
  type: 'fps' | 'memory' | 'render_time'
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
  
  // Memory management
  triggerMemoryCleanup: () => void
  
  // Metrics
  currentFps: number
  averageFps: number
  currentMemory: number
  peakMemory: number
  renderTimes: number[]
  
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
    memoryThreshold = 100 // 100MB
  } = config

  const dispatch = useAppDispatch()
  
  // State
  const [isMonitoring, setIsMonitoring] = useState(false)
  const [currentFps, setCurrentFps] = useState(60)
  const [averageFps, setAverageFps] = useState(60)
  const [currentMemory, setCurrentMemory] = useState(0)
  const [peakMemory, setPeakMemory] = useState(0)
  const [renderTimes, setRenderTimes] = useState<number[]>([])
  const [alerts, setAlerts] = useState<PerformanceAlert[]>([])

  // Refs for monitoring
  const memoryIntervalRef = useRef<NodeJS.Timeout | null>(null)
  const frameCountRef = useRef(0)
  const lastFrameTimeRef = useRef(performance.now())
  const fpsHistoryRef = useRef<number[]>([])
  const renderTimeHistoryRef = useRef<number[]>([])
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

  // Measure FPS
  const measureFps = useCallback(() => {
    const now = performance.now()
    const deltaTime = now - lastFrameTimeRef.current
    
    if (deltaTime >= fpsMonitoringInterval) {
      const fps = Math.round((frameCountRef.current * 1000) / deltaTime)
      
      setCurrentFps(fps)
      fpsHistoryRef.current.push(fps)
      
      // Keep only last 60 measurements (1 minute at 1 second intervals)
      if (fpsHistoryRef.current.length > 60) {
        fpsHistoryRef.current = fpsHistoryRef.current.slice(-60)
      }
      
      // Calculate average FPS
      const avgFps = fpsHistoryRef.current.reduce((sum, f) => sum + f, 0) / fpsHistoryRef.current.length
      setAverageFps(Math.round(avgFps))
      
      // Update store
      dispatch(updateMetrics({ fps }))
      
      // Check for FPS alerts
      if (fps < 30) {
        addAlert('fps', `Low FPS detected: ${fps}`, fps, 30)
      }
      
      frameCountRef.current = 0
      lastFrameTimeRef.current = now
    }
    
    frameCountRef.current++
    
    if (isMonitoring) {
      requestAnimationFrame(measureFps)
    }
  }, [dispatch, fpsMonitoringInterval, isMonitoring, addAlert])

  // Measure memory usage
  const measureMemory = useCallback(() => {
    if ('memory' in performance) {
      const memInfo = (performance as any).memory
      const memoryMB = memInfo.usedJSHeapSize / (1024 * 1024)
      
      setCurrentMemory(memoryMB)
      setPeakMemory(prev => Math.max(prev, memoryMB))
      
      // Update store
      dispatch(updateMetrics({ memoryUsage: memoryMB }))
      
      // Check for memory alerts
      if (memoryMB > memoryThreshold) {
        addAlert('memory', `High memory usage: ${memoryMB.toFixed(1)}MB`, memoryMB, memoryThreshold)
      }
    }
  }, [dispatch, memoryThreshold, addAlert])

  // Measure render time
  const measureRenderTime = useCallback(<T>(fn: () => T): T => {
    const start = performance.now()
    const result = fn()
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
    
    return result
  }, [dispatch, renderTimeThreshold, addAlert])

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
    
    // Start FPS monitoring
    frameCountRef.current = 0
    lastFrameTimeRef.current = performance.now()
    requestAnimationFrame(measureFps)
    
    // Start memory monitoring
    memoryIntervalRef.current = setInterval(measureMemory, memoryMonitoringInterval)
    
    // Start GC monitoring
    startGCMonitoring()
    
    console.log('Performance monitoring started')
  }, [isMonitoring, measureFps, measureMemory, memoryMonitoringInterval, startGCMonitoring])

  // Stop monitoring
  const stop = useCallback(() => {
    if (!isMonitoring) return
    
    setIsMonitoring(false)
    
    // Clear intervals
    if (memoryIntervalRef.current) {
      clearInterval(memoryIntervalRef.current)
      memoryIntervalRef.current = null
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
    setCurrentFps(60)
    setAverageFps(60)
    setCurrentMemory(0)
    setPeakMemory(0)
    setRenderTimes([])
    setAlerts([])
    
    fpsHistoryRef.current = []
    renderTimeHistoryRef.current = []
    frameCountRef.current = 0
    
    console.log('Performance metrics reset')
  }, [])

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
    }
  }, [])

  return {
    // Monitoring control
    start,
    stop,
    reset,
    
    // Performance measurement
    measureRenderTime,
    measureAsyncRenderTime,
    
    // Memory management
    triggerMemoryCleanup,
    
    // Metrics
    currentFps,
    averageFps,
    currentMemory,
    peakMemory,
    renderTimes,
    
    // Alerts
    alerts,
    clearAlerts,
    
    // Status
    isMonitoring
  }
}