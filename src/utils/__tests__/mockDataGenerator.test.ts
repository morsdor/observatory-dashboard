import {
  generateDataPoint,
  generateHistoricalData,
  generateTimeSeriesData,
  generateTestData,
  validateGeneratedData,
  generateLargeDataset
} from '../mockDataGenerator'
import type { DataPoint, DataGenerationConfig } from '../mockDataGenerator'
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
})

// Helper function to calculate variance
function calculateVariance(values: number[]): number {
  const mean = values.reduce((sum, val) => sum + val, 0) / values.length
  const squaredDiffs = values.map(val => Math.pow(val - mean, 2))
  return squaredDiffs.reduce((sum, diff) => sum + diff, 0) / values.length
}