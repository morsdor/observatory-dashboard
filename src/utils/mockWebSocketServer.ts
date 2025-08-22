import { DataPoint } from '@/types'

export interface MockServerConfig {
  port?: number
  dataPointsPerSecond?: number
  categories?: string[]
  sources?: string[]
  enableBurstMode?: boolean
  burstInterval?: number
  burstDuration?: number
  burstMultiplier?: number
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
  private isRunning = false
  private dataCounter = 0
  private startTime = Date.now()

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
      ...config
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
    this.isRunning = true
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
    
    // Generate realistic values based on category
    let value = this.generateValueForCategory(category)
    
    // Add some time-based patterns
    const timePattern = this.generateTimeBasedPattern(now)
    value = value * (1 + timePattern * 0.1) // 10% variation based on time

    return {
      id: `${source}-${category}-${this.dataCounter++}-${now.getTime()}`,
      timestamp: now,
      value: Math.round(value * 100) / 100, // Round to 2 decimal places
      category,
      source,
      metadata: {
        generated: true,
        pattern: this.getPatternForCategory(category),
        serverTime: now.toISOString()
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

  private broadcastData(dataPoints: DataPoint[]) {
    const message = JSON.stringify(dataPoints)
    
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
      uptime: Date.now() - this.startTime,
      config: this.config
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