/**
 * Performance Metric Accuracy Tests
 * 
 * These tests validate the accuracy of performance measurements
 * and ensure metrics are within acceptable tolerances.
 */

import { PerformanceBenchmark } from '../../utils/performanceBenchmark'

describe('Performance Metric Accuracy', () => {
  let benchmark: PerformanceBenchmark

  beforeEach(() => {
    benchmark = new PerformanceBenchmark()
    
    // Mock performance.now for consistent testing
    let mockTime = 0
    jest.spyOn(performance, 'now').mockImplementation(() => {
      return mockTime
    })
    
    // Helper to advance mock time
    ;(global as any).advanceMockTime = (ms: number) => {
      mockTime += ms
    }
  })

  afterEach(() => {
    jest.restoreAllMocks()
  })

  describe('Timing Accuracy', () => {
    it('should measure execution time accurately', async () => {
      const expectedDuration = 100 // 100ms
      
      const result = await benchmark.benchmark(
        'Timing Test',
        () => {
          ;(global as any).advanceMockTime(expectedDuration)
          return 'test'
        },
        { iterations: 1, warmupIterations: 0 }
      )
      
      expect(result.averageTime).toBe(expectedDuration)
      expect(result.minTime).toBe(expectedDuration)
      expect(result.maxTime).toBe(expectedDuration)
    })

    it('should handle variable execution times', async () => {
      const durations = [50, 75, 100, 125, 150]
      let callCount = 0
      
      const result = await benchmark.benchmark(
        'Variable Timing Test',
        () => {
          const duration = durations[callCount % durations.length]
          ;(global as any).advanceMockTime(duration)
          callCount++
          return 'test'
        },
        { iterations: 5, warmupIterations: 0 }
      )
      
      expect(result.averageTime).toBe(100) // Average of durations
      expect(result.minTime).toBe(50)
      expect(result.maxTime).toBe(150)
    })

    it('should measure sub-millisecond precision', async () => {
      const expectedDuration = 0.5 // 0.5ms
      
      const result = await benchmark.benchmark(
        'Sub-millisecond Test',
        () => {
          ;(global as any).advanceMockTime(expectedDuration)
          return 'test'
        },
        { iterations: 1, warmupIterations: 0 }
      )
      
      expect(result.averageTime).toBe(expectedDuration)
    })
  })

  describe('Memory Measurement Accuracy', () => {
    beforeEach(() => {
      // Mock performance.memory
      let mockMemoryUsage = 10 * 1024 * 1024 // 10MB
      
      Object.defineProperty(performance, 'memory', {
        value: {
          get usedJSHeapSize() {
            return mockMemoryUsage
          }
        },
        configurable: true
      })
      
      ;(global as any).setMockMemoryUsage = (bytes: number) => {
        mockMemoryUsage = bytes
      }
    })

    it('should measure memory usage accurately', async () => {
      const initialMemory = 10 * 1024 * 1024 // 10MB
      const finalMemory = 15 * 1024 * 1024 // 15MB
      const expectedIncrease = finalMemory - initialMemory
      
      ;(global as any).setMockMemoryUsage(initialMemory)
      
      const result = await benchmark.benchmark(
        'Memory Test',
        () => {
          ;(global as any).setMockMemoryUsage(finalMemory)
          return 'test'
        },
        { iterations: 1, warmupIterations: 0, memoryTracking: true }
      )
      
      expect(result.memoryUsed).toBe(expectedIncrease)
    })

    it('should handle memory decrease (garbage collection)', async () => {
      const initialMemory = 20 * 1024 * 1024 // 20MB
      const finalMemory = 15 * 1024 * 1024 // 15MB (after GC)
      const expectedDecrease = finalMemory - initialMemory // Negative value
      
      ;(global as any).setMockMemoryUsage(initialMemory)
      
      const result = await benchmark.benchmark(
        'Memory GC Test',
        () => {
          ;(global as any).setMockMemoryUsage(finalMemory)
          return 'test'
        },
        { iterations: 1, warmupIterations: 0, memoryTracking: true }
      )
      
      expect(result.memoryUsed).toBe(expectedDecrease)
    })
  })

  describe('Statistical Accuracy', () => {
    it('should calculate accurate averages', async () => {
      const durations = [10, 20, 30, 40, 50]
      const expectedAverage = durations.reduce((sum, d) => sum + d, 0) / durations.length
      let callCount = 0
      
      const result = await benchmark.benchmark(
        'Average Test',
        () => {
          const duration = durations[callCount % durations.length]
          ;(global as any).advanceMockTime(duration)
          callCount++
          return 'test'
        },
        { iterations: durations.length, warmupIterations: 0 }
      )
      
      expect(result.averageTime).toBe(expectedAverage)
    })

    it('should identify correct min and max values', async () => {
      const durations = [100, 50, 200, 75, 150]
      const expectedMin = Math.min(...durations)
      const expectedMax = Math.max(...durations)
      let callCount = 0
      
      const result = await benchmark.benchmark(
        'Min/Max Test',
        () => {
          const duration = durations[callCount % durations.length]
          ;(global as any).advanceMockTime(duration)
          callCount++
          return 'test'
        },
        { iterations: durations.length, warmupIterations: 0 }
      )
      
      expect(result.minTime).toBe(expectedMin)
      expect(result.maxTime).toBe(expectedMax)
    })

    it('should handle identical measurements', async () => {
      const constantDuration = 42
      
      const result = await benchmark.benchmark(
        'Constant Duration Test',
        () => {
          ;(global as any).advanceMockTime(constantDuration)
          return 'test'
        },
        { iterations: 10, warmupIterations: 0 }
      )
      
      expect(result.averageTime).toBe(constantDuration)
      expect(result.minTime).toBe(constantDuration)
      expect(result.maxTime).toBe(constantDuration)
    })
  })

  describe('Iteration Accuracy', () => {
    it('should run exact number of iterations', async () => {
      let callCount = 0
      const expectedIterations = 25
      
      const result = await benchmark.benchmark(
        'Iteration Count Test',
        () => {
          callCount++
          ;(global as any).advanceMockTime(10)
          return callCount
        },
        { iterations: expectedIterations, warmupIterations: 0 }
      )
      
      expect(result.iterations).toBe(expectedIterations)
      expect(callCount).toBe(expectedIterations)
    })

    it('should exclude warmup iterations from results', async () => {
      let totalCalls = 0
      let benchmarkCalls = 0
      const warmupIterations = 5
      const benchmarkIterations = 10
      
      const result = await benchmark.benchmark(
        'Warmup Test',
        () => {
          totalCalls++
          if (totalCalls > warmupIterations) {
            benchmarkCalls++
          }
          ;(global as any).advanceMockTime(10)
          return totalCalls
        },
        { iterations: benchmarkIterations, warmupIterations }
      )
      
      expect(totalCalls).toBe(warmupIterations + benchmarkIterations)
      expect(benchmarkCalls).toBe(benchmarkIterations)
      expect(result.iterations).toBe(benchmarkIterations)
    })
  })

  describe('Async Operation Accuracy', () => {
    it('should measure async operations accurately', async () => {
      const expectedDuration = 50
      
      const result = await benchmark.benchmark(
        'Async Test',
        async () => {
          ;(global as any).advanceMockTime(expectedDuration)
          return Promise.resolve('async result')
        },
        { iterations: 1, warmupIterations: 0 }
      )
      
      expect(result.averageTime).toBe(expectedDuration)
    })

    it('should handle mixed sync/async operations', async () => {
      let isAsync = false
      const syncDuration = 10
      const asyncDuration = 30
      
      const result = await benchmark.benchmark(
        'Mixed Operations Test',
        () => {
          isAsync = !isAsync
          if (isAsync) {
            ;(global as any).advanceMockTime(asyncDuration)
            return Promise.resolve('async')
          } else {
            ;(global as any).advanceMockTime(syncDuration)
            return 'sync'
          }
        },
        { iterations: 4, warmupIterations: 0 }
      )
      
      const expectedAverage = (syncDuration + asyncDuration) / 2
      expect(result.averageTime).toBe(expectedAverage)
    })
  })

  describe('Edge Cases', () => {
    it('should handle zero-duration operations', async () => {
      const result = await benchmark.benchmark(
        'Zero Duration Test',
        () => {
          // Don't advance time
          return 'instant'
        },
        { iterations: 5, warmupIterations: 0 }
      )
      
      expect(result.averageTime).toBe(0)
      expect(result.minTime).toBe(0)
      expect(result.maxTime).toBe(0)
    })

    it('should handle single iteration', async () => {
      const duration = 42
      
      const result = await benchmark.benchmark(
        'Single Iteration Test',
        () => {
          ;(global as any).advanceMockTime(duration)
          return 'single'
        },
        { iterations: 1, warmupIterations: 0 }
      )
      
      expect(result.iterations).toBe(1)
      expect(result.averageTime).toBe(duration)
      expect(result.minTime).toBe(duration)
      expect(result.maxTime).toBe(duration)
    })

    it('should handle operations that throw errors', async () => {
      let callCount = 0
      
      await expect(benchmark.benchmark(
        'Error Test',
        () => {
          callCount++
          if (callCount === 3) {
            throw new Error('Test error')
          }
          ;(global as any).advanceMockTime(10)
          return 'success'
        },
        { iterations: 5, warmupIterations: 0 }
      )).rejects.toThrow('Test error')
    })
  })

  describe('Precision and Tolerance', () => {
    it('should maintain precision for very small durations', async () => {
      const microDuration = 0.001 // 1 microsecond
      
      const result = await benchmark.benchmark(
        'Micro Duration Test',
        () => {
          ;(global as any).advanceMockTime(microDuration)
          return 'micro'
        },
        { iterations: 1000, warmupIterations: 0 }
      )
      
      expect(Math.abs(result.averageTime - microDuration)).toBeLessThan(0.0001)
    })

    it('should handle large durations without overflow', async () => {
      const largeDuration = 10000 // 10 seconds
      
      const result = await benchmark.benchmark(
        'Large Duration Test',
        () => {
          ;(global as any).advanceMockTime(largeDuration)
          return 'large'
        },
        { iterations: 1, warmupIterations: 0 }
      )
      
      expect(result.averageTime).toBe(largeDuration)
      expect(result.duration).toBe(largeDuration)
    })
  })

  describe('Comparison Accuracy', () => {
    it('should accurately compare benchmark results', () => {
      const baseline = {
        name: 'Baseline',
        duration: 1000,
        memoryUsed: 1024 * 1024, // 1MB
        iterations: 100,
        averageTime: 10,
        minTime: 8,
        maxTime: 15,
        timestamp: new Date()
      }
      
      const improved = {
        name: 'Improved',
        duration: 800,
        memoryUsed: 512 * 1024, // 0.5MB
        iterations: 100,
        averageTime: 8,
        minTime: 6,
        maxTime: 12,
        timestamp: new Date()
      }
      
      const comparison = PerformanceBenchmark.compare(baseline, improved)
      
      expect(comparison.speedImprovement).toBe(20) // 20% faster
      expect(comparison.memoryImprovement).toBe(50) // 50% less memory
      expect(comparison.isImprovement).toBe(true)
    })

    it('should detect performance regressions', () => {
      const baseline = {
        name: 'Baseline',
        duration: 1000,
        memoryUsed: 1024 * 1024,
        iterations: 100,
        averageTime: 10,
        minTime: 8,
        maxTime: 15,
        timestamp: new Date()
      }
      
      const regressed = {
        name: 'Regressed',
        duration: 1500,
        memoryUsed: 2048 * 1024, // 2MB
        iterations: 100,
        averageTime: 15,
        minTime: 12,
        maxTime: 20,
        timestamp: new Date()
      }
      
      const comparison = PerformanceBenchmark.compare(baseline, regressed)
      
      expect(comparison.speedImprovement).toBe(-50) // 50% slower
      expect(comparison.memoryImprovement).toBe(-100) // 100% more memory
      expect(comparison.isImprovement).toBe(false)
    })
  })
})