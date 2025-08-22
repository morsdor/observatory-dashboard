'use client'

import React from 'react'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { AlertTriangle, RefreshCw, Bug, Wifi, WifiOff, Database, Activity } from 'lucide-react'

export type ErrorSeverity = 'low' | 'medium' | 'high' | 'critical'
export type ErrorCategory = 'network' | 'data' | 'rendering' | 'performance' | 'validation' | 'unknown'

export interface ErrorContext {
  component?: string
  action?: string
  timestamp: Date
  userAgent?: string
  url?: string
  userId?: string
  sessionId?: string
}

export interface EnhancedError extends Error {
  severity: ErrorSeverity
  category: ErrorCategory
  context: ErrorContext
  recoverable: boolean
  retryCount?: number
  originalError?: Error
}

interface ErrorBoundaryState {
  hasError: boolean
  error?: EnhancedError
  errorInfo?: React.ErrorInfo
  retryCount: number
  lastErrorTime?: Date
}

interface ErrorBoundaryProps {
  children: React.ReactNode
  fallback?: React.ComponentType<ErrorFallbackProps>
  onError?: (error: EnhancedError, errorInfo: React.ErrorInfo) => void
  maxRetries?: number
  retryDelay?: number
  isolateFailures?: boolean
  componentName?: string
}

interface ErrorFallbackProps {
  error: EnhancedError
  resetError: () => void
  errorInfo?: React.ErrorInfo
  retryCount: number
  canRetry: boolean
}

// Error classification utility
export function classifyError(error: Error, componentName?: string): EnhancedError {
  let severity: ErrorSeverity = 'medium'
  let category: ErrorCategory = 'unknown'
  let recoverable = true

  // Classify by error type and message
  if (error.name === 'ChunkLoadError' || error.message.includes('Loading chunk')) {
    severity = 'medium'
    category = 'network'
    recoverable = true
  } else if (error.message.includes('WebSocket') || error.message.includes('network')) {
    severity = 'high'
    category = 'network'
    recoverable = true
  } else if (error.message.includes('validation') || error.message.includes('invalid')) {
    severity = 'medium'
    category = 'validation'
    recoverable = true
  } else if (error.message.includes('render') || error.name === 'RenderError') {
    severity = 'high'
    category = 'rendering'
    recoverable = true
  } else if (error.message.includes('memory') || error.message.includes('performance')) {
    severity = 'critical'
    category = 'performance'
    recoverable = false
  } else if (error.message.includes('data') || error.message.includes('parse')) {
    severity = 'medium'
    category = 'data'
    recoverable = true
  }

  const enhancedError: EnhancedError = {
    ...error,
    name: error.name,
    message: error.message,
    stack: error.stack,
    severity,
    category,
    recoverable,
    context: {
      component: componentName,
      timestamp: new Date(),
      userAgent: typeof window !== 'undefined' ? window.navigator.userAgent : undefined,
      url: typeof window !== 'undefined' ? window.location.href : undefined,
    },
    originalError: error
  }

  return enhancedError
}

export class ErrorBoundary extends React.Component<ErrorBoundaryProps, ErrorBoundaryState> {
  private retryTimeoutRef: NodeJS.Timeout | null = null

  constructor(props: ErrorBoundaryProps) {
    super(props)
    this.state = { 
      hasError: false, 
      retryCount: 0 
    }
  }

  static getDerivedStateFromError(error: Error): Partial<ErrorBoundaryState> {
    return {
      hasError: true,
      lastErrorTime: new Date()
    }
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    const enhancedError = classifyError(error, this.props.componentName)
    
    this.setState({
      error: enhancedError,
      errorInfo
    })
    
    // Log error with enhanced context
    this.logError(enhancedError, errorInfo)
    
    // Call optional error handler
    this.props.onError?.(enhancedError, errorInfo)

    // Auto-retry for recoverable errors
    if (enhancedError.recoverable && this.canRetry()) {
      this.scheduleRetry()
    }
  }

