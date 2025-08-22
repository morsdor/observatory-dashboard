import { MockWebSocketServer, MockWebSocket, createMockWebSocketServer } from '../mockWebSocketServer'
import { DataPoint } from '@/types'

describe('MockWebSocketServer', () => {
  let server: MockWebSocketServer

  beforeEach(() => {
    server = new MockWebSocketServer({
      dataPointsPerSecond: 10,
      categories: ['cpu', 'memory'],
      sources: ['server-1', 'server-2']
    })
  })

  afterEach(async () => {
    if (server) {
      await server.stop()
    }
  })

  it('should initialize with default configuration', () => {
    const defaultServer = new MockWebSocketServer()
    const stats = defaultServer.getStats()
    
    expect(stats.config.dataPointsPerSecond).toBe(10)
    expect(stats.config.categories).toContain('cpu')
    expect(stats.config.sources).toContain('server-1')
    expect(stats.isRunning).toBe(false)
  })

  it('should start and generate data in browser environment', async () => {
    // Mock browser environment
    Object.defineProperty(window, 'dispatchEvent', {
      value: jest.fn(),
      writable: true
    })

    await server.start()
    
    const stats = server.getStats()
    expect(stats.isRunning).toBe(true)
    expect(stats.dataPointsGenerated).toBeGreaterThan(0)
  })

  it('should generate valid data points', async () => {
    const mockDispatchEvent = jest.fn()
    Object.defineProperty(window, 'dispatchEvent', {
      value: mockDispatchEvent,
      writable: true
    })

    await server.start()

    // Wait for some data generation
    await new Promise(resolve => setTimeout(resolve, 150))

    expect(mockDispatchEvent).toHaveBeenCalled()
    
    const lastCall = mockDispatchEvent.mock.calls[mockDispatchEvent.mock.calls.length - 1]
    const event = lastCall[0]
    
    expect(event.type).toBe('mockWebSocketData')
    expect(Array.isArray(event.detail)).toBe(true)
    
    if (event.detail.length > 0) {
      const dataPoint: DataPoint = event.detail[0]
      expect(dataPoint).toHaveProperty('id')
      expect(dataPoint).toHaveProperty('timestamp')
      expect(dataPoint).toHaveProperty('value')
      expect(dataPoint).toHaveProperty('category')
      expect(dataPoint).toHaveProperty('source')
      expect(dataPoint).toHaveProperty('metadata')
      
      expect(typeof dataPoint.value).toBe('number')
      expect(['cpu', 'memory']).toContain(dataPoint.category)
      expect(['server-1', 'server-2']).toContain(dataPoint.source)
    }
  })

  it('should stop data generation', async () => {
    await server.start()
    expect(server.getStats().isRunning).toBe(true)

    await server.stop()
    expect(server.getStats().isRunning).toBe(false)
  })

  it('should update configuration dynamically', async () => {
    await server.start()
    
    const initialStats = server.getStats()
    expect(initialStats.config.dataPointsPerSecond).toBe(10)

    server.updateConfig({ dataPointsPerSecond: 20 })
    
    const updatedStats = server.getStats()
    expect(updatedStats.config.dataPointsPerSecond).toBe(20)
  })

  it('should generate different values for different categories', async () => {
    const mockDispatchEvent = jest.fn()
    Object.defineProperty(window, 'dispatchEvent', {
      value: mockDispatchEvent,
      writable: true
    })

    const testServer = new MockWebSocketServer({
      dataPointsPerSecond: 50, // Higher rate for more samples
      categories: ['cpu', 'memory', 'network']
    })

    await testServer.start()
    await new Promise(resolve => setTimeout(resolve, 200))
    await testServer.stop()

    // Collect all generated data points
    const allDataPoints: DataPoint[] = []
    mockDispatchEvent.mock.calls.forEach(call => {
      if (call[0].type === 'mockWebSocketData') {
        allDataPoints.push(...call[0].detail)
      }
    })

    // Group by category
    const byCategory = allDataPoints.reduce((acc, point) => {
      if (!acc[point.category]) acc[point.category] = []
      acc[point.category].push(point.value)
      return acc
    }, {} as Record<string, number[]>)

    // Should have data for multiple categories
    expect(Object.keys(byCategory).length).toBeGreaterThan(1)

    // Values should vary by category (different patterns)
    const categories = Object.keys(byCategory)
    if (categories.length >= 2) {
      const cat1Values = byCategory[categories[0]]
      const cat2Values = byCategory[categories[1]]
      
      const cat1Avg = cat1Values.reduce((a, b) => a + b, 0) / cat1Values.length
      const cat2Avg = cat2Values.reduce((a, b) => a + b, 0) / cat2Values.length
      
      // Different categories should have different average values (due to different patterns)
      expect(Math.abs(cat1Avg - cat2Avg)).toBeGreaterThan(1)
    }
  })

  it('should handle burst mode configuration', async () => {
    const burstServer = new MockWebSocketServer({
      dataPointsPerSecond: 5,
      enableBurstMode: true,
      burstInterval: 100, // Very short for testing
      burstDuration: 50,
      burstMultiplier: 5
    })

    const mockDispatchEvent = jest.fn()
    Object.defineProperty(window, 'dispatchEvent', {
      value: mockDispatchEvent,
      writable: true
    })

    await burstServer.start()
    await new Promise(resolve => setTimeout(resolve, 200))
    await burstServer.stop()

    // Should have generated some data
    expect(mockDispatchEvent).toHaveBeenCalled()
    
    const stats = burstServer.getStats()
    expect(stats.config.enableBurstMode).toBe(true)
    expect(stats.dataPointsGenerated).toBeGreaterThan(0)
  })

  it('should track statistics correctly', async () => {
    await server.start()
    
    const initialStats = server.getStats()
    expect(initialStats.dataPointsGenerated).toBe(0)
    expect(initialStats.uptime).toBeGreaterThanOrEqual(0)
    
    await new Promise(resolve => setTimeout(resolve, 150))
    
    const laterStats = server.getStats()
    expect(laterStats.dataPointsGenerated).toBeGreaterThan(initialStats.dataPointsGenerated)
    expect(laterStats.uptime).toBeGreaterThan(initialStats.uptime)
    
    await server.stop()
  })
})

