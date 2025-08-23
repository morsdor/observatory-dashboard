/**
 * Unified Data Streaming Service
 * 
 * This service provides a centralized way to manage data streaming across the application.
 * It handles WebSocket connections, mock data generation, and real-time data distribution.
 */

import { DataPoint } from '@/types'
import { generateDataPoint, createScenarioConfig, type DataGenerationConfig } from '@/utils/mockDataGenerator'

export type StreamingStatus = 'disconnected' | 'connecting' | 'connected' | 'error'
export type DataScenario = 'normal' | 'high_load' | 'system_failure' | 'maintenance' | 'peak_hours' | 'weekend'

export interface StreamingConfig {
  websocketUrl?: string
  dataPointsPerSecond?: number
  categories?: string[]
  sources?: string[]
  scenario?: DataScenario
  autoReconnect?: boolean
  maxReconnectAttempts?: number
  bufferSize?: number
}

export interface StreamingMetrics {
  totalDataPoints: number
  dataPointsPerSecond: number
  connectionUptime: number
  lastUpdateTime: Date | null
  bufferUtilization: number
  memoryUsage: number
}

export class DataStreamingService {
  private static instance: DataStreamingService | null = null
  
  private websocket: WebSocket | null = null
  private status: StreamingStatus = 'disconnected'
  private config: Required<StreamingConfig>
  private dataBuffer: DataPoint[] = []
  private listeners: Set<(data: DataPoint[]) => void> = new Set()
  private statusListeners: Set<(status: StreamingStatus) => void> = new Set()
  private metricsListeners: Set<(metrics: StreamingMetrics) => void> = new Set()
  
  // Mock data generation
  private mockInterval: NodeJS.Timeout | null = null
  private mockDataCounter = 0
  private startTime = Date.now()
  private scenarioConfig: Partial<DataGenerationConfig> = {}
  
  // Reconnection logic
  private reconnectAttempts = 0
  private reconnectTimeout: NodeJS.Timeout | null = null
  
  private constructor(config: StreamingConfig = {}) {
    this.config = {
      websocketUrl: 'ws://localhost:8080',
      dataPointsPerSecond: 10,
      categories: ['cpu', 'memory', 'network', 'disk', 'temperature'],
      sources: ['server-1', 'server-2', 'server-3'],
      scenario: 'normal',
      autoReconnect: true,
      maxReconnectAttempts: 5,
      bufferSize: 10000,
      ...config
    }
    
    this.updateScenarioConfig()
  }
  
  public static getInstance(config?: StreamingConfig): DataStreamingService {
    if (!DataStreamingService.instance) {
      DataStreamingService.instance = new DataStreamingService(config)
    }
    return DataStreamingService.instance
  }
  
  // Configuration management
  public updateConfig(newConfig: Partial<StreamingConfig>): void {
    this.config = { ...this.config, ...newConfig }
    this.updateScenarioConfig()
    
    // If connected, restart with new config
    if (this.status === 'connected') {
      this.disconnect()
      setTimeout(() => this.connect(), 100)
    }
  }
  
  private updateScenarioConfig(): void {
    this.scenarioConfig = createScenarioConfig(this.config.scenario)
  }
  
  // Connection management
  public async connect(): Promise<void> {
    if (this.status === 'connecting' || this.status === 'connected') {
      return
    }
    
    this.setStatus('connecting')
    
    try {
      // Try WebSocket connection first
      await this.connectWebSocket()
    } catch (error) {
      console.warn('WebSocket connection failed, falling back to mock data:', error)
      this.startMockDataGeneration()
    }
  }
  
