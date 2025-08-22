import React from 'react'
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react'
import { renderHook } from '@testing-library/react'
import { 
  ErrorBoundary, 
  ChartErrorBoundary, 
  DataGridErrorBoundary,
  setupGlobalErrorHandling 
} from '@/components/dashboard/ErrorBoundary'
import { useResilientWebSocket } from '@/hooks/useResilientWebSocket'
import { dataValidator } from '@/lib/dataValidation'
import { errorRecoveryManager } from '@/lib/errorRecovery'
import { DataPoint } from '@/types'

// Mock WebSocket for integration tests
class MockWebSocket {
  static CONNECTING = 0
  static OPEN = 1
  static CLOSING = 2
  static CLOSED = 3

  readyState = MockWebSocket.CONNECTING
  onopen: ((event: Event) => void) | null = null
  onclose: ((event: CloseEvent) => void) | null = null
  onmessage: ((event: MessageEvent) => void) | null = null
  onerror: ((event: Event) => void) | null = null

  constructor(public url: string) {
    setTimeout(() => {
      this.readyState = MockWebSocket.OPEN
      this.onopen?.(new Event('open'))
    }, 10)
  }

  send(data: string) {
    if (this.readyState !== MockWebSocket.OPEN) {
      throw new Error('WebSocket is not open')
    }
  }

  close() {
    this.readyState = MockWebSocket.CLOSED
    this.onclose?.(new CloseEvent('close'))
  }

  simulateMessage(data: any) {
    if (this.onmessage) {
      this.onmessage(new MessageEvent('message', { data: JSON.stringify(data) }))
    }
  }

  simulateError() {
    this.onerror?.(new Event('error'))
  }

  simulateClose(code = 1000) {
    this.readyState = MockWebSocket.CLOSED
    this.onclose?.(new CloseEvent('close', { code }))
  }
}

global.WebSocket = MockWebSocket as any

// Mock components that can throw errors
const ChartComponent: React.FC<{ shouldFail?: boolean; failureType?: string }> = ({ 
  shouldFail = false, 
  failureType = 'rendering' 
}) => {
  if (shouldFail) {
    switch (failureType) {
      case 'rendering':
        throw new Error('Chart rendering failed')
      case 'data':
        throw new Error('Invalid chart data')
      case 'performance':
        throw new Error('Chart performance degraded')
      default:
        throw new Error('Chart error')
    }
  }
  return <div data-testid="chart">Chart Component</div>
}

const DataGridComponent: React.FC<{ shouldFail?: boolean; failureType?: string }> = ({ 
  shouldFail = false, 
  failureType = 'data' 
}) => {
  if (shouldFail) {
    switch (failureType) {
      case 'data':
        throw new Error('Data grid data error')
      case 'rendering':
        throw new Error('Data grid rendering failed')
      case 'performance':
        throw new Error('Data grid performance issue')
      default:
        throw new Error('Data grid error')
    }
  }
  return <div data-testid="data-grid">Data Grid Component</div>
}

const NetworkComponent: React.FC<{ shouldFail?: boolean }> = ({ shouldFail = false }) => {
  const { connectionStatus, error, reconnect } = useResilientWebSocket({
    url: shouldFail ? 'ws://invalid-url' : 'ws://localhost:8080'
  })

  if (error) {
    return (
      <div data-testid="network-error">
        Network Error: {error.message}
        <button onClick={reconnect}>Reconnect</button>
      </div>
    )
  }

  return <div data-testid="network-status">Status: {connectionStatus}</div>
}

