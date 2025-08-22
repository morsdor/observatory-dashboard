import { renderHook, act, waitFor } from '@testing-library/react'
import { useRealTimeIntegration } from '../useRealTimeIntegration'
import { DataPoint } from '@/types'
import { Provider } from 'react-redux'
import { store } from '@/stores/dashboardStore'
import React from 'react'

// Mock WebSocket
class MockWebSocket {
  static CONNECTING = 0
  static OPEN = 1
  static CLOSING = 2
  static CLOSED = 3

  readyState = MockWebSocket.CONNECTING
  onopen: ((event: Event) => void) | null = null
  onmessage: ((event: MessageEvent) => void) | null = null
  onerror: ((event: Event) => void) | null = null
  onclose: ((event: CloseEvent) => void) | null = null

  constructor(public url: string) {
    // Simulate connection delay
    setTimeout(() => {
      this.readyState = MockWebSocket.OPEN
      this.onopen?.(new Event('open'))
    }, 10)
  }

  send(data: string) {
    // Mock send implementation
  }

  close() {
    this.readyState = MockWebSocket.CLOSED
    this.onclose?.(new CloseEvent('close'))
  }

  // Helper method to simulate incoming data
  simulateMessage(data: any) {
    if (this.readyState === MockWebSocket.OPEN && this.onmessage) {
      this.onmessage(new MessageEvent('message', { data: JSON.stringify(data) }))
    }
  }
}

// Mock global WebSocket
const originalWebSocket = global.WebSocket
beforeAll(() => {
  global.WebSocket = MockWebSocket as any
})

afterAll(() => {
  global.WebSocket = originalWebSocket
})

// Test wrapper with Redux store
const wrapper = ({ children }: { children: React.ReactNode }) => (
  <Provider store={store}>{children}</Provider>
)

// Helper function to generate test data
const generateDataPoints = (count: number, startTime: Date = new Date()): DataPoint[] => {
  return Array.from({ length: count }, (_, i) => ({
    id: `point-${i}`,
    timestamp: new Date(startTime.getTime() + i * 1000),
    value: Math.random() * 100,
    category: `category-${i % 5}`,
    source: `source-${i % 3}`,
    metadata: { index: i, batch: Math.floor(i / 100) }
  }))
}

