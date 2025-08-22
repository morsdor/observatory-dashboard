import {
  generateBusinessMetricsData,
  generateIoTSensorData,
  generateFinancialData,
  generateNetworkMonitoringData,
  generateStreamingTestData,
  generateScenarioTestData,
  clearPatternState,
  getPatternState,
  generateHistoricalData
} from '../mockDataGenerator'
import { MockWebSocketServer } from '../mockWebSocketServer'
import type { DataPoint, DataGenerationConfig } from '../mockDataGenerator'

describe('Enhanced Mock Data Generation', () => {
  beforeEach(() => {
    clearPatternState()
  })

  describe('Business Metrics Data Generation', () => {
    it('should generate realistic business metrics', () => {
      const dataPoints = generateBusinessMetricsData(2 * 60 * 60 * 1000) // 2 hours
      
      expect(dataPoints.length).toBeGreaterThan(0)
      
      const categories = new Set(dataPoints.map(dp => dp.category))
      expect(categories.has('revenue')).toBe(true)
      expect(categories.has('users')).toBe(true)
      expect(categories.has('orders')).toBe(true)
      expect(categories.has('conversion_rate')).toBe(true)
      expect(categories.has('bounce_rate')).toBe(true)
      
      const sources = new Set(dataPoints.map(dp => dp.source))
      expect(sources.has('web')).toBe(true)
      expect(sources.has('mobile')).toBe(true)
      
      // Verify data quality
      dataPoints.forEach(dp => {
        expect(dp.value).toBeGreaterThanOrEqual(0)
        expect(dp.timestamp).toBeInstanceOf(Date)
        expect(dp.metadata).toBeDefined()
      })
    })

    it('should apply seasonality patterns to business data', () => {
      const dataPoints = generateBusinessMetricsData(24 * 60 * 60 * 1000) // 24 hours
      
      // Group by hour to check for daily patterns
      const hourlyData = new Map<number, number[]>()
      dataPoints.forEach(dp => {
        const hour = dp.timestamp.getHours()
        if (!hourlyData.has(hour)) {
          hourlyData.set(hour, [])
        }
        hourlyData.get(hour)!.push(dp.value)
      })
      
      // Should have data for multiple hours
      expect(hourlyData.size).toBeGreaterThan(10)
    })
  })

  describe('IoT Sensor Data Generation', () => {
    it('should generate realistic IoT sensor data', () => {
      const dataPoints = generateIoTSensorData(5, 30 * 60 * 1000) // 5 sensors, 30 minutes
      
      expect(dataPoints.length).toBeGreaterThan(0)
      
      const categories = new Set(dataPoints.map(dp => dp.category))
      expect(categories.has('temperature')).toBe(true)
      expect(categories.has('humidity')).toBe(true)
      expect(categories.has('pressure')).toBe(true)
      
      const sources = new Set(dataPoints.map(dp => dp.source))
      expect(sources.has('sensor-1')).toBe(true)
      expect(sources.has('sensor-5')).toBe(true)
      
      // Temperature values should be realistic
      const tempData = dataPoints.filter(dp => dp.category === 'temperature')
      tempData.forEach(dp => {
        expect(dp.value).toBeGreaterThan(0)
        expect(dp.value).toBeLessThan(100) // Reasonable temperature range
      })
    })

    it('should generate high-frequency IoT data', () => {
      const dataPoints = generateIoTSensorData(2, 60 * 1000) // 2 sensors, 1 minute
      
      // Should generate approximately 1 point per second per sensor per category
      expect(dataPoints.length).toBeGreaterThan(100)
      
      // Should be chronologically ordered
      for (let i = 1; i < Math.min(100, dataPoints.length); i++) {
        expect(dataPoints[i].timestamp.getTime()).toBeGreaterThanOrEqual(
          dataPoints[i - 1].timestamp.getTime()
        )
      }
    })
  })

  describe('Financial Data Generation', () => {
    it('should generate realistic financial market data', () => {
      const symbols = ['AAPL', 'GOOGL', 'MSFT']
      const dataPoints = generateFinancialData(symbols, 24 * 60 * 60 * 1000) // 1 day
      
      expect(dataPoints.length).toBeGreaterThan(0)
      
      const categories = new Set(dataPoints.map(dp => dp.category))
      expect(categories.has('price')).toBe(true)
      expect(categories.has('volume')).toBe(true)
      expect(categories.has('volatility')).toBe(true)
      
      const sources = new Set(dataPoints.map(dp => dp.source))
      symbols.forEach(symbol => {
        expect(sources.has(symbol)).toBe(true)
      })
      
      // Price data should show realistic patterns
      const priceData = dataPoints.filter(dp => dp.category === 'price')
      expect(priceData.length).toBeGreaterThan(0)
      
      priceData.forEach(dp => {
        expect(dp.value).toBeGreaterThan(0)
        expect(dp.value).toBeLessThan(1000) // Reasonable price range
      })
    })

    it('should apply volatility to financial data', () => {
      const dataPoints = generateFinancialData(['TEST'], 60 * 60 * 1000) // 1 hour
      
      const priceData = dataPoints.filter(dp => dp.category === 'price')
      const values = priceData.map(dp => dp.value)
      
      if (values.length > 1) {
        const variance = calculateVariance(values)
        expect(variance).toBeGreaterThan(0) // Should have some volatility
      }
    })
  })

  describe('Network Monitoring Data Generation', () => {
    it('should generate realistic network monitoring data', () => {
      const dataPoints = generateNetworkMonitoringData(3, 60 * 60 * 1000) // 3 nodes, 1 hour
      
      expect(dataPoints.length).toBeGreaterThan(0)
      
      const categories = new Set(dataPoints.map(dp => dp.category))
      expect(categories.has('latency')).toBe(true)
      expect(categories.has('throughput')).toBe(true)
      expect(categories.has('packet_loss')).toBe(true)
      expect(categories.has('cpu_usage')).toBe(true)
      expect(categories.has('memory_usage')).toBe(true)
      
      const sources = new Set(dataPoints.map(dp => dp.source))
      expect(sources.has('node-1')).toBe(true)
      expect(sources.has('node-3')).toBe(true)
      
      // CPU and memory usage should be correlated
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

    it('should apply correlations between network metrics', () => {
      const dataPoints = generateNetworkMonitoringData(2, 30 * 60 * 1000) // 2 nodes, 30 minutes
      
      // Check that correlated metrics exist
      const cpuData = dataPoints.filter(dp => dp.category === 'cpu_usage')
      const memoryData = dataPoints.filter(dp => dp.category === 'memory_usage')
      
      expect(cpuData.length).toBeGreaterThan(0)
      expect(memoryData.length).toBeGreaterThan(0)
    })
  })

  describe('Advanced Pattern Generation', () => {
    it('should generate gaussian pattern data', () => {
      const config: Partial<DataGenerationConfig> = {
        categories: ['test'],
        sources: ['test-source'],
        patterns: {
          test: { type: 'gaussian', amplitude: 10, mean: 0, stdDev: 1, offset: 50 }
        }
      }

      const dataPoints = generateHistoricalData(1000, config)
      expect(dataPoints.length).toBeGreaterThan(0)

      const values = dataPoints.map(dp => dp.value)
      const mean = values.reduce((sum, val) => sum + val, 0) / values.length
      
      // Should be roughly centered around offset (50)
      expect(mean).toBeGreaterThan(40)
      expect(mean).toBeLessThan(60)
    })

    it('should generate brownian motion pattern data', () => {
      const config: Partial<DataGenerationConfig> = {
        categories: ['test'],
        sources: ['test-source'],
        patterns: {
          test: { type: 'brownian', amplitude: 5, persistence: 0.1, offset: 50 }
        }
      }

      const dataPoints = generateHistoricalData(500, config)
      expect(dataPoints.length).toBeGreaterThan(0)

      // Brownian motion should show persistence (consecutive values should be correlated)
      const values = dataPoints.map(dp => dp.value)
      let correlationSum = 0
      for (let i = 1; i < Math.min(100, values.length); i++) {
        correlationSum += Math.abs(values[i] - values[i-1])
      }
      const avgChange = correlationSum / Math.min(99, values.length - 1)
      
      // Changes should be relatively small due to persistence
      expect(avgChange).toBeLessThan(20)
    })

    it('should generate chaotic pattern data', () => {
      const config: Partial<DataGenerationConfig> = {
        categories: ['test'],
        sources: ['test-source'],
        patterns: {
          test: { type: 'chaos', amplitude: 20, lyapunovExponent: 3.8, offset: 50 }
        }
      }

      const dataPoints = generateHistoricalData(200, config)
      expect(dataPoints.length).toBeGreaterThan(0)

      const values = dataPoints.map(dp => dp.value)
      const variance = calculateVariance(values)
      
      // Chaotic patterns should show significant variation
      expect(variance).toBeGreaterThan(10)
    })

    it('should generate fibonacci pattern data', () => {
      const config: Partial<DataGenerationConfig> = {
        categories: ['test'],
        sources: ['test-source'],
        patterns: {
          test: { type: 'fibonacci', amplitude: 10, frequency: 0.1, phase: 0, offset: 50 }
        }
      }

      const dataPoints = generateHistoricalData(100, config)
      expect(dataPoints.length).toBeGreaterThan(0)

      // Should generate valid data points
      dataPoints.forEach(dp => {
        expect(typeof dp.value).toBe('number')
        expect(isNaN(dp.value)).toBe(false)
      })
    })
  })

  describe('Scenario Test Data Generation', () => {
    const scenarios = ['load_test', 'memory_test', 'filter_test', 'chart_test', 'anomaly_test'] as const

    scenarios.forEach(scenario => {
      it(`should generate ${scenario} scenario data`, () => {
        const dataPoints = generateScenarioTestData(scenario, 1000)
        
        expect(dataPoints).toHaveLength(1000)
        expect(dataPoints[0]).toHaveProperty('id')
        expect(dataPoints[0]).toHaveProperty('timestamp')
        expect(dataPoints[0]).toHaveProperty('value')
        expect(dataPoints[0]).toHaveProperty('category')
        expect(dataPoints[0]).toHaveProperty('source')
      })
    })

    it('should generate anomaly test data with detectable anomalies', () => {
      const dataPoints = generateScenarioTestData('anomaly_test', 1000)
      
      // Count potential anomalies (values significantly different from normal range)
      const values = dataPoints.map(dp => dp.value)
      const mean = values.reduce((sum, val) => sum + val, 0) / values.length
      const stdDev = Math.sqrt(calculateVariance(values))
      
      const anomalies = values.filter(val => Math.abs(val - mean) > 2 * stdDev)
      
      // Should have some anomalies due to high probability setting
      expect(anomalies.length).toBeGreaterThan(0)
    })

    it('should generate chart test data with different patterns', () => {
      const dataPoints = generateScenarioTestData('chart_test', 1000)
      
      const categories = new Set(dataPoints.map(dp => dp.category))
      expect(categories.has('smooth_line')).toBe(true)
      expect(categories.has('jagged_line')).toBe(true)
      expect(categories.has('stepped_line')).toBe(true)
      
      // Different categories should have different characteristics
      const smoothData = dataPoints.filter(dp => dp.category === 'smooth_line')
      const jaggedData = dataPoints.filter(dp => dp.category === 'jagged_line')
      
      const smoothVariance = calculateVariance(smoothData.map(dp => dp.value))
      const jaggedVariance = calculateVariance(jaggedData.map(dp => dp.value))
      
      // Jagged data should have higher variance than smooth data
      expect(jaggedVariance).toBeGreaterThan(smoothVariance)
    })
  })

  describe('Pattern State Management', () => {
    it('should maintain separate state for different pattern IDs', () => {
      clearPatternState()
      
      const config1: Partial<DataGenerationConfig> = {
        categories: ['test1'],
        sources: ['source1'],
        patterns: { test1: { type: 'brownian', amplitude: 10, persistence: 0.1 } }
      }
      
      const config2: Partial<DataGenerationConfig> = {
        categories: ['test2'],
        sources: ['source2'],
        patterns: { test2: { type: 'brownian', amplitude: 10, persistence: 0.1 } }
      }
      
      generateHistoricalData(50, config1)
      generateHistoricalData(50, config2)
      
      const state = getPatternState()
      expect(state.size).toBeGreaterThan(0)
      
      // Should have separate state entries for different category-source combinations
      const keys = Array.from(state.keys())
      const brownianKeys = keys.filter(key => key.includes('brownian'))
      expect(brownianKeys.length).toBeGreaterThan(0)
    })

    it('should clear pattern state correctly', () => {
      // Generate some data with stateful patterns to populate state
      generateHistoricalData(100, {
        categories: ['test'],
        sources: ['test-source'],
        patterns: {
          test: { type: 'brownian', amplitude: 10, persistence: 0.1 }
        }
      })
      
      const stateBefore = getPatternState()
      expect(stateBefore.size).toBeGreaterThan(0)
      
      clearPatternState()
      
      const stateAfter = getPatternState()
      expect(stateAfter.size).toBe(0)
    })
  })

  describe('Enhanced WebSocket Server Features', () => {
    let server: MockWebSocketServer

    afterEach(async () => {
      if (server) {
        await server.stop()
      }
    })

    it('should generate historical batch data', () => {
      server = new MockWebSocketServer({
        categories: ['cpu', 'memory'],
        sources: ['server-1']
      })

      const batch = server.generateHistoricalBatch(100)
      
      expect(batch.length).toBe(200) // 100 * 2 categories * 1 source
      expect(batch[0]).toHaveProperty('id')
      expect(batch[0]).toHaveProperty('timestamp')
      expect(batch[0]).toHaveProperty('value')
      expect(batch[0]).toHaveProperty('category')
      expect(batch[0]).toHaveProperty('source')
      
      // Should be sorted by timestamp
      for (let i = 1; i < batch.length; i++) {
        expect(batch[i].timestamp.getTime()).toBeGreaterThanOrEqual(
          batch[i - 1].timestamp.getTime()
        )
      }
    })

    it('should provide detailed statistics', async () => {
      server = new MockWebSocketServer({
        dataPointsPerSecond: 50,
        categories: ['cpu'],
        sources: ['server-1']
      })

      await server.start()
      await new Promise(resolve => setTimeout(resolve, 200))
      await server.stop()

      const detailedStats = server.getDetailedStats()
      
      expect(detailedStats).toHaveProperty('isRunning')
      expect(detailedStats).toHaveProperty('dataPointsGenerated')
      expect(detailedStats).toHaveProperty('efficiency')
      expect(detailedStats).toHaveProperty('memory')
      expect(detailedStats.efficiency).toHaveProperty('targetRate')
      expect(detailedStats.efficiency).toHaveProperty('actualRate')
      expect(detailedStats.efficiency).toHaveProperty('efficiency')
      expect(detailedStats.memory).toHaveProperty('messageQueueSize')
    })

    it('should simulate data spikes', async () => {
      server = new MockWebSocketServer({
        dataPointsPerSecond: 10,
        categories: ['cpu'],
        sources: ['server-1']
      })

      await server.start()
      
      const initialRate = server.getStats().config.dataPointsPerSecond
      
      server.simulateDataSpike(100, 3) // 100ms spike with 3x multiplier
      
      // Rate should be temporarily increased
      const spikeRate = server.getStats().config.dataPointsPerSecond
      expect(spikeRate).toBe(initialRate! * 3)
      
      // Wait for spike to end
      await new Promise(resolve => setTimeout(resolve, 150))
      
      const finalRate = server.getStats().config.dataPointsPerSecond
      expect(finalRate).toBe(initialRate)
      
      await server.stop()
    })
  })

  // Helper function to calculate variance
  function calculateVariance(values: number[]): number {
    if (values.length === 0) return 0
    const mean = values.reduce((sum, val) => sum + val, 0) / values.length
    const squaredDiffs = values.map(val => Math.pow(val - mean, 2))
    return squaredDiffs.reduce((sum, diff) => sum + diff, 0) / values.length
  }
})