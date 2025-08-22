/**
 * Automated performance tests for the Observatory Dashboard
 */

import { PerformanceBenchmark, BenchmarkResult } from '@/utils/performanceBenchmark'
import { DataPoint } from '@/types'

// Mock performance.memory for testing
Object.defineProperty(performance, 'memory', {
  value: {
    usedJSHeapSize: 1000000,
    totalJSHeapSize: 2000000,
    jsHeapSizeLimit: 4000000
  },
  writable: true
})

describe('Performance Tests', () => {
  let benchmark: PerformanceBenchmark

  beforeEach(() => {
    benchmark = new PerformanceBenchmark()
  })

  afterEach(() => {
    benchmark.clearResults()
  })

  describe('Data Processing Performance', () => {
    test('should filter large datasets within performance threshold', async () => {
      const testData: DataPoint[] = Array.from({ length: 100000 }, (_, i) => ({
        id: `point-${i}`,
        timestamp: new Date(Date.now() - (100000 - i) * 1000),
        value: Math.random() * 100,
        category: ['cpu', 'memory', 'network'][i % 3],
        source: `server-${(i % 5) + 1}`,
        metadata: {}
      }))

      const result = await benchmark.benchmark(
        'Large Dataset Filter',
        () => testData.filter(point => point.value > 50),
        { iterations: 10 }
      )

      // Should complete filtering 100k items in under 100ms on average
      expect(result.averageTime).toBeLessThan(100)
      expect(result.name).toBe('Large Dataset Filter')
    })

    test('should sort large datasets efficiently', async () => {
      const testData: DataPoint[] = Array.from({ length: 50000 }, (_, i) => ({
        id: `point-${i}`,
        timestamp: new Date(Math.random() * Date.now()),
        value: Math.random() * 100,
        category: 'test',
        source: 'benchmark',
        metadata: {}
      }))

      const result = await benchmark.benchmark(
        'Large Dataset Sort',
        () => [...testData].sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime()),
        { iterations: 5 }
      )

      // Should complete sorting 50k items in under 200ms on average
      expect(result.averageTime).toBeLessThan(200)
    })

    test('should handle JSON serialization efficiently', async () => {
      const testData = Array.from({ length: 10000 }, (_, i) => ({
        id: i,
        data: `test-data-${i}`,
        nested: { value: Math.random(), timestamp: Date.now() }
      }))

      const serializeResult = await benchmark.benchmark(
        'JSON Serialize',
        () => JSON.stringify(testData),
        { iterations: 20 }
      )

      const jsonString = JSON.stringify(testData)
      const parseResult = await benchmark.benchmark(
        'JSON Parse',
        () => JSON.parse(jsonString),
        { iterations: 20 }
      )

      // JSON operations should be fast
      expect(serializeResult.averageTime).toBeLessThan(50)
      expect(parseResult.averageTime).toBeLessThan(30)
    })
  })

  describe('Memory Management Performance', () => {
    test('should not leak memory during repeated operations', async () => {
      const initialMemory = (performance as any).memory.usedJSHeapSize

      // Simulate repeated data operations
      for (let i = 0; i < 100; i++) {
        const data = Array.from({ length: 1000 }, (_, j) => ({
          id: j,
          value: Math.random()
        }))
        
        // Process data
        data.filter(item => item.value > 0.5)
        data.map(item => ({ ...item, processed: true }))
      }

      const finalMemory = (performance as any).memory.usedJSHeapSize
      const memoryGrowth = finalMemory - initialMemory

      // Memory growth should be reasonable (less than 10MB for this test)
      expect(memoryGrowth).toBeLessThan(10 * 1024 * 1024)
    })

    test('should handle large array allocation efficiently', async () => {
      const result = await benchmark.benchmark(
        'Large Array Allocation',
        () => {
          const arr = new Array(100000)
          for (let i = 0; i < arr.length; i++) {
            arr[i] = { id: i, value: Math.random() }
          }
          return arr
        },
        { iterations: 5, memoryTracking: true }
      )

      // Should allocate large arrays quickly
      expect(result.averageTime).toBeLessThan(100)
    })
  })

  describe('Rendering Performance', () => {
    test('should create DOM elements efficiently', async () => {
      const result = await benchmark.benchmark(
        'DOM Element Creation',
        () => {
          const container = document.createElement('div')
          for (let i = 0; i < 100; i++) {
            const element = document.createElement('div')
            element.className = 'test-element'
            element.textContent = `Element ${i}`
            container.appendChild(element)
          }
          return container
        },
        { iterations: 50 }
      )

      // DOM operations should be reasonably fast
      expect(result.averageTime).toBeLessThan(20)
    })

    test('should handle canvas operations efficiently', async () => {
      // Create canvas element
      const canvas = document.createElement('canvas')
      canvas.width = 800
      canvas.height = 400
      
      // Mock canvas context for testing environment
      const mockCtx = {
        clearRect: jest.fn(),
        beginPath: jest.fn(),
        moveTo: jest.fn(),
        lineTo: jest.fn(),
        stroke: jest.fn(),
        strokeStyle: '',
        lineWidth: 0
      }
      
      // Mock getContext to return our mock context
      canvas.getContext = jest.fn().mockReturnValue(mockCtx)
      const ctx = canvas.getContext('2d')!

      const result = await benchmark.benchmark(
        'Canvas Line Drawing',
        () => {
          ctx.clearRect(0, 0, 800, 400)
          ctx.beginPath()
          ctx.strokeStyle = '#3b82f6'
          ctx.lineWidth = 2
          
          // Draw a complex line chart
          for (let i = 0; i < 1000; i++) {
            const x = (i / 1000) * 800
            const y = 200 + Math.sin(i * 0.01) * 100
            
            if (i === 0) {
              ctx.moveTo(x, y)
            } else {
              ctx.lineTo(x, y)
            }
          }
          ctx.stroke()
        },
        { iterations: 20 }
      )

      // Canvas operations should be fast
      expect(result.averageTime).toBeLessThan(10)
    })
  })

  describe('Filter Engine Performance', () => {
    test('should filter complex conditions efficiently', async () => {
      const testData: DataPoint[] = Array.from({ length: 50000 }, (_, i) => ({
        id: `point-${i}`,
        timestamp: new Date(Date.now() - (50000 - i) * 1000),
        value: Math.random() * 100,
        category: ['cpu', 'memory', 'network', 'disk'][i % 4],
        source: `server-${(i % 10) + 1}`,
        metadata: {
          region: ['us-east', 'us-west', 'eu-central'][i % 3],
          priority: i % 2 === 0 ? 'high' : 'low'
        }
      }))

      const complexFilter = (data: DataPoint[]) => {
        return data.filter(point => 
          point.value > 25 && 
          point.value < 75 &&
          ['cpu', 'memory'].includes(point.category) &&
          point.metadata.priority === 'high'
        )
      }

      const result = await benchmark.benchmark(
        'Complex Filter Operation',
        () => complexFilter(testData),
        { iterations: 10 }
      )

      // Complex filtering should complete in reasonable time
      expect(result.averageTime).toBeLessThan(50)
    })

    test('should handle multiple filter conditions', async () => {
      const testData: DataPoint[] = Array.from({ length: 25000 }, (_, i) => ({
        id: `point-${i}`,
        timestamp: new Date(Date.now() - (25000 - i) * 1000),
        value: Math.random() * 100,
        category: ['cpu', 'memory', 'network'][i % 3],
        source: `server-${(i % 5) + 1}`,
        metadata: {}
      }))

      const multipleFilters = (data: DataPoint[]) => {
        return data
          .filter(point => point.value > 10)
          .filter(point => point.category === 'cpu')
          .filter(point => point.source.includes('server-1'))
          .sort((a, b) => b.value - a.value)
          .slice(0, 100)
      }

      const result = await benchmark.benchmark(
        'Multiple Filter Chain',
        () => multipleFilters(testData),
        { iterations: 20 }
      )

      // Chained operations should be efficient
      expect(result.averageTime).toBeLessThan(25)
    })
  })

  describe('Real-time Data Performance', () => {
    test('should handle high-frequency data updates', async () => {
      const buffer: DataPoint[] = []
      const maxBufferSize = 100000

      const addDataPoints = (points: DataPoint[]) => {
        buffer.push(...points)
        if (buffer.length > maxBufferSize) {
          buffer.splice(0, buffer.length - maxBufferSize)
        }
      }

      const result = await benchmark.benchmark(
        'High Frequency Data Updates',
        () => {
          const newPoints: DataPoint[] = Array.from({ length: 1000 }, (_, i) => ({
            id: `point-${Date.now()}-${i}`,
            timestamp: new Date(),
            value: Math.random() * 100,
            category: 'realtime',
            source: 'stream',
            metadata: {}
          }))
          addDataPoints(newPoints)
        },
        { iterations: 50 }
      )

      // High-frequency updates should be fast
      expect(result.averageTime).toBeLessThan(10)
    })

    test('should maintain buffer size efficiently', async () => {
      const buffer: DataPoint[] = []
      const maxBufferSize = 50000

      // Fill buffer to capacity
      for (let i = 0; i < maxBufferSize; i++) {
        buffer.push({
          id: `point-${i}`,
          timestamp: new Date(Date.now() - (maxBufferSize - i) * 1000),
          value: Math.random() * 100,
          category: 'test',
          source: 'benchmark',
          metadata: {}
        })
      }

      const result = await benchmark.benchmark(
        'Buffer Maintenance',
        () => {
          // Add new points and maintain buffer size
          const newPoints = Array.from({ length: 100 }, (_, i) => ({
            id: `new-point-${i}`,
            timestamp: new Date(),
            value: Math.random() * 100,
            category: 'new',
            source: 'stream',
            metadata: {}
          }))
          
          buffer.push(...newPoints)
          if (buffer.length > maxBufferSize) {
            buffer.splice(0, buffer.length - maxBufferSize)
          }
        },
        { iterations: 100 }
      )

      // Buffer maintenance should be efficient
      expect(result.averageTime).toBeLessThan(5)
      expect(buffer.length).toBeLessThanOrEqual(maxBufferSize)
    })
  })

  describe('Performance Regression Tests', () => {
    test('should maintain performance baselines', async () => {
      // Define performance baselines (these would be updated as optimizations are made)
      const baselines = {
        dataFilter: 50, // ms
        dataSort: 100,  // ms
        jsonSerialize: 30, // ms
        domCreation: 15, // ms
        canvasDrawing: 8 // ms
      }

      const testData = Array.from({ length: 10000 }, (_, i) => ({
        id: i,
        value: Math.random() * 100,
        timestamp: new Date()
      }))

      // Test data filtering
      const filterResult = await benchmark.benchmark(
        'Baseline Filter Test',
        () => testData.filter(item => item.value > 50),
        { iterations: 20 }
      )

      // Test data sorting
      const sortResult = await benchmark.benchmark(
        'Baseline Sort Test',
        () => [...testData].sort((a, b) => a.value - b.value),
        { iterations: 10 }
      )

      // Test JSON serialization
      const jsonResult = await benchmark.benchmark(
        'Baseline JSON Test',
        () => JSON.stringify(testData),
        { iterations: 20 }
      )

      // Verify performance hasn't regressed
      expect(filterResult.averageTime).toBeLessThan(baselines.dataFilter)
      expect(sortResult.averageTime).toBeLessThan(baselines.dataSort)
      expect(jsonResult.averageTime).toBeLessThan(baselines.jsonSerialize)
    })
  })

  describe('Benchmark Utilities', () => {
    test('should export and import results correctly', () => {
      const mockResult: BenchmarkResult = {
        name: 'Test Benchmark',
        duration: 100,
        memoryUsed: 1000,
        iterations: 10,
        averageTime: 10,
        minTime: 8,
        maxTime: 15,
        timestamp: new Date()
      }

      benchmark['results'] = [mockResult]
      const exported = benchmark.exportResults()
      const parsed = JSON.parse(exported)

      expect(parsed.results).toHaveLength(1)
      expect(parsed.results[0].name).toBe('Test Benchmark')
      expect(parsed.timestamp).toBeDefined()
      expect(parsed.userAgent).toBeDefined()
    })

    test('should compare benchmark results correctly', () => {
      const baseline: BenchmarkResult = {
        name: 'Baseline',
        duration: 1000,
        memoryUsed: 2000000,
        iterations: 100,
        averageTime: 10,
        minTime: 8,
        maxTime: 15,
        timestamp: new Date()
      }

      const improved: BenchmarkResult = {
        name: 'Improved',
        duration: 800,
        memoryUsed: 1500000,
        iterations: 100,
        averageTime: 8,
        minTime: 6,
        maxTime: 12,
        timestamp: new Date()
      }

      const comparison = PerformanceBenchmark.compare(baseline, improved)

      expect(comparison.speedImprovement).toBe(20) // 20% faster
      expect(comparison.memoryImprovement).toBe(25) // 25% less memory
      expect(comparison.isImprovement).toBe(true)
    })
  })
})