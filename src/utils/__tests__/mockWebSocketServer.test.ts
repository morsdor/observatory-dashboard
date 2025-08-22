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
    
    // Wait a bit for data generation to start
    await new Promise(resolve => setTimeout(resolve, 120))
    
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
      dataPointsPerSecond: 20, // Higher rate for testing
      enableBurstMode: true,
      burstInterval: 50, // Very short for testing
      burstDuration: 30,
      burstMultiplier: 3
    })

    const mockDispatchEvent = jest.fn()
    Object.defineProperty(window, 'dispatchEvent', {
      value: mockDispatchEvent,
      writable: true
    })

    await burstServer.start()
    await new Promise(resolve => setTimeout(resolve, 250))
    await burstServer.stop()

    // Should have generated some data
    expect(mockDispatchEvent).toHaveBeenCalled()
    
    const stats = burstServer.getStats()
    expect(stats.config.enableBurstMode).toBe(true)
    expect(stats.dataPointsGenerated).toBeGreaterThan(0)
  })

  it('should track statistics correctly', async () => {
    const fastServer = new MockWebSocketServer({
      dataPointsPerSecond: 50, // Higher rate for reliable testing
      categories: ['cpu'],
      sources: ['server-1']
    })
    
    await fastServer.start()
    
    const initialStats = fastServer.getStats()
    expect(initialStats.dataPointsGenerated).toBe(0)
    expect(initialStats.uptime).toBeGreaterThanOrEqual(0)
    
    await new Promise(resolve => setTimeout(resolve, 200))
    
    const laterStats = fastServer.getStats()
    expect(laterStats.dataPointsGenerated).toBeGreaterThan(initialStats.dataPointsGenerated)
    expect(laterStats.uptime).toBeGreaterThan(initialStats.uptime)
    
    await fastServer.stop()
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
      const testData = [{ id: 'test', timestamp: new Date(), value: 42, category: 'test', source: 'test', metadata: {} }]
      
      mockWs.addEventListener('message', (event: any) => {
        const data = JSON.parse(event.data)
        expect(Array.isArray(data)).toBe(true)
        done()
      })

      // Simulate receiving data immediately after setup
      setTimeout(() => {
        window.dispatchEvent(new CustomEvent('mockWebSocketData', {
          detail: testData
        }))
      }, 10)
    })
  }, 1000) // Reduce timeout to 1 second

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

  describe('Scenario-based Data Generation', () => {
    it('should generate data according to specified scenario', async () => {
      const scenarioServer = new MockWebSocketServer({
        dataPointsPerSecond: 50,
        scenario: 'high_load',
        categories: ['cpu'],
        sources: ['server-1']
      })

      const mockDispatchEvent = jest.fn()
      Object.defineProperty(window, 'dispatchEvent', {
        value: mockDispatchEvent,
        writable: true
      })

      await scenarioServer.start()
      await new Promise(resolve => setTimeout(resolve, 250))
      await scenarioServer.stop()

      expect(mockDispatchEvent).toHaveBeenCalled()
      
      const stats = scenarioServer.getStats()
      expect(stats.scenario).toBe('high_load')
      
      // Collect generated data points
      const allDataPoints: DataPoint[] = []
      mockDispatchEvent.mock.calls.forEach(call => {
        if (call[0].type === 'mockWebSocketData') {
          allDataPoints.push(...call[0].detail)
        }
      })

      // High load scenario should generate data with scenario metadata
      if (allDataPoints.length > 0) {
        expect(allDataPoints[0].metadata.scenario).toBe('high_load')
      }
    })

    it('should change scenarios dynamically', async () => {
      const server = new MockWebSocketServer({
        dataPointsPerSecond: 10,
        scenario: 'normal'
      })

      await server.start()
      
      let stats = server.getStats()
      expect(stats.scenario).toBe('normal')

      server.changeScenario('maintenance')
      
      stats = server.getStats()
      expect(stats.scenario).toBe('maintenance')

      await server.stop()
    })
  })

  describe('Network Simulation', () => {
    it('should simulate network latency', async () => {
      const latencyServer = new MockWebSocketServer({
        dataPointsPerSecond: 10,
        networkLatency: 100 // 100ms delay
      })

      const mockDispatchEvent = jest.fn()
      Object.defineProperty(window, 'dispatchEvent', {
        value: mockDispatchEvent,
        writable: true
      })

      const startTime = Date.now()
      await latencyServer.start()
      
      // Wait for first message with latency
      await new Promise(resolve => setTimeout(resolve, 250))
      
      await latencyServer.stop()

      // Should have received messages, but with delay
      expect(mockDispatchEvent).toHaveBeenCalled()
      
      const stats = latencyServer.getPerformanceMetrics()
      expect(stats.networkLatency).toBe(100)
    })

    it('should simulate message dropping', async () => {
      const dropServer = new MockWebSocketServer({
        dataPointsPerSecond: 50, // High rate to test dropping
        dropRate: 0.5 // Drop 50% of messages
      })

      const mockDispatchEvent = jest.fn()
      Object.defineProperty(window, 'dispatchEvent', {
        value: mockDispatchEvent,
        writable: true
      })

      await dropServer.start()
      await new Promise(resolve => setTimeout(resolve, 200))
      await dropServer.stop()

      const stats = dropServer.getStats()
      const metrics = dropServer.getPerformanceMetrics()
      
      expect(stats.droppedMessages).toBeGreaterThan(0)
      expect(metrics.actualDropRate).toBeGreaterThan(0)
      expect(metrics.configuredDropRate).toBe(0.5)
    })
  })

  describe('Connection Interruption Simulation', () => {
    it('should simulate connection interruptions', async () => {
      const server = new MockWebSocketServer({
        dataPointsPerSecond: 10
      })

      await server.start()
      expect(server.getStats().isRunning).toBe(true)

      // Simulate short interruption
      server.simulateConnectionInterruption(100)
      
      // Should be stopped immediately
      expect(server.getStats().isRunning).toBe(false)

      // Wait for reconnection
      await new Promise(resolve => setTimeout(resolve, 150))
      
      // Should be running again
      expect(server.getStats().isRunning).toBe(true)

      await server.stop()
    })
  })

  describe('Performance Metrics', () => {
    it('should track comprehensive performance metrics', async () => {
      const server = new MockWebSocketServer({
        dataPointsPerSecond: 100, // Higher rate for reliable testing
        dropRate: 0.1,
        categories: ['cpu'],
        sources: ['server-1']
      })

      await server.start()
      await new Promise(resolve => setTimeout(resolve, 300))
      await server.stop()

      const metrics = server.getPerformanceMetrics()
      
      expect(metrics.uptime).toBeGreaterThan(0)
      expect(metrics.totalDataPoints).toBeGreaterThan(0)
      expect(metrics.averageDataPointsPerSecond).toBeGreaterThan(0)
      expect(metrics.configuredDropRate).toBe(0.1)
      expect(typeof metrics.actualDropRate).toBe('number')
      expect(metrics.networkLatency).toBe(0) // Default
    })

    it('should calculate accurate data generation rates', async () => {
      const targetRate = 50 // Higher rate for reliable testing
      const server = new MockWebSocketServer({
        dataPointsPerSecond: targetRate,
        categories: ['cpu'],
        sources: ['server-1']
      })

      await server.start()
      await new Promise(resolve => setTimeout(resolve, 400)) // Run for 400ms
      await server.stop()

      const metrics = server.getPerformanceMetrics()
      
      // Should be close to target rate (within reasonable margin)
      expect(metrics.averageDataPointsPerSecond).toBeGreaterThan(targetRate * 0.3)
      expect(metrics.averageDataPointsPerSecond).toBeLessThan(targetRate * 3)
    })
  })

  describe('Stress Testing Capabilities', () => {
    it('should handle high data generation rates', async () => {
      const highRateServer = new MockWebSocketServer({
        dataPointsPerSecond: 200, // Very high rate
        categories: ['cpu'],
        sources: ['server-1']
      })

      const mockDispatchEvent = jest.fn()
      Object.defineProperty(window, 'dispatchEvent', {
        value: mockDispatchEvent,
        writable: true
      })

      await highRateServer.start()
      await new Promise(resolve => setTimeout(resolve, 300))
      await highRateServer.stop()

      const stats = highRateServer.getStats()
      expect(stats.dataPointsGenerated).toBeGreaterThan(10) // Should generate substantial data
      
      // Should not have errors or excessive dropped messages
      expect(mockDispatchEvent).toHaveBeenCalled()
    })

    it('should handle burst mode stress testing', async () => {
      const burstServer = new MockWebSocketServer({
        dataPointsPerSecond: 50,
        enableBurstMode: true,
        burstInterval: 30, // Very frequent bursts for testing
        burstDuration: 20,
        burstMultiplier: 5,
        categories: ['cpu'],
        sources: ['server-1']
      })

      const mockDispatchEvent = jest.fn()
      Object.defineProperty(window, 'dispatchEvent', {
        value: mockDispatchEvent,
        writable: true
      })

      await burstServer.start()
      await new Promise(resolve => setTimeout(resolve, 250))
      await burstServer.stop()

      const stats = burstServer.getStats()
      expect(stats.dataPointsGenerated).toBeGreaterThan(0)
      expect(mockDispatchEvent).toHaveBeenCalled()
    })
  })

  describe('Data Quality and Consistency', () => {
    it('should generate consistent data structure across scenarios', async () => {
      const scenarios = ['normal', 'high_load', 'maintenance'] as const
      
      for (const scenario of scenarios) {
        const server = new MockWebSocketServer({
          dataPointsPerSecond: 50,
          scenario,
          categories: ['cpu'],
          sources: ['server-1']
        })

        const mockDispatchEvent = jest.fn()
        Object.defineProperty(window, 'dispatchEvent', {
          value: mockDispatchEvent,
          writable: true
        })

        await server.start()
        await new Promise(resolve => setTimeout(resolve, 150))
        await server.stop()

        // Check data structure consistency
        const calls = mockDispatchEvent.mock.calls.filter(call => call[0].type === 'mockWebSocketData')
        if (calls.length > 0) {
          const dataPoints: DataPoint[] = calls[0][0].detail
          if (dataPoints.length > 0) {
            const dp = dataPoints[0]
            expect(dp).toHaveProperty('id')
            expect(dp).toHaveProperty('timestamp')
            expect(dp).toHaveProperty('value')
            expect(dp).toHaveProperty('category')
            expect(dp).toHaveProperty('source')
            expect(dp).toHaveProperty('metadata')
            expect(dp.metadata.scenario).toBe(scenario)
          }
        }
      }
    })

    it('should maintain data point uniqueness', async () => {
      const server = new MockWebSocketServer({
        dataPointsPerSecond: 50,
        categories: ['cpu'],
        sources: ['server-1']
      })

      const mockDispatchEvent = jest.fn()
      Object.defineProperty(window, 'dispatchEvent', {
        value: mockDispatchEvent,
        writable: true
      })

      await server.start()
      await new Promise(resolve => setTimeout(resolve, 200))
      await server.stop()

      // Collect all generated IDs
      const allIds = new Set<string>()
      mockDispatchEvent.mock.calls.forEach(call => {
        if (call[0].type === 'mockWebSocketData') {
          call[0].detail.forEach((dp: DataPoint) => {
            expect(allIds.has(dp.id)).toBe(false) // Should be unique
            allIds.add(dp.id)
          })
        }
      })

      expect(allIds.size).toBeGreaterThan(0)
    })
  })

  describe('Enhanced WebSocket Server Features', () => {
    it('should generate historical batch data', () => {
      const server = new MockWebSocketServer({
        categories: ['cpu', 'memory'],
        sources: ['server-1']
      })

      const batch = server.generateHistoricalBatch(100)
      
      expect(batch.length).toBe(200) // 100 * 2 categories * 1 source
      expect(batch[0]).toHaveProperty('id')
      expect(batch[0]).toHaveProperty('timestamp')
      expect(batch[0]).toHaveProperty('value')
      expect(batch[0]).toHaveProperty('category')
      expect(batch[0]).toHaveProperty('source')
      
      // Should be sorted by timestamp
      for (let i = 1; i < batch.length; i++) {
        expect(batch[i].timestamp.getTime()).toBeGreaterThanOrEqual(
          batch[i - 1].timestamp.getTime()
        )
      }
    })

    it('should provide detailed statistics', async () => {
      const server = new MockWebSocketServer({
        dataPointsPerSecond: 30,
        categories: ['cpu'],
        sources: ['server-1']
      })

      await server.start()
      await new Promise(resolve => setTimeout(resolve, 200))
      await server.stop()

      const detailedStats = server.getDetailedStats()
      
      expect(detailedStats).toHaveProperty('isRunning')
      expect(detailedStats).toHaveProperty('dataPointsGenerated')
      expect(detailedStats).toHaveProperty('efficiency')
      expect(detailedStats).toHaveProperty('memory')
      expect(detailedStats.efficiency).toHaveProperty('targetRate')
      expect(detailedStats.efficiency).toHaveProperty('actualRate')
      expect(detailedStats.efficiency).toHaveProperty('efficiency')
      expect(detailedStats.memory).toHaveProperty('messageQueueSize')
    })

    it('should simulate data spikes', async () => {
      const server = new MockWebSocketServer({
        dataPointsPerSecond: 10,
        categories: ['cpu'],
        sources: ['server-1']
      })

      await server.start()
      
      const initialRate = server.getStats().config.dataPointsPerSecond
      
      server.simulateDataSpike(100, 3) // 100ms spike with 3x multiplier
      
      // Rate should be temporarily increased
      const spikeRate = server.getStats().config.dataPointsPerSecond
      expect(spikeRate).toBe(initialRate! * 3)
      
      // Wait for spike to end
      await new Promise(resolve => setTimeout(resolve, 150))
      
      const finalRate = server.getStats().config.dataPointsPerSecond
      expect(finalRate).toBe(initialRate)
      
      await server.stop()
    })
  })