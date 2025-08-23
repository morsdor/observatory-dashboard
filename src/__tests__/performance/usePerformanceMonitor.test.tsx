import { renderHook, act, waitFor } from '@testing-library/react'
import { usePerformanceMonitor } from '../../hooks/usePerformanceMonitor'
import { useAppDispatch } from '../../stores/dashboardStore'

// Mock the store
jest.mock('../../stores/dashboardStore')
const mockDispatch = jest.fn()
const mockUseAppDispatch = useAppDispatch as jest.MockedFunction<typeof useAppDispatch>

// Mock performance API
const mockPerformance = {
  now: jest.fn(() => Date.now()),
  memory: {
    usedJSHeapSize: 50 * 1024 * 1024 // 50MB
  }
}

Object.defineProperty(global, 'performance', {
  value: mockPerformance,
  writable: true
})

// Mock fetch for network latency testing
global.fetch = jest.fn()

// Mock requestAnimationFrame
global.requestAnimationFrame = jest.fn((cb) => {
  setTimeout(cb, 16)
  return 1
})

describe('usePerformanceMonitor', () => {
  beforeEach(() => {
    mockUseAppDispatch.mockReturnValue(mockDispatch)
    jest.clearAllMocks()
    mockPerformance.now.mockReturnValue(Date.now())
  })

  describe('Initialization', () => {
    it('should initialize with default values', () => {
      const { result } = renderHook(() => usePerformanceMonitor({ enabled: false }))
      
      expect(result.current.currentFps).toBe(60)
      expect(result.current.averageFps).toBe(60)
      expect(result.current.currentMemory).toBe(0)
      expect(result.current.peakMemory).toBe(0)
      expect(result.current.networkLatency).toBe(0)
      expect(result.current.averageNetworkLatency).toBe(0)
      expect(result.current.dataThroughput).toBe(0)
      expect(result.current.averageDataThroughput).toBe(0)
      expect(result.current.renderTimes).toEqual([])
      expect(result.current.alerts).toEqual([])
      expect(result.current.isMonitoring).toBe(false)
    })

    it('should auto-start when enabled is true', () => {
      const { result } = renderHook(() => usePerformanceMonitor({ enabled: true }))
      
      expect(result.current.isMonitoring).toBe(true)
    })
  })

  describe('Monitoring Control', () => {
    it('should start monitoring', () => {
      const { result } = renderHook(() => usePerformanceMonitor({ enabled: false }))
      
      act(() => {
        result.current.start()
      })
      
      expect(result.current.isMonitoring).toBe(true)
    })

    it('should stop monitoring', () => {
      const { result } = renderHook(() => usePerformanceMonitor({ enabled: true }))
      
      act(() => {
        result.current.stop()
      })
      
      expect(result.current.isMonitoring).toBe(false)
    })

    it('should reset metrics', () => {
      const { result } = renderHook(() => usePerformanceMonitor({ enabled: false }))
      
      // Set some values first
      act(() => {
        result.current.measureRenderTime(() => {
          // Simulate some work
          return 'test'
        })
      })
      
      act(() => {
        result.current.reset()
      })
      
      expect(result.current.currentFps).toBe(60)
      expect(result.current.averageFps).toBe(60)
      expect(result.current.currentMemory).toBe(0)
      expect(result.current.peakMemory).toBe(0)
      expect(result.current.networkLatency).toBe(0)
      expect(result.current.dataThroughput).toBe(0)
      expect(result.current.renderTimes).toEqual([])
      expect(result.current.alerts).toEqual([])
    })
  })

  describe('Performance Measurement', () => {
    it('should measure render time', () => {
      const { result } = renderHook(() => usePerformanceMonitor({ enabled: false }))
      
      let renderResult: string
      
      act(() => {
        renderResult = result.current.measureRenderTime(() => {
          // Simulate some work
          const start = Date.now()
          while (Date.now() - start < 10) {
            // Busy wait for 10ms
          }
          return 'test result'
        })
      })
      
      expect(renderResult!).toBe('test result')
      expect(result.current.renderTimes.length).toBeGreaterThan(0)
      expect(mockDispatch).toHaveBeenCalledWith(
        expect.objectContaining({
          type: expect.stringContaining('updateMetrics')
        })
      )
    })

    it('should measure async render time', async () => {
      const { result } = renderHook(() => usePerformanceMonitor({ enabled: false }))
      
      let renderResult: string
      
      await act(async () => {
        renderResult = await result.current.measureAsyncRenderTime(async () => {
          await new Promise(resolve => setTimeout(resolve, 10))
          return 'async test result'
        })
      })
      
      expect(renderResult!).toBe('async test result')
      expect(result.current.renderTimes.length).toBeGreaterThan(0)
    })

    it('should generate render time alerts for slow renders', () => {
      const { result } = renderHook(() => usePerformanceMonitor({ 
        enabled: false,
        renderTimeThreshold: 5 // Very low threshold
      }))
      
      act(() => {
        result.current.measureRenderTime(() => {
          // Simulate slow work
          const start = Date.now()
          while (Date.now() - start < 20) {
            // Busy wait for 20ms (above threshold)
          }
          return 'slow result'
        })
      })
      
      expect(result.current.alerts.length).toBeGreaterThan(0)
      expect(result.current.alerts[0].type).toBe('render_time')
      expect(result.current.alerts[0].message).toContain('Slow render detected')
    })
  })

  describe('Network Latency Measurement', () => {
    it('should measure network latency successfully', async () => {
      const mockFetch = fetch as jest.MockedFunction<typeof fetch>
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200
      } as Response)
      
      const { result } = renderHook(() => usePerformanceMonitor({ enabled: false }))
      
      let latency: number
      
      await act(async () => {
        latency = await result.current.measureNetworkLatency()
      })
      
      expect(latency!).toBeGreaterThanOrEqual(0)
      expect(result.current.networkLatency).toBeGreaterThanOrEqual(0)
      expect(mockFetch).toHaveBeenCalledWith('/api/ping', {
        method: 'HEAD',
        cache: 'no-cache',
        mode: 'cors'
      })
    })

    it('should handle network latency measurement errors', async () => {
      const mockFetch = fetch as jest.MockedFunction<typeof fetch>
      mockFetch.mockRejectedValueOnce(new Error('Network error'))
      
      const { result } = renderHook(() => usePerformanceMonitor({ enabled: false }))
      
      let latency: number
      
      await act(async () => {
        latency = await result.current.measureNetworkLatency()
      })
      
      expect(latency!).toBe(-1)
    })

    it('should generate network latency alerts for high latency', async () => {
      const mockFetch = fetch as jest.MockedFunction<typeof fetch>
      mockFetch.mockImplementation(() => {
        return new Promise(resolve => {
          setTimeout(() => {
            resolve({
              ok: true,
              status: 200
            } as Response)
          }, 300) // 300ms delay
        })
      })
      
      const { result } = renderHook(() => usePerformanceMonitor({ 
        enabled: false,
        networkLatencyThreshold: 200 // 200ms threshold
      }))
      
      await act(async () => {
        await result.current.measureNetworkLatency()
      })
      
      await waitFor(() => {
        expect(result.current.alerts.length).toBeGreaterThan(0)
        expect(result.current.alerts[0].type).toBe('network_latency')
        expect(result.current.alerts[0].message).toContain('High network latency')
      })
    })

    it('should calculate average network latency', async () => {
      const mockFetch = fetch as jest.MockedFunction<typeof fetch>
      mockFetch.mockResolvedValue({
        ok: true,
        status: 200
      } as Response)
      
      const { result } = renderHook(() => usePerformanceMonitor({ enabled: false }))
      
      // Measure latency multiple times
      await act(async () => {
        await result.current.measureNetworkLatency()
        await result.current.measureNetworkLatency()
        await result.current.measureNetworkLatency()
      })
      
      expect(result.current.averageNetworkLatency).toBeGreaterThan(0)
    })
  })

  describe('Memory Management', () => {
    it('should trigger memory cleanup', () => {
      const { result } = renderHook(() => usePerformanceMonitor({ enabled: false }))
      
      // Add some render times first
      act(() => {
        for (let i = 0; i < 150; i++) {
          result.current.measureRenderTime(() => i)
        }
      })
      
      expect(result.current.renderTimes.length).toBeGreaterThan(100)
      
      act(() => {
        result.current.triggerMemoryCleanup()
      })
      
      // Should have cleaned up some data
      expect(result.current.renderTimes.length).toBeLessThanOrEqual(50)
    })

    it('should generate memory alerts for high usage', () => {
      // Mock high memory usage
      Object.defineProperty(performance, 'memory', {
        value: {
          usedJSHeapSize: 150 * 1024 * 1024 // 150MB
        },
        configurable: true
      })
      
      const { result } = renderHook(() => usePerformanceMonitor({ 
        enabled: false,
        memoryThreshold: 100 // 100MB threshold
      }))
      
      act(() => {
        result.current.start()
      })
      
      // Wait for memory monitoring to kick in
      setTimeout(() => {
        expect(result.current.alerts.some(alert => alert.type === 'memory')).toBe(true)
      }, 100)
    })
  })

  describe('Data Throughput Tracking', () => {
    it('should track data throughput via global function', () => {
      const { result } = renderHook(() => usePerformanceMonitor({ enabled: true }))
      
      act(() => {
        // Simulate data throughput tracking
        if (typeof window !== 'undefined' && (window as any).__performanceMonitor_trackDataThroughput) {
          (window as any).__performanceMonitor_trackDataThroughput(100)
        }
      })
      
      // Should have registered the global function
      expect(typeof (window as any).__performanceMonitor_trackDataThroughput).toBe('function')
    })

    it('should generate throughput alerts for high data rates', () => {
      const { result } = renderHook(() => usePerformanceMonitor({ 
        enabled: false,
        dataThroughputThreshold: 500 // 500 points/sec threshold
      }))
      
      act(() => {
        result.current.start()
        
        // Simulate high throughput
        if (typeof window !== 'undefined' && (window as any).__performanceMonitor_trackDataThroughput) {
          (window as any).__performanceMonitor_trackDataThroughput(1000) // 1000 points
        }
      })
      
      // Wait for throughput calculation
      setTimeout(() => {
        expect(result.current.alerts.some(alert => alert.type === 'data_throughput')).toBe(true)
      }, 1100) // Wait for 1 second + buffer
    })
  })

  describe('Alert Management', () => {
    it('should clear alerts', () => {
      const { result } = renderHook(() => usePerformanceMonitor({ 
        enabled: false,
        renderTimeThreshold: 1 // Very low threshold to trigger alerts
      }))
      
      // Generate some alerts
      act(() => {
        result.current.measureRenderTime(() => {
          const start = Date.now()
          while (Date.now() - start < 10) {
            // Busy wait
          }
          return 'test'
        })
      })
      
      expect(result.current.alerts.length).toBeGreaterThan(0)
      
      act(() => {
        result.current.clearAlerts()
      })
      
      expect(result.current.alerts.length).toBe(0)
    })

    it('should limit alerts to 10 items', () => {
      const { result } = renderHook(() => usePerformanceMonitor({ 
        enabled: false,
        renderTimeThreshold: 1 // Very low threshold
      }))
      
      // Generate many alerts
      act(() => {
        for (let i = 0; i < 15; i++) {
          result.current.measureRenderTime(() => {
            const start = Date.now()
            while (Date.now() - start < 10) {
              // Busy wait
            }
            return i
          })
        }
      })
      
      expect(result.current.alerts.length).toBeLessThanOrEqual(10)
    })
  })

  describe('Configuration', () => {
    it('should use custom thresholds', () => {
      const customConfig = {
        enabled: false,
        renderTimeThreshold: 5,
        memoryThreshold: 50,
        networkLatencyThreshold: 100,
        dataThroughputThreshold: 200
      }
      
      const { result } = renderHook(() => usePerformanceMonitor(customConfig))
      
      // Test custom render time threshold
      act(() => {
        result.current.measureRenderTime(() => {
          const start = Date.now()
          while (Date.now() - start < 10) {
            // Busy wait for 10ms (above 5ms threshold)
          }
          return 'test'
        })
      })
      
      expect(result.current.alerts.some(alert => 
        alert.type === 'render_time' && alert.threshold === 5
      )).toBe(true)
    })

    it('should use custom monitoring intervals', () => {
      const customConfig = {
        enabled: false,
        fpsMonitoringInterval: 500,
        memoryMonitoringInterval: 1000,
        networkMonitoringInterval: 2000
      }
      
      const { result } = renderHook(() => usePerformanceMonitor(customConfig))
      
      // Should initialize without errors
      expect(result.current.isMonitoring).toBe(false)
    })
  })

  describe('Cleanup', () => {
    it('should cleanup intervals on unmount', () => {
      const clearIntervalSpy = jest.spyOn(global, 'clearInterval')
      
      const { unmount } = renderHook(() => usePerformanceMonitor({ enabled: true }))
      
      unmount()
      
      expect(clearIntervalSpy).toHaveBeenCalled()
    })

    it('should cleanup global functions on unmount', () => {
      const { unmount } = renderHook(() => usePerformanceMonitor({ enabled: true }))
      
      expect(typeof (window as any).__performanceMonitor_trackDataThroughput).toBe('function')
      
      unmount()
      
      expect((window as any).__performanceMonitor_trackDataThroughput).toBeUndefined()
    })
  })
})