import { renderHook, act, waitFor } from '@testing-library/react'
import { useDataStream } from '../useDataStream'
import { DataPoint } from '@/types'

// Create a simple mock WebSocket that works reliably in tests
class TestWebSocket extends EventTarget {
  static CONNECTING = 0
  static OPEN = 1
  static CLOSING = 2
  static CLOSED = 3

  public readyState = TestWebSocket.CONNECTING
  public url: string
  private _onopen: ((event: Event) => void) | null = null
  private _onmessage: ((event: MessageEvent) => void) | null = null
  private _onerror: ((event: Event) => void) | null = null
  private _onclose: ((event: CloseEvent) => void) | null = null

  constructor(url: string) {
    super()
    this.url = url
    
    // Simulate async connection
    setTimeout(() => {
      this.readyState = TestWebSocket.OPEN
      const openEvent = new Event('open')
      if (this._onopen) this._onopen(openEvent)
      this.dispatchEvent(openEvent)
    }, 10)
  }

  set onopen(handler: ((event: Event) => void) | null) {
    this._onopen = handler
  }

  set onmessage(handler: ((event: MessageEvent) => void) | null) {
    this._onmessage = handler
  }

  set onerror(handler: ((event: Event) => void) | null) {
    this._onerror = handler
  }

  set onclose(handler: ((event: CloseEvent) => void) | null) {
    this._onclose = handler
  }

  send(data: string) {
    if (this.readyState !== TestWebSocket.OPEN) {
      throw new Error('WebSocket is not open')
    }
  }

  close() {
    this.readyState = TestWebSocket.CLOSING
    setTimeout(() => {
      this.readyState = TestWebSocket.CLOSED
      const closeEvent = new CloseEvent('close')
      if (this._onclose) this._onclose(closeEvent)
      this.dispatchEvent(closeEvent)
    }, 10)
  }

  // Test helper to simulate receiving data
  simulateMessage(data: any) {
    if (this.readyState === TestWebSocket.OPEN) {
      const messageEvent = new MessageEvent('message', {
        data: JSON.stringify(data)
      })
      if (this._onmessage) this._onmessage(messageEvent)
      this.dispatchEvent(messageEvent)
    }
  }

  // Test helper to simulate error
  simulateError() {
    const errorEvent = new Event('error')
    if (this._onerror) this._onerror(errorEvent)
    this.dispatchEvent(errorEvent)
  }
}

// Mock WebSocket globally
const originalWebSocket = global.WebSocket
let currentMockWs: TestWebSocket | null = null

beforeAll(() => {
  global.WebSocket = jest.fn().mockImplementation((url: string) => {
    currentMockWs = new TestWebSocket(url)
    return currentMockWs
  }) as any
})

afterAll(() => {
  global.WebSocket = originalWebSocket
})

