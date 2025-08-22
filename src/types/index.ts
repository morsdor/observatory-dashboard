import { z } from 'zod'

// Common types for the Observatory Dashboard application
export interface BaseEntity {
  id: string
  createdAt: Date
  updatedAt: Date
}

// Dashboard-specific types will be added as we implement features
export interface DashboardConfig {
  title: string
  description?: string
  refreshInterval?: number
}

// Core data model for streaming data points
export interface DataPoint {
  id: string
  timestamp: Date
  value: number
  category: string
  metadata: Record<string, any>
  source: string
}

// Filter condition operators
export type FilterOperator = 'eq' | 'gt' | 'lt' | 'gte' | 'lte' | 'contains' | 'between' | 'in' | 'not_in'

// Logical operators for combining filter conditions
export type LogicalOperator = 'AND' | 'OR'

// Individual filter condition
export interface FilterCondition {
  id: string
  field: string
  operator: FilterOperator
  value: any
  logicalOperator?: LogicalOperator
}

// Filter grouping for complex queries
export interface FilterGroup {
  id: string
  conditions: FilterCondition[]
  logicalOperator: LogicalOperator
  parentGroupId?: string
}

// Complete filter criteria with sorting
export interface FilterCriteria {
  conditions: FilterCondition[]
  grouping: FilterGroup[]
  sortBy?: {
    field: string
    direction: 'asc' | 'desc'
  }
}

// Field definition for filter builder
export interface FieldDefinition {
  name: string
  label: string
  type: 'string' | 'number' | 'date' | 'boolean' | 'category'
  options?: string[] // For category fields
}

// Connection status for WebSocket
export type ConnectionStatus = 'connecting' | 'connected' | 'disconnected' | 'error'

// Performance metrics
export interface PerformanceMetrics {
  fps: number
  memoryUsage: number
  dataPointsPerSecond: number
  renderTime: number
  filterTime: number
}

// Export validation schemas and utilities
export * from './schemas'
