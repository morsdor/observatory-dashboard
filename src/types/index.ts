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
