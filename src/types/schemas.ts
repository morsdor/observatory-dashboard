import { z } from 'zod'

// Zod schema for DataPoint validation
export const DataPointSchema = z.object({
  id: z.string().min(1, 'ID is required'),
  timestamp: z.string(),
  value: z.number().finite('Value must be a finite number'),
  category: z.string().min(1, 'Category is required'),
  metadata: z.record(z.any()).default({}),
  source: z.string().min(1, 'Source is required')
})

// Zod schema for FilterCondition validation
export const FilterConditionSchema = z.object({
  id: z.string().min(1, 'ID is required'),
  field: z.string().min(1, 'Field is required'),
  operator: z.enum(['eq', 'gt', 'lt', 'gte', 'lte', 'contains', 'between', 'in', 'not_in']),
  value: z.any(),
  logicalOperator: z.enum(['AND', 'OR']).optional()
})

// Zod schema for FilterGroup validation  
export const FilterGroupSchema: z.ZodType<any> = z.object({
  id: z.string().min(1, 'ID is required'),
  conditions: z.array(z.lazy(() => FilterConditionSchema)),
  logicalOperator: z.enum(['AND', 'OR']),
  parentGroupId: z.string().optional()
})

// Zod schema for FilterCriteria validation
export const FilterCriteriaSchema = z.object({
  conditions: z.array(FilterConditionSchema),
  grouping: z.array(FilterGroupSchema),
  sortBy: z.object({
    field: z.string().min(1, 'Sort field is required'),
    direction: z.enum(['asc', 'desc'])
  }).optional()
})

// Zod schema for FieldDefinition validation
export const FieldDefinitionSchema = z.object({
  name: z.string().min(1, 'Field name is required'),
  label: z.string().min(1, 'Field label is required'),
  type: z.enum(['string', 'number', 'date', 'boolean', 'category']),
  options: z.array(z.string()).optional()
})

// Zod schema for PerformanceMetrics validation
export const PerformanceMetricsSchema = z.object({
  fps: z.number().min(0).max(120),
  memoryUsage: z.number().min(0),
  dataPointsPerSecond: z.number().min(0),
  renderTime: z.number().min(0),
  filterTime: z.number().min(0)
})

// Array schemas for bulk validation
export const DataPointArraySchema = z.array(DataPointSchema)
export const FilterConditionArraySchema = z.array(FilterConditionSchema)

// Validation result type
export interface ValidationResult<T> {
  success: boolean
  data?: T
  errors?: string[]
}

// Generic validation function
export function validateData<T>(
  schema: z.ZodSchema<T>, 
  data: unknown
): ValidationResult<T> {
  try {
    const result = schema.parse(data)
    return {
      success: true,
      data: result
    }
  } catch (error) {
    if (error instanceof z.ZodError) {
      return {
        success: false,
        errors: error.errors.map(err => `${err.path.join('.')}: ${err.message}`)
      }
    }
    return {
      success: false,
      errors: ['Unknown validation error']
    }
  }
}

// Safe validation function that returns partial results
export function safeValidateData<T>(
  schema: z.ZodSchema<T>, 
  data: unknown
): ValidationResult<T> {
  const result = schema.safeParse(data)
  
  if (result.success) {
    return {
      success: true,
      data: result.data
    }
  }
  
  return {
    success: false,
    errors: result.error.errors.map(err => `${err.path.join('.')}: ${err.message}`)
  }
}

// Batch validation for arrays of data
export function validateDataArray<T>(
  schema: z.ZodSchema<T>, 
  dataArray: unknown[]
): { valid: T[], invalid: { index: number, errors: string[] }[] } {
  const valid: T[] = []
  const invalid: { index: number, errors: string[] }[] = []
  
  dataArray.forEach((item, index) => {
    const result = safeValidateData(schema, item)
    if (result.success && result.data) {
      valid.push(result.data)
    } else {
      invalid.push({
        index,
        errors: result.errors || ['Unknown error']
      })
    }
  })
  
  return { valid, invalid }
}