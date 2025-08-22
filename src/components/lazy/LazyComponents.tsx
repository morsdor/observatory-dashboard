'use client'

import React, { lazy, Suspense, ComponentType } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'

// Lazy load heavy components for better performance
export const LazyTimeSeriesChart = lazy(() => 
  import('@/components/charts/TimeSeriesChart').then(module => ({
    default: module.TimeSeriesChart
  }))
)

export const LazyVirtualizedDataTable = lazy(() => 
  import('@/components/dashboard/VirtualizedDataTable').then(module => ({
    default: module.VirtualizedDataTable
  }))
)

export const LazyAdvancedFilterBuilder = lazy(() => 
  import('@/components/filters/AdvancedFilterBuilder').then(module => ({
    default: module.AdvancedFilterBuilder
  }))
)

export const LazyRealTimeDashboard = lazy(() => 
  import('@/components/dashboard/RealTimeDashboard').then(module => ({
    default: module.RealTimeDashboard
  }))
)

// Loading fallback components
export const ChartLoadingSkeleton = () => (
  <Card>
    <CardContent className="p-6">
      <div className="space-y-4">
        <Skeleton className="h-4 w-1/4" />
        <Skeleton className="h-64 w-full" />
        <div className="flex space-x-2">
          <Skeleton className="h-4 w-16" />
          <Skeleton className="h-4 w-16" />
          <Skeleton className="h-4 w-16" />
        </div>
      </div>
    </CardContent>
  </Card>
)

export const TableLoadingSkeleton = () => (
  <Card>
    <CardContent className="p-6">
      <div className="space-y-4">
        <Skeleton className="h-4 w-1/3" />
        <div className="space-y-2">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="flex space-x-4">
              <Skeleton className="h-4 w-1/4" />
              <Skeleton className="h-4 w-1/4" />
              <Skeleton className="h-4 w-1/4" />
              <Skeleton className="h-4 w-1/4" />
            </div>
          ))}
        </div>
      </div>
    </CardContent>
  </Card>
)

export const FilterLoadingSkeleton = () => (
  <Card>
    <CardContent className="p-6">
      <div className="space-y-4">
        <Skeleton className="h-4 w-1/2" />
        <div className="space-y-2">
          <div className="flex space-x-2">
            <Skeleton className="h-8 w-32" />
            <Skeleton className="h-8 w-24" />
            <Skeleton className="h-8 w-40" />
          </div>
          <div className="flex space-x-2">
            <Skeleton className="h-8 w-32" />
            <Skeleton className="h-8 w-24" />
            <Skeleton className="h-8 w-40" />
          </div>
        </div>
      </div>
    </CardContent>
  </Card>
)

export const DashboardLoadingSkeleton = () => (
  <div className="space-y-6">
    <Card>
      <CardContent className="p-6">
        <div className="flex items-center justify-between mb-4">
          <Skeleton className="h-6 w-48" />
          <div className="flex space-x-2">
            <Skeleton className="h-8 w-20" />
            <Skeleton className="h-8 w-20" />
          </div>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-20" />
          ))}
        </div>
      </CardContent>
    </Card>
    <ChartLoadingSkeleton />
    <TableLoadingSkeleton />
  </div>
)

// Higher-order component for lazy loading with error boundary
interface LazyWrapperProps {
  fallback?: ComponentType
  errorFallback?: ComponentType<{ error: Error; retry: () => void }>
  children: React.ReactNode
}

export const LazyWrapper = ({ 
  fallback: Fallback = () => <div>Loading...</div>, 
  errorFallback: ErrorFallback,
  children 
}: LazyWrapperProps) => {
  return (
    <Suspense fallback={<Fallback />}>
      {ErrorFallback ? (
        <ErrorBoundary fallback={ErrorFallback}>
          {children}
        </ErrorBoundary>
      ) : (
        children
      )}
    </Suspense>
  )
}

// Error boundary for lazy components
interface ErrorBoundaryState {
  hasError: boolean
  error?: Error
}

interface ErrorBoundaryProps {
  fallback: ComponentType<{ error: Error; retry: () => void }>
  children: React.ReactNode
}

class ErrorBoundary extends React.Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props)
    this.state = { hasError: false }
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error }
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('Lazy component error:', error, errorInfo)
  }

  retry = () => {
    this.setState({ hasError: false, error: undefined })
  }

  render() {
    if (this.state.hasError && this.state.error) {
      const { fallback: Fallback } = this.props
      return <Fallback error={this.state.error} retry={this.retry} />
    }

    return this.props.children
  }
}

// Preload functions for better UX
export const preloadTimeSeriesChart = () => {
  import('@/components/charts/TimeSeriesChart')
}

export const preloadVirtualizedDataTable = () => {
  import('@/components/dashboard/VirtualizedDataTable')
}

export const preloadAdvancedFilterBuilder = () => {
  import('@/components/filters/AdvancedFilterBuilder')
}

export const preloadRealTimeDashboard = () => {
  import('@/components/dashboard/RealTimeDashboard')
}

// Preload all heavy components
export const preloadAllComponents = () => {
  preloadTimeSeriesChart()
  preloadVirtualizedDataTable()
  preloadAdvancedFilterBuilder()
  preloadRealTimeDashboard()
}