import { 
  DataValidator, 
  dataValidator, 
  validateSingleDataPoint, 
  validateDataPointArray, 
  isDataPointValid, 
  correctDataPoint 
} from '@/lib/dataValidation'
import { DataPoint } from '@/types'

describe('DataValidation', () => {
  beforeEach(() => {
    dataValidator.clearCache()
  })

  describe('Single Data Point Validation', () => {
    it('should validate correct data point', () => {
      const validDataPoint: DataPoint = {
        id: 'test-1',
        timestamp: new Date(),
        value: 42.5,
        category: 'temperature',
        metadata: { sensor: 'A1' },
        source: 'sensor-network'
      }

      const report = validateSingleDataPoint(validDataPoint)

      expect(report.isValid).toBe(true)
      expect(report.errors).toHaveLength(0)
      expect(report.confidence).toBe(100)
    })

    it('should detect missing required fields', () => {
      const invalidDataPoint = {
        id: 'test-1',
        // missing timestamp
        value: 42.5,
        category: 'temperature',
        source: 'sensor-network'
      }

      const report = validateSingleDataPoint(invalidDataPoint)

      expect(report.isValid).toBe(false)
      expect(report.errors).toContainEqual(
        expect.objectContaining({
          field: 'timestamp',
          code: 'invalid_type'
        })
      )
    })

    it('should detect invalid data types', () => {
      const invalidDataPoint = {
        id: 'test-1',
        timestamp: new Date(),
        value: 'not-a-number', // Should be number
        category: 'temperature',
        metadata: {},
        source: 'sensor-network'
      }

      const report = validateSingleDataPoint(invalidDataPoint)

      expect(report.isValid).toBe(false)
      expect(report.errors).toContainEqual(
        expect.objectContaining({
          field: 'value',
          code: 'invalid_type'
        })
      )
    })

    it('should detect infinite and NaN values', () => {
      const invalidDataPoint = {
        id: 'test-1',
        timestamp: new Date(),
        value: Infinity,
        category: 'temperature',
        metadata: {},
        source: 'sensor-network'
      }

      const report = validateSingleDataPoint(invalidDataPoint)

      expect(report.isValid).toBe(false)
      expect(report.errors).toContainEqual(
        expect.objectContaining({
          field: 'value',
          message: 'Value must be a finite number'
        })
      )
    })

    it('should warn about future timestamps', () => {
      const futureDate = new Date()
      futureDate.setFullYear(futureDate.getFullYear() + 1)

      const dataPoint: DataPoint = {
        id: 'test-1',
        timestamp: futureDate,
        value: 42.5,
        category: 'temperature',
        metadata: {},
        source: 'sensor-network'
      }

      const report = validateSingleDataPoint(dataPoint)

      expect(report.isValid).toBe(true) // Valid but with warnings
      expect(report.warnings).toContainEqual(
        expect.objectContaining({
          field: 'timestamp',
          code: 'FUTURE_TIMESTAMP'
        })
      )
    })

    it('should warn about old timestamps', () => {
      const oldDate = new Date()
      oldDate.setFullYear(oldDate.getFullYear() - 2)

      const dataPoint: DataPoint = {
        id: 'test-1',
        timestamp: oldDate,
        value: 42.5,
        category: 'temperature',
        metadata: {},
        source: 'sensor-network'
      }

      const report = validateSingleDataPoint(dataPoint)

      expect(report.warnings).toContainEqual(
        expect.objectContaining({
          field: 'timestamp',
          code: 'OLD_TIMESTAMP'
        })
      )
    })

    it('should warn about extreme values', () => {
      const dataPoint: DataPoint = {
        id: 'test-1',
        timestamp: new Date(),
        value: 1e15, // Extremely large value
        category: 'temperature',
        metadata: {},
        source: 'sensor-network'
      }

      const report = validateSingleDataPoint(dataPoint)

      expect(report.warnings).toContainEqual(
        expect.objectContaining({
          field: 'value',
          code: 'EXTREME_VALUE'
        })
      )
    })

    it('should warn about zero values', () => {
      const dataPoint: DataPoint = {
        id: 'test-1',
        timestamp: new Date(),
        value: 0,
        category: 'temperature',
        metadata: {},
        source: 'sensor-network'
      }

      const report = validateSingleDataPoint(dataPoint)

      expect(report.warnings).toContainEqual(
        expect.objectContaining({
          field: 'value',
          code: 'ZERO_VALUE'
        })
      )
    })

    it('should warn about short IDs', () => {
      const dataPoint: DataPoint = {
        id: 'x', // Very short ID
        timestamp: new Date(),
        value: 42.5,
        category: 'temperature',
        metadata: {},
        source: 'sensor-network'
      }

      const report = validateSingleDataPoint(dataPoint)

      expect(report.warnings).toContainEqual(
        expect.objectContaining({
          field: 'id',
          code: 'SHORT_ID'
        })
      )
    })

    it('should calculate confidence based on errors and warnings', () => {
      const dataPointWithWarnings: DataPoint = {
        id: 'x', // Short ID (warning)
        timestamp: new Date(),
        value: 0, // Zero value (warning)
        category: 'temperature',
        metadata: {},
        source: 'sensor-network'
      }

      const report = validateSingleDataPoint(dataPointWithWarnings)

      expect(report.isValid).toBe(true)
      expect(report.confidence).toBeLessThan(100)
      expect(report.warnings).toHaveLength(2)
    })
  })

  describe('Array Validation', () => {
    it('should validate array of data points', () => {
      const dataPoints = [
        {
          id: 'test-1',
          timestamp: new Date(),
          value: 42.5,
          category: 'temperature',
          metadata: {},
          source: 'sensor-network'
        },
        {
          id: 'test-2',
          timestamp: new Date(),
          value: 43.0,
          category: 'temperature',
          metadata: {},
          source: 'sensor-network'
        }
      ]

      const result = validateDataPointArray(dataPoints)

      expect(result.validPoints).toHaveLength(2)
      expect(result.invalidPoints).toHaveLength(0)
      expect(result.overallReport.isValid).toBe(true)
    })

    it('should separate valid and invalid points', () => {
      const mixedData = [
        {
          id: 'valid-1',
          timestamp: new Date(),
          value: 42.5,
          category: 'temperature',
          metadata: {},
          source: 'sensor-network'
        },
        {
          id: 'invalid-1',
          // missing timestamp
          value: 43.0,
          category: 'temperature',
          source: 'sensor-network'
        },
        {
          id: 'valid-2',
          timestamp: new Date(),
          value: 44.0,
          category: 'temperature',
          metadata: {},
          source: 'sensor-network'
        }
      ]

      const result = validateDataPointArray(mixedData)

      expect(result.validPoints).toHaveLength(2)
      expect(result.invalidPoints).toHaveLength(1)
      expect(result.invalidPoints[0].index).toBe(1)
      expect(result.overallReport.confidence).toBeCloseTo(66.67, 1)
    })

    it('should perform integrity checks', () => {
      const dataWithDuplicates = [
        {
          id: 'duplicate',
          timestamp: new Date('2023-01-01'),
          value: 42.5,
          category: 'temperature',
          metadata: {},
          source: 'sensor-network'
        },
        {
          id: 'duplicate', // Duplicate ID
          timestamp: new Date('2023-01-02'),
          value: 43.0,
          category: 'temperature',
          metadata: {},
          source: 'sensor-network'
        }
      ]

      const result = validateDataPointArray(dataWithDuplicates)

      expect(result.integrityCheck.duplicateIds).toContain('duplicate')
    })

    it('should detect out-of-order timestamps', () => {
      const outOfOrderData = [
        {
          id: 'test-1',
          timestamp: new Date('2023-01-02'),
          value: 42.5,
          category: 'temperature',
          metadata: {},
          source: 'sensor-network'
        },
        {
          id: 'test-2',
          timestamp: new Date('2023-01-01'), // Earlier than previous
          value: 43.0,
          category: 'temperature',
          metadata: {},
          source: 'sensor-network'
        }
      ]

      const result = validateDataPointArray(outOfOrderData)

      expect(result.integrityCheck.outOfOrderTimestamps).toBe(1)
    })
  })

  describe('Suspicious Pattern Detection', () => {
    it('should detect sudden spikes', () => {
      const dataWithSpikes = Array.from({ length: 20 }, (_, i) => ({
        id: `spike-${i}`,
        timestamp: new Date(),
        value: i < 10 ? 10 : 1000, // Sudden spike after index 10
        category: 'temperature',
        metadata: {},
        source: 'sensor-network'
      }))

      const result = validateDataPointArray(dataWithSpikes)

      const spikePattern = result.integrityCheck.suspiciousPatterns.find(
        p => p.type === 'sudden_spike'
      )
      expect(spikePattern).toBeDefined()
      expect(spikePattern?.affectedPoints).toBeGreaterThan(0)
    })

    it('should detect constant values', () => {
      const constantData = Array.from({ length: 15 }, (_, i) => ({
        id: `constant-${i}`,
        timestamp: new Date(),
        value: 42, // All same value
        category: 'temperature',
        metadata: {},
        source: 'sensor-network'
      }))

      const result = validateDataPointArray(constantData)

      const constantPattern = result.integrityCheck.suspiciousPatterns.find(
        p => p.type === 'constant_value'
      )
      expect(constantPattern).toBeDefined()
      expect(constantPattern?.confidence).toBe(99)
    })

    it('should detect temporal anomalies', () => {
      const temporalAnomalyData = [
        {
          id: 'temporal-1',
          timestamp: new Date('2023-01-01'),
          value: 42,
          category: 'temperature',
          metadata: {},
          source: 'sensor-network'
        },
        {
          id: 'temporal-2',
          timestamp: new Date('2022-12-31'), // Goes back in time
          value: 43,
          category: 'temperature',
          metadata: {},
          source: 'sensor-network'
        }
      ]

      const result = validateDataPointArray(temporalAnomalyData)

      const temporalPattern = result.integrityCheck.suspiciousPatterns.find(
        p => p.type === 'temporal_anomaly'
      )
      expect(temporalPattern).toBeDefined()
    })
  })

  describe('Data Correction', () => {
    it('should correct string timestamps', () => {
      const dataWithStringTimestamp = {
        id: 'test-1',
        timestamp: '2023-01-01T00:00:00Z', // String instead of Date
        value: 42.5,
        category: 'temperature',
        metadata: {},
        source: 'sensor-network'
      }

      const correction = dataValidator.attemptDataCorrection(dataWithStringTimestamp)

      expect(correction.corrected).toBe(true)
      expect(correction.data.timestamp).toBeInstanceOf(Date)
      expect(correction.changes).toContain('Converted string timestamp to Date object')
    })

    it('should correct string numbers', () => {
      const dataWithStringValue = {
        id: 'test-1',
        timestamp: new Date(),
        value: '42.5', // String instead of number
        category: 'temperature',
        metadata: {},
        source: 'sensor-network'
      }

      const correction = dataValidator.attemptDataCorrection(dataWithStringValue)

      expect(correction.corrected).toBe(true)
      expect(typeof correction.data.value).toBe('number')
      expect(correction.data.value).toBe(42.5)
      expect(correction.changes).toContain('Converted string value to number')
    })

    it('should trim whitespace from strings', () => {
      const dataWithWhitespace = {
        id: '  test-1  ',
        timestamp: new Date(),
        value: 42.5,
        category: '  temperature  ',
        metadata: {},
        source: '  sensor-network  '
      }

      const correction = dataValidator.attemptDataCorrection(dataWithWhitespace)

      expect(correction.corrected).toBe(true)
      expect(correction.data.id).toBe('test-1')
      expect(correction.data.category).toBe('temperature')
      expect(correction.data.source).toBe('sensor-network')
    })

    it('should initialize missing metadata', () => {
      const dataWithoutMetadata = {
        id: 'test-1',
        timestamp: new Date(),
        value: 42.5,
        category: 'temperature',
        source: 'sensor-network'
        // missing metadata
      }

      const correction = dataValidator.attemptDataCorrection(dataWithoutMetadata)

      expect(correction.corrected).toBe(true)
      expect(correction.data.metadata).toEqual({})
      expect(correction.changes).toContain('Initialized empty metadata object')
    })
  })

  describe('Utility Functions', () => {
    it('should check if data point is valid', () => {
      const validDataPoint: DataPoint = {
        id: 'test-1',
        timestamp: new Date(),
        value: 42.5,
        category: 'temperature',
        metadata: {},
        source: 'sensor-network'
      }

      expect(isDataPointValid(validDataPoint)).toBe(true)

      const invalidDataPoint = {
        id: 'test-1',
        // missing timestamp
        value: 42.5,
        category: 'temperature',
        source: 'sensor-network'
      }

      expect(isDataPointValid(invalidDataPoint)).toBe(false)
    })

    it('should correct and validate data point', () => {
      const correctableData = {
        id: 'test-1',
        timestamp: '2023-01-01T00:00:00Z', // String timestamp
        value: '42.5', // String value
        category: 'temperature',
        metadata: {},
        source: 'sensor-network'
      }

      const result = correctDataPoint(correctableData)

      expect(result.success).toBe(true)
      expect(result.data).toBeDefined()
      expect(result.data?.timestamp).toBeInstanceOf(Date)
      expect(typeof result.data?.value).toBe('number')
    })

    it('should return errors for uncorrectable data', () => {
      const uncorrectableData = {
        id: 'test-1',
        // missing timestamp entirely
        value: 'not-a-number',
        category: 'temperature',
        source: 'sensor-network'
      }

      const result = correctDataPoint(uncorrectableData)

      expect(result.success).toBe(false)
      expect(result.errors).toBeDefined()
      expect(result.errors!.length).toBeGreaterThan(0)
    })
  })

  describe('Validation Statistics', () => {
    it('should track validation statistics', () => {
      // Perform some validations
      validateSingleDataPoint({ id: 'test-1', timestamp: new Date(), value: 42, category: 'test', metadata: {}, source: 'test' })
      validateSingleDataPoint({ id: 'test-2' }) // Invalid
      validateSingleDataPoint({ id: 'test-3', timestamp: new Date(), value: 43, category: 'test', metadata: {}, source: 'test' })

      const stats = dataValidator.getValidationStats()

      expect(stats.cacheSize).toBe(3)
      expect(stats.commonErrors.length).toBeGreaterThan(0)
      expect(stats.averageConfidence).toBeGreaterThan(0)
    })

    it('should clear validation cache', () => {
      validateSingleDataPoint({ id: 'test-1', timestamp: new Date(), value: 42, category: 'test', metadata: {}, source: 'test' })
      
      expect(dataValidator.getValidationStats().cacheSize).toBe(1)
      
      dataValidator.clearCache()
      
      expect(dataValidator.getValidationStats().cacheSize).toBe(0)
    })
  })

  describe('Performance', () => {
    it('should handle large datasets efficiently', () => {
      const largeDataset = Array.from({ length: 10000 }, (_, i) => ({
        id: `perf-${i}`,
        timestamp: new Date(),
        value: Math.random() * 100,
        category: 'performance',
        metadata: {},
        source: 'perf-test'
      }))

      const startTime = Date.now()
      const result = validateDataPointArray(largeDataset)
      const endTime = Date.now()

      expect(result.validPoints).toHaveLength(10000)
      expect(endTime - startTime).toBeLessThan(5000) // Should complete within 5 seconds
    })

    it('should use validation cache for repeated validations', () => {
      const dataPoint = {
        id: 'cache-test',
        timestamp: new Date(),
        value: 42,
        category: 'test',
        metadata: {},
        source: 'test'
      }

      // First validation
      const startTime1 = Date.now()
      validateSingleDataPoint(dataPoint)
      const endTime1 = Date.now()

      // Second validation (should use cache)
      const startTime2 = Date.now()
      validateSingleDataPoint(dataPoint)
      const endTime2 = Date.now()

      // Cached validation should be faster
      expect(endTime2 - startTime2).toBeLessThanOrEqual(endTime1 - startTime1)
    })
  })
})