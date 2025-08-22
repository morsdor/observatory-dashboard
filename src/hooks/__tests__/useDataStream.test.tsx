import { renderHook, act, waitFor } from '@testing-library/react'
import { useDataStream } from '../useDataStream'
import { DataPoint } from '@/types'

// Mock the WebSocket hook
jest.mock('../useWebSocket', () => ({
  useWebSocket: jest.fn()
}))

// Mock the DataBuffer hook
jest.mock('../useDataBuffer', () => ({
  useDataBuffer: jest.fn()
}))

import { useWebSocket } from '../useWebSocket'
import { useDataBuffer } from '../useDataBuffer'

const mockUseWebSocket = useWebSocket as jest.MockedFunction<typeof useWebSocket>
const mockUseDataBuffer = useDataBuffer as jest.MockedFunction<typeof useDataBuffer>

describe('useDataStream', () => {
  const createMockDataPoint = (id: string): DataPoint => ({
    id,
    timestamp: new Date(),
    value: 42,
    category: 'test',
    metadata: {},
    source: 'test-source'
  })

  beforeEach(() => {
    jest.clearAllMocks()

    // Default mock implementations
    mockUseWebSocket.mockReturnValue({
      connectionStatus: 'disconnected',
      lastMessage: null,
      sendMessage: jest.fn(),
      reconnect: jest.fn(),
      disconnect: jest.fn(),
      error: null,
      reconnectAttempts: 0
    })

    mockUseDataBuffer.mockReturnValue({
      data: [],
      addData: jest.fn(),
      clearBuffer: jest.fn(),
      getMetrics: jest.fn(() => ({
        totalPointsReceived: 0,
        totalPointsDropped: 0,
        bufferUtilization: 0,
        averagePointsPerSecond: 0,
        lastUpdateTime: new Date()
      })),
      bufferSize: 0,
      isBufferFull: false
    })
  })

  it('should initialize with correct default state', () => {
    const { result } = renderHook(() => 
      useDataStream({ url: 'ws://localhost:8080' })
    )

    expect(result.current.connectionStatus).toBe('disconnected')
    expect(result.current.data).toEqual([])
    expect(result.current.bufferSize).toBe(0)
    expect(result.current.isBufferFull).toBe(false)
    expect(result.current.error).toBeNull()
    expect(result.current.reconnectAttempts).toBe(0)
  })

  it('should pass configuration to WebSocket and DataBuffer hooks', () => {
    const config = {
      url: 'ws://localhost:8080',
      maxSize: 50000,
      reconnectInterval: 2000,
      maxReconnectAttempts: 5
    }

    renderHook(() => useDataStream(config))

    expect(mockUseWebSocket).toHaveBeenCalledWith(
      expect.objectContaining({
        url: 'ws://localhost:8080',
        reconnectInterval: 2000,
        maxReconnectAttempts: 5
      })
    )

    expect(mockUseDataBuffer).toHaveBeenCalledWith(
      expect.objectContaining({
        maxSize: 50000
      })
    )
  })

  it('should handle WebSocket connection status changes', () => {
    mockUseWebSocket.mockReturnValue({
      connectionStatus: 'connected',
      lastMessage: null,
      sendMessage: jest.fn(),
      reconnect: jest.fn(),
      disconnect: jest.fn(),
      error: null,
      reconnectAttempts: 0
    })

    const { result } = renderHook(() => 
      useDataStream({ url: 'ws://localhost:8080' })
    )

    expect(result.current.connectionStatus).toBe('connected')
  })

  it('should add incoming WebSocket messages to data buffer', () => {
    const mockAddData = jest.fn()
    const testData = [createMockDataPoint('test-1'), createMockDataPoint('test-2')]

    mockUseDataBuffer.mockReturnValue({
      data: testData,
      addData: mockAddData,
      clearBuffer: jest.fn(),
      getMetrics: jest.fn(() => ({
        totalPointsReceived: 2,
        totalPointsDropped: 0,
        bufferUtilization: 0.002,
        averagePointsPerSecond: 1,
        lastUpdateTime: new Date()
      })),
      bufferSize: 2,
      isBufferFull: false
    })

    // First render with no message
    const { rerender } = renderHook(() => 
      useDataStream({ url: 'ws://localhost:8080' })
    )

    expect(mockAddData).not.toHaveBeenCalled()

    // Update mock to return message
    mockUseWebSocket.mockReturnValue({
      connectionStatus: 'connected',
      lastMessage: testData,
      sendMessage: jest.fn(),
      reconnect: jest.fn(),
      disconnect: jest.fn(),
      error: null,
      reconnectAttempts: 0
    })

    rerender()

    expect(mockAddData).toHaveBeenCalledWith(testData)
  })

  it('should provide connection control methods', () => {
    const mockReconnect = jest.fn()
    const mockDisconnect = jest.fn()

    mockUseWebSocket.mockReturnValue({
      connectionStatus: 'connected',
      lastMessage: null,
      sendMessage: jest.fn(),
      reconnect: mockReconnect,
      disconnect: mockDisconnect,
      error: null,
      reconnectAttempts: 0
    })

    const { result } = renderHook(() => 
      useDataStream({ url: 'ws://localhost:8080' })
    )

    act(() => {
      result.current.reconnect()
    })

    expect(mockReconnect).toHaveBeenCalled()

    act(() => {
      result.current.disconnect()
    })

    expect(mockDisconnect).toHaveBeenCalled()
  })

  it('should provide buffer management methods', () => {
    const mockClearBuffer = jest.fn()
    const mockGetMetrics = jest.fn(() => ({
      totalPointsReceived: 10,
      totalPointsDropped: 2,
      bufferUtilization: 50,
      averagePointsPerSecond: 5,
      lastUpdateTime: new Date()
    }))

    mockUseDataBuffer.mockReturnValue({
      data: [],
      addData: jest.fn(),
      clearBuffer: mockClearBuffer,
      getMetrics: mockGetMetrics,
      bufferSize: 10,
      isBufferFull: true
    })

    const { result } = renderHook(() => 
      useDataStream({ url: 'ws://localhost:8080' })
    )

    act(() => {
      result.current.clearBuffer()
    })

    expect(mockClearBuffer).toHaveBeenCalled()

    const metrics = result.current.getMetrics()
    expect(mockGetMetrics).toHaveBeenCalled()
    expect(metrics.totalPointsReceived).toBe(10)
    expect(metrics.bufferUtilization).toBe(50)
  })

  it('should handle manual data injection', () => {
    const mockAddData = jest.fn()
    const testData = [createMockDataPoint('injected-1')]

    mockUseDataBuffer.mockReturnValue({
      data: [],
      addData: mockAddData,
      clearBuffer: jest.fn(),
      getMetrics: jest.fn(() => ({
        totalPointsReceived: 0,
        totalPointsDropped: 0,
        bufferUtilization: 0,
        averagePointsPerSecond: 0,
        lastUpdateTime: new Date()
      })),
      bufferSize: 0,
      isBufferFull: false
    })

    const { result } = renderHook(() => 
      useDataStream({ url: 'ws://localhost:8080' })
    )

    act(() => {
      result.current.injectData(testData)
    })

    expect(mockAddData).toHaveBeenCalledWith(testData)
  })

  it('should handle WebSocket errors', () => {
    mockUseWebSocket.mockReturnValue({
      connectionStatus: 'error',
      lastMessage: null,
      sendMessage: jest.fn(),
      reconnect: jest.fn(),
      disconnect: jest.fn(),
      error: 'Connection failed',
      reconnectAttempts: 3
    })

    const { result } = renderHook(() => 
      useDataStream({ url: 'ws://localhost:8080' })
    )

    expect(result.current.connectionStatus).toBe('error')
    expect(result.current.error).toBe('Connection failed')
    expect(result.current.reconnectAttempts).toBe(3)
  })

  it('should handle reconnection attempts', () => {
    mockUseWebSocket.mockReturnValue({
      connectionStatus: 'connecting',
      lastMessage: null,
      sendMessage: jest.fn(),
      reconnect: jest.fn(),
      disconnect: jest.fn(),
      error: null,
      reconnectAttempts: 2
    })

    const { result } = renderHook(() => 
      useDataStream({ url: 'ws://localhost:8080' })
    )

    expect(result.current.connectionStatus).toBe('connecting')
    expect(result.current.reconnectAttempts).toBe(2)
  })

  it('should not auto-connect when autoConnect is false', () => {
    const { result } = renderHook(() => 
      useDataStream({ 
        url: 'ws://localhost:8080',
        autoConnect: false
      })
    )

    expect(result.current.connectionStatus).toBe('disconnected')
  })

  it('should handle buffer overflow scenarios', () => {
    const testData = Array.from({ length: 1000 }, (_, i) => 
      createMockDataPoint(`point-${i}`)
    )

    mockUseDataBuffer.mockReturnValue({
      data: testData.slice(-100), // Simulate buffer keeping only last 100
      addData: jest.fn(),
      clearBuffer: jest.fn(),
      getMetrics: jest.fn(() => ({
        totalPointsReceived: 1000,
        totalPointsDropped: 900,
        bufferUtilization: 100,
        averagePointsPerSecond: 100,
        lastUpdateTime: new Date()
      })),
      bufferSize: 100,
      isBufferFull: true
    })

    const { result } = renderHook(() => 
      useDataStream({ url: 'ws://localhost:8080', maxSize: 100 })
    )

    expect(result.current.isBufferFull).toBe(true)
    expect(result.current.bufferSize).toBe(100)
    
    const metrics = result.current.getMetrics()
    expect(metrics.totalPointsDropped).toBe(900)
    expect(metrics.bufferUtilization).toBe(100)
  })

  it('should handle rapid message updates', async () => {
    const mockAddData = jest.fn()
    let messageCount = 0

    mockUseDataBuffer.mockReturnValue({
      data: [],
      addData: mockAddData,
      clearBuffer: jest.fn(),
      getMetrics: jest.fn(() => ({
        totalPointsReceived: messageCount,
        totalPointsDropped: 0,
        bufferUtilization: 0,
        averagePointsPerSecond: 0,
        lastUpdateTime: new Date()
      })),
      bufferSize: 0,
      isBufferFull: false
    })

    // Simulate rapid message updates
    const messages = [
      [createMockDataPoint('msg-1')],
      [createMockDataPoint('msg-2')],
      [createMockDataPoint('msg-3')]
    ]

    let currentMessage: DataPoint[] | null = null

    mockUseWebSocket.mockImplementation(() => ({
      connectionStatus: 'connected',
      lastMessage: currentMessage,
      sendMessage: jest.fn(),
      reconnect: jest.fn(),
      disconnect: jest.fn(),
      error: null,
      reconnectAttempts: 0
    }))

    const { rerender } = renderHook(() => 
      useDataStream({ url: 'ws://localhost:8080' })
    )

    // Simulate receiving messages rapidly
    for (const message of messages) {
      currentMessage = message
      messageCount += message.length
      rerender()
    }

    expect(mockAddData).toHaveBeenCalledTimes(3)
    expect(mockAddData).toHaveBeenNthCalledWith(1, messages[0])
    expect(mockAddData).toHaveBeenNthCalledWith(2, messages[1])
    expect(mockAddData).toHaveBeenNthCalledWith(3, messages[2])
  })
})