  private async connectWebSocket(): Promise<void> {
    return new Promise((resolve, reject) => {
      try {
        this.websocket = new WebSocket(this.config.websocketUrl)
        
        this.websocket.onopen = () => {
          console.log('WebSocket connected')
          this.setStatus('connected')
          this.reconnectAttempts = 0
          this.startTime = Date.now()
          resolve()
        }
        
        this.websocket.onmessage = (event) => {
          try {
            const data = JSON.parse(event.data)
            const dataPoints = Array.isArray(data) ? data : [data]
            this.addDataPoints(dataPoints)
          } catch (error) {
            console.error('Error parsing WebSocket message:', error)
          }
        }
        
        this.websocket.onclose = () => {
          console.log('WebSocket disconnected')
          this.websocket = null
          
          if (this.status === 'connected' && this.config.autoReconnect) {
            this.handleReconnection()
          } else {
            this.setStatus('disconnected')
          }
        }
        
        this.websocket.onerror = (error) => {
          console.error('WebSocket error:', error)
          this.setStatus('error')
          reject(error)
        }
        
        // Connection timeout
        setTimeout(() => {
          if (this.websocket?.readyState === WebSocket.CONNECTING) {
            this.websocket.close()
            reject(new Error('WebSocket connection timeout'))
          }
        }, 5000)
        
      } catch (error) {
        reject(error)
      }
    })
  }
  
  private handleReconnection(): void {
    if (this.reconnectAttempts >= this.config.maxReconnectAttempts) {
      console.log('Max reconnection attempts reached, starting mock data')
      this.startMockDataGeneration()
      return
    }
    
    this.reconnectAttempts++
    const delay = Math.min(1000 * Math.pow(2, this.reconnectAttempts - 1), 30000) // Exponential backoff, max 30s
    
    console.log(`Attempting to reconnect in ${delay}ms (attempt ${this.reconnectAttempts}/${this.config.maxReconnectAttempts})`)
    
    this.reconnectTimeout = setTimeout(() => {
      this.connect()
    }, delay)
  }
  
  private startMockDataGeneration(): void {
    if (this.mockInterval) {
      clearInterval(this.mockInterval)
    }
    
    this.setStatus('connected')
    this.startTime = Date.now()
    
    const intervalMs = 1000 / this.config.dataPointsPerSecond
    
    this.mockInterval = setInterval(() => {
      const dataPoints = this.generateMockDataBatch()
      this.addDataPoints(dataPoints)
    }, intervalMs)
    
    console.log(`Mock data generation started: ${this.config.dataPointsPerSecond} points/second`)
  }
  
  private generateMockDataBatch(): DataPoint[] {
    const batchSize = Math.max(1, Math.floor(this.config.dataPointsPerSecond / 10)) // Generate in small batches
    const dataPoints: DataPoint[] = []
    const now = new Date()
    
    for (let i = 0; i < batchSize; i++) {
      const category = this.config.categories[Math.floor(Math.random() * this.config.categories.length)]
      const source = this.config.sources[Math.floor(Math.random() * this.config.sources.length)]
      
      const baseValue = this.generateValueForCategory(category)
      const dataPoint = generateDataPoint(now, category, source, baseValue, {
        ...this.scenarioConfig,
        categories: [category],
        sources: [source]
      })
      
      dataPoints.push(dataPoint)
      this.mockDataCounter++
    }
    
    return dataPoints
  }
  
  private generateValueForCategory(category: string): number {
    const time = (Date.now() - this.startTime) / 1000
    
    const patterns: Record<string, any> = {
      cpu: { base: 50, amplitude: 30, frequency: 0.1, noise: 0.1 },
      memory: { base: 60, amplitude: 20, frequency: 0.05, noise: 0.05 },
      network: { base: 200, amplitude: 100, frequency: 0.2, noise: 0.3 },
      disk: { base: 80, amplitude: 15, frequency: 0.03, noise: 0.02 },
      temperature: { base: 65, amplitude: 10, frequency: 0.08, noise: 0.05 }
    }
    
    const pattern = patterns[category] || patterns.cpu
    let value = pattern.base
    
    // Add sine wave pattern
    value += pattern.amplitude * Math.sin(time * pattern.frequency)
    
    // Add noise
    value += (Math.random() - 0.5) * 2 * pattern.noise * pattern.base
    
    // Add scenario-specific modifications
    if (this.config.scenario === 'high_load') {
      value *= 1.5
    } else if (this.config.scenario === 'maintenance') {
      value *= 0.3
    }
    
    return Math.max(0, value)
  }
  
  public disconnect(): void {
    this.setStatus('disconnected')
    
    if (this.websocket) {
      this.websocket.close()
      this.websocket = null
    }
    
    if (this.mockInterval) {
      clearInterval(this.mockInterval)
      this.mockInterval = null
    }
    
    if (this.reconnectTimeout) {
      clearTimeout(this.reconnectTimeout)
      this.reconnectTimeout = null
    }
    
    this.reconnectAttempts = 0
  }
  
