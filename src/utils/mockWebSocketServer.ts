import { DataPoint } from '@/types'
import { createScenarioConfig, generateDataPoint, type DataGenerationConfig } from './mockDataGenerator'

export interface MockServerConfig {
  port?: number
  dataPointsPerSecond?: number
  categories?: string[]
  sources?: string[]
  enableBurstMode?: boolean
  burstInterval?: number
  burstDuration?: number
  burstMultiplier?: number
  scenario?: 'normal' | 'high_load' | 'system_failure' | 'maintenance' | 'peak_hours' | 'weekend'
  networkLatency?: number // Simulated network delay in ms
  dropRate?: number // 0-1, probability of dropping messages
  enableReconnectTesting?: boolean
  reconnectInterval?: number
}

export interface DataGenerationPattern {
  type: 'linear' | 'sine' | 'random' | 'step' | 'exponential'
  amplitude?: number
  frequency?: number
  offset?: number
  trend?: number
  noise?: number
}

export class MockWebSocketServer {
  private server: any = null
  private clients: Set<any> = new Set()
  private intervalId: NodeJS.Timeout | null = null
  private burstTimeoutId: NodeJS.Timeout | null = null
  private reconnectTimeoutId: NodeJS.Timeout | null = null
  private isRunning = false
  private dataCounter = 0
  private startTime = Date.now()
  private scenarioConfig: Partial<DataGenerationConfig> = {}
  private messageQueue: DataPoint[][] = []
  private droppedMessages = 0

  constructor(private config: MockServerConfig = {}) {
    this.config = {
      port: 8080,
      dataPointsPerSecond: 10,
      categories: ['cpu', 'memory', 'network', 'disk', 'temperature'],
      sources: ['server-1', 'server-2', 'server-3', 'database', 'cache'],
      enableBurstMode: false,
      burstInterval: 30000, // 30 seconds
      burstDuration: 5000,  // 5 seconds
      burstMultiplier: 10,
      scenario: 'normal',
      networkLatency: 0,
      dropRate: 0,
      enableReconnectTesting: false,
      reconnectInterval: 60000, // 1 minute
      ...config
    }
    
    // Load scenario configuration
    if (this.config.scenario) {
      this.scenarioConfig = createScenarioConfig(this.config.scenario)
    }
  }

  start(): Promise<void> {
    return new Promise((resolve, reject) => {
      try {
        // For browser environment, we'll simulate the server behavior
        if (typeof window !== 'undefined') {
          this.startBrowserMockServer()
          resolve()
          return
        }

        // Node.js environment - actual WebSocket server
        const WebSocket = require('ws')
        
        this.server = new WebSocket.Server({ 
          port: this.config.port,
          perMessageDeflate: false
        })

        this.server.on('connection', (ws: any) => {
          console.log('Client connected to mock WebSocket server')
          this.clients.add(ws)

          ws.on('close', () => {
            console.log('Client disconnected from mock WebSocket server')
            this.clients.delete(ws)
          })

          ws.on('error', (error: Error) => {
            console.error('WebSocket client error:', error)
            this.clients.delete(ws)
          })
        })

        this.server.on('listening', () => {
          console.log(`Mock WebSocket server listening on port ${this.config.port}`)
          this.startDataGeneration()
          resolve()
        })

        this.server.on('error', (error: Error) => {
          console.error('Mock WebSocket server error:', error)
          reject(error)
        })

      } catch (error) {
        reject(error)
      }
    })
  }

  private startBrowserMockServer() {
    // For browser testing, we'll create a mock that can be used with the WebSocket hook
    console.log('Starting browser mock WebSocket server simulation')
    this.startDataGeneration()
  }

  private startDataGeneration() {
    if (this.isRunning) return

    this.isRunning = true
    const intervalMs = Math.max(10, 1000 / (this.config.dataPointsPerSecond || 10)) // Minimum 10ms interval

    this.intervalId = setInterval(() => {
      this.generateAndSendData()
    }, intervalMs)

    // Setup burst mode if enabled
    if (this.config.enableBurstMode) {
      this.scheduleBurst()
    }
  }

  private scheduleBurst() {
    this.burstTimeoutId = setTimeout(() => {
      this.executeBurst()
      this.scheduleBurst() // Schedule next burst
    }, this.config.burstInterval)
  }

