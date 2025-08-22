import {
  downsampleLTTB,
  downsampleAverage,
  downsampleMinMax,
  aggregateData,
  processChartData
} from '../utils/dataProcessing'
import { DataPoint } from '@/types'

// Helper function to create mock data
const createMockData = (count: number, startTime?: Date): DataPoint[] => {
  const start = startTime || new Date('2024-01-01T00:00:00Z')
  
  return Array.from({ length: count }, (_, i) => ({
    id: `point-${i}`,
    timestamp: new Date(start.getTime() + i * 60000), // 1 minute intervals
    value: Math.sin(i * 0.1) * 50 + 50 + Math.random() * 10, // Sine wave with noise
    category: i % 2 === 0 ? 'cpu' : 'memory',
    metadata: { index: i },
    source: `server-${i % 3 + 1}`
  }))
}

describe('Data Processing Utils', () => {
  describe('downsampleLTTB', () => {
    it('reduces data points to target count', () => {
      const data = createMockData(1000)
      const result = downsampleLTTB(data, 100)
      
      expect(result).toHaveLength(100)
      expect(result[0]).toEqual(data[0]) // First point preserved
      expect(result[result.length - 1]).toEqual(data[data.length - 1]) // Last point preserved
    })

    it('returns original data when target is larger than input', () => {
      const data = createMockData(50)
      const result = downsampleLTTB(data, 100)
      
      expect(result).toHaveLength(50)
      expect(result).toEqual(data.map(d => ({ ...d })))
    })

    it('handles edge cases', () => {
      // Empty data
      expect(downsampleLTTB([], 10)).toEqual([])
      
      // Target less than 3
      const smallData = createMockData(10)
      expect(downsampleLTTB(smallData, 2)).toEqual(smallData.map(d => ({ ...d })))
    })

    it('maintains temporal order', () => {
      const data = createMockData(1000)
      const result = downsampleLTTB(data, 100)
      
      for (let i = 1; i < result.length; i++) {
        expect(result[i].timestamp.getTime()).toBeGreaterThanOrEqual(
          result[i - 1].timestamp.getTime()
        )
      }
    })

    it('preserves important visual features', () => {
      // Create data with a clear peak
      const data = createMockData(1000).map((d, i) => ({
        ...d,
        value: i === 500 ? 1000 : Math.random() * 10 // Clear peak at index 500
      }))
      
      const result = downsampleLTTB(data, 100)
      
      // The peak should be preserved (or very close to it)
      const maxValue = Math.max(...result.map(d => d.value))
      expect(maxValue).toBeGreaterThan(500) // Should capture the peak
    })
  })

  describe('downsampleAverage', () => {
    it('creates averaged buckets', () => {
      const data = createMockData(100)
      const result = downsampleAverage(data, 10)
      
      expect(result).toHaveLength(10)
      
      // Each result point should have aggregation metadata
      result.forEach(point => {
        expect(point.aggregatedCount).toBeGreaterThan(0)
        expect(point.originalIndices).toBeDefined()
        expect(Array.isArray(point.originalIndices)).toBe(true)
      })
    })

    it('calculates correct averages', () => {
      // Create predictable data
      const data = Array.from({ length: 10 }, (_, i) => ({
        id: `point-${i}`,
        timestamp: new Date(i * 1000),
        value: i * 10, // 0, 10, 20, 30, ...
        category: 'test',
        metadata: {},
        source: 'test'
      }))
      
      const result = downsampleAverage(data, 2)
      
      expect(result).toHaveLength(2)
      // First bucket: average of 0,10,20,30,40 = 20
      // Second bucket: average of 50,60,70,80,90 = 70
      expect(result[0].value).toBeCloseTo(20, 1)
      expect(result[1].value).toBeCloseTo(70, 1)
    })

    it('handles uneven bucket sizes', () => {
      const data = createMockData(7) // 7 points into 3 buckets
      const result = downsampleAverage(data, 3)
      
      expect(result).toHaveLength(3)
      result.forEach(point => {
        expect(point.aggregatedCount).toBeGreaterThan(0)
      })
    })
  })

  describe('downsampleMinMax', () => {
    it('preserves extremes', () => {
      // Create data with clear min and max
      const data = Array.from({ length: 100 }, (_, i) => ({
        id: `point-${i}`,
        timestamp: new Date(i * 1000),
        value: i === 25 ? 0 : i === 75 ? 100 : 50, // Clear min at 25, max at 75
        category: 'test',
        metadata: {},
        source: 'test'
      }))
      
      const result = downsampleMinMax(data, 20)
      
      // Should contain both extremes
      const values = result.map(d => d.value)
      expect(values).toContain(0)
      expect(values).toContain(100)
    })

    it('maintains chronological order within buckets', () => {
      const data = createMockData(100)
      const result = downsampleMinMax(data, 20)
      
      for (let i = 1; i < result.length; i++) {
        expect(result[i].timestamp.getTime()).toBeGreaterThanOrEqual(
          result[i - 1].timestamp.getTime()
        )
      }
    })

    it('handles duplicate min/max values', () => {
      const data = Array.from({ length: 10 }, (_, i) => ({
        id: `point-${i}`,
        timestamp: new Date(i * 1000),
        value: 50, // All same value
        category: 'test',
        metadata: {},
        source: 'test'
      }))
      
      const result = downsampleMinMax(data, 4)
      expect(result.length).toBeGreaterThan(0)
      expect(result.length).toBeLessThanOrEqual(4)
    })
  })

  describe('aggregateData', () => {
    it('aggregates by time intervals', () => {
      const data = createMockData(60) // 60 minutes of data
      const result = aggregateData(data, 300000, 'average') // 5-minute buckets
      
      expect(result.length).toBeLessThan(data.length)
      
      result.forEach(point => {
        expect(point.aggregatedCount).toBeGreaterThan(0)
        expect(point.metadata.aggregationMethod).toBe('average')
      })
    })

    it('calculates correct aggregation methods', () => {
      const data = [
        { id: '1', timestamp: new Date('2024-01-01T00:00:00Z'), value: 10, category: 'test', metadata: {}, source: 'test' },
        { id: '2', timestamp: new Date('2024-01-01T00:01:00Z'), value: 20, category: 'test', metadata: {}, source: 'test' },
        { id: '3', timestamp: new Date('2024-01-01T00:02:00Z'), value: 30, category: 'test', metadata: {}, source: 'test' }
      ]
      
      // Test different aggregation methods
      const avgResult = aggregateData(data, 300000, 'average') // 5 minutes
      const sumResult = aggregateData(data, 300000, 'sum')
      const minResult = aggregateData(data, 300000, 'min')
      const maxResult = aggregateData(data, 300000, 'max')
      const countResult = aggregateData(data, 300000, 'count')
      
      expect(avgResult[0].value).toBe(20) // (10+20+30)/3
      expect(sumResult[0].value).toBe(60) // 10+20+30
      expect(minResult[0].value).toBe(10)
      expect(maxResult[0].value).toBe(30)
      expect(countResult[0].value).toBe(3)
    })

    it('creates proper time buckets', () => {
      const startTime = new Date('2024-01-01T00:00:00Z')
      const data = [
        { id: '1', timestamp: new Date('2024-01-01T00:00:30Z'), value: 10, category: 'test', metadata: {}, source: 'test' },
        { id: '2', timestamp: new Date('2024-01-01T00:04:30Z'), value: 20, category: 'test', metadata: {}, source: 'test' },
        { id: '3', timestamp: new Date('2024-01-01T00:06:30Z'), value: 30, category: 'test', metadata: {}, source: 'test' }
      ]
      
      const result = aggregateData(data, 300000, 'average') // 5-minute buckets
      
      expect(result).toHaveLength(2) // Two 5-minute buckets
      expect(result[0].timestamp.getTime()).toBe(new Date('2024-01-01T00:00:00Z').getTime())
      expect(result[1].timestamp.getTime()).toBe(new Date('2024-01-01T00:05:00Z').getTime())
    })

    it('handles empty data', () => {
      const result = aggregateData([], 60000, 'average')
      expect(result).toEqual([])
    })
  })

  describe('processChartData', () => {
    it('applies aggregation only', () => {
      const data = createMockData(100)
      const config = {
        aggregation: {
          enabled: true,
          method: 'average' as const,
          interval: 300000
        },
        downsampling: {
          enabled: false,
          maxPoints: 1000,
          algorithm: 'lttb' as const
        }
      }
      
      const result = processChartData(data, config)
      
      expect(result.length).toBeLessThan(data.length)
      result.forEach(point => {
        expect(point.metadata.aggregationMethod).toBe('average')
      })
    })

    it('applies downsampling only', () => {
      const data = createMockData(1000)
      const config = {
        aggregation: {
          enabled: false,
          method: 'average' as const,
          interval: 60000
        },
        downsampling: {
          enabled: true,
          maxPoints: 100,
          algorithm: 'lttb' as const
        }
      }
      
      const result = processChartData(data, config)
      
      expect(result).toHaveLength(100)
    })

    it('applies both aggregation and downsampling', () => {
      const data = createMockData(2000)
      const config = {
        aggregation: {
          enabled: true,
          method: 'average' as const,
          interval: 300000 // 5 minutes
        },
        downsampling: {
          enabled: true,
          maxPoints: 50,
          algorithm: 'lttb' as const
        }
      }
      
      const result = processChartData(data, config)
      
      // Should be aggregated first, then downsampled
      expect(result.length).toBeLessThanOrEqual(50)
    })

    it('skips processing when disabled', () => {
      const data = createMockData(100)
      const config = {
        aggregation: {
          enabled: false,
          method: 'average' as const,
          interval: 60000
        },
        downsampling: {
          enabled: false,
          maxPoints: 50,
          algorithm: 'lttb' as const
        }
      }
      
      const result = processChartData(data, config)
      
      expect(result).toHaveLength(100)
      expect(result.map(d => d.id)).toEqual(data.map(d => d.id))
    })

    it('skips downsampling when under threshold', () => {
      const data = createMockData(50)
      const config = {
        aggregation: {
          enabled: false,
          method: 'average' as const,
          interval: 60000
        },
        downsampling: {
          enabled: true,
          maxPoints: 100, // More than data length
          algorithm: 'lttb' as const
        }
      }
      
      const result = processChartData(data, config)
      
      expect(result).toHaveLength(50) // No downsampling applied
    })
  })

  describe('Performance', () => {
    it('handles large datasets efficiently', () => {
      const data = createMockData(50000)
      
      const startTime = performance.now()
      const result = downsampleLTTB(data, 1000)
      const endTime = performance.now()
      
      expect(result).toHaveLength(1000)
      expect(endTime - startTime).toBeLessThan(1000) // Should complete in under 1 second
    })

    it('aggregation performs well on large datasets', () => {
      const data = createMockData(10000)
      
      const startTime = performance.now()
      const result = aggregateData(data, 300000, 'average')
      const endTime = performance.now()
      
      expect(result.length).toBeGreaterThan(0)
      expect(endTime - startTime).toBeLessThan(500) // Should complete in under 500ms
    })
  })
})