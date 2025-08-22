import { AdvancedFilterEngine } from '../filterEngine'
import { DataPoint, FilterCondition, FilterCriteria } from '@/types'

// Mock data generator for performance testing
function generateMockData(count: number): DataPoint[] {
  const categories = ['cpu', 'memory', 'network', 'disk', 'database']
  const sources = ['server-1', 'server-2', 'server-3', 'server-4', 'server-5']
  const data: DataPoint[] = []

  for (let i = 0; i < count; i++) {
    data.push({
      id: `point-${i}`,
      timestamp: new Date(Date.now() - (count - i) * 1000), // 1 second intervals
      value: Math.random() * 100,
      category: categories[i % categories.length],
      source: sources[i % sources.length],
      metadata: {
        region: i % 2 === 0 ? 'us-east' : 'us-west',
        environment: i % 3 === 0 ? 'production' : 'staging',
        priority: i % 4 === 0 ? 'high' : 'normal'
      }
    })
  }

  return data
}

describe('AdvancedFilterEngine Performance Tests', () => {
  let filterEngine: AdvancedFilterEngine
  let smallDataset: DataPoint[]
  let mediumDataset: DataPoint[]
  let largeDataset: DataPoint[]

  beforeAll(() => {
    // Generate test datasets
    smallDataset = generateMockData(1000)
    mediumDataset = generateMockData(10000)
    largeDataset = generateMockData(100000)
  })

  beforeEach(() => {
    filterEngine = new AdvancedFilterEngine()
  })

  describe('Index Building Performance', () => {
    test('should build indices for small dataset quickly', () => {
      const startTime = performance.now()
      filterEngine.setData(smallDataset)
      const endTime = performance.now()
      
      expect(endTime - startTime).toBeLessThan(50) // Should complete in under 50ms
    })

    test('should build indices for medium dataset efficiently', () => {
      const startTime = performance.now()
      filterEngine.setData(mediumDataset)
      const endTime = performance.now()
      
      expect(endTime - startTime).toBeLessThan(200) // Should complete in under 200ms
    })

    test('should build indices for large dataset within acceptable time', () => {
      const startTime = performance.now()
      filterEngine.setData(largeDataset)
      const endTime = performance.now()
      
      expect(endTime - startTime).toBeLessThan(1000) // Should complete in under 1 second
    })
  })

  describe('Simple Filter Performance', () => {
    beforeEach(() => {
      filterEngine.setData(largeDataset)
    })

    test('should filter by exact match quickly using indices', () => {
      const criteria: FilterCriteria = {
        conditions: [{
          id: 'test-1',
          field: 'category',
          operator: 'eq',
          value: 'cpu'
        }],
        grouping: []
      }

      const startTime = performance.now()
      const result = filterEngine.filter(criteria)
      const endTime = performance.now()

      expect(endTime - startTime).toBeLessThan(50) // Should be very fast with indices
      expect(result.length).toBeGreaterThan(0)
    })

    test('should filter by numeric range efficiently', () => {
      const criteria: FilterCriteria = {
        conditions: [{
          id: 'test-2',
          field: 'value',
          operator: 'between',
          value: [25, 75]
        }],
        grouping: []
      }

      const startTime = performance.now()
      const result = filterEngine.filter(criteria)
      const endTime = performance.now()

      expect(endTime - startTime).toBeLessThan(100) // Should complete in under 100ms
      expect(result.length).toBeGreaterThan(0)
    })

    test('should filter by date range using timestamp indices', () => {
      const now = new Date()
      const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000)

      const criteria: FilterCriteria = {
        conditions: [{
          id: 'test-3',
          field: 'timestamp',
          operator: 'between',
          value: [oneHourAgo.toISOString(), now.toISOString()]
        }],
        grouping: []
      }

      const startTime = performance.now()
      const result = filterEngine.filter(criteria)
      const endTime = performance.now()

      expect(endTime - startTime).toBeLessThan(50) // Should be fast with timestamp indices
      expect(result.length).toBeGreaterThan(0)
    })
  })

  describe('Complex Filter Performance', () => {
    beforeEach(() => {
      filterEngine.setData(largeDataset)
    })

    test('should handle multiple AND conditions efficiently', () => {
      const criteria: FilterCriteria = {
        conditions: [
          {
            id: 'test-4a',
            field: 'category',
            operator: 'eq',
            value: 'cpu'
          },
          {
            id: 'test-4b',
            field: 'source',
            operator: 'eq',
            value: 'server-1',
            logicalOperator: 'AND'
          },
          {
            id: 'test-4c',
            field: 'value',
            operator: 'gt',
            value: 50,
            logicalOperator: 'AND'
          }
        ],
        grouping: []
      }

      const startTime = performance.now()
      const result = filterEngine.filter(criteria)
      const endTime = performance.now()

      expect(endTime - startTime).toBeLessThan(100) // Should complete in under 100ms
      expect(result.length).toBeGreaterThan(0)
    })

    test('should handle multiple OR conditions efficiently', () => {
      const criteria: FilterCriteria = {
        conditions: [
          {
            id: 'test-5a',
            field: 'category',
            operator: 'eq',
            value: 'cpu'
          },
          {
            id: 'test-5b',
            field: 'category',
            operator: 'eq',
            value: 'memory',
            logicalOperator: 'OR'
          },
          {
            id: 'test-5c',
            field: 'category',
            operator: 'eq',
            value: 'network',
            logicalOperator: 'OR'
          }
        ],
        grouping: []
      }

      const startTime = performance.now()
      const result = filterEngine.filter(criteria)
      const endTime = performance.now()

      expect(endTime - startTime).toBeLessThan(50) // Should be fast with indices
      expect(result.length).toBeGreaterThan(0)
    })

    test('should handle mixed AND/OR conditions', () => {
      const criteria: FilterCriteria = {
        conditions: [
          {
            id: 'test-6a',
            field: 'category',
            operator: 'eq',
            value: 'cpu'
          },
          {
            id: 'test-6b',
            field: 'category',
            operator: 'eq',
            value: 'memory',
            logicalOperator: 'OR'
          },
          {
            id: 'test-6c',
            field: 'value',
            operator: 'gt',
            value: 25,
            logicalOperator: 'AND'
          }
        ],
        grouping: []
      }

      const startTime = performance.now()
      const result = filterEngine.filter(criteria)
      const endTime = performance.now()

      expect(endTime - startTime).toBeLessThan(100)
      expect(result.length).toBeGreaterThan(0)
    })
  })

  describe('Cache Performance', () => {
    beforeEach(() => {
      filterEngine.setData(mediumDataset)
    })

    test('should cache filter results for repeated queries', () => {
      const criteria: FilterCriteria = {
        conditions: [{
          id: 'test-7',
          field: 'category',
          operator: 'eq',
          value: 'cpu'
        }],
        grouping: []
      }

      // First query - should build cache
      const startTime1 = performance.now()
      const result1 = filterEngine.filter(criteria)
      const endTime1 = performance.now()

      // Second query - should use cache
      const startTime2 = performance.now()
      const result2 = filterEngine.filter(criteria)
      const endTime2 = performance.now()

      expect(result1).toEqual(result2)
      expect(endTime2 - startTime2).toBeLessThan(endTime1 - startTime1) // Cache should be faster
    })
  })

  describe('Memory Usage', () => {
    test('should maintain reasonable memory usage with large datasets', () => {
      const initialMemory = process.memoryUsage().heapUsed

      filterEngine.setData(largeDataset)
      
      const afterIndexingMemory = process.memoryUsage().heapUsed
      const memoryIncrease = afterIndexingMemory - initialMemory

      // Memory increase should be reasonable (less than 100MB for 100k records)
      expect(memoryIncrease).toBeLessThan(100 * 1024 * 1024)
    })

    test('should provide accurate statistics', () => {
      filterEngine.setData(mediumDataset)
      
      const stats = filterEngine.getStats()
      
      expect(stats.dataSize).toBe(mediumDataset.length)
      expect(stats.indexSize).toBeGreaterThan(0)
      expect(stats.indexedFields.length).toBeGreaterThan(0)
      expect(stats.cacheSize).toBe(0) // No filters applied yet
    })
  })

  describe('Incremental Data Addition', () => {
    test('should efficiently add new data points', () => {
      const testEngine = new AdvancedFilterEngine(mediumDataset)
      
      const newData = generateMockData(1000)
      
      const startTime = performance.now()
      testEngine.addData(newData)
      const endTime = performance.now()

      expect(endTime - startTime).toBeLessThan(50) // Should be fast
      expect(testEngine.getStats().dataSize).toBe(mediumDataset.length + newData.length)
    })
  })

  describe('Stress Testing', () => {
    test('should handle rapid filter changes without performance degradation', async () => {
      filterEngine.setData(largeDataset)
      
      const categories = ['cpu', 'memory', 'network', 'disk', 'database']
      const times: number[] = []

      // Apply 50 different filters rapidly
      for (let i = 0; i < 50; i++) {
        const criteria: FilterCriteria = {
          conditions: [{
            id: `stress-${i}`,
            field: 'category',
            operator: 'eq',
            value: categories[i % categories.length]
          }],
          grouping: []
        }

        const startTime = performance.now()
        filterEngine.filter(criteria)
        const endTime = performance.now()
        
        times.push(endTime - startTime)
      }

      // Average time should remain reasonable
      const averageTime = times.reduce((sum, time) => sum + time, 0) / times.length
      expect(averageTime).toBeLessThan(20) // Average under 20ms

      // No significant performance degradation over time
      const firstHalf = times.slice(0, 25).reduce((sum, time) => sum + time, 0) / 25
      const secondHalf = times.slice(25).reduce((sum, time) => sum + time, 0) / 25
      expect(secondHalf).toBeLessThan(firstHalf * 2) // Second half shouldn't be more than 2x slower
    })
  })

  describe('Edge Cases', () => {
    test('should handle empty datasets gracefully', () => {
      filterEngine.setData([])
      
      const criteria: FilterCriteria = {
        conditions: [{
          id: 'empty-test',
          field: 'category',
          operator: 'eq',
          value: 'cpu'
        }],
        grouping: []
      }

      const result = filterEngine.filter(criteria)
      expect(result).toEqual([])
    })

    test('should handle filters with no matches efficiently', () => {
      filterEngine.setData(smallDataset)
      
      const criteria: FilterCriteria = {
        conditions: [{
          id: 'no-match-test',
          field: 'category',
          operator: 'eq',
          value: 'nonexistent-category'
        }],
        grouping: []
      }

      const startTime = performance.now()
      const result = filterEngine.filter(criteria)
      const endTime = performance.now()

      expect(result).toEqual([])
      expect(endTime - startTime).toBeLessThan(10) // Should be fast even with no matches
    })
  })
})