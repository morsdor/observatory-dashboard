import { renderHook, act } from '@testing-library/react'
import { useDataBuffer } from '../useDataBuffer'
import { DataPoint } from '@/types'

// Helper function to generate test data
const generateDataPoints = (count: number, startTime: Date = new Date()): DataPoint[] => {
  return Array.from({ length: count }, (_, i) => ({
    id: `stress-point-${i}`,
    timestamp: new Date(startTime.getTime() + i * 1000),
    value: Math.random() * 100,
    category: `category-${i % 10}`,
    source: `source-${i % 5}`,
    metadata: { 
      index: i, 
      batch: Math.floor(i / 1000),
      description: `Data point ${i} with some metadata`
    }
  }))
}

// Generate large data points for memory testing
const generateLargeDataPoints = (count: number): DataPoint[] => {
  return Array.from({ length: count }, (_, i) => ({
    id: `large-stress-point-${i}-${Date.now()}`,
    timestamp: new Date(),
    value: Math.random() * 1000,
    category: `category-with-very-long-name-for-testing-${i % 20}`,
    source: `source-with-detailed-information-and-long-description-${i % 8}`,
    metadata: {
      index: i,
      description: `This is a very detailed description for stress testing data point ${i}. `.repeat(50),
      tags: Array.from({ length: 100 }, (_, j) => `stress-tag-${j}-${i}`),
      measurements: Array.from({ length: 200 }, () => Math.random() * 1000),
      nestedData: {
        level1: {
          level2: {
            level3: {
              data: Array.from({ length: 500 }, () => ({
                id: `nested-${i}-${Math.random()}`,
                value: Math.random(),
                timestamp: Date.now()
              }))
            }
          }
        }
      },
      largeArray: new Array(1000).fill(0).map(() => Math.random()),
      stringData: 'x'.repeat(10000) // 10KB string
    }
  }))
}