  private logError(error: EnhancedError, errorInfo: React.ErrorInfo) {
    const errorReport = {
      error: {
        name: error.name,
        message: error.message,
        stack: error.stack,
        severity: error.severity,
        category: error.category,
        recoverable: error.recoverable
      },
      context: error.context,
      componentStack: errorInfo.componentStack,
      retryCount: this.state.retryCount,
      timestamp: new Date().toISOString()
    }

    if (process.env.NODE_ENV === 'development') {
      console.group('🚨 Error Boundary Caught Error')
      console.error('Error:', error)
      console.error('Error Info:', errorInfo)
      console.table(errorReport)
      console.groupEnd()
    }

    // In production, send to error tracking service
    if (process.env.NODE_ENV === 'production') {
      // TODO: Integrate with error tracking service (Sentry, LogRocket, etc.)
      console.error('Production Error:', errorReport)
    }
  }

  private canRetry(): boolean {
    const maxRetries = this.props.maxRetries ?? 3
    return this.state.retryCount < maxRetries
  }

  private scheduleRetry() {
    const delay = this.props.retryDelay ?? 1000 * Math.pow(2, this.state.retryCount) // Exponential backoff
    
    this.retryTimeoutRef = setTimeout(() => {
      this.setState(prevState => ({
        hasError: false,
        error: undefined,
        errorInfo: undefined,
        retryCount: prevState.retryCount + 1
      }))
    }, delay)
  }

  resetError = () => {
    if (this.retryTimeoutRef) {
      clearTimeout(this.retryTimeoutRef)
      this.retryTimeoutRef = null
    }
    
    this.setState({ 
      hasError: false, 
      error: undefined, 
      errorInfo: undefined,
      retryCount: 0,
      lastErrorTime: undefined
    })
  }

  componentWillUnmount() {
    if (this.retryTimeoutRef) {
      clearTimeout(this.retryTimeoutRef)
    }
  }

  render() {
    if (this.state.hasError && this.state.error) {
      const FallbackComponent = this.props.fallback || DefaultErrorFallback
      return (
        <FallbackComponent
          error={this.state.error}
          resetError={this.resetError}
          errorInfo={this.state.errorInfo}
          retryCount={this.state.retryCount}
          canRetry={this.canRetry()}
        />
      )
    }

    return this.props.children
  }
}

// Error severity color mapping
const getSeverityColor = (severity: ErrorSeverity) => {
  switch (severity) {
    case 'low': return 'text-yellow-600 bg-yellow-50 border-yellow-200'
    case 'medium': return 'text-orange-600 bg-orange-50 border-orange-200'
    case 'high': return 'text-red-600 bg-red-50 border-red-200'
    case 'critical': return 'text-red-800 bg-red-100 border-red-300'
    default: return 'text-gray-600 bg-gray-50 border-gray-200'
  }
}

// Error category icon mapping
const getCategoryIcon = (category: ErrorCategory) => {
  switch (category) {
    case 'network': return WifiOff
    case 'data': return Database
    case 'rendering': return Bug
    case 'performance': return Activity
    case 'validation': return AlertTriangle
    default: return AlertTriangle
  }
}

