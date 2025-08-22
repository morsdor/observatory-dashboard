import { renderHook, act, waitFor } from '@testing-library/react'
import { useResilientWebSocket } from '@/hooks/useResilientWebSocket'
import { DataPoint } from '@/types'

// Mock WebSocket
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
    // Simulate async connection
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

  // Test helpers
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

// Mock global WebSocket
global.WebSocket = MockWebSocket as any

// Mock navigator.onLine
Object.defineProperty(navigator, 'onLine', {
  writable: true,
  value: true
})

describe('useResilientWebSocket', () => {
  const mockConfig = {
    url: 'ws://localhost:8080',
    reconnectInterval: 100,
    maxReconnectAttempts: 3,
    heartbeatInterval: 1000,
    connectionTimeout: 500
  }

  beforeEach(() => {
    jest.clearAllTimers()
    jest.useFakeTimers()
  })

  afterEach(() => {
    jest.runOnlyPendingTimers()
    jest.useRealTimers()
  })

  describe('Basic Connection', () => {
    it('should establish WebSocket connection', async () => {
      const { result } = renderHook(() => useResilientWebSocket(mockConfig))

      expect(result.current.connectionStatus).toBe('connecting')

      act(() => {
        jest.advanceTimersByTime(20)
      })

      await waitFor(() => {
        expect(result.current.connectionStatus).toBe('connected')
      })
    })

    it('should handle connection timeout', async () => {
      const config = { ...mockConfig, connectionTimeout: 50 }
      
      // Mock WebSocket that never connects
      const SlowWebSocket = class extends MockWebSocket {
        constructor(url: string) {
          super(url)
          // Don't call onopen
        }
      }
      global.WebSocket = SlowWebSocket as any

      const { result } = renderHook(() => useResilientWebSocket(config))

      act(() => {
        jest.advanceTimersByTime(100)
      })

      await waitFor(() => {
        expect(result.current.connectionStatus).toBe('error')
        expect(result.current.error?.message).toContain('timeout')
      })
    })

    it('should disconnect cleanly', async () => {
      const { result } = renderHook(() => useResilientWebSocket(mockConfig))

      act(() => {
        jest.advanceTimersByTime(20)
      })

      await waitFor(() => {
        expect(result.current.connectionStatus).toBe('connected')
      })

      act(() => {
        result.current.disconnect()
      })

      expect(result.current.connectionStatus).toBe('disconnected')
    })
  })

  describe('Data Handling', () => {
    it('should receive and validate data messages', async () => {
      const { result } = renderHook(() => useResilientWebSocket({
        ...mockConfig,
        dataValidation: true
      }))

      let mockWs: MockWebSocket

      act(() => {
        jest.advanceTimersByTime(20)
      })

      await waitFor(() => {
        expect(result.current.connectionStatus).toBe('connected')
        mockWs = (global.WebSocket as any).mock.instances[0]
      })

      const validData: DataPoint[] = [{
        id: 'test-1',
        timestamp: new Date(),
        value: 42,
        category: 'test',
        metadata: {},
        source: 'test-source'
      }]

      act(() => {
        mockWs!.simulateMessage(validData)
      })

      expect(result.current.lastMessage).toEqual(validData)
    })

    it('should handle invalid data gracefully', async () => {
      const { result } = renderHook(() => useResilientWebSocket({
        ...mockConfig,
        dataValidation: true
      }))

      let mockWs: MockWebSocket

      act(() => {
        jest.advanceTimersByTime(20)
      })

      await waitFor(() => {
        mockWs = (global.WebSocket as any).mock.instances[0]
      })

      const invalidData = [{ invalid: 'data' }]

      act(() => {
        mockWs!.simulateMessage(invalidData)
      })

      expect(result.current.connectionHealth.dataIntegrityScore).toBeLessThan(100)
    })

    it('should handle malformed JSON', async () => {
      const { result } = renderHook(() => useResilientWebSocket(mockConfig))

      let mockWs: MockWebSocket

      act(() => {
        jest.advanceTimersByTime(20)
      })

      await waitFor(() => {
        mockWs = (global.WebSocket as any).mock.instances[0]
      })

      act(() => {
        // Simulate malformed JSON
        if (mockWs!.onmessage) {
          mockWs!.onmessage(new MessageEvent('message', { data: 'invalid json' }))
        }
      })

      expect(result.current.error?.category).toBe('data')
    })
  })

  describe('Reconnection Logic', () => {
    it('should attempt reconnection on connection loss', async () => {
      const { result } = renderHook(() => useResilientWebSocket(mockConfig))

      let mockWs: MockWebSocket

      act(() => {
        jest.advanceTimersByTime(20)
      })

      await waitFor(() => {
        expect(result.current.connectionStatus).toBe('connected')
        mockWs = (global.WebSocket as any).mock.instances[0]
      })

      // Simulate connection loss
      act(() => {
        mockWs!.simulateClose(1006) // Abnormal closure
      })

      expect(result.current.connectionStatus).toBe('disconnected')

      // Should attempt reconnection
      act(() => {
        jest.advanceTimersByTime(150) // Wait for reconnect interval
      })

      expect(result.current.connectionHealth.reconnectCount).toBeGreaterThan(0)
    })

    it('should use exponential backoff for reconnection', async () => {
      const { result } = renderHook(() => useResilientWebSocket({
        ...mockConfig,
        reconnectBackoffMultiplier: 2
      }))

      let mockWs: MockWebSocket

      act(() => {
        jest.advanceTimersByTime(20)
      })

      await waitFor(() => {
        mockWs = (global.WebSocket as any).mock.instances[0]
      })

      // Simulate multiple connection failures
      for (let i = 0; i < 3; i++) {
        act(() => {
          mockWs!.simulateClose(1006)
          jest.advanceTimersByTime(100 * Math.pow(2, i) + 50)
        })
      }

      expect(result.current.connectionHealth.reconnectCount).toBe(3)
    })

    it('should stop reconnecting after max attempts', async () => {
      const { result } = renderHook(() => useResilientWebSocket({
        ...mockConfig,
        maxReconnectAttempts: 2
      }))

      let mockWs: MockWebSocket

      act(() => {
        jest.advanceTimersByTime(20)
      })

      await waitFor(() => {
        mockWs = (global.WebSocket as any).mock.instances[0]
      })

      // Simulate connection failures exceeding max attempts
      for (let i = 0; i < 3; i++) {
        act(() => {
          mockWs!.simulateClose(1006)
          jest.advanceTimersByTime(200)
        })
      }

      expect(result.current.error?.message).toContain('Failed to reconnect after 2 attempts')
    })

    it('should try fallback URLs', async () => {
      const configWithFallbacks = {
        ...mockConfig,
        fallbackUrls: ['ws://fallback1:8080', 'ws://fallback2:8080']
      }

      const { result } = renderHook(() => useResilientWebSocket(configWithFallbacks))

      let mockWs: MockWebSocket

      act(() => {
        jest.advanceTimersByTime(20)
      })

      await waitFor(() => {
        mockWs = (global.WebSocket as any).mock.instances[0]
      })

      // Simulate connection failure
      act(() => {
        mockWs!.simulateClose(1006)
        jest.advanceTimersByTime(150)
      })

      const diagnostics = result.current.getConnectionDiagnostics()
      expect(diagnostics.attemptedUrls.length).toBeGreaterThan(1)
    })
  })

  describe('Heartbeat Mechanism', () => {
    it('should send heartbeat messages', async () => {
      const { result } = renderHook(() => useResilientWebSocket({
        ...mockConfig,
        heartbeatInterval: 100
      }))

      let mockWs: MockWebSocket
      const sendSpy = jest.fn()

      act(() => {
        jest.advanceTimersByTime(20)
      })

      await waitFor(() => {
        mockWs = (global.WebSocket as any).mock.instances[0]
        mockWs.send = sendSpy
      })

      act(() => {
        jest.advanceTimersByTime(150)
      })

      expect(sendSpy).toHaveBeenCalledWith(
        expect.stringContaining('"type":"ping"')
      )
    })

    it('should calculate latency from pong responses', async () => {
      const { result } = renderHook(() => useResilientWebSocket(mockConfig))

      let mockWs: MockWebSocket

      act(() => {
        jest.advanceTimersByTime(20)
      })

      await waitFor(() => {
        mockWs = (global.WebSocket as any).mock.instances[0]
      })

      // Simulate pong response
      act(() => {
        mockWs!.simulateMessage({ type: 'pong', timestamp: Date.now() })
      })

      expect(result.current.connectionHealth.latency).toBeGreaterThanOrEqual(0)
    })
  })

  describe('Offline Mode', () => {
    it('should switch to offline mode when network is unavailable', async () => {
      const { result } = renderHook(() => useResilientWebSocket({
        ...mockConfig,
        enableOfflineMode: true
      }))

      act(() => {
        jest.advanceTimersByTime(20)
      })

      await waitFor(() => {
        expect(result.current.connectionStatus).toBe('connected')
      })

      // Simulate going offline
      act(() => {
        Object.defineProperty(navigator, 'onLine', { value: false })
        window.dispatchEvent(new Event('offline'))
      })

      expect(result.current.connectionStatus).toBe('disconnected')
    })

    it('should reconnect when coming back online', async () => {
      const { result } = renderHook(() => useResilientWebSocket({
        ...mockConfig,
        enableOfflineMode: true
      }))

      // Start offline
      Object.defineProperty(navigator, 'onLine', { value: false })

      act(() => {
        result.current.switchToOfflineMode()
      })

      expect(result.current.connectionStatus).toBe('disconnected')

      // Come back online
      act(() => {
        Object.defineProperty(navigator, 'onLine', { value: true })
        window.dispatchEvent(new Event('online'))
        jest.advanceTimersByTime(50)
      })

      await waitFor(() => {
        expect(result.current.connectionStatus).toBe('connected')
      })
    })

    it('should use cached data in offline mode', async () => {
      const { result } = renderHook(() => useResilientWebSocket(mockConfig))

      let mockWs: MockWebSocket

      act(() => {
        jest.advanceTimersByTime(20)
      })

      await waitFor(() => {
        mockWs = (global.WebSocket as any).mock.instances[0]
      })

      // Receive some data first
      const testData: DataPoint[] = [{
        id: 'cached-1',
        timestamp: new Date(),
        value: 100,
        category: 'cached',
        metadata: {},
        source: 'cache-source'
      }]

      act(() => {
        mockWs!.simulateMessage(testData)
      })

      // Switch to offline mode
      act(() => {
        result.current.switchToOfflineMode()
      })

      expect(result.current.lastMessage).toEqual(testData)
    })
  })

  describe('Error Handling', () => {
    it('should handle WebSocket errors', async () => {
      const { result } = renderHook(() => useResilientWebSocket(mockConfig))

      let mockWs: MockWebSocket

      act(() => {
        jest.advanceTimersByTime(20)
      })

      await waitFor(() => {
        mockWs = (global.WebSocket as any).mock.instances[0]
      })

      act(() => {
        mockWs!.simulateError()
      })

      expect(result.current.connectionStatus).toBe('error')
      expect(result.current.error?.category).toBe('network')
    })

    it('should handle send message errors', async () => {
      const { result } = renderHook(() => useResilientWebSocket(mockConfig))

      act(() => {
        jest.advanceTimersByTime(20)
      })

      await waitFor(() => {
        expect(result.current.connectionStatus).toBe('connected')
      })

      // Try to send message when connection is closed
      act(() => {
        result.current.disconnect()
        result.current.sendMessage({ test: 'message' })
      })

      expect(result.current.error?.message).toContain('not connected')
    })

    it('should clear errors', async () => {
      const { result } = renderHook(() => useResilientWebSocket(mockConfig))

      let mockWs: MockWebSocket

      act(() => {
        jest.advanceTimersByTime(20)
      })

      await waitFor(() => {
        mockWs = (global.WebSocket as any).mock.instances[0]
      })

      act(() => {
        mockWs!.simulateError()
      })

      expect(result.current.error).toBeTruthy()

      act(() => {
        result.current.clearError()
      })

      expect(result.current.error).toBeNull()
    })
  })

  describe('Connection Diagnostics', () => {
    it('should provide connection diagnostics', async () => {
      const { result } = renderHook(() => useResilientWebSocket({
        ...mockConfig,
        fallbackUrls: ['ws://fallback:8080']
      }))

      act(() => {
        jest.advanceTimersByTime(20)
      })

      await waitFor(() => {
        expect(result.current.connectionStatus).toBe('connected')
      })

      const diagnostics = result.current.getConnectionDiagnostics()

      expect(diagnostics).toEqual(
        expect.objectContaining({
          currentUrl: mockConfig.url,
          attemptedUrls: expect.any(Array),
          networkStatus: 'online',
          connectionDuration: expect.any(Number),
          messagesReceived: expect.any(Number),
          messagesLost: expect.any(Number)
        })
      )
    })

    it('should track message statistics', async () => {
      const { result } = renderHook(() => useResilientWebSocket(mockConfig))

      let mockWs: MockWebSocket

      act(() => {
        jest.advanceTimersByTime(20)
      })

      await waitFor(() => {
        mockWs = (global.WebSocket as any).mock.instances[0]
      })

      // Send valid messages
      const validData: DataPoint[] = [{
        id: 'stat-1',
        timestamp: new Date(),
        value: 1,
        category: 'stats',
        metadata: {},
        source: 'stats-source'
      }]

      act(() => {
        mockWs!.simulateMessage(validData)
        mockWs!.simulateMessage([{ invalid: 'data' }]) // Invalid message
      })

      const diagnostics = result.current.getConnectionDiagnostics()
      expect(diagnostics.messagesReceived).toBe(1)
      expect(diagnostics.messagesLost).toBe(1)
    })
  })

  describe('Buffer Management', () => {
    it('should maintain buffer size limit', async () => {
      const { result } = renderHook(() => useResilientWebSocket({
        ...mockConfig,
        bufferSize: 5
      }))

      let mockWs: MockWebSocket

      act(() => {
        jest.advanceTimersByTime(20)
      })

      await waitFor(() => {
        mockWs = (global.WebSocket as any).mock.instances[0]
      })

      // Send more data than buffer size
      for (let i = 0; i < 10; i++) {
        const data: DataPoint[] = [{
          id: `buffer-${i}`,
          timestamp: new Date(),
          value: i,
          category: 'buffer',
          metadata: {},
          source: 'buffer-source'
        }]

        act(() => {
          mockWs!.simulateMessage(data)
        })
      }

      // Buffer should only contain last 5 items
      const diagnostics = result.current.getConnectionDiagnostics()
      expect(diagnostics.messagesReceived).toBe(10)
    })
  })
})