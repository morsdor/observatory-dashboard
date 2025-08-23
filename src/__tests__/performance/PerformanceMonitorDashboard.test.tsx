import React from 'react'
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react'
import '@testing-library/jest-dom'
import { PerformanceMonitorDashboard } from '../../components/performance/PerformanceMonitorDashboard'
import { usePerformanceMonitor } from '../../hooks/usePerformanceMonitor'

// Mock the performance monitor hook
jest.mock('../../hooks/usePerformanceMonitor')
const mockUsePerformanceMonitor = usePerformanceMonitor as jest.MockedFunction<typeof usePerformanceMonitor>

// Mock the performance benchmark
jest.mock('../../utils/performanceBenchmark', () => ({
  PerformanceBenchmark: jest.fn().mockImplementation(() => ({
    benchmarkDataProcessing: jest.fn().mockResolvedValue([
      {
        name: 'Array Filter (10000 items)',
        duration: 100,
        memoryUsed: 1024,
        iterations: 50,
        averageTime: 2,
        minTime: 1,
        maxTime: 5,
        timestamp: new Date()
      }
    ]),
    runComprehensiveBenchmark: jest.fn().mockResolvedValue({
      dataProcessing: [],
      rendering: [],
      memory: [],
      summary: {
        totalTests: 10,
        totalDuration: 1000,
        averageMemoryUsage: 512
      }
    })
  }))
}))

