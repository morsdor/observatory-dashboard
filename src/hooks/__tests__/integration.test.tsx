import { renderHook, act, waitFor } from '@testing-library/react'
import { useDataStream } from '../useDataStream'
import { MockWebSocketServer, MockWebSocket } from '../../utils/mockWebSocketServer'
import { DataPoint } from '@/types'

// Replace global WebSocket with MockWebSocket for integration testing
const originalWebSocket = global.WebSocket
beforeAll(() => {
  global.WebSocket = MockWebSocket as any
})

afterAll(() => {
  global.WebSocket = originalWebSocket
})

describe('WebSocket Data Streaming Integration', () => {
  let mockServer: MockWebSocketServer

  beforeEach(() => {
    // Setup mock server
    mockServer = new MockWebSocketServer({
      dataPointsPerSecond: 20,
      categories: ['cpu', 'memory', 'network'],
      sources: ['server-1', 'server-2']
    })
  })

  afterEach(async () => {
    if (mockServer) {
      await mockServer.stop()
    }
  })

  it('should establish connection and receive streaming data', async () => {
    // Start mock server
    await mockServer.start()

    const { result } = renderHook(() => 
      useDataStream({
        url: 'ws://localhost:8080',
        maxSize: 1000,
        autoConnect: true
      })
    )

    // Wait for connection to establish
    await waitFor(() => {
      expect(result.current.connectionStatus).toBe('connected')
    }, { timeout: 1000 })

    // Wait for some data to arrive
    await waitFor(() => {
      expect(result.current.data.length).toBeGreaterThan(0)
    }, { timeout: 2000 })

    // Verify data structure
    const firstDataPoint = result.current.data[0]
    expect(firstDataPoint).toHaveProperty('id')
    expect(firstDataPoint).toHaveProperty('timestamp')
    expect(firstDataPoint).toHaveProperty('value')
    expect(firstDataPoint).toHaveProperty('category')
    expect(firstDataPoint).toHaveProperty('source')
    expect(firstDataPoint).toHaveProperty('metadata')

    // Verify data is from expected categories and sources
    expect(['cpu', 'memory', 'network']).toContain(firstDataPoint.category)
    expect(['server-1', 'server-2']).toContain(firstDataPoint.source)
  })

  it('should handle high-frequency data streaming', async () => {
    // Configure for high-frequency streaming
    mockServer = new MockWebSocketServer({
      dataPointsPerSecond: 100, // High frequency
      categories: ['cpu'],
      sources: ['server-1']
    })

    await mockServer.start()

    const { result } = renderHook(() => 
      useDataStream({
        url: 'ws://localhost:8080',
        maxSize: 500,
        enableMetrics: true
      })
    )

    // Wait for connection
    await waitFor(() => {
      expect(result.current.connectionStatus).toBe('connected')
    }, { timeout: 1000 })

    // Wait for significant data accumulation
    await waitFor(() => {
      expect(result.current.data.length).toBeGreaterThan(50)
    }, { timeout: 3000 })

    // Check metrics
    const metrics = result.current.getMetrics()
    expect(metrics.totalPointsReceived).toBeGreaterThan(50)
    expect(metrics.averagePointsPerSecond).toBeGreaterThan(10)
  })

  it('should implement sliding window when buffer limit is reached', async () => {
    const bufferSize = 50
    
    mockServer = new MockWebSocketServer({
      dataPointsPerSecond: 50,
      categories: ['test'],
      sources: ['test-source']
    })

    await mockServer.start()

    const { result } = renderHook(() => 
      useDataStream({
        url: 'ws://localhost:8080',
        maxSize: bufferSize,
        enableMetrics: true
      })
    )

    // Wait for connection
    await waitFor(() => {
      expect(result.current.connectionStatus).toBe('connected')
    }, { timeout: 1000 })

    // Wait for buffer to fill and overflow
    await waitFor(() => {
      expect(result.current.bufferSize).toBe(bufferSize)
      expect(result.current.isBufferFull).toBe(true)
    }, { timeout: 5000 })

    // Continue streaming to test sliding window
    await new Promise(resolve => setTimeout(resolve, 1000))

    // Buffer should maintain max size
    expect(result.current.bufferSize).toBe(bufferSize)
    expect(result.current.isBufferFull).toBe(true)

    // Should have dropped some points
    const metrics = result.current.getMetrics()
    expect(metrics.totalPointsReceived).toBeGreaterThan(bufferSize)
    expect(metrics.totalPointsDropped).toBeGreaterThan(0)
  })

  it('should handle connection interruption and reconnection', async () => {
    await mockServer.start()

    const { result } = renderHook(() => 
      useDataStream({
        url: 'ws://localhost:8080',
        reconnectInterval: 100, // Fast reconnection for testing
        maxReconnectAttempts: 3
      })
    )

    // Wait for initial connection
    await waitFor(() => {
      expect(result.current.connectionStatus).toBe('connected')
    }, { timeout: 1000 })

    // Simulate connection loss by stopping server
    await mockServer.stop()

    // Should detect disconnection
    await waitFor(() => {
      expect(result.current.connectionStatus).toBe('disconnected')
    }, { timeout: 1000 })

    // Restart server to allow reconnection
    await mockServer.start()

    // Should attempt reconnection
    await waitFor(() => {
      expect(result.current.connectionStatus).toBe('connected')
    }, { timeout: 2000 })
  })

  it('should handle manual data injection alongside streaming', async () => {
    await mockServer.start()

    const { result } = renderHook(() => 
      useDataStream({
        url: 'ws://localhost:8080',
        maxSize: 1000
      })
    )

    // Wait for connection and some streaming data
    await waitFor(() => {
      expect(result.current.connectionStatus).toBe('connected')
      expect(result.current.data.length).toBeGreaterThan(0)
    }, { timeout: 2000 })

    const initialDataCount = result.current.data.length

    // Inject manual data
    const manualData: DataPoint[] = [
      {
        id: 'manual-1',
        timestamp: new Date(),
        value: 999,
        category: 'manual',
        source: 'test',
        metadata: { injected: true }
      },
      {
        id: 'manual-2',
        timestamp: new Date(),
        value: 888,
        category: 'manual',
        source: 'test',
        metadata: { injected: true }
      }
    ]

    act(() => {
      result.current.injectData(manualData)
    })

    // Should have added manual data to buffer
    expect(result.current.data.length).toBe(initialDataCount + 2)

    // Should be able to find injected data
    const injectedPoints = result.current.data.filter(point => 
      point.metadata?.injected === true
    )
    expect(injectedPoints).toHaveLength(2)
    expect(injectedPoints[0].id).toBe('manual-1')
    expect(injectedPoints[1].id).toBe('manual-2')
  })

  it('should maintain data chronological order', async () => {
    await mockServer.start()

    const { result } = renderHook(() => 
      useDataStream({
        url: 'ws://localhost:8080',
        maxSize: 100
      })
    )

    // Wait for sufficient data
    await waitFor(() => {
      expect(result.current.data.length).toBeGreaterThan(10)
    }, { timeout: 3000 })

    // Verify chronological order
    const timestamps = result.current.data.map(point => point.timestamp.getTime())
    
    for (let i = 1; i < timestamps.length; i++) {
      expect(timestamps[i]).toBeGreaterThanOrEqual(timestamps[i - 1])
    }
  })

  it('should handle burst mode data correctly', async () => {
    mockServer = new MockWebSocketServer({
      dataPointsPerSecond: 10,
      enableBurstMode: true,
      burstInterval: 500, // Short interval for testing
      burstDuration: 200,
      burstMultiplier: 5
    })

    await mockServer.start()

    const { result } = renderHook(() => 
      useDataStream({
        url: 'ws://localhost:8080',
        maxSize: 1000,
        enableMetrics: true
      })
    )

    // Wait for connection
    await waitFor(() => {
      expect(result.current.connectionStatus).toBe('connected')
    }, { timeout: 1000 })

    // Wait long enough to experience burst mode
    await new Promise(resolve => setTimeout(resolve, 1500))

    // Should have received data
    expect(result.current.data.length).toBeGreaterThan(0)

    const metrics = result.current.getMetrics()
    expect(metrics.totalPointsReceived).toBeGreaterThan(10)
  })

  it('should clear buffer and reset metrics', async () => {
    await mockServer.start()

    const { result } = renderHook(() => 
      useDataStream({
        url: 'ws://localhost:8080',
        maxSize: 100,
        enableMetrics: true
      })
    )

    // Wait for data accumulation
    await waitFor(() => {
      expect(result.current.data.length).toBeGreaterThan(5)
    }, { timeout: 2000 })

    const initialMetrics = result.current.getMetrics()
    expect(initialMetrics.totalPointsReceived).toBeGreaterThan(0)

    // Clear buffer
    act(() => {
      result.current.clearBuffer()
    })

    // Buffer should be empty
    expect(result.current.data).toHaveLength(0)
    expect(result.current.bufferSize).toBe(0)
    expect(result.current.isBufferFull).toBe(false)

    // Metrics should be reset
    const clearedMetrics = result.current.getMetrics()
    expect(clearedMetrics.totalPointsReceived).toBe(0)
    expect(clearedMetrics.totalPointsDropped).toBe(0)
    expect(clearedMetrics.bufferUtilization).toBe(0)
  })

  it('should handle multiple data categories simultaneously', async () => {
    mockServer = new MockWebSocketServer({
      dataPointsPerSecond: 30,
      categories: ['cpu', 'memory', 'network', 'disk'],
      sources: ['server-1', 'server-2', 'server-3']
    })

    await mockServer.start()

    const { result } = renderHook(() => 
      useDataStream({
        url: 'ws://localhost:8080',
        maxSize: 200
      })
    )

    // Wait for diverse data
    await waitFor(() => {
      expect(result.current.data.length).toBeGreaterThan(20)
    }, { timeout: 3000 })

    // Group data by category and source
    const byCategory = result.current.data.reduce((acc, point) => {
      acc[point.category] = (acc[point.category] || 0) + 1
      return acc
    }, {} as Record<string, number>)

    const bySource = result.current.data.reduce((acc, point) => {
      acc[point.source] = (acc[point.source] || 0) + 1
      return acc
    }, {} as Record<string, number>)

    // Should have data from multiple categories and sources
    expect(Object.keys(byCategory).length).toBeGreaterThan(1)
    expect(Object.keys(bySource).length).toBeGreaterThan(1)

    // Verify expected categories and sources
    Object.keys(byCategory).forEach(category => {
      expect(['cpu', 'memory', 'network', 'disk']).toContain(category)
    })

    Object.keys(bySource).forEach(source => {
      expect(['server-1', 'server-2', 'server-3']).toContain(source)
    })
  })
})