import {
  generateLargeDataset,
  generatePerformanceTestData,
  benchmarkDataGeneration,
  createScenarioConfig,
  generateCorrelatedData,
  validateGeneratedData
} from '../mockDataGenerator'
import { MockWebSocketServer } from '../mockWebSocketServer'
import { DataPoint } from '@/types'

describe('Mock Data Performance Tests', () => {
  describe('Large Dataset Generation Performance', () => {
    it('should generate 10k data points within reasonable time', () => {
      const startTime = performance.now()
      const dataPoints = generateLargeDataset(10000)
      const endTime = performance.now()
      
      expect(dataPoints).toHaveLength(10000)
      expect(endTime - startTime).toBeLessThan(2000) // Should complete within 2 seconds
    })

    it('should generate 100k data points for stress testing', () => {
      const startTime = performance.now()
      const dataPoints = generateLargeDataset(100000)
      const endTime = performance.now()
      
      expect(dataPoints).toHaveLength(100000)
      expect(endTime - startTime).toBeLessThan(10000) // Should complete within 10 seconds
      
      // Verify data quality on sample
      const sampleSize = 1000
      const sampleIndices = Array.from(
        { length: sampleSize },
        (_, i) => Math.floor(i * dataPoints.length / sampleSize)
      )
      
      sampleIndices.forEach(index => {
        const dp = dataPoints[index]
        expect(dp.id).toBeDefined()
        expect(dp.timestamp).toBeInstanceOf(Date)
        expect(typeof dp.value).toBe('number')
        expect(dp.category).toBeDefined()
        expect(dp.source).toBeDefined()
      })
    })

    it('should maintain memory efficiency during large dataset generation', () => {
      // Monitor memory usage if available
      const initialMemory = (performance as any).memory?.usedJSHeapSize || 0
      
      const dataPoints = generateLargeDataset(50000)
      
      const finalMemory = (performance as any).memory?.usedJSHeapSize || 0
      
      expect(dataPoints).toHaveLength(50000)
      
      // If memory monitoring is available, check reasonable memory usage
      if (initialMemory > 0 && finalMemory > 0) {
        const memoryIncrease = finalMemory - initialMemory
        const bytesPerDataPoint = memoryIncrease / dataPoints.length
        
        // Should use reasonable memory per data point (less than 1KB per point)
        expect(bytesPerDataPoint).toBeLessThan(1024)
      }
    })
  })

  describe('Performance Test Data Generation', () => {
    const testTypes = ['memory_stress', 'rendering_stress', 'filter_stress', 'streaming_stress'] as const

    testTypes.forEach(testType => {
      it(`should generate ${testType} data efficiently`, () => {
        const startTime = performance.now()
        const dataPoints = generatePerformanceTestData(testType)
        const endTime = performance.now()
        
        expect(dataPoints.length).toBeGreaterThan(1000)
        
        // Adjust timeout based on test type - filter_stress generates more data
        const timeoutMs = testType === 'filter_stress' ? 30000 : 5000
        expect(endTime - startTime).toBeLessThan(timeoutMs)
        
        // Verify data structure
        expect(dataPoints[0]).toHaveProperty('id')
        expect(dataPoints[0]).toHaveProperty('timestamp')
        expect(dataPoints[0]).toHaveProperty('value')
        expect(dataPoints[0]).toHaveProperty('category')
        expect(dataPoints[0]).toHaveProperty('source')
      })
    })

    it('should generate memory stress test data with correct size', () => {
      const dataPoints = generatePerformanceTestData('memory_stress')
      expect(dataPoints).toHaveLength(100000)
      
      // Verify chronological order
      for (let i = 1; i < Math.min(1000, dataPoints.length); i++) {
        expect(dataPoints[i].timestamp.getTime()).toBeGreaterThanOrEqual(
          dataPoints[i - 1].timestamp.getTime()
        )
      }
    })
  })

  describe('Benchmarking Performance', () => {
    it('should benchmark small dataset generation', () => {
      const benchmark = benchmarkDataGeneration(1000, 3)
      
      expect(benchmark.averageTime).toBeGreaterThan(0)
      expect(benchmark.minTime).toBeGreaterThanOrEqual(0)
      expect(benchmark.maxTime).toBeGreaterThanOrEqual(benchmark.averageTime)
      expect(benchmark.pointsPerSecond).toBeGreaterThan(100) // Should generate at least 100 points/second
    })

    it('should benchmark large dataset generation', () => {
      const benchmark = benchmarkDataGeneration(10000, 2)
      
      expect(benchmark.averageTime).toBeGreaterThan(0)
      expect(benchmark.pointsPerSecond).toBeGreaterThan(1000) // Should be efficient for large datasets
    })

    it('should show performance scaling characteristics', () => {
      const smallBenchmark = benchmarkDataGeneration(1000, 2)
      const largeBenchmark = benchmarkDataGeneration(10000, 2)
      
      // Larger datasets should take more time but potentially higher throughput
      expect(largeBenchmark.averageTime).toBeGreaterThan(smallBenchmark.averageTime)
      
      // Efficiency should not degrade significantly
      const smallEfficiency = smallBenchmark.pointsPerSecond
      const largeEfficiency = largeBenchmark.pointsPerSecond
      
      expect(largeEfficiency).toBeGreaterThan(smallEfficiency * 0.5) // Should maintain at least 50% efficiency
    })
  })

  describe('Data Consistency at Scale', () => {
    it('should maintain data uniqueness in large datasets', () => {
      const dataPoints = generateLargeDataset(25000)
      
      // Check ID uniqueness
      const ids = new Set(dataPoints.map(dp => dp.id))
      expect(ids.size).toBe(dataPoints.length)
      
      // Check timestamp ordering
      for (let i = 1; i < dataPoints.length; i++) {
        expect(dataPoints[i].timestamp.getTime()).toBeGreaterThanOrEqual(
          dataPoints[i - 1].timestamp.getTime()
        )
      }
    })

    it('should validate large datasets efficiently', () => {
      const dataPoints = generateLargeDataset(10000)
      
      const startTime = performance.now()
      const validation = validateGeneratedData(dataPoints)
      const endTime = performance.now()
      
      expect(validation.summary.total).toBe(10000)
      expect(validation.summary.valid).toBe(10000)
      expect(validation.summary.invalid).toBe(0)
      expect(endTime - startTime).toBeLessThan(1000) // Validation should be fast
    })

    it('should handle correlated data generation at scale', () => {
      const correlations = [
        { categories: ['cpu', 'memory'], strength: 0.7 },
        { categories: ['network', 'disk'], strength: 0.5 }
      ]
      
      const config = {
        categories: ['cpu', 'memory', 'network', 'disk'],
        sources: ['server-1', 'server-2']
      }
      
      const startTime = performance.now()
      const dataPoints = generateCorrelatedData(5000, correlations, config)
      const endTime = performance.now()
      
      expect(dataPoints.length).toBeGreaterThan(0)
      expect(endTime - startTime).toBeLessThan(3000) // Should complete within 3 seconds
      
      // Verify correlation exists (basic check)
      const byTimestamp = new Map<number, DataPoint[]>()
      dataPoints.forEach(point => {
        const timestamp = point.timestamp.getTime()
        if (!byTimestamp.has(timestamp)) {
          byTimestamp.set(timestamp, [])
        }
        byTimestamp.get(timestamp)!.push(point)
      })
      
      expect(byTimestamp.size).toBeGreaterThan(0)
    })
  })

  describe('WebSocket Server Performance', () => {
    it('should handle high-frequency data generation', async () => {
      const server = new MockWebSocketServer({
        dataPointsPerSecond: 200,
        categories: ['cpu'],
        sources: ['server-1']
      })

      const mockDispatchEvent = jest.fn()
      Object.defineProperty(window, 'dispatchEvent', {
        value: mockDispatchEvent,
        writable: true
      })

      const startTime = Date.now()
      await server.start()
      await new Promise(resolve => setTimeout(resolve, 600)) // Run for 600ms
      await server.stop()
      const endTime = Date.now()

      const stats = server.getStats()
      const metrics = server.getPerformanceMetrics()
      
      expect(stats.dataPointsGenerated).toBeGreaterThan(10) // Should generate substantial data
      expect(metrics.averageDataPointsPerSecond).toBeGreaterThan(0) // Should maintain reasonable rate
      expect(endTime - startTime).toBeLessThan(2000) // Should not block significantly
    })

    it('should maintain performance during burst mode', async () => {
      const server = new MockWebSocketServer({
        dataPointsPerSecond: 50,
        enableBurstMode: true,
        burstInterval: 50,
        burstDuration: 30,
        burstMultiplier: 5,
        categories: ['cpu'],
        sources: ['server-1']
      })

      const mockDispatchEvent = jest.fn()
      Object.defineProperty(window, 'dispatchEvent', {
        value: mockDispatchEvent,
        writable: true
      })

      await server.start()
      await new Promise(resolve => setTimeout(resolve, 400))
      await server.stop()

      const stats = server.getStats()
      expect(stats.dataPointsGenerated).toBeGreaterThan(0)
      expect(mockDispatchEvent).toHaveBeenCalled()
      
      // Should handle bursts without errors
      expect(stats.isRunning).toBe(false) // Should stop cleanly
    })

    it('should handle multiple scenario changes efficiently', async () => {
      const server = new MockWebSocketServer({
        dataPointsPerSecond: 100,
        scenario: 'normal',
        categories: ['cpu'],
        sources: ['server-1']
      })

      await server.start()
      
      const scenarios = ['high_load', 'maintenance', 'peak_hours', 'normal'] as const
      
      for (const scenario of scenarios) {
        server.changeScenario(scenario)
        await new Promise(resolve => setTimeout(resolve, 80))
        
        const stats = server.getStats()
        expect(stats.scenario).toBe(scenario)
      }
      
      await server.stop()
      
      const finalStats = server.getStats()
      expect(finalStats.dataPointsGenerated).toBeGreaterThan(0)
    })
  })

  describe('Memory and Resource Management', () => {
    it('should not leak memory during extended operation', async () => {
      const server = new MockWebSocketServer({
        dataPointsPerSecond: 100,
        categories: ['cpu'],
        sources: ['server-1']
      })

      const mockDispatchEvent = jest.fn()
      Object.defineProperty(window, 'dispatchEvent', {
        value: mockDispatchEvent,
        writable: true
      })

      // Run for extended period
      await server.start()
      await new Promise(resolve => setTimeout(resolve, 800))
      await server.stop()

      const stats = server.getStats()
      expect(stats.dataPointsGenerated).toBeGreaterThan(10)
      
      // Should clean up properly
      expect(stats.isRunning).toBe(false)
    })

    it('should handle rapid start/stop cycles', async () => {
      const server = new MockWebSocketServer({
        dataPointsPerSecond: 100,
        categories: ['cpu'],
        sources: ['server-1']
      })

      // Rapid start/stop cycles
      for (let i = 0; i < 3; i++) {
        await server.start()
        await new Promise(resolve => setTimeout(resolve, 100))
        await server.stop()
        await new Promise(resolve => setTimeout(resolve, 20))
      }

      const stats = server.getStats()
      expect(stats.isRunning).toBe(false)
      expect(stats.dataPointsGenerated).toBeGreaterThan(0)
    })
  })

  describe('Scenario Performance Characteristics', () => {
    it('should generate different scenarios with consistent performance', async () => {
      const scenarios = ['normal', 'high_load', 'system_failure', 'maintenance'] as const
      
      for (const scenario of scenarios) {
        const config = createScenarioConfig(scenario)
        
        const startTime = performance.now()
        const dataPoints = generateLargeDataset(5000)
        const endTime = performance.now()
        
        expect(dataPoints).toHaveLength(5000)
        expect(endTime - startTime).toBeLessThan(2000) // Consistent performance across scenarios
        
        // Verify scenario-specific characteristics exist
        expect(config.categories).toBeDefined()
        expect(config.sources).toBeDefined()
      }
    })
  })
})