describe('PerformanceMonitorDashboard', () => {
  const mockPerformanceMonitor = {
    start: jest.fn(),
    stop: jest.fn(),
    reset: jest.fn(),
    measureRenderTime: jest.fn(),
    measureAsyncRenderTime: jest.fn(),
    measureNetworkLatency: jest.fn().mockResolvedValue(50),
    triggerMemoryCleanup: jest.fn(),
    currentFps: 60,
    averageFps: 58,
    currentMemory: 45.5,
    peakMemory: 67.2,
    renderTimes: [12.5, 14.2, 16.1],
    networkLatency: 45,
    averageNetworkLatency: 52,
    dataThroughput: 150,
    averageDataThroughput: 125,
    alerts: [],
    clearAlerts: jest.fn(),
    isMonitoring: true
  }

  beforeEach(() => {
    mockUsePerformanceMonitor.mockReturnValue(mockPerformanceMonitor)
    jest.clearAllMocks()
  })

  describe('Component Rendering', () => {
    it('should render performance monitor dashboard', () => {
      render(<PerformanceMonitorDashboard />)
      
      expect(screen.getByText('Performance Monitor')).toBeInTheDocument()
      expect(screen.getByText('Active')).toBeInTheDocument()
    })

    it('should display all performance metrics', () => {
      render(<PerformanceMonitorDashboard />)
      
      // Check FPS metrics
      expect(screen.getByText('Frame Rate')).toBeInTheDocument()
      expect(screen.getByText('60 FPS')).toBeInTheDocument()
      expect(screen.getByText('Excellent')).toBeInTheDocument()
      
      // Check memory metrics
      expect(screen.getByText('Memory Usage')).toBeInTheDocument()
      expect(screen.getByText('45.5 MB')).toBeInTheDocument()
      
      // Check render time metrics
      expect(screen.getByText('Render Time')).toBeInTheDocument()
      expect(screen.getByText('16.10ms')).toBeInTheDocument()
      
      // Check network metrics
      expect(screen.getByText('Network Latency')).toBeInTheDocument()
      expect(screen.getByText('45.00ms')).toBeInTheDocument()
      
      // Check data throughput metrics
      expect(screen.getByText('Data Throughput')).toBeInTheDocument()
      expect(screen.getByText('150')).toBeInTheDocument()
    })

    it('should show inactive status when monitoring is stopped', () => {
      mockUsePerformanceMonitor.mockReturnValue({
        ...mockPerformanceMonitor,
        isMonitoring: false
      })
      
      render(<PerformanceMonitorDashboard />)
      
      expect(screen.getByText('Inactive')).toBeInTheDocument()
    })
  })

  describe('Control Actions', () => {
    it('should start monitoring when start button is clicked', () => {
      mockUsePerformanceMonitor.mockReturnValue({
        ...mockPerformanceMonitor,
        isMonitoring: false
      })
      
      render(<PerformanceMonitorDashboard />)
      
      const startButton = screen.getByRole('button', { name: /start/i })
      fireEvent.click(startButton)
      
      expect(mockPerformanceMonitor.start).toHaveBeenCalled()
    })

    it('should stop monitoring when stop button is clicked', () => {
      render(<PerformanceMonitorDashboard />)
      
      const stopButton = screen.getByRole('button', { name: /stop/i })
      fireEvent.click(stopButton)
      
      expect(mockPerformanceMonitor.stop).toHaveBeenCalled()
    })

    it('should reset metrics when reset button is clicked', () => {
      render(<PerformanceMonitorDashboard />)
      
      const resetButton = screen.getByRole('button', { name: /reset/i })
      fireEvent.click(resetButton)
      
      expect(mockPerformanceMonitor.reset).toHaveBeenCalled()
    })

    it('should trigger memory cleanup when cleanup button is clicked', () => {
      render(<PerformanceMonitorDashboard />)
      
      const cleanupButton = screen.getByRole('button', { name: /trigger cleanup/i })
      fireEvent.click(cleanupButton)
      
      expect(mockPerformanceMonitor.triggerMemoryCleanup).toHaveBeenCalled()
    })

    it('should test network latency when test latency button is clicked', async () => {
      render(<PerformanceMonitorDashboard />)
      
      const testLatencyButton = screen.getByRole('button', { name: /test latency/i })
      fireEvent.click(testLatencyButton)
      
      await waitFor(() => {
        expect(mockPerformanceMonitor.measureNetworkLatency).toHaveBeenCalled()
      })
    })
  })

  describe('Performance Status Indicators', () => {
    it('should show correct FPS status colors', () => {
      // Test excellent FPS (60)
      render(<PerformanceMonitorDashboard />)
      expect(screen.getByText('Excellent')).toHaveClass('text-green-600')
      
      // Test poor FPS
      mockUsePerformanceMonitor.mockReturnValue({
        ...mockPerformanceMonitor,
        currentFps: 25
      })
      
      render(<PerformanceMonitorDashboard />)
      expect(screen.getByText('Poor')).toHaveClass('text-red-600')
    })

    it('should show correct memory status colors', () => {
      // Test low memory usage
      render(<PerformanceMonitorDashboard />)
      expect(screen.getByText('Low')).toHaveClass('text-green-600')
      
      // Test high memory usage
      mockUsePerformanceMonitor.mockReturnValue({
        ...mockPerformanceMonitor,
        currentMemory: 150
      })
      
      render(<PerformanceMonitorDashboard />)
      expect(screen.getByText('High')).toHaveClass('text-orange-600')
    })

    it('should show correct network latency status', () => {
      // Test excellent latency
      render(<PerformanceMonitorDashboard />)
      expect(screen.getByText('Excellent')).toHaveClass('text-green-600')
      
      // Test poor latency
      mockUsePerformanceMonitor.mockReturnValue({
        ...mockPerformanceMonitor,
        networkLatency: 250
      })
      
      render(<PerformanceMonitorDashboard />)
      expect(screen.getByText('Poor')).toHaveClass('text-red-600')
    })
  })

  describe('Benchmarking', () => {
    it('should initialize benchmark functionality', () => {
      render(<PerformanceMonitorDashboard />)
      
      // Should render without errors
      expect(screen.getByText('Performance Monitor')).toBeInTheDocument()
    })
  })

  describe('Alerts Management', () => {
    it('should handle alerts data', () => {
      const alertsData = [
        {
          type: 'fps' as const,
          message: 'Low FPS detected: 25',
          value: 25,
          threshold: 30,
          timestamp: new Date()
        }
      ]
      
      mockUsePerformanceMonitor.mockReturnValue({
        ...mockPerformanceMonitor,
        alerts: alertsData
      })
      
      render(<PerformanceMonitorDashboard />)
      
      // Should render without errors
      expect(screen.getByText('Performance Monitor')).toBeInTheDocument()
    })
  })

  describe('Data Export', () => {
    it('should handle export functionality', () => {
      render(<PerformanceMonitorDashboard />)
      
      // Should render export button
      expect(screen.getByRole('button', { name: /export/i })).toBeInTheDocument()
    })
  })
})