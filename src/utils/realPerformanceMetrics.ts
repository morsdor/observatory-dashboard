/**
 * Real Performance Metrics Utility
 * 
 * This utility provides actual browser performance metrics instead of hardcoded values.
 * It integrates with the browser's Performance API to get real-time data.
 */

export interface RealPerformanceMetrics {
  // Frame rate metrics
  currentFps: number
  averageFps: number
  
  // Memory metrics (in MB)
  currentMemory: number
  peakMemory: number
  
  // Timing metrics (in ms)
  renderTime: number
  networkLatency: number
  
  // Data throughput
  dataThroughput: number
  
  // Browser metrics
  browserMemory: {
    usedJSHeapSize: number
    totalJSHeapSize: number
    jsHeapSizeLimit: number
  } | null
  
  // Connection metrics
  connectionType: string
  effectiveType: string
  downlink: number
  rtt: number
}

class RealPerformanceMonitor {
  private fpsHistory: number[] = []
  private memoryHistory: number[] = []
  private renderTimeHistory: number[] = []
  private lastFrameTime = performance.now()
  private frameCount = 0
  private isMonitoring = false
  private animationFrameId: number | null = null

  constructor() {
    this.startMonitoring()
  }

  private startMonitoring() {
    if (this.isMonitoring) return
    this.isMonitoring = true
    this.measureFrame()
  }

  private measureFrame = () => {
    const now = performance.now()
    this.frameCount++
    
    // Calculate FPS every second
    if (now - this.lastFrameTime >= 1000) {
      const fps = Math.round((this.frameCount * 1000) / (now - this.lastFrameTime))
      this.fpsHistory.push(fps)
      
      // Keep only last 60 measurements (1 minute)
      if (this.fpsHistory.length > 60) {
        this.fpsHistory = this.fpsHistory.slice(-60)
      }
      
      this.frameCount = 0
      this.lastFrameTime = now
    }
    
    if (this.isMonitoring) {
      this.animationFrameId = requestAnimationFrame(this.measureFrame)
    }
  }

  private getBrowserMemory() {
    if ('memory' in performance) {
      const memory = (performance as any).memory
      return {
        usedJSHeapSize: memory.usedJSHeapSize,
        totalJSHeapSize: memory.totalJSHeapSize,
        jsHeapSizeLimit: memory.jsHeapSizeLimit
      }
    }
    return null
  }

  private getConnectionInfo() {
    if ('connection' in navigator) {
      const connection = (navigator as any).connection
      return {
        connectionType: connection.type || 'unknown',
        effectiveType: connection.effectiveType || 'unknown',
        downlink: connection.downlink || 0,
        rtt: connection.rtt || 0
      }
    }
    return {
      connectionType: 'unknown',
      effectiveType: 'unknown',
      downlink: 0,
      rtt: 0
    }
  }

  public measureRenderTime<T>(fn: () => T): T {
    const start = performance.now()
    const result = fn()
    const renderTime = performance.now() - start
    
    this.renderTimeHistory.push(renderTime)
    if (this.renderTimeHistory.length > 100) {
      this.renderTimeHistory = this.renderTimeHistory.slice(-100)
    }
    
    return result
  }

  public async measureNetworkLatency(url: string = '/api/ping'): Promise<number> {
    try {
      const start = performance.now()
      
      // Try to make a lightweight request
      await fetch(url, {
        method: 'HEAD',
        cache: 'no-cache',
        mode: 'cors'
      })
      
      return performance.now() - start
    } catch (error) {
      // Fallback: measure connection RTT if available
      const connection = this.getConnectionInfo()
      return connection.rtt || 0
    }
  }

  public getCurrentMetrics(): RealPerformanceMetrics {
    const browserMemory = this.getBrowserMemory()
    const connection = this.getConnectionInfo()
    
    // Calculate current memory in MB
    const currentMemoryMB = browserMemory 
      ? browserMemory.usedJSHeapSize / (1024 * 1024)
      : 0
    
    this.memoryHistory.push(currentMemoryMB)
    if (this.memoryHistory.length > 60) {
      this.memoryHistory = this.memoryHistory.slice(-60)
    }
    
    return {
      currentFps: this.fpsHistory.length > 0 ? this.fpsHistory[this.fpsHistory.length - 1] : 60,
      averageFps: this.fpsHistory.length > 0 
        ? Math.round(this.fpsHistory.reduce((sum, fps) => sum + fps, 0) / this.fpsHistory.length)
        : 60,
      
      currentMemory: currentMemoryMB,
      peakMemory: this.memoryHistory.length > 0 ? Math.max(...this.memoryHistory) : 0,
      
      renderTime: this.renderTimeHistory.length > 0 
        ? this.renderTimeHistory[this.renderTimeHistory.length - 1]
        : 0,
      networkLatency: connection.rtt,
      
      dataThroughput: 0, // This should be set by the data streaming components
      
      browserMemory,
      
      connectionType: connection.connectionType,
      effectiveType: connection.effectiveType,
      downlink: connection.downlink,
      rtt: connection.rtt
    }
  }