describe('MockWebSocket', () => {
  it('should simulate WebSocket connection lifecycle', (done) => {
    const mockWs = new MockWebSocket('ws://localhost:8080')
    
    expect(mockWs.readyState).toBe(MockWebSocket.CONNECTING)
    expect(mockWs.url).toBe('ws://localhost:8080')

    mockWs.addEventListener('open', () => {
      expect(mockWs.readyState).toBe(MockWebSocket.OPEN)
      
      // Test sending message
      expect(() => {
        mockWs.send('test message')
      }).not.toThrow()
      
      mockWs.close()
    })

    mockWs.addEventListener('close', () => {
      expect(mockWs.readyState).toBe(MockWebSocket.CLOSED)
      done()
    })
  })

  it('should handle message events', (done) => {
    const mockWs = new MockWebSocket('ws://localhost:8080')
    
    mockWs.addEventListener('open', () => {
      // Setup mock data event
      const testData = [{ id: 'test', timestamp: new Date(), value: 42 }]
      
      mockWs.addEventListener('message', (event: any) => {
        const data = JSON.parse(event.data)
        expect(Array.isArray(data)).toBe(true)
        done()
      })

      // Simulate receiving data
      setTimeout(() => {
        window.dispatchEvent(new CustomEvent('mockWebSocketData', {
          detail: testData
        }))
      }, 10)
    })
  })

  it('should throw error when sending on closed connection', () => {
    const mockWs = new MockWebSocket('ws://localhost:8080')
    mockWs.readyState = MockWebSocket.CLOSED
    
    expect(() => {
      mockWs.send('test')
    }).toThrow('WebSocket is not open')
  })
})

describe('createMockWebSocketServer', () => {
  it('should create server instance with configuration', () => {
    const config = {
      dataPointsPerSecond: 25,
      categories: ['test-category'],
      sources: ['test-source']
    }
    
    const server = createMockWebSocketServer(config)
    const stats = server.getStats()
    
    expect(stats.config.dataPointsPerSecond).toBe(25)
    expect(stats.config.categories).toEqual(['test-category'])
    expect(stats.config.sources).toEqual(['test-source'])
  })

  it('should create server with default configuration', () => {
    const server = createMockWebSocketServer()
    const stats = server.getStats()
    
    expect(stats.config.dataPointsPerSecond).toBe(10)
    expect(stats.config.categories).toContain('cpu')
    expect(stats.config.sources).toContain('server-1')
  })
})