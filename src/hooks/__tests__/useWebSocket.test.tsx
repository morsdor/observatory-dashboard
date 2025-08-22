import { renderHook, act, waitFor } from '@testing-library/react'
import { useWebSocket } from '../useWebSocket'
import { MockWebSocket } from '../../utils/mockWebSocketServer'

// Mock WebSocket globally
const mockWebSocket = jest.fn()
global.WebSocket = mockWebSocket as any

describe('useWebSocket', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    mockWebSocket.mockClear()
  })

  afterEach(() => {
    jest.clearAllTimers()
  })

  it('should initialize with disconnected status', () => {
    const { result } = renderHook(() => 
      useWebSocket({ url: 'ws://localhost:8080' })
    )

    expect(result.current.connectionStatus).toBe('connecting')
    expect(result.current.lastMessage).toBeNull()
    expect(result.current.error).toBeNull()
    expect(result.current.reconnectAttempts).toBe(0)
  })

  it('should establish connection and update status', async () => {
    const mockWs = {
      readyState: WebSocket.OPEN,
      onopen: null as any,
      onmessage: null as any,
      onerror: null as any,
      onclose: null as any,
      send: jest.fn(),
      close: jest.fn()
    }

    mockWebSocket.mockReturnValue(mockWs)

    const { result } = renderHook(() => 
      useWebSocket({ url: 'ws://localhost:8080' })
    )

    // Simulate connection opening
    act(() => {
      if (mockWs.onopen) {
        mockWs.onopen({} as Event)
      }
    })

    await waitFor(() => {
      expect(result.current.connectionStatus).toBe('connected')
    })

    expect(result.current.reconnectAttempts).toBe(0)
    expect(result.current.error).toBeNull()
  })

  it('should handle incoming messages and validate data', async () => {
    const mockWs = {
      readyState: WebSocket.OPEN,
      onopen: null as any,
      onmessage: null as any,
      onerror: null as any,
      onclose: null as any,
      send: jest.fn(),
      close: jest.fn()
    }

    mockWebSocket.mockReturnValue(mockWs)

    const { result } = renderHook(() => 
      useWebSocket({ url: 'ws://localhost:8080' })
    )

    // Simulate connection opening
    act(() => {
      if (mockWs.onopen) {
        mockWs.onopen({} as Event)
      }
    })

    // Simulate receiving valid data
    const validData = [
      {
        id: 'test-1',
        timestamp: new Date(),
        value: 42,
        category: 'cpu',
        metadata: {},
        source: 'server-1'
      }
    ]

    act(() => {
      if (mockWs.onmessage) {
        mockWs.onmessage({
          data: JSON.stringify(validData)
        } as MessageEvent)
      }
    })

    await waitFor(() => {
      expect(result.current.lastMessage).toEqual(validData)
    })
  })

  it('should handle connection errors', async () => {
    const mockWs = {
      readyState: WebSocket.CONNECTING,
      onopen: null as any,
      onmessage: null as any,
      onerror: null as any,
      onclose: null as any,
      send: jest.fn(),
      close: jest.fn()
    }

    mockWebSocket.mockReturnValue(mockWs)

    const { result } = renderHook(() => 
      useWebSocket({ url: 'ws://localhost:8080' })
    )

    // Simulate connection error
    act(() => {
      if (mockWs.onerror) {
        mockWs.onerror({} as Event)
      }
    })

    await waitFor(() => {
      expect(result.current.connectionStatus).toBe('error')
    })

    expect(result.current.error).toBe('WebSocket connection error')
  })

  it('should attempt reconnection with exponential backoff', async () => {
    jest.useFakeTimers()

    const mockWs = {
      readyState: WebSocket.CLOSED,
      onopen: null as any,
      onmessage: null as any,
      onerror: null as any,
      onclose: null as any,
      send: jest.fn(),
      close: jest.fn()
    }

    mockWebSocket.mockReturnValue(mockWs)

    const { result } = renderHook(() => 
      useWebSocket({ 
        url: 'ws://localhost:8080',
        reconnectInterval: 1000,
        maxReconnectAttempts: 3
      })
    )

    // Simulate connection close
    act(() => {
      if (mockWs.onclose) {
        mockWs.onclose({} as CloseEvent)
      }
    })

    expect(result.current.connectionStatus).toBe('disconnected')

    // Fast-forward time to trigger first reconnection attempt
    act(() => {
      jest.advanceTimersByTime(1000)
    })

    expect(mockWebSocket).toHaveBeenCalledTimes(2) // Initial + first reconnect

    // Fast-forward for second reconnection (should use backoff)
    act(() => {
      if (mockWs.onclose) {
        mockWs.onclose({} as CloseEvent)
      }
      jest.advanceTimersByTime(1500) // 1000 * 1.5 backoff
    })

    expect(mockWebSocket).toHaveBeenCalledTimes(3)

    jest.useRealTimers()
  })

  it('should send messages when connected', () => {
    const mockWs = {
      readyState: WebSocket.OPEN,
      onopen: null as any,
      onmessage: null as any,
      onerror: null as any,
      onclose: null as any,
      send: jest.fn(),
      close: jest.fn()
    }

    mockWebSocket.mockReturnValue(mockWs)

    const { result } = renderHook(() => 
      useWebSocket({ url: 'ws://localhost:8080' })
    )

    // Simulate connection opening
    act(() => {
      if (mockWs.onopen) {
        mockWs.onopen({} as Event)
      }
    })

    const testMessage = { type: 'test', data: 'hello' }

    act(() => {
      result.current.sendMessage(testMessage)
    })

    expect(mockWs.send).toHaveBeenCalledWith(JSON.stringify(testMessage))
  })

  it('should handle manual reconnection', () => {
    const mockWs = {
      readyState: WebSocket.CLOSED,
      onopen: null as any,
      onmessage: null as any,
      onerror: null as any,
      onclose: null as any,
      send: jest.fn(),
      close: jest.fn()
    }

    mockWebSocket.mockReturnValue(mockWs)

    const { result } = renderHook(() => 
      useWebSocket({ url: 'ws://localhost:8080' })
    )

    act(() => {
      result.current.reconnect()
    })

    expect(mockWebSocket).toHaveBeenCalledTimes(2) // Initial + manual reconnect
    expect(result.current.reconnectAttempts).toBe(0) // Should reset on manual reconnect
  })

  it('should handle manual disconnection', () => {
    const mockWs = {
      readyState: WebSocket.OPEN,
      onopen: null as any,
      onmessage: null as any,
      onerror: null as any,
      onclose: null as any,
      send: jest.fn(),
      close: jest.fn()
    }

    mockWebSocket.mockReturnValue(mockWs)

    const { result } = renderHook(() => 
      useWebSocket({ url: 'ws://localhost:8080' })
    )

    act(() => {
      result.current.disconnect()
    })

    expect(mockWs.close).toHaveBeenCalled()
    expect(result.current.connectionStatus).toBe('disconnected')
  })

  it('should validate incoming data and filter invalid points', async () => {
    const mockWs = {
      readyState: WebSocket.OPEN,
      onopen: null as any,
      onmessage: null as any,
      onerror: null as any,
      onclose: null as any,
      send: jest.fn(),
      close: jest.fn()
    }

    mockWebSocket.mockReturnValue(mockWs)

    const { result } = renderHook(() => 
      useWebSocket({ url: 'ws://localhost:8080' })
    )

    // Simulate connection opening
    act(() => {
      if (mockWs.onopen) {
        mockWs.onopen({} as Event)
      }
    })

    // Simulate receiving mixed valid/invalid data
    const mixedData = [
      {
        id: 'valid-1',
        timestamp: new Date(),
        value: 42,
        category: 'cpu',
        metadata: {},
        source: 'server-1'
      },
      {
        id: 'invalid-1',
        // missing timestamp
        value: 'not-a-number', // invalid value type
        category: '',
        metadata: {},
        source: 'server-1'
      },
      {
        id: 'valid-2',
        timestamp: new Date(),
        value: 84,
        category: 'memory',
        metadata: {},
        source: 'server-2'
      }
    ]

    act(() => {
      if (mockWs.onmessage) {
        mockWs.onmessage({
          data: JSON.stringify(mixedData)
        } as MessageEvent)
      }
    })

    await waitFor(() => {
      expect(result.current.lastMessage).toHaveLength(2) // Only valid points
    })

    expect(result.current.lastMessage?.[0].id).toBe('valid-1')
    expect(result.current.lastMessage?.[1].id).toBe('valid-2')
  })
})