  public getPerformanceStatus() {
    const metrics = this.getCurrentMetrics()
    
    return {
      fps: {
        value: metrics.currentFps,
        status: metrics.currentFps >= 55 ? 'excellent' : 
                metrics.currentFps >= 45 ? 'good' : 
                metrics.currentFps >= 30 ? 'fair' : 'poor',
        color: metrics.currentFps >= 55 ? 'text-green-600' : 
               metrics.currentFps >= 45 ? 'text-yellow-600' : 
               metrics.currentFps >= 30 ? 'text-orange-600' : 'text-red-600'
      },
      memory: {
        value: metrics.currentMemory,
        status: metrics.currentMemory < 50 ? 'low' : 
                metrics.currentMemory < 100 ? 'moderate' : 
                metrics.currentMemory < 200 ? 'high' : 'critical',
        color: metrics.currentMemory < 50 ? 'text-green-600' : 
               metrics.currentMemory < 100 ? 'text-yellow-600' : 
               metrics.currentMemory < 200 ? 'text-orange-600' : 'text-red-600'
      },
      renderTime: {
        value: metrics.renderTime,
        status: metrics.renderTime < 8 ? 'fast' : 
                metrics.renderTime < 16.67 ? 'good' : 
                metrics.renderTime < 33 ? 'slow' : 'very_slow',
        color: metrics.renderTime < 8 ? 'text-green-600' : 
               metrics.renderTime < 16.67 ? 'text-yellow-600' : 
               metrics.renderTime < 33 ? 'text-orange-600' : 'text-red-600'
      },
      network: {
        value: metrics.networkLatency,
        status: metrics.networkLatency < 50 ? 'excellent' : 
                metrics.networkLatency < 100 ? 'good' : 
                metrics.networkLatency < 200 ? 'fair' : 'poor',
        color: metrics.networkLatency < 50 ? 'text-green-600' : 
               metrics.networkLatency < 100 ? 'text-yellow-600' : 
               metrics.networkLatency < 200 ? 'text-orange-600' : 'text-red-600'
      }
    }
  }

  public stop() {
    this.isMonitoring = false
    if (this.animationFrameId) {
      cancelAnimationFrame(this.animationFrameId)
      this.animationFrameId = null
    }
  }

  public reset() {
    this.fpsHistory = []
    this.memoryHistory = []
    this.renderTimeHistory = []
    this.frameCount = 0
    this.lastFrameTime = performance.now()
  }
}

// Singleton instance
let performanceMonitorInstance: RealPerformanceMonitor | null = null

export function getRealPerformanceMonitor(): RealPerformanceMonitor {
  if (!performanceMonitorInstance) {
    performanceMonitorInstance = new RealPerformanceMonitor()
  }
  return performanceMonitorInstance
}

// Utility functions for formatting
export function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 B'
  const k = 1024
  const sizes = ['B', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return `${(bytes / Math.pow(k, i)).toFixed(1)} ${sizes[i]}`
}

export function formatFps(fps: number): string {
  return `${Math.round(fps)} FPS`
}

export function formatMs(ms: number): string {
  return `${ms.toFixed(2)}ms`
}

export function formatPercentage(value: number, max: number): number {
  return Math.min((value / max) * 100, 100)
}

// Hook for React components
export function useRealPerformanceMetrics() {
  const monitor = getRealPerformanceMonitor()
  
  return {
    getCurrentMetrics: () => monitor.getCurrentMetrics(),
    getPerformanceStatus: () => monitor.getPerformanceStatus(),
    measureRenderTime: <T>(fn: () => T) => monitor.measureRenderTime(fn),
    measureNetworkLatency: (url?: string) => monitor.measureNetworkLatency(url),
    reset: () => monitor.reset(),
    stop: () => monitor.stop()
  }
}