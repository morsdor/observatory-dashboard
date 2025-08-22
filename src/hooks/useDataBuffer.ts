import { useCallback, useRef, useState } from 'react'
import { DataPoint } from '@/types'

export interface DataBufferConfig {
  maxSize?: number
  enableMetrics?: boolean
}

export interface DataBufferMetrics {
  totalPointsReceived: number
  totalPointsDropped: number
  bufferUtilization: number
  averagePointsPerSecond: number
  lastUpdateTime: Date
}

export interface DataBufferHookReturn {
  data: DataPoint[]
  addData: (newPoints: DataPoint[]) => void
  clearBuffer: () => void
  getMetrics: () => DataBufferMetrics
  bufferSize: number
  isBufferFull: boolean
}

export function useDataBuffer(config: DataBufferConfig = {}): DataBufferHookReturn {
  const {
    maxSize = 100000,
    enableMetrics = true
  } = config

  const [data, setData] = useState<DataPoint[]>([])
  const [bufferSize, setBufferSize] = useState(0)
  
  // Metrics tracking
  const metricsRef = useRef({
    totalPointsReceived: 0,
    totalPointsDropped: 0,
    startTime: new Date(),
    lastUpdateTime: new Date()
  })

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

      // If new points fit within available space, just append them
      if (totalNewPoints <= availableSpace) {
        const updatedData = [...currentData, ...newPoints]
        setBufferSize(updatedData.length)
        return updatedData
      }

      // Need to implement sliding window
      let finalData: DataPoint[]
      let droppedCount = 0

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
        lastUpdateTime: new Date()
      }
    }
  }, [enableMetrics])

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
      lastUpdateTime: metricsRef.current.lastUpdateTime
    }
  }, [bufferSize, maxSize])

  const isBufferFull = bufferSize >= maxSize

  return {
    data,
    addData,
    clearBuffer,
    getMetrics,
    bufferSize,
    isBufferFull
  }
}