describe('WebSocket Data Streaming Core Functionality', () => {
  beforeEach(() => {
    currentMockWs = null
  })

  it('should establish WebSocket connection and update status', async () => {
    const { result } = renderHook(() => 
      useDataStream({
        url: 'ws://localhost:8080',
        maxSize: 1000
      })
    )

    // Initially connecting
    expect(result.current.connectionStatus).toBe('connecting')

    // Wait for connection to establish
    await waitFor(() => {
      expect(result.current.connectionStatus).toBe('connected')
    }, { timeout: 1000 })

    expect(currentMockWs).toBeTruthy()
    expect(currentMockWs?.readyState).toBe(TestWebSocket.OPEN)
  })

  it('should receive and buffer streaming data', async () => {
    const { result } = renderHook(() => 
      useDataStream({
        url: 'ws://localhost:8080',
        maxSize: 100
      })
    )

    // Wait for connection
    await waitFor(() => {
      expect(result.current.connectionStatus).toBe('connected')
    })

    // Simulate receiving data
    const testData: DataPoint[] = [
      {
        id: 'test-1',
        timestamp: new Date(),
        value: 42,
        category: 'cpu',
        source: 'server-1',
        metadata: {}
      },
      {
        id: 'test-2',
        timestamp: new Date(),
        value: 84,
        category: 'memory',
        source: 'server-2',
        metadata: {}
      }
    ]

    act(() => {
      currentMockWs?.simulateMessage(testData)
    })

    // Data should be added to buffer
    await waitFor(() => {
      expect(result.current.data.length).toBe(2)
    })

    expect(result.current.data[0].id).toBe('test-1')
    expect(result.current.data[1].id).toBe('test-2')
    expect(result.current.bufferSize).toBe(2)
  })

  it('should implement sliding window when buffer limit is exceeded', async () => {
    const bufferLimit = 5
    const { result } = renderHook(() => 
      useDataStream({
        url: 'ws://localhost:8080',
        maxSize: bufferLimit
      })
    )

    await waitFor(() => {
      expect(result.current.connectionStatus).toBe('connected')
    })

    // Fill buffer to capacity
    const initialData: DataPoint[] = Array.from({ length: bufferLimit }, (_, i) => ({
      id: `initial-${i}`,
      timestamp: new Date(),
      value: i,
      category: 'test',
      source: 'test',
      metadata: {}
    }))

    act(() => {
      currentMockWs?.simulateMessage(initialData)
    })

    await waitFor(() => {
      expect(result.current.bufferSize).toBe(bufferLimit)
    })

    expect(result.current.isBufferFull).toBe(true)

    // Add more data to trigger sliding window
    const additionalData: DataPoint[] = [
      {
        id: 'overflow-1',
        timestamp: new Date(),
        value: 999,
        category: 'test',
        source: 'test',
        metadata: {}
      },
      {
        id: 'overflow-2',
        timestamp: new Date(),
        value: 888,
        category: 'test',
        source: 'test',
        metadata: {}
      }
    ]

    act(() => {
      currentMockWs?.simulateMessage(additionalData)
    })

    // Buffer should maintain max size
    await waitFor(() => {
      expect(result.current.bufferSize).toBe(bufferLimit)
    })

    // Should contain most recent data
    const dataIds = result.current.data.map(point => point.id)
    expect(dataIds).toContain('overflow-1')
    expect(dataIds).toContain('overflow-2')
    expect(dataIds).not.toContain('initial-0') // Oldest should be dropped
  })

  it('should handle connection errors gracefully', async () => {
    const { result } = renderHook(() => 
      useDataStream({
        url: 'ws://localhost:8080',
        maxSize: 100
      })
    )

    await waitFor(() => {
      expect(result.current.connectionStatus).toBe('connected')
    })

    // Simulate connection error
    act(() => {
      currentMockWs?.simulateError()
    })

    await waitFor(() => {
      expect(result.current.connectionStatus).toBe('error')
    })

    expect(result.current.error).toBeTruthy()
  })

  it('should handle manual data injection', async () => {
    const { result } = renderHook(() => 
      useDataStream({
        url: 'ws://localhost:8080',
        maxSize: 100
      })
    )

    await waitFor(() => {
      expect(result.current.connectionStatus).toBe('connected')
    })

    // Inject manual data
    const manualData: DataPoint[] = [
      {
        id: 'manual-1',
        timestamp: new Date(),
        value: 123,
        category: 'manual',
        source: 'test',
        metadata: { injected: true }
      }
    ]

    act(() => {
      result.current.injectData(manualData)
    })

    expect(result.current.data.length).toBe(1)
    expect(result.current.data[0].id).toBe('manual-1')
    expect(result.current.data[0].metadata.injected).toBe(true)
  })

  it('should provide accurate metrics', async () => {
    const { result } = renderHook(() => 
      useDataStream({
        url: 'ws://localhost:8080',
        maxSize: 10,
        enableMetrics: true
      })
    )

    await waitFor(() => {
      expect(result.current.connectionStatus).toBe('connected')
    })

    // Add some data
    const testData: DataPoint[] = Array.from({ length: 5 }, (_, i) => ({
      id: `metric-test-${i}`,
      timestamp: new Date(),
      value: i,
      category: 'test',
      source: 'test',
      metadata: {}
    }))

    act(() => {
      currentMockWs?.simulateMessage(testData)
    })

    await waitFor(() => {
      expect(result.current.data.length).toBe(5)
    })

    const metrics = result.current.getMetrics()
    expect(metrics.totalPointsReceived).toBe(5)
    expect(metrics.totalPointsDropped).toBe(0)
    expect(metrics.bufferUtilization).toBe(50) // 5/10 * 100
  })

  it('should clear buffer and reset state', async () => {
    const { result } = renderHook(() => 
      useDataStream({
        url: 'ws://localhost:8080',
        maxSize: 100
      })
    )

    await waitFor(() => {
      expect(result.current.connectionStatus).toBe('connected')
    })

    // Add some data
    const testData: DataPoint[] = [
      {
        id: 'clear-test-1',
        timestamp: new Date(),
        value: 1,
        category: 'test',
        source: 'test',
        metadata: {}
      }
    ]

    act(() => {
      currentMockWs?.simulateMessage(testData)
    })

    await waitFor(() => {
      expect(result.current.data.length).toBe(1)
    })

    // Clear buffer
    act(() => {
      result.current.clearBuffer()
    })

    expect(result.current.data.length).toBe(0)
    expect(result.current.bufferSize).toBe(0)
    expect(result.current.isBufferFull).toBe(false)

    const metrics = result.current.getMetrics()
    expect(metrics.totalPointsReceived).toBe(0)
    expect(metrics.totalPointsDropped).toBe(0)
  })

  it('should handle connection control methods', async () => {
    const { result } = renderHook(() => 
      useDataStream({
        url: 'ws://localhost:8080',
        maxSize: 100
      })
    )

    await waitFor(() => {
      expect(result.current.connectionStatus).toBe('connected')
    })

    // Test disconnect
    act(() => {
      result.current.disconnect()
    })

    await waitFor(() => {
      expect(result.current.connectionStatus).toBe('disconnected')
    })

    // Test reconnect
    act(() => {
      result.current.reconnect()
    })

    await waitFor(() => {
      expect(result.current.connectionStatus).toBe('connected')
    })
  })

  it('should validate incoming data and filter invalid points', async () => {
    const { result } = renderHook(() => 
      useDataStream({
        url: 'ws://localhost:8080',
        maxSize: 100
      })
    )

    await waitFor(() => {
      expect(result.current.connectionStatus).toBe('connected')
    })

    // Send mixed valid and invalid data
    const mixedData = [
      {
        id: 'valid-1',
        timestamp: new Date(),
        value: 42,
        category: 'cpu',
        source: 'server-1',
        metadata: {}
      },
      {
        id: 'invalid-1',
        // missing timestamp
        value: 'not-a-number', // invalid type
        category: '',
        source: 'server-1',
        metadata: {}
      },
      {
        id: 'valid-2',
        timestamp: new Date(),
        value: 84,
        category: 'memory',
        source: 'server-2',
        metadata: {}
      }
    ]

    act(() => {
      currentMockWs?.simulateMessage(mixedData)
    })

    // Should only receive valid data points
    await waitFor(() => {
      expect(result.current.data.length).toBe(2)
    })

    const dataIds = result.current.data.map(point => point.id)
    expect(dataIds).toContain('valid-1')
    expect(dataIds).toContain('valid-2')
    expect(dataIds).not.toContain('invalid-1')
  })
})