export function DefaultErrorFallback({ error, resetError, errorInfo, retryCount, canRetry }: ErrorFallbackProps) {
  const CategoryIcon = getCategoryIcon(error.category || 'unknown')
  const severityClass = getSeverityColor(error.severity || 'medium')

  return (
    <Card className="p-6 m-4">
      <Alert variant="destructive" className={`border-2 ${severityClass}`}>
        <CategoryIcon className="h-4 w-4" />
        <AlertTitle className="flex items-center justify-between">
          <span>Error Detected</span>
          <span className="text-xs font-normal capitalize">
            {error.severity || 'unknown'} • {error.category || 'unknown'}
          </span>
        </AlertTitle>
        <AlertDescription className="mt-2">
          {(error.recoverable !== false)
            ? "A recoverable error occurred. You can try again or the system will auto-retry."
            : "A critical error occurred that requires manual intervention."
          }
        </AlertDescription>
      </Alert>
      
      <div className="mt-4 space-y-4">
        <div className="text-sm text-gray-600">
          <strong>Error:</strong> {error.message}
        </div>

        {retryCount > 0 && (
          <div className="text-sm text-blue-600">
            <strong>Retry Attempts:</strong> {retryCount}
          </div>
        )}

        {error.context?.timestamp && (
          <div className="text-xs text-gray-500">
            <strong>Time:</strong> {error.context.timestamp.toLocaleString()}
            {error.context.component && (
              <span className="ml-4">
                <strong>Component:</strong> {error.context.component}
              </span>
            )}
          </div>
        )}
        
        {process.env.NODE_ENV === 'development' && (
          <details className="text-xs text-gray-500">
            <summary className="cursor-pointer font-medium">Technical Details</summary>
            <div className="mt-2 space-y-2">
              <pre className="p-2 bg-gray-100 rounded overflow-auto text-xs">
                {error.stack}
              </pre>
              {errorInfo && (
                <pre className="p-2 bg-gray-100 rounded overflow-auto text-xs">
                  {errorInfo.componentStack}
                </pre>
              )}
              {error.context && (
                <div className="p-2 bg-blue-50 rounded text-xs">
                  <strong>Context:</strong>
                  <pre>{JSON.stringify(error.context, null, 2)}</pre>
                </div>
              )}
            </div>
          </details>
        )}
        
        <div className="flex space-x-2">
          {canRetry && (error.recoverable !== false) && (
            <Button onClick={resetError} variant="outline" size="sm">
              <RefreshCw className="h-4 w-4 mr-2" />
              Try Again
            </Button>
          )}
          <Button 
            onClick={() => window.location.reload()} 
            variant="outline" 
            size="sm"
          >
            Reload Page
          </Button>
          {(error.category === 'network') && (
            <Button 
              onClick={() => window.location.href = '/offline'} 
              variant="ghost" 
              size="sm"
            >
              <WifiOff className="h-4 w-4 mr-2" />
              Offline Mode
            </Button>
          )}
        </div>
      </div>
    </Card>
  )
}

export function ChartErrorFallback({ error, resetError, retryCount, canRetry }: ErrorFallbackProps) {
  const CategoryIcon = getCategoryIcon(error.category || 'unknown')
  
  return (
    <div className="flex flex-col items-center justify-center h-full p-4 text-center border-2 border-dashed border-gray-300 rounded-lg">
      <CategoryIcon className="h-12 w-12 text-red-500 mb-4" />
      <h3 className="text-lg font-semibold text-gray-900 mb-2">Chart Rendering Error</h3>
      <p className="text-sm text-gray-600 mb-2">
        {error.message}
      </p>
      <p className="text-xs text-gray-500 mb-4">
        Severity: {error.severity || 'unknown'} • Category: {error.category || 'unknown'}
        {retryCount > 0 && ` • Attempts: ${retryCount}`}
      </p>
      
      <div className="flex space-x-2">
        {canRetry && (error.recoverable !== false) && (
          <Button onClick={resetError} variant="outline" size="sm">
            <RefreshCw className="h-4 w-4 mr-2" />
            Retry Chart
          </Button>
        )}
        <Button 
          onClick={() => {
            // Fallback to simple chart or table view
            console.log('Switching to fallback chart mode')
          }} 
          variant="ghost" 
          size="sm"
        >
          Simple View
        </Button>
      </div>
    </div>
  )
}

export function DataGridErrorFallback({ error, resetError, retryCount, canRetry }: ErrorFallbackProps) {
  const CategoryIcon = getCategoryIcon(error.category || 'unknown')
  
  return (
    <div className="flex flex-col items-center justify-center h-full p-4 text-center border-2 border-dashed border-gray-300 rounded-lg">
      <CategoryIcon className="h-12 w-12 text-red-500 mb-4" />
      <h3 className="text-lg font-semibold text-gray-900 mb-2">Data Grid Error</h3>
      <p className="text-sm text-gray-600 mb-2">
        {error.message}
      </p>
      <p className="text-xs text-gray-500 mb-4">
        Severity: {error.severity || 'unknown'} • Category: {error.category || 'unknown'}
        {retryCount > 0 && ` • Attempts: ${retryCount}`}
      </p>
      
      <div className="flex space-x-2">
        {canRetry && (error.recoverable !== false) && (
          <Button onClick={resetError} variant="outline" size="sm">
            <RefreshCw className="h-4 w-4 mr-2" />
            Retry Grid
          </Button>
        )}
        <Button 
          onClick={() => {
            // Fallback to basic table
            console.log('Switching to basic table mode')
          }} 
          variant="ghost" 
          size="sm"
        >
          Basic Table
        </Button>
      </div>
    </div>
  )
}

