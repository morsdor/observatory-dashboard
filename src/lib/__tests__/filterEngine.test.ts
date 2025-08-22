import { AdvancedFilterEngine } from '../filterEngine'
import { DataPoint, FilterCondition, FilterCriteria, FilterGroup } from '@/types'

describe('AdvancedFilterEngine', () => {
  let filterEngine: AdvancedFilterEngine
  let mockData: DataPoint[]

  beforeEach(() => {
    mockData = [
      {
        id: '1',
        timestamp: new Date('2024-01-01T10:00:00Z'),
        value: 25,
        category: 'cpu',
        source: 'server-1',
        metadata: { region: 'us-east', priority: 'high' }
      },
      {
        id: '2',
        timestamp: new Date('2024-01-01T11:00:00Z'),
        value: 75,
        category: 'memory',
        source: 'server-1',
        metadata: { region: 'us-east', priority: 'normal' }
      },
      {
        id: '3',
        timestamp: new Date('2024-01-01T12:00:00Z'),
        value: 50,
        category: 'cpu',
        source: 'server-2',
        metadata: { region: 'us-west', priority: 'high' }
      },
      {
        id: '4',
        timestamp: new Date('2024-01-01T13:00:00Z'),
        value: 90,
        category: 'network',
        source: 'server-2',
        metadata: { region: 'us-west', priority: 'normal' }
      }
    ]

    filterEngine = new AdvancedFilterEngine(mockData)
  })

  describe('Basic Filtering', () => {
    test('should filter by exact match', () => {
      const criteria: FilterCriteria = {
        conditions: [{
          id: 'test-1',
          field: 'category',
          operator: 'eq',
          value: 'cpu'
        }],
        grouping: []
      }

      const result = filterEngine.filter(criteria)
      expect(result).toHaveLength(2)
      expect(result.every(item => item.category === 'cpu')).toBe(true)
    })

    test('should filter by greater than', () => {
      const criteria: FilterCriteria = {
        conditions: [{
          id: 'test-2',
          field: 'value',
          operator: 'gt',
          value: 50
        }],
        grouping: []
      }

      const result = filterEngine.filter(criteria)
      expect(result).toHaveLength(2)
      expect(result.every(item => item.value > 50)).toBe(true)
    })

    test('should filter by less than', () => {
      const criteria: FilterCriteria = {
        conditions: [{
          id: 'test-3',
          field: 'value',
          operator: 'lt',
          value: 60
        }],
        grouping: []
      }

      const result = filterEngine.filter(criteria)
      expect(result).toHaveLength(2)
      expect(result.every(item => item.value < 60)).toBe(true)
    })

    test('should filter by contains', () => {
      const criteria: FilterCriteria = {
        conditions: [{
          id: 'test-4',
          field: 'source',
          operator: 'contains',
          value: 'server'
        }],
        grouping: []
      }

      const result = filterEngine.filter(criteria)
      expect(result).toHaveLength(4) // All items contain 'server'
    })

    test('should filter by between range', () => {
      const criteria: FilterCriteria = {
        conditions: [{
          id: 'test-5',
          field: 'value',
          operator: 'between',
          value: [30, 80]
        }],
        grouping: []
      }

      const result = filterEngine.filter(criteria)
      expect(result).toHaveLength(2)
      expect(result.every(item => item.value >= 30 && item.value <= 80)).toBe(true)
    })

    test('should filter by in array', () => {
      const criteria: FilterCriteria = {
        conditions: [{
          id: 'test-6',
          field: 'category',
          operator: 'in',
          value: ['cpu', 'memory']
        }],
        grouping: []
      }

      const result = filterEngine.filter(criteria)
      expect(result).toHaveLength(3)
      expect(result.every(item => ['cpu', 'memory'].includes(item.category))).toBe(true)
    })

    test('should filter by not in array', () => {
      const criteria: FilterCriteria = {
        conditions: [{
          id: 'test-7',
          field: 'category',
          operator: 'not_in',
          value: ['cpu', 'memory']
        }],
        grouping: []
      }

      const result = filterEngine.filter(criteria)
      expect(result).toHaveLength(1)
      expect(result[0].category).toBe('network')
    })
  })

  describe('Date Range Filtering', () => {
    test('should filter by date range', () => {
      const criteria: FilterCriteria = {
        conditions: [{
          id: 'test-8',
          field: 'timestamp',
          operator: 'between',
          value: ['2024-01-01T10:30:00Z', '2024-01-01T12:30:00Z']
        }],
        grouping: []
      }

      const result = filterEngine.filter(criteria)
      expect(result).toHaveLength(2)
      expect(result.map(item => item.id)).toEqual(['2', '3'])
    })
  })

  describe('Metadata Filtering', () => {
    test('should filter by metadata fields', () => {
      const criteria: FilterCriteria = {
        conditions: [{
          id: 'test-9',
          field: 'metadata.region',
          operator: 'eq',
          value: 'us-east'
        }],
        grouping: []
      }

      const result = filterEngine.filter(criteria)
      expect(result).toHaveLength(2)
      expect(result.every(item => item.metadata.region === 'us-east')).toBe(true)
    })

    test('should filter by nested metadata with dot notation', () => {
      const criteria: FilterCriteria = {
        conditions: [{
          id: 'test-10',
          field: 'priority',
          operator: 'eq',
          value: 'high'
        }],
        grouping: []
      }

      const result = filterEngine.filter(criteria)
      expect(result).toHaveLength(2)
      expect(result.every(item => item.metadata.priority === 'high')).toBe(true)
    })
  })

  describe('Logical Operations', () => {
    test('should handle AND conditions', () => {
      const criteria: FilterCriteria = {
        conditions: [
          {
            id: 'test-11a',
            field: 'category',
            operator: 'eq',
            value: 'cpu'
          },
          {
            id: 'test-11b',
            field: 'source',
            operator: 'eq',
            value: 'server-1',
            logicalOperator: 'AND'
          }
        ],
        grouping: []
      }

      const result = filterEngine.filter(criteria)
      expect(result).toHaveLength(1)
      expect(result[0].id).toBe('1')
    })

    test('should handle OR conditions', () => {
      const criteria: FilterCriteria = {
        conditions: [
          {
            id: 'test-12a',
            field: 'category',
            operator: 'eq',
            value: 'cpu'
          },
          {
            id: 'test-12b',
            field: 'category',
            operator: 'eq',
            value: 'memory',
            logicalOperator: 'OR'
          }
        ],
        grouping: []
      }

      const result = filterEngine.filter(criteria)
      expect(result).toHaveLength(3)
      expect(result.every(item => ['cpu', 'memory'].includes(item.category))).toBe(true)
    })

    test('should handle mixed AND/OR conditions', () => {
      const criteria: FilterCriteria = {
        conditions: [
          {
            id: 'test-13a',
            field: 'category',
            operator: 'eq',
            value: 'cpu'
          },
          {
            id: 'test-13b',
            field: 'category',
            operator: 'eq',
            value: 'memory',
            logicalOperator: 'OR'
          },
          {
            id: 'test-13c',
            field: 'value',
            operator: 'gt',
            value: 30,
            logicalOperator: 'AND'
          }
        ],
        grouping: []
      }

      const result = filterEngine.filter(criteria)
      expect(result).toHaveLength(2)
      expect(result.map(item => item.id).sort()).toEqual(['2', '3'])
    })
  })

  describe('Filter Groups', () => {
    test('should handle simple filter groups', () => {
      const group: FilterGroup = {
        id: 'group-1',
        conditions: [
          {
            id: 'test-14a',
            field: 'category',
            operator: 'eq',
            value: 'cpu'
          },
          {
            id: 'test-14b',
            field: 'source',
            operator: 'eq',
            value: 'server-2',
            logicalOperator: 'AND'
          }
        ],
        logicalOperator: 'AND'
      }

      const criteria: FilterCriteria = {
        conditions: [],
        grouping: [group]
      }

      const result = filterEngine.filter(criteria)
      expect(result).toHaveLength(1)
      expect(result[0].id).toBe('3')
    })

    test('should handle multiple filter groups with OR', () => {
      const group1: FilterGroup = {
        id: 'group-1',
        conditions: [{
          id: 'test-15a',
          field: 'category',
          operator: 'eq',
          value: 'cpu'
        }],
        logicalOperator: 'AND'
      }

      const group2: FilterGroup = {
        id: 'group-2',
        conditions: [{
          id: 'test-15b',
          field: 'category',
          operator: 'eq',
          value: 'memory'
        }],
        logicalOperator: 'OR'
      }

      const criteria: FilterCriteria = {
        conditions: [],
        grouping: [group1, group2]
      }

      const result = filterEngine.filter(criteria)
      expect(result).toHaveLength(3)
      expect(result.every(item => ['cpu', 'memory'].includes(item.category))).toBe(true)
    })
  })

  describe('Sorting', () => {
    test('should sort results in ascending order', () => {
      const criteria: FilterCriteria = {
        conditions: [],
        grouping: [],
        sortBy: {
          field: 'value',
          direction: 'asc'
        }
      }

      const result = filterEngine.filter(criteria)
      expect(result).toHaveLength(4)
      expect(result.map(item => item.value)).toEqual([25, 50, 75, 90])
    })

    test('should sort results in descending order', () => {
      const criteria: FilterCriteria = {
        conditions: [],
        grouping: [],
        sortBy: {
          field: 'value',
          direction: 'desc'
        }
      }

      const result = filterEngine.filter(criteria)
      expect(result).toHaveLength(4)
      expect(result.map(item => item.value)).toEqual([90, 75, 50, 25])
    })
  })

  describe('Data Management', () => {
    test('should add new data incrementally', () => {
      const newData: DataPoint[] = [{
        id: '5',
        timestamp: new Date('2024-01-01T14:00:00Z'),
        value: 60,
        category: 'disk',
        source: 'server-3',
        metadata: { region: 'eu-west', priority: 'low' }
      }]

      filterEngine.addData(newData)

      const criteria: FilterCriteria = {
        conditions: [{
          id: 'test-16',
          field: 'category',
          operator: 'eq',
          value: 'disk'
        }],
        grouping: []
      }

      const result = filterEngine.filter(criteria)
      expect(result).toHaveLength(1)
      expect(result[0].id).toBe('5')
    })

    test('should provide accurate statistics', () => {
      const stats = filterEngine.getStats()
      
      expect(stats.dataSize).toBe(4)
      expect(stats.indexSize).toBeGreaterThan(0)
      expect(stats.indexedFields).toContain('category')
      expect(stats.indexedFields).toContain('source')
      expect(stats.cacheSize).toBe(0) // No filters cached yet
    })
  })

  describe('Edge Cases', () => {
    test('should handle empty filter criteria', () => {
      const criteria: FilterCriteria = {
        conditions: [],
        grouping: []
      }

      const result = filterEngine.filter(criteria)
      expect(result).toHaveLength(4) // Should return all data
    })

    test('should handle invalid field names gracefully', () => {
      const criteria: FilterCriteria = {
        conditions: [{
          id: 'test-17',
          field: 'nonexistent_field',
          operator: 'eq',
          value: 'test'
        }],
        grouping: []
      }

      const result = filterEngine.filter(criteria)
      expect(result).toHaveLength(0) // Should return no results
    })

    test('should handle null/undefined values', () => {
      const dataWithNulls: DataPoint[] = [
        ...mockData,
        {
          id: '6',
          timestamp: new Date('2024-01-01T15:00:00Z'),
          value: 0,
          category: '',
          source: 'server-4',
          metadata: {}
        }
      ]

      filterEngine.setData(dataWithNulls)

      const criteria: FilterCriteria = {
        conditions: [{
          id: 'test-18',
          field: 'category',
          operator: 'eq',
          value: ''
        }],
        grouping: []
      }

      const result = filterEngine.filter(criteria)
      expect(result).toHaveLength(1)
      expect(result[0].id).toBe('6')
    })
  })
})