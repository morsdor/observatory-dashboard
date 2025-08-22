import { z } from 'zod'
import { DataPoint, FilterCriteria } from '@/types'
import { DataPointSchema, FilterCriteriaSchema } from '@/types/schemas'

export interface ValidationReport {
  isValid: boolean
  errors: ValidationError[]
  warnings: ValidationWarning[]
  correctedData?: any
  confidence: number
  timestamp: Date
}

export interface ValidationError {
  field: string
  message: string
  severity: 'low' | 'medium' | 'high' | 'critical'
  code: string
  value?: any
  suggestion?: string
}

export interface ValidationWarning {
  field: string
  message: string
  code: string
  value?: any
  suggestion?: string
}

export interface DataIntegrityCheck {
  duplicateIds: string[]
  missingTimestamps: number
  outOfOrderTimestamps: number
  invalidValues: number
  missingRequiredFields: number
  suspiciousPatterns: SuspiciousPattern[]
}

export interface SuspiciousPattern {
  type: 'sudden_spike' | 'constant_value' | 'impossible_value' | 'temporal_anomaly'
  description: string
  affectedPoints: number
  confidence: number
}

// Enhanced data point validation with corruption detection
export class DataValidator {
  private static instance: DataValidator
  private validationCache = new Map<string, ValidationReport>()
  private integrityHistory: DataIntegrityCheck[] = []

  static getInstance(): DataValidator {
    if (!DataValidator.instance) {
      DataValidator.instance = new DataValidator()
    }
    return DataValidator.instance
  }

  // Validate single data point with detailed error reporting
  validateDataPoint(data: unknown, context?: string): ValidationReport {
    const cacheKey = JSON.stringify(data) + (context || '')
    
    if (this.validationCache.has(cacheKey)) {
      return this.validationCache.get(cacheKey)!
    }

    const report: ValidationReport = {
      isValid: true,
      errors: [],
      warnings: [],
      confidence: 100,
      timestamp: new Date()
    }

    try {
      // Basic schema validation
      const result = DataPointSchema.safeParse(data)
      
      if (!result.success) {
        result.error.errors.forEach(error => {
          report.errors.push({
            field: error.path.join('.'),
            message: error.message,
            severity: this.determineSeverity(error.code),
            code: error.code,
            value: error.path.reduce((obj: any, key) => obj?.[key], data),
            suggestion: this.getSuggestion(error.code, error.path.join('.'))
          })
        })
        report.isValid = false
        report.confidence = 0
      } else {
        // Additional validation checks
        const dataPoint = result.data as DataPoint
        this.performAdditionalValidation(dataPoint, report)
      }
    } catch (error) {
      report.errors.push({
        field: 'unknown',
        message: error instanceof Error ? error.message : 'Unknown validation error',
        severity: 'critical',
        code: 'VALIDATION_EXCEPTION'
      })
      report.isValid = false
      report.confidence = 0
    }

    // Calculate confidence based on errors and warnings
    report.confidence = this.calculateConfidence(report.errors, report.warnings)

    // Cache the result
    this.validationCache.set(cacheKey, report)
    
    return report
  }

  // Validate array of data points with batch processing
  validateDataArray(dataArray: unknown[]): {
    validPoints: DataPoint[]
    invalidPoints: { index: number, data: unknown, report: ValidationReport }[]
    integrityCheck: DataIntegrityCheck
    overallReport: ValidationReport
  } {
    const validPoints: DataPoint[] = []
    const invalidPoints: { index: number, data: unknown, report: ValidationReport }[] = []
    const allErrors: ValidationError[] = []
    const allWarnings: ValidationWarning[] = []

    // Validate each point
    dataArray.forEach((data, index) => {
      const report = this.validateDataPoint(data, `batch_${index}`)
      
      if (report.isValid && report.correctedData) {
        validPoints.push(report.correctedData as DataPoint)
      } else if (report.isValid) {
        validPoints.push(data as DataPoint)
      } else {
        invalidPoints.push({ index, data, report })
      }

      allErrors.push(...report.errors)
      allWarnings.push(...report.warnings)
    })

    // Perform integrity checks on valid points
    const integrityCheck = this.performIntegrityCheck(validPoints)
    
    const overallReport: ValidationReport = {
      isValid: invalidPoints.length === 0 && integrityCheck.duplicateIds.length === 0,
      errors: allErrors,
      warnings: allWarnings,
      confidence: validPoints.length / dataArray.length * 100,
      timestamp: new Date()
    }

    // Store integrity history
    this.integrityHistory.push(integrityCheck)
    if (this.integrityHistory.length > 100) {
      this.integrityHistory.shift()
    }

    return {
      validPoints,
      invalidPoints,
      integrityCheck,
      overallReport
    }
  }

