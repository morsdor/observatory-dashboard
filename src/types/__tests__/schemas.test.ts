import {
  DataPointSchema,
  FilterConditionSchema,
  FilterCriteriaSchema,
  FilterGroupSchema,
  FieldDefinitionSchema,
  PerformanceMetricsSchema,
  validateData,
  safeValidateData,
  validateDataArray
} from '../schemas'
import type { DataPoint, FilterCondition, FilterCriteria } from '../index'

describe('Data Model Schemas', () => {
  describe('DataPointSchema', () => {
    const validDataPoint: DataPoint = {
      id: 'test-id-123',
      timestamp: new Date('2024-01-01T12:00:00Z'),
      value: 42.5,
      category: 'cpu',
      metadata: { unit: '%', threshold: 80 },
      source: 'server-1'
    }

    it('should validate a valid DataPoint', () => {
      const result = DataPointSchema.parse(validDataPoint)
      expect(result).toEqual(validDataPoint)
    })

    it('should reject DataPoint with missing required fields', () => {
      const invalidDataPoint = {
        id: 'test-id',
        // missing timestamp
        value: 42.5,
        category: 'cpu',
        source: 'server-1'
      }

      expect(() => DataPointSchema.parse(invalidDataPoint)).toThrow()
    })

    it('should reject DataPoint with invalid value types', () => {
      const invalidDataPoint = {
        ...validDataPoint,
        value: 'not-a-number'
      }

      expect(() => DataPointSchema.parse(invalidDataPoint)).toThrow()
    })

    it('should reject DataPoint with infinite or NaN values', () => {
      const infiniteValue = { ...validDataPoint, value: Infinity }
      const nanValue = { ...validDataPoint, value: NaN }

      expect(() => DataPointSchema.parse(infiniteValue)).toThrow()
      expect(() => DataPointSchema.parse(nanValue)).toThrow()
    })

    it('should provide default empty metadata if not provided', () => {
      const dataPointWithoutMetadata = {
        id: 'test-id',
        timestamp: new Date(),
        value: 42.5,
        category: 'cpu',
        source: 'server-1'
      }

      const result = DataPointSchema.parse(dataPointWithoutMetadata)
      expect(result.metadata).toEqual({})
    })

    it('should reject empty string fields', () => {
      const emptyStringFields = [
        { ...validDataPoint, id: '' },
        { ...validDataPoint, category: '' },
        { ...validDataPoint, source: '' }
      ]

      emptyStringFields.forEach(invalid => {
        expect(() => DataPointSchema.parse(invalid)).toThrow()
      })
    })
  })

  describe('FilterConditionSchema', () => {
    const validFilterCondition: FilterCondition = {
      id: 'filter-1',
      field: 'value',
      operator: 'gt',
      value: 50,
      logicalOperator: 'AND'
    }

    it('should validate a valid FilterCondition', () => {
      const result = FilterConditionSchema.parse(validFilterCondition)
      expect(result).toEqual(validFilterCondition)
    })

    it('should validate FilterCondition without logicalOperator', () => {
      const { logicalOperator, ...conditionWithoutLogical } = validFilterCondition
      const result = FilterConditionSchema.parse(conditionWithoutLogical)
      expect(result.logicalOperator).toBeUndefined()
    })

    it('should reject invalid operators', () => {
      const invalidOperator = {
        ...validFilterCondition,
        operator: 'invalid-operator'
      }

      expect(() => FilterConditionSchema.parse(invalidOperator)).toThrow()
    })

    it('should reject invalid logical operators', () => {
      const invalidLogicalOperator = {
        ...validFilterCondition,
        logicalOperator: 'MAYBE'
      }

      expect(() => FilterConditionSchema.parse(invalidLogicalOperator)).toThrow()
    })

    it('should accept any value type', () => {
      const differentValues = [
        { ...validFilterCondition, value: 'string-value' },
        { ...validFilterCondition, value: [1, 2, 3] },
        { ...validFilterCondition, value: { nested: 'object' } },
        { ...validFilterCondition, value: null },
        { ...validFilterCondition, value: true }
      ]

      differentValues.forEach(condition => {
        expect(() => FilterConditionSchema.parse(condition)).not.toThrow()
      })
    })
  })

  describe('FilterCriteriaSchema', () => {
    const validFilterCriteria: FilterCriteria = {
      conditions: [
        {
          id: 'filter-1',
          field: 'value',
          operator: 'gt',
          value: 50
        }
      ],
      grouping: [
        {
          id: 'group-1',
          conditions: [
            {
              id: 'filter-2',
              field: 'category',
              operator: 'eq',
              value: 'cpu'
            }
          ],
          logicalOperator: 'AND'
        }
      ],
      sortBy: {
        field: 'timestamp',
        direction: 'desc'
      }
    }

    it('should validate a valid FilterCriteria', () => {
      const result = FilterCriteriaSchema.parse(validFilterCriteria)
      expect(result).toEqual(validFilterCriteria)
    })

    it('should validate FilterCriteria without optional fields', () => {
      const minimalCriteria = {
        conditions: [],
        grouping: []
      }

      const result = FilterCriteriaSchema.parse(minimalCriteria)
      expect(result.sortBy).toBeUndefined()
    })

    it('should reject invalid sort direction', () => {
      const invalidSort = {
        ...validFilterCriteria,
        sortBy: {
          field: 'timestamp',
          direction: 'invalid'
        }
      }

      expect(() => FilterCriteriaSchema.parse(invalidSort)).toThrow()
    })
  })

  describe('FieldDefinitionSchema', () => {
    it('should validate field definitions for all types', () => {
      const fieldTypes = ['string', 'number', 'date', 'boolean', 'category'] as const
      
      fieldTypes.forEach(type => {
        const field = {
          name: `test-${type}`,
          label: `Test ${type}`,
          type
        }

        expect(() => FieldDefinitionSchema.parse(field)).not.toThrow()
      })
    })

    it('should validate category field with options', () => {
      const categoryField = {
        name: 'status',
        label: 'Status',
        type: 'category' as const,
        options: ['active', 'inactive', 'pending']
      }

      const result = FieldDefinitionSchema.parse(categoryField)
      expect(result.options).toEqual(['active', 'inactive', 'pending'])
    })

    it('should reject invalid field types', () => {
      const invalidField = {
        name: 'test',
        label: 'Test',
        type: 'invalid-type'
      }

      expect(() => FieldDefinitionSchema.parse(invalidField)).toThrow()
    })
  })

  describe('PerformanceMetricsSchema', () => {
    const validMetrics = {
      fps: 60,
      memoryUsage: 1024,
      dataPointsPerSecond: 100,
      renderTime: 16.67,
      filterTime: 5.2
    }

    it('should validate valid performance metrics', () => {
      const result = PerformanceMetricsSchema.parse(validMetrics)
      expect(result).toEqual(validMetrics)
    })

    it('should reject negative values', () => {
      const negativeValues = [
        { ...validMetrics, fps: -1 },
        { ...validMetrics, memoryUsage: -100 },
        { ...validMetrics, dataPointsPerSecond: -50 },
        { ...validMetrics, renderTime: -10 },
        { ...validMetrics, filterTime: -5 }
      ]

      negativeValues.forEach(invalid => {
        expect(() => PerformanceMetricsSchema.parse(invalid)).toThrow()
      })
    })

    it('should reject fps values above 120', () => {
      const highFps = { ...validMetrics, fps: 150 }
      expect(() => PerformanceMetricsSchema.parse(highFps)).toThrow()
    })
  })
})