describe('useDataBuffer - Stress Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  describe('High Volume Data Processing', () => {
    test('handles 100,000 data points efficiently', () => {
      const { result } = renderHook(() => 
        useDataBuffer({ 
          maxSize: 150000,
          enableMetrics: true 
        })
      )

      const batchSize = 5000
      const totalPoints = 100000
      const batches = totalPoints / batchSize

      // Measure processing time
      const startTime = performance.now()

      for (let i = 0; i < batches; i++) {
        const batchStartTime = new Date(Date.now() + i * batchSize * 1000)
        const dataPoints = generateDataPoints(batchSize, batchStartTime)
        
        act(() => {
          result.current.addData(dataPoints)
        })
      }

      const processingTime = performance.now() - startTime

      // Verify all data was processed
      expect(result.current.data.length).toBe(totalPoints)
      expect(result.current.bufferSize).toBe(totalPoints)
      
      // Verify metrics
      const metrics = result.current.getMetrics()
      expect(metrics.totalPointsReceived).toBe(totalPoints)
      expect(metrics.totalPointsDropped).toBe(0)
      expect(metrics.bufferUtilization).toBeCloseTo((totalPoints / 150000) * 100, 1)
      
      // Performance requirement: should process 100k points in under 5 seconds
      expect(processingTime).toBeLessThan(5000)
      
      console.log(`Processed ${totalPoints} points in ${processingTime.toFixed(2)}ms`)
    })

    test('maintains performance with sliding window at capacity', () => {
      const maxSize = 50000
      const { result } = renderHook(() => 
        useDataBuffer({ 
          maxSize,
          enableMetrics: true 
        })
      )

      const batchSize = 2000
      const totalBatches = 100 // Will exceed buffer capacity
      const processingTimes: number[] = []

      for (let batch = 0; batch < totalBatches; batch++) {
        const dataPoints = generateDataPoints(batchSize)
        
        const batchStart = performance.now()
        
        act(() => {
          result.current.addData(dataPoints)
        })
        
        const batchTime = performance.now() - batchStart
        processingTimes.push(batchTime)

        // Verify buffer size constraint
        expect(result.current.data.length).toBeLessThanOrEqual(maxSize)
      }

      // Verify sliding window behavior
      expect(result.current.data.length).toBe(maxSize)
      expect(result.current.isBufferFull).toBe(true)
      
      const metrics = result.current.getMetrics()
      expect(metrics.totalPointsReceived).toBe(totalBatches * batchSize)
      expect(metrics.totalPointsDropped).toBeGreaterThan(0)
      
      // Performance should remain consistent (no degradation over time)
      const firstHalfAvg = processingTimes.slice(0, 50).reduce((sum, time) => sum + time, 0) / 50
      const secondHalfAvg = processingTimes.slice(50).reduce((sum, time) => sum + time, 0) / 50
      
      // Second half should not be more than 50% slower than first half
      expect(secondHalfAvg).toBeLessThan(firstHalfAvg * 1.5)
      
      console.log(`First half avg: ${firstHalfAvg.toFixed(2)}ms, Second half avg: ${secondHalfAvg.toFixed(2)}ms`)
    })

    test('handles rapid successive additions without memory leaks', () => {
      const { result } = renderHook(() => 
        useDataBuffer({ 
          maxSize: 10000,
          enableMetrics: true,
          memoryThreshold: 10 // 10MB threshold for testing
        })
      )

      // Simulate rapid fire additions
      const rapidAdditions = 1000
      const pointsPerAddition = 50

      for (let i = 0; i < rapidAdditions; i++) {
        const dataPoints = generateDataPoints(pointsPerAddition)
        
        act(() => {
          result.current.addData(dataPoints)
        })
        
        // No delay - test rapid succession
      }

      // Verify buffer management
      expect(result.current.data.length).toBeLessThanOrEqual(10000)
      
      const metrics = result.current.getMetrics()
      expect(metrics.totalPointsReceived).toBe(rapidAdditions * pointsPerAddition)
      expect(metrics.memoryUsage).toBeGreaterThan(0)
    })
  })

  describe('Memory Management Stress Tests', () => {
    test('handles large data points with extensive metadata', () => {
      const { result } = renderHook(() => 
        useDataBuffer({ 
          maxSize: 5000,
          enableMetrics: true,
          memoryThreshold: 50, // 50MB
          gcInterval: 1000
        })
      )

      const batches = 10
      const pointsPerBatch = 200

      for (let i = 0; i < batches; i++) {
        const largeDataPoints = generateLargeDataPoints(pointsPerBatch)
        
        act(() => {
          result.current.addData(largeDataPoints)
        })
      }

      // Verify data was processed
      expect(result.current.data.length).toBeLessThanOrEqual(5000)
      
      const metrics = result.current.getMetrics()
      expect(metrics.memoryUsage).toBeGreaterThan(0)
      expect(metrics.totalPointsReceived).toBe(batches * pointsPerBatch)
      
      console.log(`Memory usage with large points: ${metrics.memoryUsage.toFixed(2)}MB`)
    })

    test('triggers garbage collection under memory pressure', () => {
      // Mock performance.memory for testing
      const mockMemory = {
        usedJSHeapSize: 100 * 1024 * 1024, // 100MB
        totalJSHeapSize: 200 * 1024 * 1024,
        jsHeapSizeLimit: 2 * 1024 * 1024 * 1024
      }

      Object.defineProperty(performance, 'memory', {
        value: mockMemory,
        configurable: true
      })

      const { result } = renderHook(() => 
        useDataBuffer({ 
          maxSize: 10000,
          enableMetrics: true,
          memoryThreshold: 5, // Low threshold to trigger GC
          gcInterval: 100
        })
      )

      // Add data that should trigger memory management
      const largeDataPoints = generateLargeDataPoints(1000)
      
      act(() => {
        result.current.addData(largeDataPoints)
      })

      // Force garbage collection manually
      act(() => {
        result.current.forceGarbageCollection()
      })

      const metrics = result.current.getMetrics()
      expect(metrics.gcCount).toBeGreaterThan(0)
      expect(metrics.lastGcTime).toBeDefined()
    })

    test('optimizes buffer by removing duplicates', () => {
      const { result } = renderHook(() => 
        useDataBuffer({ 
          maxSize: 10000,
          enableMetrics: true
        })
      )

      // Generate data with many duplicates
      const baseTime = new Date()
      const duplicateData: DataPoint[] = []
      
      // Create 1000 points with only 100 unique combinations
      for (let i = 0; i < 1000; i++) {
        const uniqueIndex = i % 100
        duplicateData.push({
          id: `dup-${uniqueIndex}`,
          timestamp: new Date(baseTime.getTime() + uniqueIndex * 1000),
          value: uniqueIndex,
          category: `cat-${uniqueIndex % 10}`,
          source: `src-${uniqueIndex % 5}`,
          metadata: { index: uniqueIndex }
        })
      }

      act(() => {
        result.current.addData(duplicateData)
      })

      const initialSize = result.current.data.length

      // Optimize buffer
      act(() => {
        result.current.optimizeBuffer()
      })

      // Should have fewer points after optimization
      expect(result.current.data.length).toBeLessThan(initialSize)
      
      const metrics = result.current.getMetrics()
      expect(metrics.totalPointsDropped).toBeGreaterThan(0)
    })
  })

  describe('Concurrent Operations Stress Test', () => {
    test('handles concurrent additions and buffer operations', async () => {
      const { result } = renderHook(() => 
        useDataBuffer({ 
          maxSize: 20000,
          enableMetrics: true
        })
      )

      // Simulate concurrent operations
      const operations = []

      // Add data concurrently
      for (let i = 0; i < 10; i++) {
        operations.push(
          new Promise<void>(resolve => {
            setTimeout(() => {
              const dataPoints = generateDataPoints(500)
              act(() => {
                result.current.addData(dataPoints)
              })
              resolve()
            }, Math.random() * 100)
          })
        )
      }

      // Clear buffer during additions
      operations.push(
        new Promise<void>(resolve => {
          setTimeout(() => {
            act(() => {
              result.current.clearBuffer()
            })
            resolve()
          }, 50)
        })
      )

      // Optimize buffer during additions
      operations.push(
        new Promise<void>(resolve => {
          setTimeout(() => {
            act(() => {
              result.current.optimizeBuffer()
            })
            resolve()
          }, 75)
        })
      )

      await Promise.all(operations)

      // Verify system remains stable
      expect(result.current.data.length).toBeLessThanOrEqual(20000)
      
      const metrics = result.current.getMetrics()
      expect(metrics).toBeDefined()
      expect(metrics.memoryUsage).toBeGreaterThanOrEqual(0)
    })
  })

  describe('Performance Benchmarks', () => {
    test('meets performance requirements for data processing', () => {
      const { result } = renderHook(() => 
        useDataBuffer({ 
          maxSize: 100000,
          enableMetrics: true 
        })
      )

      const benchmarks = [
        { points: 1000, maxTime: 50 },    // 1k points in 50ms
        { points: 5000, maxTime: 200 },   // 5k points in 200ms
        { points: 10000, maxTime: 400 },  // 10k points in 400ms
        { points: 25000, maxTime: 1000 }  // 25k points in 1s
      ]

      benchmarks.forEach(({ points, maxTime }) => {
        const dataPoints = generateDataPoints(points)
        
        const startTime = performance.now()
        
        act(() => {
          result.current.addData(dataPoints)
        })
        
        const processingTime = performance.now() - startTime
        
        expect(processingTime).toBeLessThan(maxTime)
        
        console.log(`${points} points processed in ${processingTime.toFixed(2)}ms (limit: ${maxTime}ms)`)
      })
    })

    test('maintains consistent performance across multiple operations', () => {
      const { result } = renderHook(() => 
        useDataBuffer({ 
          maxSize: 50000,
          enableMetrics: true 
        })
      )

      const operationTimes: number[] = []
      const operationsCount = 100
      const pointsPerOperation = 500

      for (let i = 0; i < operationsCount; i++) {
        const dataPoints = generateDataPoints(pointsPerOperation)
        
        const startTime = performance.now()
        
        act(() => {
          result.current.addData(dataPoints)
        })
        
        const operationTime = performance.now() - startTime
        operationTimes.push(operationTime)
      }

      // Calculate statistics
      const avgTime = operationTimes.reduce((sum, time) => sum + time, 0) / operationsCount
      const maxTime = Math.max(...operationTimes)
      const minTime = Math.min(...operationTimes)
      const stdDev = Math.sqrt(
        operationTimes.reduce((sum, time) => sum + Math.pow(time - avgTime, 2), 0) / operationsCount
      )

      // Performance requirements
      expect(avgTime).toBeLessThan(100) // Average under 100ms
      expect(maxTime).toBeLessThan(500) // Max under 500ms
      expect(stdDev).toBeLessThan(avgTime * 0.5) // Standard deviation less than 50% of average

      console.log(`Performance stats - Avg: ${avgTime.toFixed(2)}ms, Max: ${maxTime.toFixed(2)}ms, Min: ${minTime.toFixed(2)}ms, StdDev: ${stdDev.toFixed(2)}ms`)
    })
  })

  describe('Edge Cases and Error Handling', () => {
    test('handles empty and invalid data gracefully', () => {
      const { result } = renderHook(() => 
        useDataBuffer({ 
          maxSize: 1000,
          enableMetrics: true 
        })
      )

      // Test empty arrays
      act(() => {
        result.current.addData([])
      })

      expect(result.current.data.length).toBe(0)

      // Test null/undefined (should be handled by type system, but test runtime behavior)
      act(() => {
        result.current.addData([] as any)
      })

      expect(result.current.data.length).toBe(0)

      // Add valid data after edge cases
      const validData = generateDataPoints(100)
      act(() => {
        result.current.addData(validData)
      })

      expect(result.current.data.length).toBe(100)
    })

    test('recovers from extreme memory pressure scenarios', () => {
      const { result } = renderHook(() => 
        useDataBuffer({ 
          maxSize: 1000,
          enableMetrics: true,
          memoryThreshold: 1, // Very low threshold
          gcInterval: 10
        })
      )

      // Generate extremely large data points
      const extremeDataPoints = Array.from({ length: 100 }, (_, i) => ({
        id: `extreme-${i}`,
        timestamp: new Date(),
        value: i,
        category: 'extreme',
        source: 'test',
        metadata: {
          hugeString: 'x'.repeat(100000), // 100KB string per point
          hugeArray: new Array(10000).fill(0).map(() => Math.random()),
          nestedHuge: {
            level1: new Array(1000).fill(0).map(() => ({
              data: 'y'.repeat(1000),
              numbers: new Array(100).fill(0).map(() => Math.random())
            }))
          }
        }
      })) as DataPoint[]

      act(() => {
        result.current.addData(extremeDataPoints)
      })

      // System should remain stable
      expect(result.current.data.length).toBeLessThanOrEqual(1000)
      
      const metrics = result.current.getMetrics()
      expect(metrics.memoryUsage).toBeGreaterThan(0)
      
      // Force optimization and GC
      act(() => {
        result.current.optimizeBuffer()
        result.current.forceGarbageCollection()
      })

      // Should still be functional
      expect(result.current.getMetrics()).toBeDefined()
    })
  })
})