  // Data management
  private addDataPoints(dataPoints: DataPoint[]): void {
    // Add to buffer
    this.dataBuffer.push(...dataPoints)
    
    // Maintain buffer size
    if (this.dataBuffer.length > this.config.bufferSize) {
      this.dataBuffer = this.dataBuffer.slice(-this.config.bufferSize)
    }
    
    // Notify listeners
    this.notifyDataListeners(dataPoints)
    this.updateMetrics()
  }
  
  public clearBuffer(): void {
    this.dataBuffer = []
    this.mockDataCounter = 0
    this.updateMetrics()
  }
  
  public getBufferedData(): DataPoint[] {
    return [...this.dataBuffer]
  }
  
  public getRecentData(count: number = 1000): DataPoint[] {
    return this.dataBuffer.slice(-count)
  }
  
  // Event listeners
  public onData(callback: (data: DataPoint[]) => void): () => void {
    this.listeners.add(callback)
    return () => this.listeners.delete(callback)
  }
  
  public onStatusChange(callback: (status: StreamingStatus) => void): () => void {
    this.statusListeners.add(callback)
    return () => this.statusListeners.delete(callback)
  }
  
  public onMetricsUpdate(callback: (metrics: StreamingMetrics) => void): () => void {
    this.metricsListeners.add(callback)
    return () => this.metricsListeners.delete(callback)
  }
  
  private notifyDataListeners(data: DataPoint[]): void {
    this.listeners.forEach(callback => {
      try {
        callback(data)
      } catch (error) {
        console.error('Error in data listener:', error)
      }
    })
  }
  
  private setStatus(status: StreamingStatus): void {
    if (this.status !== status) {
      this.status = status
      this.statusListeners.forEach(callback => {
        try {
          callback(status)
        } catch (error) {
          console.error('Error in status listener:', error)
        }
      })
    }
  }
  
  private updateMetrics(): void {
    const uptime = Date.now() - this.startTime
    const metrics: StreamingMetrics = {
      totalDataPoints: this.dataBuffer.length,
      dataPointsPerSecond: this.mockDataCounter / (uptime / 1000),
      connectionUptime: uptime,
      lastUpdateTime: new Date(),
      bufferUtilization: (this.dataBuffer.length / this.config.bufferSize) * 100,
      memoryUsage: this.dataBuffer.length * 0.001 // Rough estimate in MB
    }
    
    this.metricsListeners.forEach(callback => {
      try {
        callback(metrics)
      } catch (error) {
        console.error('Error in metrics listener:', error)
      }
    })
  }
  
  // Status and metrics getters
  public getStatus(): StreamingStatus {
    return this.status
  }
  
  public getConfig(): Required<StreamingConfig> {
    return { ...this.config }
  }
  
  public getMetrics(): StreamingMetrics {
    const uptime = Date.now() - this.startTime
    return {
      totalDataPoints: this.dataBuffer.length,
      dataPointsPerSecond: this.mockDataCounter / (uptime / 1000),
      connectionUptime: uptime,
      lastUpdateTime: new Date(),
      bufferUtilization: (this.dataBuffer.length / this.config.bufferSize) * 100,
      memoryUsage: this.dataBuffer.length * 0.001
    }
  }
  
  // Scenario management
  public changeScenario(scenario: DataScenario): void {
    this.config.scenario = scenario
    this.updateScenarioConfig()
    console.log(`Changed to scenario: ${scenario}`)
  }
  
  // Testing utilities
  public simulateDataSpike(duration: number = 2000, multiplier: number = 5): void {
    const originalRate = this.config.dataPointsPerSecond
    this.config.dataPointsPerSecond = originalRate * multiplier
    
    setTimeout(() => {
      this.config.dataPointsPerSecond = originalRate
    }, duration)
  }
  
  public injectTestData(dataPoints: DataPoint[]): void {
    this.addDataPoints(dataPoints)
  }
}

// Singleton instance getter
export function getDataStreamingService(config?: StreamingConfig): DataStreamingService {
  return DataStreamingService.getInstance(config)
}