  private executeBurst() {
    const burstRate = (this.config.dataPointsPerSecond || 10) * (this.config.burstMultiplier || 10)
    const burstIntervalMs = 1000 / burstRate
    const burstEndTime = Date.now() + (this.config.burstDuration || 5000)

    const burstInterval = setInterval(() => {
      if (Date.now() >= burstEndTime) {
        clearInterval(burstInterval)
        return
      }
      this.generateAndSendData(true)
    }, burstIntervalMs)
  }

  private generateAndSendData(isBurst = false) {
    const batchSize = isBurst ? 5 : 1
    const dataPoints: DataPoint[] = []

    for (let i = 0; i < batchSize; i++) {
      dataPoints.push(this.generateDataPoint())
    }

    this.broadcastData(dataPoints)
  }

  private generateDataPoint(): DataPoint {
    const now = new Date()
    const categories = this.config.categories || ['default']
    const sources = this.config.sources || ['default']
    
    const category = categories[Math.floor(Math.random() * categories.length)]
    const source = sources[Math.floor(Math.random() * sources.length)]
    
    // Use advanced data generator if scenario config is available
    if (this.scenarioConfig.patterns && this.scenarioConfig.patterns[category]) {
      const baseValue = this.generateValueForCategory(category)
      return generateDataPoint(now, category, source, baseValue, {
        ...this.scenarioConfig,
        categories: [category],
        sources: [source]
      })
    }
    
    // Fallback to legacy generation
    let value = this.generateValueForCategory(category)
    const timePattern = this.generateTimeBasedPattern(now)
    value = value * (1 + timePattern * 0.1)

    return {
      id: `${source}-${category}-${this.dataCounter++}-${now.getTime()}`,
      timestamp: now,
      value: Math.round(value * 100) / 100,
      category,
      source,
      metadata: {
        generated: true,
        pattern: this.getPatternForCategory(category),
        serverTime: now.toISOString(),
        scenario: this.config.scenario || 'normal',
        batchId: Math.floor(this.dataCounter / 10), // Group data points in batches
        sequenceNumber: this.dataCounter,
        unit: this.getUnitForCategory(category),
        threshold: this.getThresholdForCategory(category),
        status: value > this.getThresholdForCategory(category) ? 'warning' : 'normal'
      }
    }
  }

  private generateValueForCategory(category: string): number {
    const patterns: Record<string, DataGenerationPattern> = {
      cpu: { type: 'sine', amplitude: 30, frequency: 0.1, offset: 50, noise: 0.1 },
      memory: { type: 'linear', trend: 0.01, offset: 60, noise: 0.05 },
      network: { type: 'random', amplitude: 100, offset: 200, noise: 0.3 },
      disk: { type: 'step', amplitude: 20, offset: 80, noise: 0.02 },
      temperature: { type: 'sine', amplitude: 10, frequency: 0.05, offset: 65, noise: 0.05 },
      default: { type: 'random', amplitude: 50, offset: 50, noise: 0.2 }
    }

    const pattern = patterns[category] || patterns.default
    const time = (Date.now() - this.startTime) / 1000 // Time in seconds

    let value = pattern.offset || 0

    switch (pattern.type) {
      case 'sine':
        value += (pattern.amplitude || 10) * Math.sin(time * (pattern.frequency || 0.1))
        break
      case 'linear':
        value += time * (pattern.trend || 0.01)
        break
      case 'random':
        value += (Math.random() - 0.5) * 2 * (pattern.amplitude || 10)
        break
      case 'step':
        value += (pattern.amplitude || 10) * Math.floor(time / 10) % 5
        break
      case 'exponential':
        value += (pattern.amplitude || 10) * Math.exp(time * (pattern.trend || 0.001))
        break
    }

    // Add noise
    if (pattern.noise) {
      value += (Math.random() - 0.5) * 2 * pattern.noise * value
    }

    return Math.max(0, value) // Ensure non-negative values
  }

  private generateTimeBasedPattern(timestamp: Date): number {
    const hour = timestamp.getHours()
    const dayOfWeek = timestamp.getDay()
    
    // Business hours pattern (higher activity 9-17)
    let pattern = 0
    if (hour >= 9 && hour <= 17) {
      pattern += 0.3
    }
    
    // Weekend pattern (lower activity)
    if (dayOfWeek === 0 || dayOfWeek === 6) {
      pattern -= 0.2
    }
    
    return pattern
  }