describe('Validation Utilities', () => {
  const validDataPoint: DataPoint = {
    id: 'test-id',
    timestamp: new Date(),
    value: 42.5,
    category: 'cpu',
    metadata: {},
    source: 'server-1'
  }

  describe('validateData', () => {
    it('should return success for valid data', () => {
      const result = validateData(DataPointSchema, validDataPoint)
      
      expect(result.success).toBe(true)
      expect(result.data).toEqual(validDataPoint)
      expect(result.errors).toBeUndefined()
    })

    it('should return errors for invalid data', () => {
      const invalidData = { ...validDataPoint, value: 'not-a-number' }
      const result = validateData(DataPointSchema, invalidData)
      
      expect(result.success).toBe(false)
      expect(result.data).toBeUndefined()
      expect(result.errors).toBeDefined()
      expect(result.errors!.length).toBeGreaterThan(0)
    })

    it('should handle non-Zod errors gracefully', () => {
      const result = validateData(DataPointSchema, null)
      
      expect(result.success).toBe(false)
      expect(result.errors).toBeDefined()
    })
  })

  describe('safeValidateData', () => {
    it('should return success for valid data', () => {
      const result = safeValidateData(DataPointSchema, validDataPoint)
      
      expect(result.success).toBe(true)
      expect(result.data).toEqual(validDataPoint)
    })

    it('should return formatted errors for invalid data', () => {
      const invalidData = { 
        id: '', // Invalid: empty string
        timestamp: 'not-a-date', // Invalid: not a date
        value: 'not-a-number' // Invalid: not a number
      }
      
      const result = safeValidateData(DataPointSchema, invalidData)
      
      expect(result.success).toBe(false)
      expect(result.errors).toBeDefined()
      expect(result.errors!.length).toBeGreaterThan(0)
      
      // Check that error messages contain field paths
      const errorString = result.errors!.join(' ')
      expect(errorString).toContain('id')
      expect(errorString).toContain('timestamp')
      expect(errorString).toContain('value')
    })
  })

  describe('validateDataArray', () => {
    it('should separate valid and invalid items', () => {
      const mixedData = [
        validDataPoint,
        { ...validDataPoint, id: 'valid-2' },
        { ...validDataPoint, value: 'invalid' }, // Invalid
        { ...validDataPoint, id: '' }, // Invalid
        { ...validDataPoint, id: 'valid-3' }
      ]
      
      const result = validateDataArray(DataPointSchema, mixedData)
      
      expect(result.valid).toHaveLength(3)
      expect(result.invalid).toHaveLength(2)
      
      // Check invalid items have correct indices
      expect(result.invalid[0].index).toBe(2)
      expect(result.invalid[1].index).toBe(3)
      
      // Check that all valid items are properly typed
      result.valid.forEach(item => {
        expect(typeof item.id).toBe('string')
        expect(item.timestamp).toBeInstanceOf(Date)
        expect(typeof item.value).toBe('number')
      })
    })

    it('should handle empty array', () => {
      const result = validateDataArray(DataPointSchema, [])
      
      expect(result.valid).toHaveLength(0)
      expect(result.invalid).toHaveLength(0)
    })

    it('should handle all invalid items', () => {
      const invalidData = [
        { invalid: 'data' },
        { also: 'invalid' },
        null,
        undefined
      ]
      
      const result = validateDataArray(DataPointSchema, invalidData)
      
      expect(result.valid).toHaveLength(0)
      expect(result.invalid).toHaveLength(4)
      
      result.invalid.forEach((item, index) => {
        expect(item.index).toBe(index)
        expect(item.errors.length).toBeGreaterThan(0)
      })
    })
  })
})