export function NetworkErrorFallback({ error, resetError, retryCount, canRetry }: ErrorFallbackProps) {
  return (
    <div className="flex flex-col items-center justify-center h-full p-4 text-center">
      <WifiOff className="h-12 w-12 text-orange-500 mb-4" />
      <h3 className="text-lg font-semibold text-gray-900 mb-2">Connection Error</h3>
      <p className="text-sm text-gray-600 mb-2">
        Unable to connect to the data source
      </p>
      <p className="text-xs text-gray-500 mb-4">
        {error.message}
        {retryCount > 0 && ` • Retry attempts: ${retryCount}`}
      </p>
      
      <div className="flex space-x-2">
        {canRetry && (
          <Button onClick={resetError} variant="outline" size="sm">
            <Wifi className="h-4 w-4 mr-2" />
            Reconnect
          </Button>
        )}
        <Button 
          onClick={() => {
            // Switch to cached/offline data
            console.log('Switching to offline mode')
          }} 
          variant="ghost" 
          size="sm"
        >
          Use Cached Data
        </Button>
      </div>
    </div>
  )
}

// Higher-order component for wrapping components with error boundaries
export function withErrorBoundary<P extends object>(
  Component: React.ComponentType<P>,
  options?: {
    fallback?: React.ComponentType<ErrorFallbackProps>
    maxRetries?: number
    retryDelay?: number
    isolateFailures?: boolean
    componentName?: string
  }
) {
  const WrappedComponent = (props: P) => (
    <ErrorBoundary 
      fallback={options?.fallback}
      maxRetries={options?.maxRetries}
      retryDelay={options?.retryDelay}
      isolateFailures={options?.isolateFailures}
      componentName={options?.componentName || Component.displayName || Component.name}
    >
      <Component {...props} />
    </ErrorBoundary>
  )
  
  WrappedComponent.displayName = `withErrorBoundary(${Component.displayName || Component.name})`
  
  return WrappedComponent
}

// Specialized error boundaries for different component types
export const ChartErrorBoundary: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <ErrorBoundary 
    fallback={ChartErrorFallback}
    maxRetries={3}
    retryDelay={1000}
    componentName="Chart"
  >
    {children}
  </ErrorBoundary>
)

export const DataGridErrorBoundary: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <ErrorBoundary 
    fallback={DataGridErrorFallback}
    maxRetries={2}
    retryDelay={2000}
    componentName="DataGrid"
  >
    {children}
  </ErrorBoundary>
)

export const NetworkErrorBoundary: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <ErrorBoundary 
    fallback={NetworkErrorFallback}
    maxRetries={5}
    retryDelay={3000}
    componentName="Network"
  >
    {children}
  </ErrorBoundary>
)

// Global error handler for unhandled promise rejections and errors
export function setupGlobalErrorHandling() {
  if (typeof window !== 'undefined') {
    // Handle unhandled promise rejections
    window.addEventListener('unhandledrejection', (event) => {
      console.error('Unhandled promise rejection:', event.reason)
      
      // Prevent the default browser behavior
      event.preventDefault()
      
      // Log to error tracking service
      const errorReport = {
        type: 'unhandledrejection',
        reason: event.reason,
        timestamp: new Date().toISOString(),
        url: window.location.href,
        userAgent: navigator.userAgent
      }
      
      if (process.env.NODE_ENV === 'production') {
        // TODO: Send to error tracking service
        console.error('Production unhandled rejection:', errorReport)
      }
    })

    // Handle global errors
    window.addEventListener('error', (event) => {
      console.error('Global error:', event.error)
      
      const errorReport = {
        type: 'error',
        message: event.message,
        filename: event.filename,
        lineno: event.lineno,
        colno: event.colno,
        error: event.error,
        timestamp: new Date().toISOString(),
        url: window.location.href,
        userAgent: navigator.userAgent
      }
      
      if (process.env.NODE_ENV === 'production') {
        // TODO: Send to error tracking service
        console.error('Production error:', errorReport)
      }
    })
  }
}