describe('Error Handling Integration', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    jest.clearAllTimers()
    jest.useFakeTimers()
    
    // Suppress console errors for cleaner test output
    jest.spyOn(console, 'error').mockImplementation(() => {})
    jest.spyOn(console, 'warn').mockImplementation(() => {})
    
    // Clear error recovery history
    errorRecoveryManager.clearHistory()
    dataValidator.clearCache()
  })

  afterEach(() => {
    jest.runOnlyPendingTimers()
    jest.useRealTimers()
    jest.restoreAllMocks()
  })

  describe('End-to-End Error Scenarios', () => {
    it('should handle chart rendering failure with recovery', async () => {
      const { rerender } = render(
        <ChartErrorBoundary>
          <ChartComponent shouldFail={true} failureType="rendering" />
        </ChartErrorBoundary>
      )

      // Should show chart error fallback
      expect(screen.getByText('Chart Rendering Error')).toBeInTheDocument()
      expect(screen.getByText('Retry Chart')).toBeInTheDocument()

      // Click retry
      fireEvent.click(screen.getByText('Retry Chart'))

      // Re-render with working component
      rerender(
        <ChartErrorBoundary>
          <ChartComponent shouldFail={false} />
        </ChartErrorBoundary>
      )

      await waitFor(() => {
        expect(screen.getByTestId('chart')).toBeInTheDocument()
      })
    })

    it('should handle data grid failure with fallback', async () => {
      const { rerender } = render(
        <DataGridErrorBoundary>
          <DataGridComponent shouldFail={true} failureType="data" />
        </DataGridErrorBoundary>
      )

      expect(screen.getByText('Data Grid Error')).toBeInTheDocument()
      expect(screen.getByText('Basic Table')).toBeInTheDocument()

      // Click basic table fallback
      fireEvent.click(screen.getByText('Basic Table'))

      // Should trigger fallback mode
      expect(screen.getByText('Basic Table')).toBeInTheDocument()
    })

    it('should handle network failures with automatic recovery', async () => {
      const { result } = renderHook(() => useResilientWebSocket({
        url: 'ws://localhost:8080',
        maxReconnectAttempts: 3,
        reconnectInterval: 100
      }))

      let mockWs: MockWebSocket

      act(() => {
        jest.advanceTimersByTime(20)
      })

      await waitFor(() => {
        expect(result.current.connectionStatus).toBe('connected')
        mockWs = (global.WebSocket as any).mock.instances[0]
      })

      // Simulate connection failure
      act(() => {
        mockWs!.simulateClose(1006) // Abnormal closure
      })

      expect(result.current.connectionStatus).toBe('disconnected')

      // Should attempt automatic reconnection
      act(() => {
        jest.advanceTimersByTime(150)
      })

      await waitFor(() => {
        expect(result.current.connectionHealth.reconnectCount).toBeGreaterThan(0)
      })
    })

    it('should handle data validation errors with correction', async () => {
      const invalidData = [
        {
          id: 'test-1',
          timestamp: '2023-01-01T00:00:00Z', // String timestamp (correctable)
          value: '42.5', // String value (correctable)
          category: 'temperature',
          metadata: {},
          source: 'sensor'
        },
        {
          id: 'test-2',
          // Missing timestamp (not correctable)
          value: 43.0,
          category: 'temperature',
          source: 'sensor'
        }
      ]

      const result = dataValidator.validateDataArray(invalidData)

      expect(result.validPoints).toHaveLength(0) // Raw validation fails
      expect(result.invalidPoints).toHaveLength(2)

      // Attempt correction on the correctable data point
      const correctionResult = dataValidator.attemptDataCorrection(invalidData[0])
      expect(correctionResult.corrected).toBe(true)

      // Validate corrected data
      const correctedValidation = dataValidator.validateDataPoint(correctionResult.data)
      expect(correctedValidation.isValid).toBe(true)
    })

    it('should integrate error recovery with error boundaries', async () => {
      let errorRecoveryAttempted = false
      
      const TestComponent: React.FC = () => {
        throw new Error('Network connection failed')
      }

      const onError = async (error: any) => {
        const result = await errorRecoveryManager.attemptRecovery(error)
        errorRecoveryAttempted = result.success
      }

      render(
        <ErrorBoundary onError={onError}>
          <TestComponent />
        </ErrorBoundary>
      )

      await waitFor(() => {
        expect(errorRecoveryAttempted).toBe(true)
      })

      const stats = errorRecoveryManager.getRecoveryStats()
      expect(stats.totalAttempts).toBe(1)
      expect(stats.successfulRecoveries).toBe(1)
    })
  })

  describe('Complex Error Scenarios', () => {
    it('should handle cascading errors across components', async () => {
      const CascadingErrorComponent: React.FC = () => {
        // Simulate a component that causes multiple errors
        throw new Error('Primary component failure')
      }

      const FallbackComponent: React.FC = () => {
        // Fallback that also fails
        throw new Error('Fallback component failure')
      }

      const UltimateFallback: React.FC = () => (
        <div data-testid="ultimate-fallback">Ultimate Fallback</div>
      )

      render(
        <ErrorBoundary fallback={UltimateFallback}>
          <ErrorBoundary fallback={FallbackComponent}>
            <CascadingErrorComponent />
          </ErrorBoundary>
        </ErrorBoundary>
      )

      await waitFor(() => {
        expect(screen.getByTestId('ultimate-fallback')).toBeInTheDocument()
      })
    })

    it('should handle simultaneous network and data errors', async () => {
      const { result } = renderHook(() => useResilientWebSocket({
        url: 'ws://localhost:8080',
        dataValidation: true
      }))

      let mockWs: MockWebSocket

      act(() => {
        jest.advanceTimersByTime(20)
      })

      await waitFor(() => {
        mockWs = (global.WebSocket as any).mock.instances[0]
      })

      // Send invalid data
      act(() => {
        mockWs!.simulateMessage([{ invalid: 'data' }])
      })

      // Then simulate network error
      act(() => {
        mockWs!.simulateError()
      })

      expect(result.current.error?.category).toBe('network')
      expect(result.current.connectionHealth.dataIntegrityScore).toBeLessThan(100)
    })

    it('should handle memory pressure with graceful degradation', async () => {
      // Simulate memory pressure scenario
      const largeDataset = Array.from({ length: 50000 }, (_, i) => ({
        id: `memory-test-${i}`,
        timestamp: new Date(),
        value: Math.random() * 1000,
        category: 'memory-test',
        metadata: { index: i },
        source: 'memory-source'
      }))

      const MemoryIntensiveComponent: React.FC = () => {
        // Simulate component that processes large dataset
        const processedData = largeDataset.map(item => ({
          ...item,
          processed: true
        }))

        if (processedData.length > 40000) {
          throw new Error('Memory limit exceeded')
        }

        return <div data-testid="memory-component">Processing {processedData.length} items</div>
      }

      render(
        <ErrorBoundary>
          <MemoryIntensiveComponent />
        </ErrorBoundary>
      )

      await waitFor(() => {
        expect(screen.getByText(/critical • performance/)).toBeInTheDocument()
      })
    })

    it('should handle offline/online transitions', async () => {
      const { result } = renderHook(() => useResilientWebSocket({
        url: 'ws://localhost:8080',
        enableOfflineMode: true
      }))

      let mockWs: MockWebSocket

      act(() => {
        jest.advanceTimersByTime(20)
      })

      await waitFor(() => {
        expect(result.current.connectionStatus).toBe('connected')
        mockWs = (global.WebSocket as any).mock.instances[0]
      })

      // Send some data first
      const testData: DataPoint[] = [{
        id: 'offline-test',
        timestamp: new Date(),
        value: 100,
        category: 'offline',
        metadata: {},
        source: 'offline-source'
      }]

      act(() => {
        mockWs!.simulateMessage(testData)
      })

      // Go offline
      act(() => {
        Object.defineProperty(navigator, 'onLine', { value: false, configurable: true })
        window.dispatchEvent(new Event('offline'))
      })

      expect(result.current.connectionStatus).toBe('disconnected')

      // Come back online
      act(() => {
        Object.defineProperty(navigator, 'onLine', { value: true, configurable: true })
        window.dispatchEvent(new Event('online'))
        jest.advanceTimersByTime(50)
      })

      await waitFor(() => {
        expect(result.current.connectionStatus).toBe('connected')
      })
    })
  })

  describe('Error Recovery Integration', () => {
    it('should recover from WebSocket errors with fallback URLs', async () => {
      const { result } = renderHook(() => useResilientWebSocket({
        url: 'ws://primary:8080',
        fallbackUrls: ['ws://fallback1:8080', 'ws://fallback2:8080'],
        maxReconnectAttempts: 3,
        reconnectInterval: 50
      }))

      let mockWs: MockWebSocket

      act(() => {
        jest.advanceTimersByTime(20)
      })

      await waitFor(() => {
        mockWs = (global.WebSocket as any).mock.instances[0]
      })

      // Simulate primary connection failure
      act(() => {
        mockWs!.simulateClose(1006)
        jest.advanceTimersByTime(100)
      })

      const diagnostics = result.current.getConnectionDiagnostics()
      expect(diagnostics.attemptedUrls.length).toBeGreaterThan(1)
    })

    it('should integrate validation with error recovery', async () => {
      const corruptedData = [
        {
          id: 'corrupt-1',
          timestamp: 'invalid-date',
          value: 'not-a-number',
          category: '',
          source: ''
        }
      ]

      // Validate data (should fail)
      const validationResult = dataValidator.validateDataArray(corruptedData)
      expect(validationResult.overallReport.isValid).toBe(false)

      // Attempt recovery
      const error = {
        name: 'ValidationError',
        message: 'Data validation failed',
        category: 'validation' as const,
        severity: 'medium' as const,
        recoverable: true,
        context: {
          timestamp: new Date()
        }
      }

      const recoveryResult = await errorRecoveryManager.attemptRecovery(error, {
        lastKnownGoodState: { data: [] }
      })

      expect(recoveryResult.success).toBe(true)
      expect(recoveryResult.recoveredData).toBeDefined()
    })

    it('should handle performance degradation with automatic optimization', async () => {
      const PerformanceTestComponent: React.FC<{ dataSize: number }> = ({ dataSize }) => {
        // Simulate performance-intensive operation
        const data = Array.from({ length: dataSize }, (_, i) => i)
        const processed = data.map(x => x * 2).filter(x => x > 1000)

        if (dataSize > 10000) {
          throw new Error('Performance degradation detected')
        }

        return <div data-testid="perf-component">Processed {processed.length} items</div>
      }

      const { rerender } = render(
        <ErrorBoundary>
          <PerformanceTestComponent dataSize={15000} />
        </ErrorBoundary>
      )

      expect(screen.getByText(/Performance Issue/)).toBeInTheDocument()

      // Simulate automatic optimization by reducing data size
      rerender(
        <ErrorBoundary>
          <PerformanceTestComponent dataSize={5000} />
        </ErrorBoundary>
      )

      // Reset error boundary
      fireEvent.click(screen.getByText('Try Again'))

      await waitFor(() => {
        expect(screen.getByTestId('perf-component')).toBeInTheDocument()
      })
    })
  })

  describe('Global Error Handling', () => {
    it('should capture and handle global errors', () => {
      const errorSpy = jest.spyOn(console, 'error').mockImplementation()
      
      setupGlobalErrorHandling()

      // Simulate global error
      const errorEvent = new ErrorEvent('error', {
        message: 'Global script error',
        filename: 'test.js',
        lineno: 1,
        colno: 1,
        error: new Error('Global error')
      })

      window.dispatchEvent(errorEvent)

      expect(errorSpy).toHaveBeenCalledWith('Global error:', expect.any(Object))
    })

    it('should handle unhandled promise rejections', () => {
      const errorSpy = jest.spyOn(console, 'error').mockImplementation()
      
      setupGlobalErrorHandling()

      // Simulate unhandled promise rejection
      const rejectionEvent = new Event('unhandledrejection') as any
      rejectionEvent.reason = new Error('Unhandled promise rejection')
      rejectionEvent.preventDefault = jest.fn()

      window.dispatchEvent(rejectionEvent)

      expect(errorSpy).toHaveBeenCalledWith('Unhandled promise rejection:', expect.any(Error))
      expect(rejectionEvent.preventDefault).toHaveBeenCalled()
    })
  })

  describe('User Experience During Errors', () => {
    it('should provide clear error messages and recovery options', async () => {
      render(
        <ErrorBoundary>
          <ChartComponent shouldFail={true} failureType="rendering" />
        </ErrorBoundary>
      )

      expect(screen.getByText('Error Detected')).toBeInTheDocument()
      expect(screen.getByText(/rendering • high/)).toBeInTheDocument()
      expect(screen.getByText('Try Again')).toBeInTheDocument()
      expect(screen.getByText('Reload Page')).toBeInTheDocument()
    })

    it('should show appropriate fallback options based on error type', async () => {
      render(
        <ErrorBoundary>
          <NetworkComponent shouldFail={true} />
        </ErrorBoundary>
      )

      await waitFor(() => {
        expect(screen.getByText('Offline Mode')).toBeInTheDocument()
      })
    })

    it('should maintain application state during error recovery', async () => {
      let appState = { counter: 0 }

      const StatefulComponent: React.FC<{ shouldFail: boolean }> = ({ shouldFail }) => {
        if (shouldFail) {
          throw new Error('Component error')
        }
        return <div data-testid="counter">Counter: {appState.counter}</div>
      }

      const { rerender } = render(
        <ErrorBoundary>
          <StatefulComponent shouldFail={false} />
        </ErrorBoundary>
      )

      expect(screen.getByText('Counter: 0')).toBeInTheDocument()

      // Update state
      appState.counter = 5

      // Cause error
      rerender(
        <ErrorBoundary>
          <StatefulComponent shouldFail={true} />
        </ErrorBoundary>
      )

      expect(screen.getByText('Error Detected')).toBeInTheDocument()

      // Recover
      fireEvent.click(screen.getByText('Try Again'))

      rerender(
        <ErrorBoundary>
          <StatefulComponent shouldFail={false} />
        </ErrorBoundary>
      )

      await waitFor(() => {
        expect(screen.getByText('Counter: 5')).toBeInTheDocument()
      })
    })
  })

  describe('Performance Under Error Conditions', () => {
    it('should not degrade performance during error handling', async () => {
      const startTime = Date.now()

      // Render multiple components with errors
      for (let i = 0; i < 10; i++) {
        render(
          <ErrorBoundary key={i}>
            <ChartComponent shouldFail={true} />
          </ErrorBoundary>
        )
      }

      const endTime = Date.now()
      const renderTime = endTime - startTime

      // Should handle multiple errors quickly
      expect(renderTime).toBeLessThan(1000)
    })

    it('should clean up resources during error recovery', async () => {
      const { result } = renderHook(() => useResilientWebSocket({
        url: 'ws://localhost:8080'
      }))

      let mockWs: MockWebSocket

      act(() => {
        jest.advanceTimersByTime(20)
      })

      await waitFor(() => {
        mockWs = (global.WebSocket as any).mock.instances[0]
      })

      // Disconnect and verify cleanup
      act(() => {
        result.current.disconnect()
      })

      expect(result.current.connectionStatus).toBe('disconnected')
      
      // Should not have any pending timers
      expect(jest.getTimerCount()).toBe(0)
    })
  })
})