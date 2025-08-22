import {
  generateDataPoint,
  generateHistoricalData,
  generateTimeSeriesData,
  generateTestData,
  validateGeneratedData,
  generateLargeDataset,
  createScenarioConfig,
  generateCorrelatedData,
  generatePerformanceTestData,
  benchmarkDataGeneration,
  generateBusinessMetricsData,
  generateIoTSensorData,
  generateFinancialData,
  generateNetworkMonitoringData,
  generateScenarioTestData,
  clearPatternState,
  getPatternState
} from '../mockDataGenerator'
import type { DataGenerationConfig, DataPattern, SeasonalityConfig, AnomalyConfig } from '../mockDataGenerator'
import type { DataPoint } from '../../types'
import { DataPointSchema } from '../../types/schemas'

describe('Mock Data Generator', () => {
  describe('generateDataPoint', () => {
    it('should generate a valid data point with required fields', () => {
      const timestamp = new Date('2024-01-01T12:00:00Z')
      const category = 'cpu'
      const source = 'server-1'
      const baseValue = 50

      const dataPoint = generateDataPoint(timestamp, category, source, baseValue)

      expect(dataPoint.id).toBeDefined()
      expect(dataPoint.timestamp).toEqual(timestamp)
      expect(dataPoint.category).toBe(category)
      expect(dataPoint.source).toBe(source)
      expect(typeof dataPoint.value).toBe('number')
      expect(dataPoint.metadata).toBeDefined()
      expect(typeof dataPoint.metadata).toBe('object')
    })

    it('should generate values within specified range', () => {
      const config: Partial<DataGenerationConfig> = {
        valueRange: { min: 10, max: 90 },
        noiseLevel: 0
      }

      const dataPoint = generateDataPoint(
        new Date(),
        'cpu',
        'server-1',
        50,
        config
      )

      expect(dataPoint.value).toBeGreaterThanOrEqual(10)
      expect(dataPoint.value).toBeLessThanOrEqual(90)
    })

    it('should add appropriate noise to base value', () => {
      const baseValue = 50
      const config: Partial<DataGenerationConfig> = {
        noiseLevel: 0.2,
        valueRange: { min: 0, max: 100 }
      }

      // Generate multiple points to test noise variation
      const dataPoints = Array.from({ length: 100 }, () =>
        generateDataPoint(new Date(), 'cpu', 'server-1', baseValue, config)
      )

      const values = dataPoints.map(dp => dp.value)
      const minValue = Math.min(...values)
      const maxValue = Math.max(...values)

      // With 20% noise, we should see variation around the base value
      expect(minValue).toBeLessThan(baseValue)
      expect(maxValue).toBeGreaterThan(baseValue)
      expect(maxValue - minValue).toBeGreaterThan(0)
    })

    it('should generate category-specific metadata', () => {
      const categories = ['cpu', 'memory', 'network', 'disk', 'temperature']

      categories.forEach(category => {
        const dataPoint = generateDataPoint(
          new Date(),
          category,
          'server-1',
          50
        )

        expect(dataPoint.metadata.unit).toBeDefined()
        expect(dataPoint.metadata.threshold).toBeDefined()
        expect(dataPoint.metadata.status).toBeDefined()

        // Check category-specific metadata
        switch (category) {
          case 'cpu':
            expect(dataPoint.metadata.cores).toBeDefined()
            expect(dataPoint.metadata.frequency).toBeDefined()
            break
          case 'memory':
            expect(dataPoint.metadata.total).toBeDefined()
            expect(dataPoint.metadata.available).toBeDefined()
            break
          case 'network':
            expect(dataPoint.metadata.interface).toBeDefined()
            expect(dataPoint.metadata.protocol).toBeDefined()
            break
          case 'disk':
            expect(dataPoint.metadata.filesystem).toBeDefined()
            expect(dataPoint.metadata.mountPoint).toBeDefined()
            break
          case 'temperature':
            expect(dataPoint.metadata.sensor).toBeDefined()
            expect(dataPoint.metadata.location).toBeDefined()
            break
        }
      })
    })

    it('should round values to 2 decimal places', () => {
      const dataPoint = generateDataPoint(
        new Date(),
        'cpu',
        'server-1',
        33.333333
      )

      // Check that value has at most 2 decimal places
      const decimalPlaces = (dataPoint.value.toString().split('.')[1] || '').length
      expect(decimalPlaces).toBeLessThanOrEqual(2)
    })
  })

  describe('generateHistoricalData', () => {
    it('should generate the requested number of data points', () => {
      const count = 100
      const config: Partial<DataGenerationConfig> = {
        categories: ['cpu'],
        sources: ['server-1']
      }

      const dataPoints = generateHistoricalData(count, config)

      // Should generate count * categories * sources points
      expect(dataPoints).toHaveLength(count * 1 * 1)
    })

    it('should generate data points for all category/source combinations', () => {
      const config: Partial<DataGenerationConfig> = {
        categories: ['cpu', 'memory'],
        sources: ['server-1', 'server-2']
      }

      const dataPoints = generateHistoricalData(10, config)

      // Should have 10 * 2 categories * 2 sources = 40 points
      expect(dataPoints).toHaveLength(40)

      // Check that all combinations are present
      const combinations = new Set()
      dataPoints.forEach(dp => {
        combinations.add(`${dp.category}-${dp.source}`)
      })

      expect(combinations.has('cpu-server-1')).toBe(true)
      expect(combinations.has('cpu-server-2')).toBe(true)
      expect(combinations.has('memory-server-1')).toBe(true)
      expect(combinations.has('memory-server-2')).toBe(true)
    })

    it('should generate data points in chronological order', () => {
      const dataPoints = generateHistoricalData(50)

      for (let i = 1; i < dataPoints.length; i++) {
        expect(dataPoints[i].timestamp.getTime()).toBeGreaterThanOrEqual(
          dataPoints[i - 1].timestamp.getTime()
        )
      }
    })

    it('should respect custom date ranges', () => {
      const startDate = new Date('2024-01-01T00:00:00Z')
      const endDate = new Date('2024-01-02T00:00:00Z')

      const dataPoints = generateHistoricalData(10, {
        startDate,
        endDate,
        categories: ['cpu'],
        sources: ['server-1']
      })

      dataPoints.forEach(dp => {
        expect(dp.timestamp.getTime()).toBeGreaterThanOrEqual(startDate.getTime())
        expect(dp.timestamp.getTime()).toBeLessThanOrEqual(endDate.getTime())
      })
    })

    it('should generate valid data points according to schema', () => {
      const dataPoints = generateHistoricalData(20)

      dataPoints.forEach(dp => {
        expect(() => DataPointSchema.parse(dp)).not.toThrow()
      })
    })
  })

  describe('generateTimeSeriesData', () => {
    it('should generate data based on points per hour configuration', () => {
      const config: Partial<DataGenerationConfig> = {
        startDate: new Date('2024-01-01T00:00:00Z'),
        endDate: new Date('2024-01-01T02:00:00Z'), // 2 hours
        pointsPerHour: 60,
        categories: ['cpu'],
        sources: ['server-1']
      }

      const dataPoints = generateTimeSeriesData(config)

      // Should generate 2 hours * 60 points/hour * 1 category * 1 source = 120 points
      expect(dataPoints).toHaveLength(120)
    })

    it('should use default configuration when not specified', () => {
      const dataPoints = generateTimeSeriesData()

      expect(dataPoints.length).toBeGreaterThan(0)

      // Check that default categories and sources are used
      const categories = new Set(dataPoints.map(dp => dp.category))
      const sources = new Set(dataPoints.map(dp => dp.source))

      expect(categories.size).toBeGreaterThan(1)
      expect(sources.size).toBeGreaterThan(1)
    })
  })

  describe('generateTestData', () => {
    const patterns = ['spike', 'gradual', 'stable', 'noisy'] as const

    patterns.forEach(pattern => {
      it(`should generate ${pattern} pattern data`, () => {
        const dataPoints = generateTestData(pattern, 100)

        expect(dataPoints).toHaveLength(100)
        expect(dataPoints[0].category).toBe('test')
        expect(dataPoints[0].source).toBe('test-source')

        // Validate all points
        dataPoints.forEach(dp => {
          expect(() => DataPointSchema.parse(dp)).not.toThrow()
        })
      })
    })

    it('should generate different value patterns for different types', () => {
      const spikeData = generateTestData('spike', 100)
      const stableData = generateTestData('stable', 100)

      const spikeValues = spikeData.map(dp => dp.value)
      const stableValues = stableData.map(dp => dp.value)

      // Spike data should have more variation than stable data
      const spikeVariance = calculateVariance(spikeValues)
      const stableVariance = calculateVariance(stableValues)

      expect(spikeVariance).toBeGreaterThan(stableVariance)
    })
  })

  describe('validateGeneratedData', () => {
    it('should validate all valid data points', () => {
      const dataPoints = generateHistoricalData(10, {
        categories: ['cpu'],
        sources: ['server-1']
      })
      const result = validateGeneratedData(dataPoints)

      expect(result.valid).toHaveLength(10)
      expect(result.invalid).toHaveLength(0)
      expect(result.summary.total).toBe(10)
      expect(result.summary.valid).toBe(10)
      expect(result.summary.invalid).toBe(0)
    })

    it('should identify invalid data points', () => {
      const validPoints = generateHistoricalData(2, {
        categories: ['cpu'],
        sources: ['server-1']
      })
      const invalidPoints = [
        { ...validPoints[0], value: 'invalid' }, // Invalid value type
        { ...validPoints[0], id: '' }, // Empty ID
        { ...validPoints[0], timestamp: 'not-a-date' } // Invalid timestamp
      ] as any[]

      const mixedData = [...validPoints, ...invalidPoints]
      const result = validateGeneratedData(mixedData)

      expect(result.valid).toHaveLength(2)
      expect(result.invalid).toHaveLength(3)
      expect(result.summary.total).toBe(5)
      expect(result.summary.valid).toBe(2)
      expect(result.summary.invalid).toBe(3)
    })

    it('should collect summary statistics', () => {
      const config: Partial<DataGenerationConfig> = {
        categories: ['cpu', 'memory'],
        sources: ['server-1', 'server-2']
      }

      const dataPoints = generateHistoricalData(20, config)
      const result = validateGeneratedData(dataPoints)

      expect(result.summary.categories.size).toBe(2)
      expect(result.summary.sources.size).toBe(2)
      expect(result.summary.timeRange).not.toBeNull()
      expect(result.summary.timeRange!.start).toBeInstanceOf(Date)
      expect(result.summary.timeRange!.end).toBeInstanceOf(Date)
    })

    it('should handle empty data array', () => {
      const result = validateGeneratedData([])

      expect(result.valid).toHaveLength(0)
      expect(result.invalid).toHaveLength(0)
      expect(result.summary.total).toBe(0)
      expect(result.summary.timeRange).toBeNull()
    })
  })

  describe('generateLargeDataset', () => {
    it('should generate the requested number of data points', () => {
      const size = 1000
      const dataPoints = generateLargeDataset(size)

      expect(dataPoints).toHaveLength(size)
    })

    it('should generate data in chronological order', () => {
      const dataPoints = generateLargeDataset(500)

      for (let i = 1; i < dataPoints.length; i++) {
        expect(dataPoints[i].timestamp.getTime()).toBeGreaterThanOrEqual(
          dataPoints[i - 1].timestamp.getTime()
        )
      }
    })

    it('should handle large datasets efficiently', () => {
      const startTime = Date.now()
      const dataPoints = generateLargeDataset(10000)
      const endTime = Date.now()

      expect(dataPoints).toHaveLength(10000)

      // Should complete within reasonable time (adjust threshold as needed)
      const executionTime = endTime - startTime
      expect(executionTime).toBeLessThan(5000) // 5 seconds
    })

    it('should generate valid data points for large datasets', () => {
      const dataPoints = generateLargeDataset(1000)

      // Sample validation (checking all 1000 would be slow)
      const sampleSize = Math.min(100, dataPoints.length)
      const sampleIndices = Array.from(
        { length: sampleSize },
        (_, i) => Math.floor(i * dataPoints.length / sampleSize)
      )

      sampleIndices.forEach(index => {
        expect(() => DataPointSchema.parse(dataPoints[index])).not.toThrow()
      })
    })
  })

  describe('Advanced Pattern Generation', () => {
    it('should generate data with custom patterns', () => {
      const config: Partial<DataGenerationConfig> = {
        categories: ['cpu'],
        sources: ['server-1'],
        patterns: {
          cpu: { type: 'sine', amplitude: 20, frequency: 0.1, offset: 50, noise: 0.05 }
        }
      }

      const dataPoints = generateHistoricalData(100, config)

      expect(dataPoints).toHaveLength(100)

      // Values should vary around the offset (50) with amplitude (20)
      const values = dataPoints.map(dp => dp.value)
      const minValue = Math.min(...values)
      const maxValue = Math.max(...values)

      expect(minValue).toBeGreaterThan(20) // 50 - 20 - some margin
      expect(maxValue).toBeLessThan(80)    // 50 + 20 + some margin
    })

    it('should apply seasonality patterns correctly', () => {
      const seasonality: SeasonalityConfig = {
        enabled: true,
        dailyPattern: { type: 'sine', amplitude: 10, frequency: 1 }
      }

      const config: Partial<DataGenerationConfig> = {
        categories: ['cpu'],
        sources: ['server-1'],
        startDate: new Date('2024-01-01T00:00:00Z'),
        endDate: new Date('2024-01-01T23:59:59Z'),
        seasonality
      }

      const dataPoints = generateTimeSeriesData(config)

      expect(dataPoints.length).toBeGreaterThan(0)

      // Group by hour to check daily pattern
      const hourlyAverages = new Array(24).fill(0).map(() => ({ sum: 0, count: 0 }))

      dataPoints.forEach(dp => {
        const hour = dp.timestamp.getHours()
        hourlyAverages[hour].sum += dp.value
        hourlyAverages[hour].count++
      })

      const hourlyAvgs = hourlyAverages.map(h => h.count > 0 ? h.sum / h.count : 0)

      // Should show variation across hours (daily pattern)
      const variance = calculateVariance(hourlyAvgs.filter(avg => avg > 0))
      expect(variance).toBeGreaterThan(0)
    })

    it('should inject anomalies when configured', () => {
      const anomalies: AnomalyConfig = {
        enabled: true,
        probability: 0.1, // High probability for testing
        types: ['spike', 'drop'],
        intensity: 5
      }

      const config: Partial<DataGenerationConfig> = {
        categories: ['cpu'],
        sources: ['server-1'],
        valueRange: { min: 0, max: 100 },
        anomalies
      }

      const dataPoints = generateHistoricalData(1000, config)
      const values = dataPoints.map(dp => dp.value)

      // With high anomaly probability, we should see some extreme values
      const extremeValues = values.filter(v => v < 10 || v > 90)
      expect(extremeValues.length).toBeGreaterThan(0)
    })
  })

  describe('Scenario Configuration', () => {
    const scenarios = ['normal', 'high_load', 'system_failure', 'maintenance', 'peak_hours', 'weekend'] as const

    scenarios.forEach(scenario => {
      it(`should create valid ${scenario} scenario configuration`, () => {
        const config = createScenarioConfig(scenario)

        expect(config).toBeDefined()
        expect(config.categories).toBeDefined()
        expect(config.sources).toBeDefined()

        if (config.patterns) {
          Object.values(config.patterns).forEach(pattern => {
            expect(pattern.type).toBeDefined()
            expect(['linear', 'exponential', 'cyclical', 'random', 'step', 'sine', 'cosine', 'sawtooth', 'square'].includes(pattern.type)).toBe(true)
          })
        }
      })
    })

    it('should generate different data characteristics for different scenarios', () => {
      const normalData = generateHistoricalData(100, createScenarioConfig('normal'))
      const highLoadData = generateHistoricalData(100, createScenarioConfig('high_load'))

      const normalValues = normalData.filter(dp => dp.category === 'cpu').map(dp => dp.value)
      const highLoadValues = highLoadData.filter(dp => dp.category === 'cpu').map(dp => dp.value)

      const normalAvg = normalValues.reduce((sum, val) => sum + val, 0) / normalValues.length
      const highLoadAvg = highLoadValues.reduce((sum, val) => sum + val, 0) / highLoadValues.length

      // High load scenario should have higher average CPU values
      expect(highLoadAvg).toBeGreaterThan(normalAvg)
    })
  })

  describe('Correlated Data Generation', () => {
    it('should generate data with specified correlations', () => {
      const correlations = [
        { categories: ['cpu', 'memory'], strength: 0.8 }
      ]

      const config: Partial<DataGenerationConfig> = {
        categories: ['cpu', 'memory'],
        sources: ['server-1']
      }

      const dataPoints = generateCorrelatedData(100, correlations, config)

      // Group by timestamp
      const byTimestamp = new Map<number, DataPoint[]>()
      dataPoints.forEach(point => {
        const timestamp = point.timestamp.getTime()
        if (!byTimestamp.has(timestamp)) {
          byTimestamp.set(timestamp, [])
        }
        byTimestamp.get(timestamp)!.push(point)
      })

      // Check correlation exists
      let correlationSum = 0
      let correlationCount = 0

      byTimestamp.forEach(points => {
        const cpuPoint = points.find(p => p.category === 'cpu')
        const memoryPoint = points.find(p => p.category === 'memory')

        if (cpuPoint && memoryPoint) {
          correlationSum += (cpuPoint.value - 50) * (memoryPoint.value - 50)
          correlationCount++
        }
      })

      if (correlationCount > 0) {
        const correlation = correlationSum / correlationCount
        expect(Math.abs(correlation)).toBeGreaterThan(0) // Some correlation should exist
      }
    })
  })

  describe('Performance Test Data Generation', () => {
    const testTypes = ['memory_stress', 'rendering_stress', 'filter_stress', 'streaming_stress'] as const

    testTypes.forEach(testType => {
      it(`should generate ${testType} test data`, () => {
        const dataPoints = generatePerformanceTestData(testType)

        expect(dataPoints.length).toBeGreaterThan(1000) // Should be substantial dataset
        expect(dataPoints[0]).toHaveProperty('id')
        expect(dataPoints[0]).toHaveProperty('timestamp')
        expect(dataPoints[0]).toHaveProperty('value')
        expect(dataPoints[0]).toHaveProperty('category')
        expect(dataPoints[0]).toHaveProperty('source')

        // Should be sorted by timestamp
        for (let i = 1; i < Math.min(100, dataPoints.length); i++) {
          expect(dataPoints[i].timestamp.getTime()).toBeGreaterThanOrEqual(
            dataPoints[i - 1].timestamp.getTime()
          )
        }
      })
    })

    it('should generate memory stress test with 100k points', () => {
      const dataPoints = generatePerformanceTestData('memory_stress')
      expect(dataPoints.length).toBe(100000)
    })
  })

  describe('Performance Benchmarking', () => {
    it('should benchmark data generation performance', () => {
      const benchmark = benchmarkDataGeneration(1000, 3)

      expect(benchmark.averageTime).toBeGreaterThan(0)
      expect(benchmark.minTime).toBeGreaterThan(0)
      expect(benchmark.maxTime).toBeGreaterThan(0)
      expect(benchmark.pointsPerSecond).toBeGreaterThan(0)
      expect(benchmark.minTime).toBeLessThanOrEqual(benchmark.averageTime)
      expect(benchmark.averageTime).toBeLessThanOrEqual(benchmark.maxTime)
    })

    it('should handle performance benchmarking with different sizes', () => {
      const smallBenchmark = benchmarkDataGeneration(100, 2)
      const largeBenchmark = benchmarkDataGeneration(1000, 2)

      // Both benchmarks should complete successfully
      expect(largeBenchmark.averageTime).toBeGreaterThan(0)
      expect(smallBenchmark.averageTime).toBeGreaterThan(0)

      // Points per second should be reasonable for both
      expect(largeBenchmark.pointsPerSecond).toBeGreaterThan(0)
      expect(smallBenchmark.pointsPerSecond).toBeGreaterThan(0)
      
      // Efficiency should not degrade significantly (allow for batching optimizations)
      const efficiencyRatio = largeBenchmark.pointsPerSecond / smallBenchmark.pointsPerSecond
      expect(efficiencyRatio).toBeGreaterThan(0.1) // Should maintain at least 10% efficiency
    })
  })

  describe('Data Consistency and Quality', () => {
    it('should maintain data consistency across large datasets', () => {
      const dataPoints = generateLargeDataset(10000)

      // Check for duplicate IDs
      const ids = new Set(dataPoints.map(dp => dp.id))
      expect(ids.size).toBe(dataPoints.length)

      // Check timestamp ordering
      for (let i = 1; i < dataPoints.length; i++) {
        expect(dataPoints[i].timestamp.getTime()).toBeGreaterThanOrEqual(
          dataPoints[i - 1].timestamp.getTime()
        )
      }

      // Check value ranges
      dataPoints.forEach(dp => {
        expect(dp.value).toBeGreaterThanOrEqual(0)
        expect(dp.value).toBeLessThanOrEqual(100)
        expect(typeof dp.value).toBe('number')
        expect(isNaN(dp.value)).toBe(false)
      })
    })

    it('should generate realistic metadata for all categories', () => {
      const categories = ['cpu', 'memory', 'network', 'disk', 'temperature']
      const dataPoints = generateHistoricalData(categories.length * 10, {
        categories,
        sources: ['server-1']
      })

      categories.forEach(category => {
        const categoryPoints = dataPoints.filter(dp => dp.category === category)
        expect(categoryPoints.length).toBeGreaterThan(0)

        categoryPoints.forEach(dp => {
          expect(dp.metadata).toBeDefined()
          expect(dp.metadata.unit).toBeDefined()
          expect(dp.metadata.threshold).toBeDefined()
          expect(dp.metadata.status).toBeDefined()
        })
      })
    })

    it('should handle edge cases gracefully', () => {
      // Empty configuration
      expect(() => generateHistoricalData(10, {})).not.toThrow()

      // Zero count
      const zeroData = generateHistoricalData(0)
      expect(zeroData).toHaveLength(0)

      // Single point
      const singleData = generateHistoricalData(1, {
        categories: ['cpu'],
        sources: ['server-1']
      })
      expect(singleData).toHaveLength(1)

      // Extreme value ranges
      const extremeData = generateHistoricalData(10, {
        valueRange: { min: -1000, max: 1000 },
        categories: ['test'],
        sources: ['test']
      })
      extremeData.forEach(dp => {
        expect(dp.value).toBeGreaterThanOrEqual(-1000)
        expect(dp.value).toBeLessThanOrEqual(1000)
      })
    })
  })

  describe('Enhanced Pattern Generation', () => {
    it('should generate gaussian pattern data', () => {
      const config: Partial<DataGenerationConfig> = {
        categories: ['test'],
        sources: ['test-source'],
        patterns: {
          test: { type: 'gaussian', amplitude: 10, mean: 0, stdDev: 1, offset: 50, noise: 0.02 }
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
          test: { type: 'brownian', amplitude: 5, persistence: 0.1, offset: 50, noise: 0.02 }
        }
      }

      const dataPoints = generateHistoricalData(500, config)
      expect(dataPoints.length).toBeGreaterThan(0)

      // Brownian motion should show some persistence (consecutive values should be correlated)
      const values = dataPoints.map(dp => dp.value)
      let correlationSum = 0
      for (let i = 1; i < Math.min(100, values.length); i++) {
        correlationSum += Math.abs(values[i] - values[i-1])
      }
      const avgChange = correlationSum / Math.min(99, values.length - 1)
      
      // Changes should be relatively small due to persistence
      expect(avgChange).toBeLessThan(20)
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

    it('should generate chaotic pattern data', () => {
      const config: Partial<DataGenerationConfig> = {
        categories: ['test'],
        sources: ['test-source'],
        patterns: {
          test: { type: 'chaos', amplitude: 20, lyapunovExponent: 3.8, offset: 50, noise: 0.02 }
        }
      }

      const dataPoints = generateHistoricalData(200, config)
      expect(dataPoints.length).toBeGreaterThan(0)

      const values = dataPoints.map(dp => dp.value)
      const variance = calculateVariance(values)
      
      // Chaotic patterns should show significant variation
      expect(variance).toBeGreaterThan(10)
    })
  })

  describe('Specialized Data Generators', () => {
    it('should generate business metrics data', () => {
      const dataPoints = generateBusinessMetricsData(60 * 60 * 1000) // 1 hour
      
      expect(dataPoints.length).toBeGreaterThan(0)
      
      const categories = new Set(dataPoints.map(dp => dp.category))
      expect(categories.has('revenue')).toBe(true)
      expect(categories.has('users')).toBe(true)
      expect(categories.has('orders')).toBe(true)
      
      // Should have realistic business data patterns
      dataPoints.forEach(dp => {
        expect(dp.value).toBeGreaterThanOrEqual(0)
        expect(dp.metadata).toBeDefined()
      })
    })

    it('should generate IoT sensor data', () => {
      const dataPoints = generateIoTSensorData(3, 30 * 60 * 1000) // 3 sensors, 30 minutes
      
      expect(dataPoints.length).toBeGreaterThan(0)
      
      const categories = new Set(dataPoints.map(dp => dp.category))
      expect(categories.has('temperature')).toBe(true)
      expect(categories.has('humidity')).toBe(true)
      
      const sources = new Set(dataPoints.map(dp => dp.source))
      expect(sources.has('sensor-1')).toBe(true)
      expect(sources.has('sensor-2')).toBe(true)
      expect(sources.has('sensor-3')).toBe(true)
    })

    it('should generate financial data', () => {
      const symbols = ['AAPL', 'GOOGL']
      const dataPoints = generateFinancialData(symbols, 24 * 60 * 60 * 1000) // 1 day
      
      expect(dataPoints.length).toBeGreaterThan(0)
      
      const categories = new Set(dataPoints.map(dp => dp.category))
      expect(categories.has('price')).toBe(true)
      expect(categories.has('volume')).toBe(true)
      
      const sources = new Set(dataPoints.map(dp => dp.source))
      expect(sources.has('AAPL')).toBe(true)
      expect(sources.has('GOOGL')).toBe(true)
    })

    it('should generate network monitoring data', () => {
      const dataPoints = generateNetworkMonitoringData(2, 60 * 60 * 1000) // 2 nodes, 1 hour
      
      expect(dataPoints.length).toBeGreaterThan(0)
      
      const categories = new Set(dataPoints.map(dp => dp.category))
      expect(categories.has('latency')).toBe(true)
      expect(categories.has('throughput')).toBe(true)
      expect(categories.has('cpu_usage')).toBe(true)
      
      const sources = new Set(dataPoints.map(dp => dp.source))
      expect(sources.has('node-1')).toBe(true)
      expect(sources.has('node-2')).toBe(true)
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

    it('should generate anomaly test data with high anomaly rate', () => {
      const dataPoints = generateScenarioTestData('anomaly_test', 1000)
      
      // Count potential anomalies (values significantly different from normal range)
      const values = dataPoints.map(dp => dp.value)
      const mean = values.reduce((sum, val) => sum + val, 0) / values.length
      const stdDev = Math.sqrt(calculateVariance(values))
      
      const anomalies = values.filter(val => Math.abs(val - mean) > 2 * stdDev)
      
      // Should have some anomalies due to high probability setting
      expect(anomalies.length).toBeGreaterThan(0)
    })
  })

  describe('Pattern State Management', () => {
    it('should clear pattern state', () => {
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
  })

  // Helper function to calculate variance
  function calculateVariance(values: number[]): number {
    if (values.length === 0) return 0
    const mean = values.reduce((sum, val) => sum + val, 0) / values.length
    const squaredDiffs = values.map(val => Math.pow(val - mean, 2))
    return squaredDiffs.reduce((sum, diff) => sum + diff, 0) / values.length
  }

})