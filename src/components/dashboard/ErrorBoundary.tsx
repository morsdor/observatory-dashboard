'use client'

import React from 'react'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { AlertTriangle, RefreshCw, Bug } from 'lucide-react'

interface ErrorBoundaryState {
  hasError: boolean
  error?: Error
  errorInfo?: React.ErrorInfo
}

interface ErrorBoundaryProps {
  children: React.ReactNode
  fallback?: React.ComponentType<ErrorFallbackProps>
  onError?: (error: Error, errorInfo: React.ErrorInfo) => void
}

interface ErrorFallbackProps {
  error: Error
  resetError: () => void
  errorInfo?: React.ErrorInfo
}

export class ErrorBoundary extends React.Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props)
    this.state = { hasError: false }
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return {
      hasError: true,
      error
    }
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    this.setState({
      error,
      errorInfo
    })
    
    // Log error to console in development
    if (process.env.NODE_ENV === 'development') {
      console.error('ErrorBoundary caught an error:', error, errorInfo)
    }
    
    // Call optional error handler
    this.props.onError?.(error, errorInfo)
  }

  resetError = () => {
    this.setState({ hasError: false, error: undefined, errorInfo: undefined })
  }

  render() {
    if (this.state.hasError) {
      const FallbackComponent = this.props.fallback || DefaultErrorFallback
      return (
        <FallbackComponent
          error={this.state.error!}
          resetError={this.resetError}
          errorInfo={this.state.errorInfo}
        />
      )
    }

    return this.props.children
  }
}

export function DefaultErrorFallback({ error, resetError, errorInfo }: ErrorFallbackProps) {
  return (
    <Card className="p-6 m-4">
      <Alert variant="destructive">
        <AlertTriangle className="h-4 w-4" />
        <AlertTitle>Something went wrong</AlertTitle>
        <AlertDescription className="mt-2">
          An unexpected error occurred while rendering this component.
        </AlertDescription>
      </Alert>
      
      <div className="mt-4 space-y-4">
        <div className="text-sm text-gray-600">
          <strong>Error:</strong> {error.message}
        </div>
        
        {process.env.NODE_ENV === 'development' && (
          <details className="text-xs text-gray-500">
            <summary className="cursor-pointer font-medium">Technical Details</summary>
            <pre className="mt-2 p-2 bg-gray-100 rounded overflow-auto">
              {error.stack}
            </pre>
            {errorInfo && (
              <pre className="mt-2 p-2 bg-gray-100 rounded overflow-auto">
                {errorInfo.componentStack}
              </pre>
            )}
          </details>
        )}
        
        <div className="flex space-x-2">
          <Button onClick={resetError} variant="outline" size="sm">
            <RefreshCw className="h-4 w-4 mr-2" />
            Try Again
          </Button>
          <Button 
            onClick={() => window.location.reload()} 
            variant="outline" 
            size="sm"
          >
            Reload Page
          </Button>
        </div>
      </div>
    </Card>
  )
}

export function ChartErrorFallback({ error, resetError }: ErrorFallbackProps) {
  return (
    <div className="flex flex-col items-center justify-center h-full p-4 text-center">
      <Bug className="h-12 w-12 text-red-500 mb-4" />
      <h3 className="text-lg font-semibold text-gray-900 mb-2">Chart Error</h3>
      <p className="text-sm text-gray-600 mb-4">
        Failed to render chart: {error.message}
      </p>
      <Button onClick={resetError} variant="outline" size="sm">
        <RefreshCw className="h-4 w-4 mr-2" />
        Retry
      </Button>
    </div>
  )
}

export function DataGridErrorFallback({ error, resetError }: ErrorFallbackProps) {
  return (
    <div className="flex flex-col items-center justify-center h-full p-4 text-center">
      <AlertTriangle className="h-12 w-12 text-red-500 mb-4" />
      <h3 className="text-lg font-semibold text-gray-900 mb-2">Data Grid Error</h3>
      <p className="text-sm text-gray-600 mb-4">
        Failed to load data grid: {error.message}
      </p>
      <Button onClick={resetError} variant="outline" size="sm">
        <RefreshCw className="h-4 w-4 mr-2" />
        Retry
      </Button>
    </div>
  )
}

// Higher-order component for wrapping components with error boundaries
export function withErrorBoundary<P extends object>(
  Component: React.ComponentType<P>,
  fallback?: React.ComponentType<ErrorFallbackProps>
) {
  const WrappedComponent = (props: P) => (
    <ErrorBoundary fallback={fallback}>
      <Component {...props} />
    </ErrorBoundary>
  )
  
  WrappedComponent.displayName = `withErrorBoundary(${Component.displayName || Component.name})`
  
  return WrappedComponent
}