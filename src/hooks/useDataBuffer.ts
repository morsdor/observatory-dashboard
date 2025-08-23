import { useCallback, useRef, useState, useEffect } from 'react'
import { DataPoint } from '@/types'

export interface DataBufferConfig {
  maxSize?: number
  enableMetrics?: boolean
  memoryThreshold?: number // MB
  gcInterval?: number // ms
  optimizationInterval?: number // ms
}

export interface DataBufferMetrics {
  totalPointsReceived: number
  totalPointsDropped: number
  bufferUtilization: number
  averagePointsPerSecond: number
  lastUpdateTime: Date
  memoryUsage: number
  gcCount: number
  lastGcTime?: Date
}

export interface DataBufferHookReturn {
  data: DataPoint[]
  addData: (newPoints: DataPoint[]) => void
  clearBuffer: () => void
  getMetrics: () => DataBufferMetrics
  bufferSize: number
  isBufferFull: boolean
  forceGarbageCollection: () => void
  optimizeBuffer: () => void
}

export function useDataBuffer(config: DataBufferConfig = {}): DataBufferHookReturn {
  const {
    maxSize = 100000,
    enableMetrics = true,
    memoryThreshold = 50, // 50MB
    gcInterval = 30000, // 30 seconds
    optimizationInterval = 60000 // 60 seconds
  } = config

  const [data, setData] = useState<DataPoint[]>([])
  const [bufferSize, setBufferSize] = useState(0)
  
  // Metrics tracking
  const metricsRef = useRef({
    totalPointsReceived: 0,
    totalPointsDropped: 0,
    startTime: new Date(),
    lastUpdateTime: new Date(),
    memoryUsage: 0,
    gcCount: 0,
    lastGcTime: undefined as Date | undefined
  })

  const gcIntervalRef = useRef<NodeJS.Timeout | null>(null)
  const optimizationIntervalRef = useRef<NodeJS.Timeout | null>(null)
  const lastOptimizationRef = useRef<number>(0)

  // Calculate memory usage more accurately
  const calculateMemoryUsage = useCallback((dataPoints: DataPoint[]) => {
    if (dataPoints.length === 0) return 0
    
    // Sample first 100 points for estimation
    const sampleSize = Math.min(100, dataPoints.length)
    let totalSize = 0
    
    for (let i = 0; i < sampleSize; i++) {
      const point = dataPoints[i]
      
      // Base object overhead
      totalSize += 64
      
      // String properties
      totalSize += (point.id?.length || 0) * 2
      totalSize += (point.category?.length || 0) * 2
      totalSize += (point.source?.length || 0) * 2
      
      // Date object
      totalSize += 24
      
      // Number
      totalSize += 8
      
      // Metadata object
      if (point.metadata) {
        totalSize += JSON.stringify(point.metadata).length * 2
      }
    }
    
    // Extrapolate for all points
    const avgPointSize = totalSize / sampleSize
    return (avgPointSize * dataPoints.length) / (1024 * 1024) // Convert to MB
  }, [])

  // Force garbage collection
  const forceGarbageCollection = useCallback(() => {
    if ('gc' in window && typeof (window as any).gc === 'function') {
      try {
        (window as any).gc()
        metricsRef.current.gcCount++
        metricsRef.current.lastGcTime = new Date()
        console.log('Manual garbage collection triggered')
      } catch (error) {
        console.warn('Failed to trigger garbage collection:', error)
      }
    } else {
      // Fallback: create and release large objects to encourage GC
      const largeArray = new Array(1000000).fill(null)
      largeArray.length = 0
      metricsRef.current.gcCount++
      metricsRef.current.lastGcTime = new Date()
    }
  }, [])

  // Optimize buffer by removing duplicates and old data
  const optimizeBuffer = useCallback(() => {
    const now = performance.now()
    
    // Throttle optimization
    if (now - lastOptimizationRef.current < 5000) return
    
    setData(prevData => {
      if (prevData.length === 0) return prevData
      
      // Remove duplicates based on timestamp and value
      const uniqueData = prevData.filter((point, index, array) => {
        if (index === 0) return true
        const prev = array[index - 1]
        const pointTime = point.timestamp instanceof Date ? point.timestamp.getTime() : new Date(point.timestamp).getTime()
        const prevTime = prev.timestamp instanceof Date ? prev.timestamp.getTime() : new Date(prev.timestamp).getTime()
        return !(
          Math.abs(pointTime - prevTime) < 1000 &&
          Math.abs(point.value - prev.value) < 0.001 &&
          point.category === prev.category
        )
      })
      
      if (uniqueData.length < prevData.length) {
        const removed = prevData.length - uniqueData.length
        console.log(`Buffer optimization removed ${removed} duplicate/similar points`)
        metricsRef.current.totalPointsDropped += removed
      }
      
      lastOptimizationRef.current = now
      return uniqueData
    })
  }, [])

  const addData = useCallback((newPoints: DataPoint[]) => {
    if (!newPoints || newPoints.length === 0) {
      return
    }

    const now = new Date()
    metricsRef.current.lastUpdateTime = now

    setData(currentData => {
      const totalNewPoints = newPoints.length
      const currentSize = currentData.length
      const availableSpace = maxSize - currentSize
      
      if (enableMetrics) {
        metricsRef.current.totalPointsReceived += totalNewPoints
      }

      let finalData: DataPoint[]
      let droppedCount = 0

      // If new points fit within available space, just append them
      if (totalNewPoints <= availableSpace) {
        finalData = [...currentData, ...newPoints]
      } else {
        // Need to implement sliding window
        if (totalNewPoints >= maxSize) {
          // New points exceed buffer size, keep only the most recent points
          finalData = newPoints.slice(-maxSize)
          droppedCount = currentSize + (totalNewPoints - maxSize)
        } else {
          // Remove oldest points to make room for new ones
          const pointsToRemove = totalNewPoints - availableSpace
          finalData = [...currentData.slice(pointsToRemove), ...newPoints]
          droppedCount = pointsToRemove
        }

        if (enableMetrics) {
          metricsRef.current.totalPointsDropped += droppedCount
        }
      }

      // Update memory usage
      const memoryUsage = calculateMemoryUsage(finalData)
      metricsRef.current.memoryUsage = memoryUsage

      // Check memory threshold
      if (memoryUsage > memoryThreshold) {
        console.warn(`Memory usage (${memoryUsage.toFixed(1)}MB) exceeds threshold (${memoryThreshold}MB)`)
        
        // Trigger optimization and GC asynchronously
        setTimeout(() => {
          optimizeBuffer()
          forceGarbageCollection()
        }, 0)
      }

      setBufferSize(finalData.length)
      return finalData
    })
  }, [maxSize, enableMetrics])

  const clearBuffer = useCallback(() => {
    setData([])
    setBufferSize(0)
    
    if (enableMetrics) {
      metricsRef.current = {
        totalPointsReceived: 0,
        totalPointsDropped: 0,
        startTime: new Date(),
        lastUpdateTime: new Date(),
        memoryUsage: 0,
        gcCount: metricsRef.current.gcCount, // Preserve GC count
        lastGcTime: metricsRef.current.lastGcTime
      }
    }

    // Force GC after clearing
    setTimeout(() => {
      forceGarbageCollection()
    }, 100)
  }, [enableMetrics, forceGarbageCollection])

  const getMetrics = useCallback((): DataBufferMetrics => {
    const now = new Date()
    const elapsedSeconds = (now.getTime() - metricsRef.current.startTime.getTime()) / 1000
    const averagePointsPerSecond = elapsedSeconds > 0 
      ? metricsRef.current.totalPointsReceived / elapsedSeconds 
      : 0

    return {
      totalPointsReceived: metricsRef.current.totalPointsReceived,
      totalPointsDropped: metricsRef.current.totalPointsDropped,
      bufferUtilization: (bufferSize / maxSize) * 100,
      averagePointsPerSecond: Math.round(averagePointsPerSecond * 100) / 100,
      lastUpdateTime: metricsRef.current.lastUpdateTime,
      memoryUsage: metricsRef.current.memoryUsage,
      gcCount: metricsRef.current.gcCount,
      lastGcTime: metricsRef.current.lastGcTime
    }
  }, [bufferSize, maxSize])

  // Automatic garbage collection and optimization
  useEffect(() => {
    if (gcInterval > 0) {
      gcIntervalRef.current = setInterval(() => {
        const metrics = getMetrics()
        if (metrics.memoryUsage > memoryThreshold * 0.7) {
          forceGarbageCollection()
        }
      }, gcInterval)
    }

    if (optimizationInterval > 0) {
      optimizationIntervalRef.current = setInterval(() => {
        optimizeBuffer()
      }, optimizationInterval)
    }

    return () => {
      if (gcIntervalRef.current) {
        clearInterval(gcIntervalRef.current)
      }
      if (optimizationIntervalRef.current) {
        clearInterval(optimizationIntervalRef.current)
      }
    }
  }, [gcInterval, optimizationInterval, memoryThreshold, getMetrics, forceGarbageCollection, optimizeBuffer])

  const isBufferFull = bufferSize >= maxSize

  return {
    data,
    addData,
    clearBuffer,
    getMetrics,
    bufferSize,
    isBufferFull,
    forceGarbageCollection,
    optimizeBuffer
  }
}