describe('useRealTimeIntegration - Stress Tests', () => {
  let mockWs: MockWebSocket

  beforeEach(() => {
    jest.clearAllMocks()
    // Reset store state
    store.dispatch({ type: 'data/clearData' })
  })

  describe('High-Frequency Data Streaming', () => {
    test('handles 1000 points per second for 10 seconds', async () => {
      const { result } = renderHook(
        () => useRealTimeIntegration({
          websocketUrl: 'ws://localhost:8080',
          maxBufferSize: 50000,
          performanceMonitoringInterval: 100
        }),
        { wrapper }
      )

      // Wait for connection
      await waitFor(() => {
        expect(result.current.isConnected).toBe(true)
      })

      // Get the mock WebSocket instance
      mockWs = (global.WebSocket as any).mock?.instances?.[0] || new MockWebSocket('ws://localhost:8080')

      const startTime = new Date()
      const pointsPerBatch = 100
      const batchesPerSecond = 10
      const totalSeconds = 10
      const totalBatches = batchesPerSecond * totalSeconds

      // Simulate high-frequency streaming
      for (let batch = 0; batch < totalBatches; batch++) {
        const batchStartTime = new Date(startTime.getTime() + batch * 100) // 100ms intervals
        const dataPoints = generateDataPoints(pointsPerBatch, batchStartTime)
        
        act(() => {
          mockWs.simulateMessage(dataPoints)
        })

        // Small delay to simulate real-time streaming
        await new Promise(resolve => setTimeout(resolve, 10))
      }

      // Wait for all data to be processed
      await waitFor(() => {
        expect(result.current.data.length).toBeGreaterThan(0)
      }, { timeout: 5000 })

      // Verify performance metrics
      expect(result.current.metrics.dataPointsPerSecond).toBeGreaterThan(0)
      expect(result.current.metrics.totalDataPoints).toBe(Math.min(totalBatches * pointsPerBatch, 50000))
      expect(result.current.performanceMetrics.fps).toBeGreaterThan(0)
      
      // Verify buffer management
      if (totalBatches * pointsPerBatch > 50000) {
        expect(result.current.isBufferFull).toBe(true)
        expect(result.current.data.length).toBe(50000)
      }
    })

    test('handles burst traffic patterns', async () => {
      const { result } = renderHook(
        () => useRealTimeIntegration({
          websocketUrl: 'ws://localhost:8080',
          maxBufferSize: 20000
        }),
        { wrapper }
      )

      await waitFor(() => {
        expect(result.current.isConnected).toBe(true)
      })

      mockWs = (global.WebSocket as any).mock?.instances?.[0] || new MockWebSocket('ws://localhost:8080')

      // Simulate burst pattern: high activity followed by quiet periods
      const burstSizes = [5000, 100, 3000, 50, 8000, 200]
      let totalPoints = 0

      for (const burstSize of burstSizes) {
        const dataPoints = generateDataPoints(burstSize)
        
        act(() => {
          mockWs.simulateMessage(dataPoints)
        })

        totalPoints += burstSize

        // Wait between bursts
        await new Promise(resolve => setTimeout(resolve, 100))
      }

      await waitFor(() => {
        expect(result.current.data.length).toBeGreaterThan(0)
      })

      // Verify sliding window behavior
      expect(result.current.data.length).toBeLessThanOrEqual(20000)
      expect(result.current.metrics.totalDataPoints).toBe(Math.min(totalPoints, 20000))
    })

    test('maintains performance under memory pressure', async () => {
      const { result } = renderHook(
        () => useRealTimeIntegration({
          websocketUrl: 'ws://localhost:8080',
          maxBufferSize: 100000,
          memoryMonitoringInterval: 100
        }),
        { wrapper }
      )

      await waitFor(() => {
        expect(result.current.isConnected).toBe(true)
      })

      mockWs = (global.WebSocket as any).mock?.instances?.[0] || new MockWebSocket('ws://localhost:8080')

      // Generate large data points with extensive metadata
      const generateLargeDataPoints = (count: number): DataPoint[] => {
        return Array.from({ length: count }, (_, i) => ({
          id: `large-point-${i}-${Date.now()}`,
          timestamp: new Date(),
          value: Math.random() * 1000,
          category: `category-with-long-name-${i % 10}`,
          source: `source-with-detailed-information-${i % 5}`,
          metadata: {
            index: i,
            description: `This is a detailed description for data point ${i}`.repeat(10),
            tags: Array.from({ length: 20 }, (_, j) => `tag-${j}`),
            measurements: Array.from({ length: 50 }, () => Math.random()),
            nested: {
              level1: {
                level2: {
                  data: Array.from({ length: 100 }, () => Math.random())
                }
              }
            }
          }
        }))
      }

      // Stream large data points
      for (let i = 0; i < 20; i++) {
        const largePoints = generateLargeDataPoints(1000)
        
        act(() => {
          mockWs.simulateMessage(largePoints)
        })

        await new Promise(resolve => setTimeout(resolve, 50))
      }

      await waitFor(() => {
        expect(result.current.data.length).toBeGreaterThan(0)
      })

      // Verify memory management
      expect(result.current.metrics.memoryUsage).toBeGreaterThan(0)
      expect(result.current.data.length).toBeLessThanOrEqual(100000)
    })
  })

  describe('Performance Monitoring', () => {
    test('tracks data rate accurately during variable streaming', async () => {
      const { result } = renderHook(
        () => useRealTimeIntegration({
          websocketUrl: 'ws://localhost:8080',
          dataRateCalculationWindow: 2000
        }),
        { wrapper }
      )

      await waitFor(() => {
        expect(result.current.isConnected).toBe(true)
      })

      mockWs = (global.WebSocket as any).mock?.instances?.[0] || new MockWebSocket('ws://localhost:8080')

      // Variable rate streaming
      const rates = [10, 50, 100, 200, 500] // points per batch
      
      for (const rate of rates) {
        // Send multiple batches at this rate
        for (let i = 0; i < 5; i++) {
          const dataPoints = generateDataPoints(rate)
          
          act(() => {
            mockWs.simulateMessage(dataPoints)
          })

          await new Promise(resolve => setTimeout(resolve, 200))
        }

        // Allow time for rate calculation
        await new Promise(resolve => setTimeout(resolve, 500))
        
        // Verify rate is being tracked
        expect(result.current.metrics.dataPointsPerSecond).toBeGreaterThan(0)
      }
    })

    test('monitors memory usage and triggers garbage collection', async () => {
      // Mock performance.memory
      const mockMemory = {
        usedJSHeapSize: 50 * 1024 * 1024, // 50MB
        totalJSHeapSize: 100 * 1024 * 1024,
        jsHeapSizeLimit: 2 * 1024 * 1024 * 1024
      }

      Object.defineProperty(performance, 'memory', {
        value: mockMemory,
        configurable: true
      })

      const { result } = renderHook(
        () => useRealTimeIntegration({
          websocketUrl: 'ws://localhost:8080',
          memoryMonitoringInterval: 100
        }),
        { wrapper }
      )

      await waitFor(() => {
        expect(result.current.isConnected).toBe(true)
      })

      // Wait for memory monitoring to start
      await new Promise(resolve => setTimeout(resolve, 200))

      // Verify memory metrics are being tracked
      expect(result.current.metrics.memoryUsage).toBeGreaterThan(0)
    })
  })

  describe('Buffer Overflow Handling', () => {
    test('handles buffer overflow gracefully with sliding window', async () => {
      const maxBufferSize = 1000
      const { result } = renderHook(
        () => useRealTimeIntegration({
          websocketUrl: 'ws://localhost:8080',
          maxBufferSize
        }),
        { wrapper }
      )

      await waitFor(() => {
        expect(result.current.isConnected).toBe(true)
      })

      mockWs = (global.WebSocket as any).mock?.instances?.[0] || new MockWebSocket('ws://localhost:8080')

      // Send more data than buffer can hold
      const totalPoints = maxBufferSize * 2
      const batchSize = 100

      for (let i = 0; i < totalPoints; i += batchSize) {
        const dataPoints = generateDataPoints(Math.min(batchSize, totalPoints - i))
        
        act(() => {
          mockWs.simulateMessage(dataPoints)
        })

        await new Promise(resolve => setTimeout(resolve, 10))
      }

      await waitFor(() => {
        expect(result.current.data.length).toBeGreaterThan(0)
      })

      // Verify sliding window behavior
      expect(result.current.data.length).toBeLessThanOrEqual(maxBufferSize)
      expect(result.current.isBufferFull).toBe(true)
      expect(result.current.metrics.bufferUtilization).toBeCloseTo(100, 0)
    })

    test('recovers from memory pressure by optimizing buffer', async () => {
      const { result } = renderHook(
        () => useRealTimeIntegration({
          websocketUrl: 'ws://localhost:8080',
          maxBufferSize: 10000
        }),
        { wrapper }
      )

      await waitFor(() => {
        expect(result.current.isConnected).toBe(true)
      })

      mockWs = (global.WebSocket as any).mock?.instances?.[0] || new MockWebSocket('ws://localhost:8080')

      // Generate duplicate data to test optimization
      const baseTime = new Date()
      const duplicatePoints = Array.from({ length: 5000 }, (_, i) => ({
        id: `dup-${Math.floor(i / 10)}`, // Create duplicates
        timestamp: new Date(baseTime.getTime() + Math.floor(i / 10) * 1000),
        value: Math.floor(i / 10), // Same values for groups
        category: 'test',
        source: 'test',
        metadata: {}
      }))

      act(() => {
        mockWs.simulateMessage(duplicatePoints)
      })

      await waitFor(() => {
        expect(result.current.data.length).toBeGreaterThan(0)
      })

      // Buffer should contain fewer points due to deduplication
      expect(result.current.data.length).toBeLessThan(5000)
    })
  })

  describe('Connection Resilience', () => {
    test('maintains performance during connection interruptions', async () => {
      const { result } = renderHook(
        () => useRealTimeIntegration({
          websocketUrl: 'ws://localhost:8080'
        }),
        { wrapper }
      )

      await waitFor(() => {
        expect(result.current.isConnected).toBe(true)
      })

      mockWs = (global.WebSocket as any).mock?.instances?.[0] || new MockWebSocket('ws://localhost:8080')

      // Send initial data
      const initialData = generateDataPoints(1000)
      act(() => {
        mockWs.simulateMessage(initialData)
      })

      // Simulate connection loss
      act(() => {
        mockWs.close()
      })

      expect(result.current.connectionStatus).toBe('disconnected')

      // Data should still be available
      expect(result.current.data.length).toBe(1000)

      // Reconnect and send more data
      act(() => {
        result.current.reconnect()
      })

      await waitFor(() => {
        expect(result.current.isConnected).toBe(true)
      })

      const additionalData = generateDataPoints(500)
      act(() => {
        mockWs.simulateMessage(additionalData)
      })

      await waitFor(() => {
        expect(result.current.data.length).toBe(1500)
      })
    })
  })

  describe('Performance Benchmarks', () => {
    test('maintains sub-200ms response times under load', async () => {
      const { result } = renderHook(
        () => useRealTimeIntegration({
          websocketUrl: 'ws://localhost:8080',
          performanceMonitoringInterval: 100
        }),
        { wrapper }
      )

      await waitFor(() => {
        expect(result.current.isConnected).toBe(true)
      })

      mockWs = (global.WebSocket as any).mock?.instances?.[0] || new MockWebSocket('ws://localhost:8080')

      const responseTimes: number[] = []

      // Measure response times for data processing
      for (let i = 0; i < 50; i++) {
        const startTime = performance.now()
        const dataPoints = generateDataPoints(200)
        
        act(() => {
          mockWs.simulateMessage(dataPoints)
        })

        await waitFor(() => {
          expect(result.current.data.length).toBeGreaterThan(i * 200)
        })

        const responseTime = performance.now() - startTime
        responseTimes.push(responseTime)

        await new Promise(resolve => setTimeout(resolve, 20))
      }

      // Verify performance requirements
      const averageResponseTime = responseTimes.reduce((sum, time) => sum + time, 0) / responseTimes.length
      const maxResponseTime = Math.max(...responseTimes)

      expect(averageResponseTime).toBeLessThan(200) // Average under 200ms
      expect(maxResponseTime).toBeLessThan(500) // Max under 500ms
      
      // At least 95% of responses should be under 200ms
      const fastResponses = responseTimes.filter(time => time < 200).length
      const fastResponseRate = fastResponses / responseTimes.length
      expect(fastResponseRate).toBeGreaterThan(0.95)
    })
  })
})