  // Perform additional validation beyond schema
  private performAdditionalValidation(dataPoint: DataPoint, report: ValidationReport): void {
    // Timestamp validation
    if (dataPoint.timestamp > new Date()) {
      report.warnings.push({
        field: 'timestamp',
        message: 'Timestamp is in the future',
        code: 'FUTURE_TIMESTAMP',
        value: dataPoint.timestamp,
        suggestion: 'Check system clock synchronization'
      })
    }

    const oneYearAgo = new Date()
    oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1)
    if (dataPoint.timestamp < oneYearAgo) {
      report.warnings.push({
        field: 'timestamp',
        message: 'Timestamp is more than one year old',
        code: 'OLD_TIMESTAMP',
        value: dataPoint.timestamp,
        suggestion: 'Verify data source timing'
      })
    }

    // Value validation
    if (Math.abs(dataPoint.value) > 1e10) {
      report.warnings.push({
        field: 'value',
        message: 'Value is extremely large',
        code: 'EXTREME_VALUE',
        value: dataPoint.value,
        suggestion: 'Check for unit conversion errors'
      })
    }

    if (dataPoint.value === 0) {
      report.warnings.push({
        field: 'value',
        message: 'Value is zero',
        code: 'ZERO_VALUE',
        value: dataPoint.value,
        suggestion: 'Verify if zero is expected'
      })
    }

    // ID validation
    if (dataPoint.id.length < 3) {
      report.warnings.push({
        field: 'id',
        message: 'ID is very short',
        code: 'SHORT_ID',
        value: dataPoint.id,
        suggestion: 'Use longer, more unique IDs'
      })
    }

    // Category validation
    if (dataPoint.category.length === 0) {
      report.errors.push({
        field: 'category',
        message: 'Category cannot be empty',
        severity: 'medium',
        code: 'EMPTY_CATEGORY',
        value: dataPoint.category
      })
    }