  private getPatternForCategory(category: string): string {
    const patterns: Record<string, string> = {
      cpu: 'sinusoidal_with_noise',
      memory: 'linear_growth',
      network: 'random_spikes',
      disk: 'stepped_levels',
      temperature: 'slow_sine_wave'
    }
    return patterns[category] || 'random'
  }

  private getUnitForCategory(category: string): string {
    const units: Record<string, string> = {
      cpu: '%',
      memory: '%',
      network: 'Mbps',
      disk: '%',
      temperature: '°C'
    }
    return units[category] || 'units'
  }

  private getThresholdForCategory(category: string): number {
    const thresholds: Record<string, number> = {
      cpu: 80,
      memory: 85,
      network: 90,
      disk: 90,
      temperature: 70
    }
    return thresholds[category] || 80
  }

  private broadcastData(dataPoints: DataPoint[]) {
    // Simulate message dropping
    if (this.config.dropRate && Math.random() < this.config.dropRate) {
      this.droppedMessages++
      return
    }
    
    const message = JSON.stringify(dataPoints)
    
    // Simulate network latency
    const sendMessage = () => {
      if (typeof window !== 'undefined') {
        // Browser environment - emit custom event
        window.dispatchEvent(new CustomEvent('mockWebSocketData', {
          detail: dataPoints
        }))
      } else {
        // Node.js environment - send to WebSocket clients
        this.clients.forEach(client => {
          if (client.readyState === 1) { // WebSocket.OPEN
            try {
              client.send(message)
            } catch (error) {
              console.error('Error sending data to client:', error)
              this.clients.delete(client)
            }
          }
        })
      }
    }
    
    if (this.config.networkLatency && this.config.networkLatency > 0) {
      setTimeout(sendMessage, this.config.networkLatency)
    } else {
      sendMessage()
    }
  }

  stop(): Promise<void> {
    return new Promise((resolve) => {
      this.isRunning = false
      
      if (this.intervalId) {
        clearInterval(this.intervalId)
        this.intervalId = null
      }
      
      if (this.burstTimeoutId) {
        clearTimeout(this.burstTimeoutId)
        this.burstTimeoutId = null
      }

      if (this.server) {
        this.server.close(() => {
          console.log('Mock WebSocket server stopped')
          resolve()
        })
      } else {
        console.log('Mock WebSocket server simulation stopped')
        resolve()
      }
    })
  }

  getStats() {
    return {
      isRunning: this.isRunning,
      clientCount: this.clients.size,
      dataPointsGenerated: this.dataCounter,
      droppedMessages: this.droppedMessages,
      uptime: Date.now() - this.startTime,
      config: this.config,
      scenario: this.config.scenario,
      messageQueueSize: this.messageQueue.length
    }
  }
  
  // Simulate connection interruption for testing reconnection logic
  simulateConnectionInterruption(duration: number = 5000) {
    if (!this.isRunning) return
    
    console.log(`Simulating connection interruption for ${duration}ms`)
    this.stop()
    
    setTimeout(() => {
      console.log('Reconnecting after simulated interruption')
      this.start()
    }, duration)
  }
  
  // Change scenario dynamically
  changeScenario(scenario: 'normal' | 'high_load' | 'system_failure' | 'maintenance' | 'peak_hours' | 'weekend') {
    this.config.scenario = scenario
    this.scenarioConfig = createScenarioConfig(scenario)
    console.log(`Changed to scenario: ${scenario}`)
  }
  
  // Get performance metrics
  getPerformanceMetrics() {
    const uptime = Date.now() - this.startTime
    const avgDataPointsPerSecond = this.dataCounter / (uptime / 1000)
    const dropRate = this.droppedMessages / (this.dataCounter + this.droppedMessages)
    
    return {
      uptime,
      totalDataPoints: this.dataCounter,
      droppedMessages: this.droppedMessages,
      averageDataPointsPerSecond: avgDataPointsPerSecond,
      actualDropRate: dropRate,
      configuredDropRate: this.config.dropRate || 0,
      networkLatency: this.config.networkLatency || 0
    }
  }

  // Method to change data generation rate dynamically
  updateConfig(newConfig: Partial<MockServerConfig>) {
    this.config = { ...this.config, ...newConfig }
    
    if (this.isRunning) {
      // Restart data generation with new config
      this.stop().then(() => {
        this.start()
      })
    }
  }

