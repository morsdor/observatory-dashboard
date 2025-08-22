import { DataPoint, FilterCondition, FilterCriteria, FilterGroup, LogicalOperator } from '@/types'

/**
 * Advanced Filter Engine with indexing, caching, and performance optimizations
 * Supports complex logical operations and high-performance filtering for large datasets
 */
export class AdvancedFilterEngine {
  private dataIndices: Map<string, Map<any, Set<number>>> = new Map()
  private filterCache: Map<string, number[]> = new Map()
  private data: DataPoint[] = []
  private maxCacheSize = 100

  constructor(data: DataPoint[] = []) {
    this.setData(data)
  }

  /**
   * Set new data and rebuild indices
   */
  setData(data: DataPoint[]): void {
    this.data = data
    this.clearCache()
    this.buildIndices()
  }

  /**
   * Add new data points incrementally
   */
  addData(newPoints: DataPoint[]): void {
    const startIndex = this.data.length
    this.data.push(...newPoints)
    
    // Update indices for new data points
    newPoints.forEach((point, idx) => {
      const dataIndex = startIndex + idx
      this.updateIndicesForPoint(point, dataIndex)
    })
    
    // Clear cache as data has changed
    this.clearCache()
  }

  /**
   * Apply filter criteria and return filtered data indices
   */
  filter(criteria: FilterCriteria): DataPoint[] {
    const cacheKey = this.getCacheKey(criteria)
    
    // Check cache first
    const cachedIndices = this.filterCache.get(cacheKey)
    if (cachedIndices) {
      return cachedIndices.map(idx => this.data[idx])
    }

    const startTime = performance.now()
    
    // Apply filtering
    let resultIndices: Set<number>
    
    if (criteria.grouping.length > 0) {
      // Handle complex grouping
      resultIndices = this.evaluateFilterGroups(criteria.grouping)
    } else {
      // Handle simple conditions
      resultIndices = this.evaluateConditions(criteria.conditions)
    }

    // Convert to array and apply sorting
    let indices = Array.from(resultIndices)
    
    if (criteria.sortBy) {
      indices = this.applySorting(indices, criteria.sortBy)
    }

    // Cache result if cache isn't full
    if (this.filterCache.size < this.maxCacheSize) {
      this.filterCache.set(cacheKey, indices)
    }

    const endTime = performance.now()
    console.log(`Filter applied in ${endTime - startTime}ms, ${indices.length} results`)

    return indices.map(idx => this.data[idx])
  }

  /**
   * Build indices for fast lookups
   */
  private buildIndices(): void {
    this.dataIndices.clear()
    
    this.data.forEach((point, index) => {
      this.updateIndicesForPoint(point, index)
    })
  }

  /**
   * Update indices for a single data point
   */
  private updateIndicesForPoint(point: DataPoint, index: number): void {
    // Index common fields
    const fieldsToIndex = [
      'category', 'source', 'id',
      // Extract metadata fields for indexing
      ...Object.keys(point.metadata || {})
    ]

    fieldsToIndex.forEach(field => {
      const value = this.getFieldValue(point, field)
      if (value !== null && value !== undefined) {
        this.addToIndex(field, value, index)
      }
    })

    // Index timestamp ranges for date filtering
    this.indexTimestamp(point.timestamp, index)
  }

  /**
   * Add value to index
   */
  private addToIndex(field: string, value: any, index: number): void {
    if (!this.dataIndices.has(field)) {
      this.dataIndices.set(field, new Map())
    }
    
    const fieldIndex = this.dataIndices.get(field)!
    if (!fieldIndex.has(value)) {
      fieldIndex.set(value, new Set())
    }
    
    fieldIndex.get(value)!.add(index)
  }

  /**
   * Index timestamp for efficient date range queries
   */
  private indexTimestamp(timestamp: Date, index: number): void {
    const year = timestamp.getFullYear()
    const month = timestamp.getMonth()
    const day = timestamp.getDate()
    const hour = timestamp.getHours()

    // Index by different time granularities
    this.addToIndex('timestamp_year', year, index)
    this.addToIndex('timestamp_month', `${year}-${month}`, index)
    this.addToIndex('timestamp_day', `${year}-${month}-${day}`, index)
    this.addToIndex('timestamp_hour', `${year}-${month}-${day}-${hour}`, index)
  }