    // Source validation
    if (dataPoint.source.length === 0) {
      report.errors.push({
        field: 'source',
        message: 'Source cannot be empty',
        severity: 'medium',
        code: 'EMPTY_SOURCE',
        value: dataPoint.source
      })
    }
  }

  // Perform integrity checks on dataset
  private performIntegrityCheck(dataPoints: DataPoint[]): DataIntegrityCheck {
    const check: DataIntegrityCheck = {
      duplicateIds: [],
      missingTimestamps: 0,
      outOfOrderTimestamps: 0,
      invalidValues: 0,
      missingRequiredFields: 0,
      suspiciousPatterns: []
    }

    const seenIds = new Set<string>()
    let lastTimestamp: Date | null = null

    dataPoints.forEach((point, index) => {
      // Check for duplicate IDs
      if (seenIds.has(point.id)) {
        check.duplicateIds.push(point.id)
      } else {
        seenIds.add(point.id)
      }

      // Check timestamp ordering
      if (lastTimestamp && point.timestamp < lastTimestamp) {
        check.outOfOrderTimestamps++
      }
      lastTimestamp = point.timestamp

      // Check for invalid values
      if (!isFinite(point.value) || isNaN(point.value)) {
        check.invalidValues++
      }

      // Check for missing required fields
      if (!point.category || !point.source) {
        check.missingRequiredFields++
      }
    })

    // Detect suspicious patterns
    check.suspiciousPatterns = this.detectSuspiciousPatterns(dataPoints)

    return check
  }

  // Detect suspicious patterns in data
  private detectSuspiciousPatterns(dataPoints: DataPoint[]): SuspiciousPattern[] {
    const patterns: SuspiciousPattern[] = []

    if (dataPoints.length < 3) return patterns

    // Detect sudden spikes
    const values = dataPoints.map(p => p.value)
    const mean = values.reduce((a, b) => a + b, 0) / values.length
    const stdDev = Math.sqrt(values.reduce((a, b) => a + Math.pow(b - mean, 2), 0) / values.length)
    
    let spikeCount = 0
    values.forEach(value => {
      if (Math.abs(value - mean) > 3 * stdDev) {
        spikeCount++
      }
    })

    if (spikeCount > values.length * 0.1) {
      patterns.push({
        type: 'sudden_spike',
        description: `${spikeCount} values exceed 3 standard deviations`,
        affectedPoints: spikeCount,
        confidence: Math.min(spikeCount / values.length * 100, 95)
      })
    }

    // Detect constant values
    const uniqueValues = new Set(values)
    if (uniqueValues.size === 1 && values.length > 10) {
      patterns.push({
        type: 'constant_value',
        description: 'All values are identical',
        affectedPoints: values.length,
        confidence: 99
      })
    }

    // Detect impossible values (e.g., negative time intervals)
    const timestamps = dataPoints.map(p => p.timestamp.getTime())
    let negativeIntervals = 0
    for (let i = 1; i < timestamps.length; i++) {
      if (timestamps[i] < timestamps[i - 1]) {
        negativeIntervals++
      }
    }

    if (negativeIntervals > 0) {
      patterns.push({
        type: 'temporal_anomaly',
        description: 'Timestamps are not in chronological order',
        affectedPoints: negativeIntervals,
        confidence: 90
      })
    }

    return patterns
  }

  // Determine error severity based on Zod error code
  private determineSeverity(code: string): 'low' | 'medium' | 'high' | 'critical' {
    switch (code) {
      case 'invalid_type':
      case 'invalid_literal':
        return 'critical'
      case 'too_small':
      case 'too_big':
        return 'high'
      case 'invalid_string':
      case 'invalid_date':
        return 'medium'
      default:
        return 'low'
    }
  }

  // Get suggestion for fixing validation error
  private getSuggestion(code: string, field: string): string {
    const suggestions: Record<string, string> = {
      'invalid_type': `Ensure ${field} has the correct data type`,
      'too_small': `Increase the value of ${field}`,
      'too_big': `Decrease the value of ${field}`,
      'invalid_string': `Provide a valid string for ${field}`,
      'invalid_date': `Provide a valid date for ${field}`,
      'required': `${field} is required and cannot be empty`
    }

    return suggestions[code] || `Check the format and value of ${field}`
  }

  // Calculate confidence score based on errors and warnings
  private calculateConfidence(errors: ValidationError[], warnings: ValidationWarning[]): number {
    if (errors.length === 0 && warnings.length === 0) return 100

    let confidence = 100
    
    errors.forEach(error => {
      switch (error.severity) {
        case 'critical': confidence -= 50; break
        case 'high': confidence -= 25; break
        case 'medium': confidence -= 15; break
        case 'low': confidence -= 5; break
      }
    })

    warnings.forEach(() => {
      confidence -= 2
    })

    return Math.max(0, confidence)
  }

  // Attempt to correct common data issues
  attemptDataCorrection(data: unknown): { corrected: boolean, data: any, changes: string[] } {
    const changes: string[] = []
    let corrected = false
    let correctedData = { ...data as any }

    try {
      // Convert string timestamps to Date objects
      if (correctedData.timestamp && typeof correctedData.timestamp === 'string') {
        const date = new Date(correctedData.timestamp)
        if (!isNaN(date.getTime())) {
          correctedData.timestamp = date
          changes.push('Converted string timestamp to Date object')
          corrected = true
        }
      }

      // Convert string numbers to actual numbers
      if (correctedData.value && typeof correctedData.value === 'string') {
        const num = parseFloat(correctedData.value)
        if (!isNaN(num)) {
          correctedData.value = num
          changes.push('Converted string value to number')
          corrected = true
        }
      }

      // Trim whitespace from strings
      ['id', 'category', 'source'].forEach(field => {
        if (correctedData[field] && typeof correctedData[field] === 'string') {
          const trimmed = correctedData[field].trim()
          if (trimmed !== correctedData[field]) {
            correctedData[field] = trimmed
            changes.push(`Trimmed whitespace from ${field}`)
            corrected = true
          }
        }
      })

      // Ensure metadata is an object
      if (!correctedData.metadata || typeof correctedData.metadata !== 'object') {
        correctedData.metadata = {}
        changes.push('Initialized empty metadata object')
        corrected = true
      }

    } catch (error) {
      console.warn('Data correction failed:', error)
    }

    return { corrected, data: correctedData, changes }
  }

  // Get validation statistics
  getValidationStats(): {
    cacheSize: number
    integrityHistoryLength: number
    commonErrors: { code: string, count: number }[]
    averageConfidence: number
  } {
    const commonErrors: Record<string, number> = {}
    let totalConfidence = 0
    let reportCount = 0

    this.validationCache.forEach(report => {
      totalConfidence += report.confidence
      reportCount++
      
      report.errors.forEach(error => {
        commonErrors[error.code] = (commonErrors[error.code] || 0) + 1
      })
    })

    const sortedErrors = Object.entries(commonErrors)
      .map(([code, count]) => ({ code, count }))
      .sort((a, b) => b.count - a.count)

    return {
      cacheSize: this.validationCache.size,
      integrityHistoryLength: this.integrityHistory.length,
      commonErrors: sortedErrors,
      averageConfidence: reportCount > 0 ? totalConfidence / reportCount : 0
    }
  }

  // Clear validation cache
  clearCache(): void {
    this.validationCache.clear()
  }
}

// Utility functions for validation
export const dataValidator = DataValidator.getInstance()

export function validateSingleDataPoint(data: unknown): ValidationReport {
  return dataValidator.validateDataPoint(data)
}

export function validateDataPointArray(dataArray: unknown[]) {
  return dataValidator.validateDataArray(dataArray)
}

export function isDataPointValid(data: unknown): boolean {
  const report = dataValidator.validateDataPoint(data)
  return report.isValid && report.confidence > 80
}

export function correctDataPoint(data: unknown): { success: boolean, data?: DataPoint, errors?: string[] } {
  const correction = dataValidator.attemptDataCorrection(data)
  
  if (correction.corrected) {
    const validation = dataValidator.validateDataPoint(correction.data)
    if (validation.isValid) {
      return { success: true, data: correction.data as DataPoint }
    }
  }

  const validation = dataValidator.validateDataPoint(data)
  return { 
    success: false, 
    errors: validation.errors.map(e => e.message) 
  }
}