  // Generate a batch of historical data for initial load
  generateHistoricalBatch(count: number = 1000): DataPoint[] {
    const batch: DataPoint[] = []
    const now = Date.now()
    const timeStep = 1000 // 1 second between points
    
    for (let i = 0; i < count; i++) {
      const timestamp = new Date(now - (count - i) * timeStep)
      const categories = this.config.categories || ['default']
      const sources = this.config.sources || ['default']
      
      for (const category of categories) {
        for (const source of sources) {
          const baseValue = this.generateValueForCategory(category)
          const dataPoint = generateDataPoint(timestamp, category, source, baseValue, {
            ...this.scenarioConfig,
            categories: [category],
            sources: [source]
          })
          batch.push(dataPoint)
        }
      }
    }
    
    return batch.sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime())
  }

  // Simulate data spikes for testing
  simulateDataSpike(duration: number = 2000, multiplier: number = 5) {
    if (!this.isRunning) return
    
    const originalRate = this.config.dataPointsPerSecond
    this.config.dataPointsPerSecond = (originalRate || 10) * multiplier
    
    console.log(`Simulating data spike: ${this.config.dataPointsPerSecond} points/second for ${duration}ms`)
    
    setTimeout(() => {
      this.config.dataPointsPerSecond = originalRate
      console.log(`Data spike ended, returning to ${originalRate} points/second`)
    }, duration)
  }

  // Simulate gradual load increase
  simulateGradualLoad(targetRate: number, duration: number = 10000) {
    if (!this.isRunning) return
    
    const startRate = this.config.dataPointsPerSecond || 10
    const steps = 20
    const stepDuration = duration / steps
    const rateIncrement = (targetRate - startRate) / steps
    
    let currentStep = 0
    const interval = setInterval(() => {
      if (currentStep >= steps || !this.isRunning) {
        clearInterval(interval)
        return
      }
      
      this.config.dataPointsPerSecond = Math.round(startRate + rateIncrement * currentStep)
      console.log(`Gradual load step ${currentStep + 1}/${steps}: ${this.config.dataPointsPerSecond} points/second`)
      currentStep++
    }, stepDuration)
  }

  // Get detailed statistics for monitoring
  getDetailedStats() {
    const stats = this.getStats()
    const metrics = this.getPerformanceMetrics()
    
    return {
      ...stats,
      ...metrics,
      efficiency: {
        targetRate: this.config.dataPointsPerSecond || 10,
        actualRate: metrics.averageDataPointsPerSecond,
        efficiency: metrics.averageDataPointsPerSecond / (this.config.dataPointsPerSecond || 10),
        dropRatePercentage: (metrics.actualDropRate * 100).toFixed(2) + '%'
      },
      memory: {
        messageQueueSize: this.messageQueue.length,
        clientConnections: this.clients.size
      }
    }
  }
}

// Browser-compatible mock WebSocket for testing
export class MockWebSocket extends EventTarget {
  static CONNECTING = 0
  static OPEN = 1
  static CLOSING = 2
  static CLOSED = 3

  public readyState = MockWebSocket.CONNECTING
  public url: string
  
  private mockServer: MockWebSocketServer | null = null

  constructor(url: string) {
    super()
    this.url = url
    
    // Simulate connection delay
    setTimeout(() => {
      this.readyState = MockWebSocket.OPEN
      this.dispatchEvent(new Event('open'))
      
      // Start receiving mock data
      this.startMockDataFlow()
    }, 100)
  }

  private startMockDataFlow() {
    // Listen for mock data events
    if (typeof window !== 'undefined') {
      window.addEventListener('mockWebSocketData', (event: any) => {
        const messageEvent = new MessageEvent('message', {
          data: JSON.stringify(event.detail)
        })
        this.dispatchEvent(messageEvent)
      })
    }
  }

  send(data: string) {
    if (this.readyState !== MockWebSocket.OPEN) {
      throw new Error('WebSocket is not open')
    }
    // Mock implementation - could log or process the sent data
    console.log('Mock WebSocket sent:', data)
  }

  close() {
    this.readyState = MockWebSocket.CLOSING
    setTimeout(() => {
      this.readyState = MockWebSocket.CLOSED
      this.dispatchEvent(new CloseEvent('close'))
    }, 50)
  }
}

// Utility function to create a mock server instance
export function createMockWebSocketServer(config?: MockServerConfig): MockWebSocketServer {
  return new MockWebSocketServer(config)
}