  /**
   * Evaluate filter groups with complex logical operations
   */
  private evaluateFilterGroups(groups: FilterGroup[]): Set<number> {
    if (groups.length === 0) {
      return new Set(Array.from({ length: this.data.length }, (_, i) => i))
    }

    // Build group hierarchy
    const groupMap = new Map<string, FilterGroup>()
    const rootGroups: FilterGroup[] = []

    groups.forEach(group => {
      groupMap.set(group.id, group)
      if (!group.parentGroupId) {
        rootGroups.push(group)
      }
    })

    // Evaluate root groups
    let result: Set<number> | null = null

    rootGroups.forEach((group, index) => {
      const groupResult = this.evaluateGroup(group, groupMap)
      
      if (result === null) {
        result = groupResult
      } else {
        if (group.logicalOperator === 'OR') {
          result = this.unionSets(result, groupResult)
        } else {
          result = this.intersectSets(result, groupResult)
        }
      }
    })

    return result || new Set()
  }

  /**
   * Evaluate a single filter group
   */
  private evaluateGroup(group: FilterGroup, groupMap: Map<string, FilterGroup>): Set<number> {
    const conditionResults = this.evaluateConditions(group.conditions)
    
    // Find child groups
    const childGroups = Array.from(groupMap.values()).filter(g => g.parentGroupId === group.id)
    
    if (childGroups.length === 0) {
      return conditionResults
    }

    // Combine with child group results
    let result = conditionResults

    childGroups.forEach(childGroup => {
      const childResult = this.evaluateGroup(childGroup, groupMap)
      
      if (childGroup.logicalOperator === 'OR') {
        result = this.unionSets(result, childResult)
      } else {
        result = this.intersectSets(result, childResult)
      }
    })

    return result
  }

  /**
   * Evaluate filter conditions
   */
  private evaluateConditions(conditions: FilterCondition[]): Set<number> {
    if (conditions.length === 0) {
      return new Set(Array.from({ length: this.data.length }, (_, i) => i))
    }

    let result: Set<number> | null = null

    conditions.forEach((condition, index) => {
      const conditionResult = this.evaluateCondition(condition)
      
      if (result === null) {
        result = conditionResult
      } else {
        if (condition.logicalOperator === 'OR') {
          result = this.unionSets(result, conditionResult)
        } else {
          result = this.intersectSets(result, conditionResult)
        }
      }
    })

    return result || new Set()
  }

  /**
   * Evaluate a single condition using indices when possible
   */
  private evaluateCondition(condition: FilterCondition): Set<number> {
    const { field, operator, value } = condition

    // Try to use index for exact matches
    if (operator === 'eq' && this.dataIndices.has(field)) {
      const fieldIndex = this.dataIndices.get(field)!
      return fieldIndex.get(value) || new Set()
    }

    // Try to use index for 'in' operations
    if (operator === 'in' && Array.isArray(value) && this.dataIndices.has(field)) {
      const fieldIndex = this.dataIndices.get(field)!
      const result = new Set<number>()
      
      value.forEach(val => {
        const indices = fieldIndex.get(val)
        if (indices) {
          indices.forEach(idx => result.add(idx))
        }
      })
      
      return result
    }

    // Handle date range operations with timestamp indices
    if (field === 'timestamp' && operator === 'between' && Array.isArray(value) && value.length === 2) {
      return this.filterByDateRange(new Date(value[0]), new Date(value[1]))
    }

    // Fall back to linear scan for complex operations
    return this.linearScanCondition(condition)
  }

  /**
   * Efficient date range filtering using timestamp indices
   */
  private filterByDateRange(startDate: Date, endDate: Date): Set<number> {
    const result = new Set<number>()
    
    // Use day-level indices for efficiency
    const currentDate = new Date(startDate)
    
    while (currentDate <= endDate) {
      const dayKey = `${currentDate.getFullYear()}-${currentDate.getMonth()}-${currentDate.getDate()}`
      const dayIndices = this.dataIndices.get('timestamp_day')?.get(dayKey)
      
      if (dayIndices) {
        // Filter within the day for exact time range
        dayIndices.forEach(idx => {
          const timestamp = this.data[idx].timestamp
          if (timestamp >= startDate && timestamp <= endDate) {
            result.add(idx)
          }
        })
      }
      
      currentDate.setDate(currentDate.getDate() + 1)
    }
    
    return result
  }

