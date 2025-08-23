import { getRealPerformanceMonitor, formatBytes, formatFps, formatMs } from '../realPerformanceMetrics'

// Mock performance API
const mockPerformance = {
  now: jest.fn(() => Date.now()),
  memory: {
    usedJSHeapSize: 50 * 1024 * 1024, // 50MB
    totalJSHeapSize: 100 * 1024 * 1024, // 100MB
    jsHeapSizeLimit: 2 * 1024 * 1024 * 1024 // 2GB
  }
}

Object.defineProperty(global, 'performance', {
  value: mockPerformance,
  configurable: true,
  writable: true
})

// Mock navigator.connection
Object.defineProperty(global.navigator, 'connection', {
  value: {
    type: 'wifi',
    effectiveType: '4g',
    downlink: 10,
    rtt: 50
  },
  configurable: true,
  writable: true
})

// Mock requestAnimationFrame
global.requestAnimationFrame = jest.fn((cb) => {
  setTimeout(cb, 16)
  return 1
})

global.cancelAnimationFrame = jest.fn()

describe('Real Performance Metrics', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  describe('getRealPerformanceMonitor', () => {
    it('should return a singleton instance', () => {
      const monitor1 = getRealPerformanceMonitor()
      const monitor2 = getRealPerformanceMonitor()
      
      expect(monitor1).toBe(monitor2)
    })

    it('should provide current metrics', () => {
      const monitor = getRealPerformanceMonitor()
      const metrics = monitor.getCurrentMetrics()
      
      expect(metrics).toHaveProperty('currentFps')
      expect(metrics).toHaveProperty('currentMemory')
      expect(metrics).toHaveProperty('browserMemory')
      expect(metrics).toHaveProperty('connectionType')
      expect(metrics).toHaveProperty('effectiveType')
      expect(metrics).toHaveProperty('downlink')
      expect(metrics).toHaveProperty('rtt')
    })

    it('should measure render time', () => {
      const monitor = getRealPerformanceMonitor()
      
      const result = monitor.measureRenderTime(() => {
        // Simulate some work
        let sum = 0
        for (let i = 0; i < 1000; i++) {
          sum += i
        }
        return sum
      })
      
      expect(result).toBe(499500) // Sum of 0 to 999
    })

    it('should provide performance status', () => {
      const monitor = getRealPerformanceMonitor()
      const status = monitor.getPerformanceStatus()
      
      expect(status).toHaveProperty('fps')
      expect(status).toHaveProperty('memory')
      expect(status).toHaveProperty('renderTime')
      expect(status).toHaveProperty('network')
      
      expect(status.fps).toHaveProperty('value')
      expect(status.fps).toHaveProperty('status')
      expect(status.fps).toHaveProperty('color')
    })
  })

  describe('Formatting utilities', () => {
    it('should format bytes correctly', () => {
      expect(formatBytes(0)).toBe('0 B')
      expect(formatBytes(1024)).toBe('1.0 KB')
      expect(formatBytes(1024 * 1024)).toBe('1.0 MB')
      expect(formatBytes(1024 * 1024 * 1024)).toBe('1.0 GB')
    })

    it('should format FPS correctly', () => {
      expect(formatFps(60)).toBe('60 FPS')
      expect(formatFps(59.7)).toBe('60 FPS')
      expect(formatFps(30.2)).toBe('30 FPS')
    })

    it('should format milliseconds correctly', () => {
      expect(formatMs(16.67)).toBe('16.67ms')
      expect(formatMs(0)).toBe('0.00ms')
      expect(formatMs(100.123)).toBe('100.12ms')
    })
  })

  describe('Browser compatibility', () => {
    it('should handle missing performance.memory gracefully', () => {
      const originalMemory = (performance as any).memory
      delete (performance as any).memory
      
      const monitor = getRealPerformanceMonitor()
      const metrics = monitor.getCurrentMetrics()
      
      expect(metrics.browserMemory).toBeNull()
      expect(metrics.currentMemory).toBe(0)
      
      // Restore
      ;(performance as any).memory = originalMemory
    })

    it('should handle missing navigator.connection gracefully', () => {
      const originalConnection = (navigator as any).connection
      delete (navigator as any).connection
      
      const monitor = getRealPerformanceMonitor()
      const metrics = monitor.getCurrentMetrics()
      
      expect(metrics.connectionType).toBe('unknown')
      expect(metrics.effectiveType).toBe('unknown')
      expect(metrics.downlink).toBe(0)
      expect(metrics.rtt).toBe(0)
      
      // Restore
      ;(navigator as any).connection = originalConnection
    })
  })
})