import React from 'react'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { 
  ErrorBoundary, 
  ChartErrorBoundary, 
  DataGridErrorBoundary, 
  NetworkErrorBoundary,
  classifyError,
  setupGlobalErrorHandling,
  withErrorBoundary
} from '@/components/dashboard/ErrorBoundary'

// Mock component that throws errors
const ThrowError: React.FC<{ shouldThrow?: boolean; errorType?: string }> = ({ 
  shouldThrow = false, 
  errorType = 'generic' 
}) => {
  if (shouldThrow) {
    switch (errorType) {
      case 'network':
        throw new Error('WebSocket connection failed')
      case 'data':
        throw new Error('Failed to parse data')
      case 'rendering':
        throw new Error('Canvas rendering failed')
      case 'performance':
        throw new Error('Memory limit exceeded')
      case 'validation':
        throw new Error('Data validation failed')
      default:
        throw new Error('Generic error')
    }
  }
  return <div>Component rendered successfully</div>
}

describe('ErrorBoundary', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    // Suppress console.error for cleaner test output
    jest.spyOn(console, 'error').mockImplementation(() => {})
  })

  afterEach(() => {
    jest.restoreAllMocks()
  })

  describe('Basic Error Boundary Functionality', () => {
    it('should render children when there is no error', () => {
      render(
        <ErrorBoundary>
          <ThrowError shouldThrow={false} />
        </ErrorBoundary>
      )

      expect(screen.getByText('Component rendered successfully')).toBeInTheDocument()
    })

    it('should catch and display error when child component throws', () => {
      render(
        <ErrorBoundary>
          <ThrowError shouldThrow={true} />
        </ErrorBoundary>
      )

      expect(screen.getByText('Error Detected')).toBeInTheDocument()
      expect(screen.getByText(/Generic error/)).toBeInTheDocument()
    })

    it('should allow error reset and re-render children', async () => {
      const { rerender } = render(
        <ErrorBoundary>
          <ThrowError shouldThrow={true} />
        </ErrorBoundary>
      )

      expect(screen.getByText('Error Detected')).toBeInTheDocument()

      const tryAgainButton = screen.getByText('Try Again')
      fireEvent.click(tryAgainButton)

      // Re-render with no error
      rerender(
        <ErrorBoundary>
          <ThrowError shouldThrow={false} />
        </ErrorBoundary>
      )

      await waitFor(() => {
        expect(screen.getByText('Component rendered successfully')).toBeInTheDocument()
      })
    })

    it('should call onError callback when error occurs', () => {
      const onErrorMock = jest.fn()

      render(
        <ErrorBoundary onError={onErrorMock}>
          <ThrowError shouldThrow={true} />
        </ErrorBoundary>
      )

      expect(onErrorMock).toHaveBeenCalledTimes(1)
      expect(onErrorMock).toHaveBeenCalledWith(
        expect.objectContaining({
          message: 'Generic error',
          category: 'unknown',
          severity: 'medium'
        }),
        expect.any(Object)
      )
    })
  })

  describe('Error Classification', () => {
    it('should classify network errors correctly', () => {
      const error = new Error('WebSocket connection failed')
      const classified = classifyError(error, 'TestComponent')

      expect(classified.category).toBe('network')
      expect(classified.severity).toBe('high')
      expect(classified.recoverable).toBe(true)
      expect(classified.context.component).toBe('TestComponent')
    })

    it('should classify data errors correctly', () => {
      const error = new Error('Failed to parse data')
      const classified = classifyError(error)

      expect(classified.category).toBe('data')
      expect(classified.severity).toBe('medium')
      expect(classified.recoverable).toBe(true)
    })

    it('should classify rendering errors correctly', () => {
      const error = new Error('Canvas rendering failed')
      const classified = classifyError(error)

      expect(classified.category).toBe('rendering')
      expect(classified.severity).toBe('high')
      expect(classified.recoverable).toBe(true)
    })

    it('should classify performance errors correctly', () => {
      const error = new Error('Memory limit exceeded')
      const classified = classifyError(error)

      expect(classified.category).toBe('performance')
      expect(classified.severity).toBe('critical')
      expect(classified.recoverable).toBe(false)
    })

    it('should classify validation errors correctly', () => {
      const error = new Error('Data validation failed')
      const classified = classifyError(error)

      expect(classified.category).toBe('validation')
      expect(classified.severity).toBe('medium')
      expect(classified.recoverable).toBe(true)
    })
  })

  describe('Specialized Error Boundaries', () => {
    it('should render chart-specific error fallback', () => {
      render(
        <ChartErrorBoundary>
          <ThrowError shouldThrow={true} errorType="rendering" />
        </ChartErrorBoundary>
      )

      expect(screen.getByText('Chart Rendering Error')).toBeInTheDocument()
      expect(screen.getByText('Retry Chart')).toBeInTheDocument()
      expect(screen.getByText('Simple View')).toBeInTheDocument()
    })

    it('should render data grid-specific error fallback', () => {
      render(
        <DataGridErrorBoundary>
          <ThrowError shouldThrow={true} errorType="data" />
        </DataGridErrorBoundary>
      )

      expect(screen.getByText('Data Grid Error')).toBeInTheDocument()
      expect(screen.getByText('Retry Grid')).toBeInTheDocument()
      expect(screen.getByText('Basic Table')).toBeInTheDocument()
    })

    it('should render network-specific error fallback', () => {
      render(
        <NetworkErrorBoundary>
          <ThrowError shouldThrow={true} errorType="network" />
        </NetworkErrorBoundary>
      )

      expect(screen.getByText('Connection Error')).toBeInTheDocument()
      expect(screen.getByText('Reconnect')).toBeInTheDocument()
      expect(screen.getByText('Use Cached Data')).toBeInTheDocument()
    })
  })

  describe('Auto-retry Functionality', () => {
    it('should auto-retry recoverable errors', async () => {
      const { rerender } = render(
        <ErrorBoundary maxRetries={2} retryDelay={100}>
          <ThrowError shouldThrow={true} errorType="network" />
        </ErrorBoundary>
      )

      expect(screen.getByText('Error Detected')).toBeInTheDocument()

      // Wait for auto-retry
      await waitFor(() => {
        expect(screen.getByText(/Attempts: 1/)).toBeInTheDocument()
      }, { timeout: 200 })

      // Simulate successful retry
      rerender(
        <ErrorBoundary maxRetries={2} retryDelay={100}>
          <ThrowError shouldThrow={false} />
        </ErrorBoundary>
      )

      await waitFor(() => {
        expect(screen.getByText('Component rendered successfully')).toBeInTheDocument()
      })
    })

    it('should not auto-retry non-recoverable errors', () => {
      render(
        <ErrorBoundary maxRetries={2} retryDelay={100}>
          <ThrowError shouldThrow={true} errorType="performance" />
        </ErrorBoundary>
      )

      expect(screen.getByText('Error Detected')).toBeInTheDocument()
      expect(screen.queryByText('Try Again')).not.toBeInTheDocument()
    })

    it('should stop retrying after max attempts', async () => {
      render(
        <ErrorBoundary maxRetries={1} retryDelay={50}>
          <ThrowError shouldThrow={true} errorType="network" />
        </ErrorBoundary>
      )

      expect(screen.getByText('Error Detected')).toBeInTheDocument()

      // Wait for max retries to be reached
      await waitFor(() => {
        expect(screen.getByText(/Attempts: 1/)).toBeInTheDocument()
      }, { timeout: 200 })

      // Should not retry again
      await new Promise(resolve => setTimeout(resolve, 100))
      expect(screen.getByText(/Attempts: 1/)).toBeInTheDocument()
    })
  })

  describe('withErrorBoundary HOC', () => {
    it('should wrap component with error boundary', () => {
      const WrappedComponent = withErrorBoundary(ThrowError, {
        componentName: 'TestComponent',
        maxRetries: 1
      })

      render(<WrappedComponent shouldThrow={true} />)

      expect(screen.getByText('Error Detected')).toBeInTheDocument()
    })

    it('should use custom fallback component', () => {
      const CustomFallback = () => <div>Custom Error Message</div>
      
      const WrappedComponent = withErrorBoundary(ThrowError, {
        fallback: CustomFallback
      })

      render(<WrappedComponent shouldThrow={true} />)

      expect(screen.getByText('Custom Error Message')).toBeInTheDocument()
    })
  })

  describe('Global Error Handling', () => {
    it('should setup global error handlers', () => {
      const addEventListenerSpy = jest.spyOn(window, 'addEventListener')
      
      setupGlobalErrorHandling()

      expect(addEventListenerSpy).toHaveBeenCalledWith('unhandledrejection', expect.any(Function))
      expect(addEventListenerSpy).toHaveBeenCalledWith('error', expect.any(Function))
    })

    it('should handle unhandled promise rejections', () => {
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation()
      
      setupGlobalErrorHandling()

      // Simulate unhandled promise rejection
      const event = new Event('unhandledrejection') as any
      event.reason = new Error('Unhandled promise rejection')
      event.preventDefault = jest.fn()

      window.dispatchEvent(event)

      expect(consoleSpy).toHaveBeenCalledWith('Unhandled promise rejection:', expect.any(Error))
      expect(event.preventDefault).toHaveBeenCalled()
    })

    it('should handle global errors', () => {
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation()
      
      setupGlobalErrorHandling()

      // Simulate global error
      const event = new ErrorEvent('error', {
        message: 'Global error',
        filename: 'test.js',
        lineno: 1,
        colno: 1,
        error: new Error('Global error')
      })

      window.dispatchEvent(event)

      expect(consoleSpy).toHaveBeenCalledWith('Global error:', expect.any(Object))
    })
  })

  describe('Error Context and Logging', () => {
    it('should include error context in enhanced error', () => {
      const error = new Error('Test error')
      const classified = classifyError(error, 'TestComponent')

      expect(classified.context).toEqual(
        expect.objectContaining({
          component: 'TestComponent',
          timestamp: expect.any(Date)
        })
      )
    })

    it('should log errors in development mode', () => {
      const originalEnv = process.env.NODE_ENV
      process.env.NODE_ENV = 'development'
      
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation()
      const consoleGroupSpy = jest.spyOn(console, 'group').mockImplementation()
      const consoleGroupEndSpy = jest.spyOn(console, 'groupEnd').mockImplementation()

      render(
        <ErrorBoundary>
          <ThrowError shouldThrow={true} />
        </ErrorBoundary>
      )

      expect(consoleGroupSpy).toHaveBeenCalledWith('🚨 Error Boundary Caught Error')
      expect(consoleSpy).toHaveBeenCalled()
      expect(consoleGroupEndSpy).toHaveBeenCalled()

      process.env.NODE_ENV = originalEnv
    })
  })

  describe('Error Severity Display', () => {
    it('should display different styles for different severities', () => {
      render(
        <ErrorBoundary>
          <ThrowError shouldThrow={true} errorType="performance" />
        </ErrorBoundary>
      )

      expect(screen.getByText('critical • performance')).toBeInTheDocument()
    })

    it('should show appropriate recovery options based on error type', () => {
      render(
        <ErrorBoundary>
          <ThrowError shouldThrow={true} errorType="network" />
        </ErrorBoundary>
      )

      expect(screen.getByText('Offline Mode')).toBeInTheDocument()
    })
  })
})