  /**
   * Linear scan for conditions that can't use indices
   */
  private linearScanCondition(condition: FilterCondition): Set<number> {
    const result = new Set<number>()
    
    this.data.forEach((point, index) => {
      if (this.evaluateConditionForPoint(point, condition)) {
        result.add(index)
      }
    })
    
    return result
  }

  /**
   * Evaluate condition for a single data point
   */
  private evaluateConditionForPoint(point: DataPoint, condition: FilterCondition): boolean {
    const fieldValue = this.getFieldValue(point, condition.field)
    const { operator, value } = condition

    if (fieldValue === null || fieldValue === undefined) {
      return false
    }

    switch (operator) {
      case 'eq':
        return fieldValue === value

      case 'gt':
        return Number(fieldValue) > Number(value)

      case 'lt':
        return Number(fieldValue) < Number(value)

      case 'gte':
        return Number(fieldValue) >= Number(value)

      case 'lte':
        return Number(fieldValue) <= Number(value)

      case 'contains':
        return String(fieldValue).toLowerCase().includes(String(value).toLowerCase())

      case 'between':
        if (Array.isArray(value) && value.length === 2) {
          if (condition.field === 'timestamp') {
            const timestamp = fieldValue instanceof Date ? fieldValue : new Date(fieldValue)
            const start = new Date(value[0])
            const end = new Date(value[1])
            return timestamp >= start && timestamp <= end
          } else {
            const numValue = Number(fieldValue)
            return numValue >= Number(value[0]) && numValue <= Number(value[1])
          }
        }
        return false

      case 'in':
        return Array.isArray(value) && value.includes(fieldValue)

      case 'not_in':
        return Array.isArray(value) && !value.includes(fieldValue)

      default:
        return false
    }
  }

  /**
   * Get field value from data point (supports nested paths)
   */
  private getFieldValue(point: DataPoint, field: string): any {
    if (field.includes('.')) {
      return field.split('.').reduce((obj, key) => obj?.[key], point)
    }
    
    // Check metadata for fields not in main object
    if (!(field in point) && point.metadata && field in point.metadata) {
      return point.metadata[field]
    }
    
    return (point as any)[field]
  }

  /**
   * Apply sorting to filtered indices
   */
  private applySorting(indices: number[], sortBy: { field: string; direction: 'asc' | 'desc' }): number[] {
    return indices.sort((aIdx, bIdx) => {
      const aValue = this.getFieldValue(this.data[aIdx], sortBy.field)
      const bValue = this.getFieldValue(this.data[bIdx], sortBy.field)
      
      let comparison = 0
      
      if (aValue < bValue) comparison = -1
      else if (aValue > bValue) comparison = 1
      
      return sortBy.direction === 'desc' ? -comparison : comparison
    })
  }

  /**
   * Union two sets
   */
  private unionSets(set1: Set<number>, set2: Set<number>): Set<number> {
    const result = new Set(set1)
    set2.forEach(item => result.add(item))
    return result
  }

  /**
   * Intersect two sets
   */
  private intersectSets(set1: Set<number>, set2: Set<number>): Set<number> {
    const result = new Set<number>()
    set1.forEach(item => {
      if (set2.has(item)) {
        result.add(item)
      }
    })
    return result
  }

  /**
   * Generate cache key for filter criteria
   */
  private getCacheKey(criteria: FilterCriteria): string {
    return JSON.stringify({
      conditions: criteria.conditions,
      grouping: criteria.grouping,
      sortBy: criteria.sortBy
    })
  }

  /**
   * Clear filter cache
   */
  private clearCache(): void {
    this.filterCache.clear()
  }

  /**
   * Get performance statistics
   */
  getStats(): {
    dataSize: number
    indexSize: number
    cacheSize: number
    indexedFields: string[]
  } {
    return {
      dataSize: this.data.length,
      indexSize: this.dataIndices.size,
      cacheSize: this.filterCache.size,
      indexedFields: Array.from(this.dataIndices.keys())
    }
  }
}

/**
 * Singleton instance for global use
 */
export const filterEngine = new AdvancedFilterEngine()