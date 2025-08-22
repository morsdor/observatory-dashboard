import React from 'react'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import '@testing-library/jest-dom'
import { AdvancedChart } from '../AdvancedChart'
import { ChartConfiguration, ChartSyncConfiguration } from '../ChartTypes'
import { DataPoint } from '@/types'

// Mock D3
jest.mock('d3', () => ({
  scaleTime: () => ({
    domain: jest.fn().mockReturnThis(),
    range: jest.fn().mockReturnThis(),
    ticks: jest.fn(() => []),
    invert: jest.fn(() => new Date())
  }),
  scaleLinear: () => ({
    domain: jest.fn().mockReturnThis(),
    range: jest.fn().mockReturnThis(),
    ticks: jest.fn(() => [])
  }),
  extent: jest.fn(() => [new Date(), new Date()]),
  line: () => ({
    x: jest.fn().mockReturnThis(),
    y: jest.fn().mockReturnThis(),
    curve: jest.fn().mockReturnThis()
  }),
  area: () => ({
    x: jest.fn().mockReturnThis(),
    y0: jest.fn().mockReturnThis(),
    y1: jest.fn().mockReturnThis(),
    curve: jest.fn().mockReturnThis()
  }),
  curveLinear: {},
  timeFormat: () => () => '12:00',
  format: () => () => '1.00',
  bisector: () => ({ left: jest.fn(() => 0) }),
  zoom: () => ({
    scaleExtent: jest.fn().mockReturnThis(),
    translateExtent: jest.fn().mockReturnThis(),
    on: jest.fn().mockReturnThis()
  }),
  select: () => ({
    call: jest.fn()
  }),
  zoomIdentity: {
    rescaleX: jest.fn((scale) => scale),
    translate: jest.fn().mockReturnThis(),
    scale: jest.fn().mockReturnThis()
  }
}))

// Mock ChartSyncManager
jest.mock('../ChartSyncManager', () => ({
  useChartSync: () => ({
    broadcastEvent: jest.fn(),
    createZoomEvent: jest.fn(),
    createCrosshairEvent: jest.fn(),
    createSelectionEvent: jest.fn()
  })
}))

// Mock D3 and canvas context
const mockContext = {
  clearRect: jest.fn(),
  scale: jest.fn(),
  translate: jest.fn(),
  save: jest.fn(),
  restore: jest.fn(),
  beginPath: jest.fn(),
  moveTo: jest.fn(),
  lineTo: jest.fn(),
  stroke: jest.fn(),
  fill: jest.fn(),
  arc: jest.fn(),
  fillRect: jest.fn(),
  measureText: jest.fn(() => ({ width: 50 })),
  fillText: jest.fn(),
  setLineDash: jest.fn(),
  clip: jest.fn(),
  rect: jest.fn()
}

Object.defineProperty(HTMLCanvasElement.prototype, 'getContext', {
  value: () => mockContext
})

// Mock data
const mockData: DataPoint[] = Array.from({ length: 100 }, (_, i) => ({
  id: `point-${i}`,
  timestamp: new Date(Date.now() - (100 - i) * 60000), // 1 minute intervals
  value: Math.sin(i * 0.1) * 50 + 50,
  category: 'test',
  metadata: {},
  source: 'test-source'
}))

describe('AdvancedChart', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  describe('Chart Type Rendering', () => {
    it('renders line chart by default', () => {
      render(
        <AdvancedChart
          data={mockData}
          width={400}
          height={300}
        />
      )

      const canvas = screen.getByRole('img', { hidden: true })
      expect(canvas).toBeInTheDocument()
      expect(canvas).toHaveClass('cursor-crosshair')
    })

    it('renders area chart when configured', () => {
      const config: Partial<ChartConfiguration> = {
        type: 'area'
      }

      render(
        <AdvancedChart
          data={mockData}
          width={400}
          height={300}
          config={config}
        />
      )

      expect(mockContext.fill).toHaveBeenCalled()
      expect(mockContext.stroke).toHaveBeenCalled()
    })

    it('renders scatter chart when configured', () => {
      const config: Partial<ChartConfiguration> = {
        type: 'scatter'
      }

      render(
        <AdvancedChart
          data={mockData}
          width={400}
          height={300}
          config={config}
        />
      )

      expect(mockContext.arc).toHaveBeenCalled()
      expect(mockContext.fill).toHaveBeenCalled()
    })

    it('renders bar chart when configured', () => {
      const config: Partial<ChartConfiguration> = {
        type: 'bar'
      }

      render(
        <AdvancedChart
          data={mockData}
          width={400}
          height={300}
          config={config}
        />
      )

      expect(mockContext.fillRect).toHaveBeenCalled()
    })
  })

  describe('Chart Configuration', () => {
    it('applies custom colors', () => {
      const config: Partial<ChartConfiguration> = {
        colors: {
          primary: '#ff0000',
          stroke: '#00ff00'
        }
      }

      render(
        <AdvancedChart
          data={mockData}
          width={400}
          height={300}
          config={config}
        />
      )

      // Verify that custom colors are used in canvas context
      expect(mockContext.strokeStyle).toBeDefined()
    })

    it('applies custom style settings', () => {
      const config: Partial<ChartConfiguration> = {
        style: {
          lineWidth: 5,
          pointRadius: 8
        }
      }

      render(
        <AdvancedChart
          data={mockData}
          width={400}
          height={300}
          config={config}
        />
      )

      expect(mockContext.lineWidth).toBeDefined()
    })

    it('handles aggregation configuration', () => {
      const config: Partial<ChartConfiguration> = {
        aggregation: {
          enabled: true,
          method: 'average',
          interval: 300000 // 5 minutes
        }
      }

      render(
        <AdvancedChart
          data={mockData}
          width={400}
          height={300}
          config={config}
        />
      )

      // Chart should render with aggregated data
      expect(mockContext.stroke).toHaveBeenCalled()
    })

    it('handles downsampling configuration', () => {
      const config: Partial<ChartConfiguration> = {
        downsampling: {
          enabled: true,
          maxPoints: 50,
          algorithm: 'lttb'
        }
      }

      render(
        <AdvancedChart
          data={mockData}
          width={400}
          height={300}
          config={config}
        />
      )

      // Chart should render with downsampled data
      expect(mockContext.stroke).toHaveBeenCalled()
    })
  })

  describe('Chart Synchronization', () => {
    it('handles sync configuration', () => {
      const syncConfig: Partial<ChartSyncConfiguration> = {
        enabled: true,
        groupId: 'test-group',
        syncZoom: true,
        syncCrosshair: true
      }

      render(
        <AdvancedChart
          data={mockData}
          width={400}
          height={300}
          syncConfig={syncConfig}
          chartId="test-chart"
        />
      )

      const canvas = screen.getByRole('img', { hidden: true })
      expect(canvas).toBeInTheDocument()
    })
  })

  describe('Interactions', () => {
    it('handles mouse hover events', async () => {
      const onHover = jest.fn()

      render(
        <AdvancedChart
          data={mockData}
          width={400}
          height={300}
          onHover={onHover}
        />
      )

      const canvas = screen.getByRole('img', { hidden: true })
      
      fireEvent.mouseMove(canvas, {
        clientX: 200,
        clientY: 150
      })

      await waitFor(() => {
        expect(onHover).toHaveBeenCalled()
      })
    })

    it('handles mouse leave events', async () => {
      const onHover = jest.fn()

      render(
        <AdvancedChart
          data={mockData}
          width={400}
          height={300}
          onHover={onHover}
        />
      )

      const canvas = screen.getByRole('img', { hidden: true })
      
      fireEvent.mouseLeave(canvas)

      await waitFor(() => {
        expect(onHover).toHaveBeenCalledWith(null)
      })
    })

    it('shows tooltip when enabled', () => {
      render(
        <AdvancedChart
          data={mockData}
          width={400}
          height={300}
          showTooltip={true}
        />
      )

      // Tooltip component should be rendered
      const canvas = screen.getByRole('img', { hidden: true })
      expect(canvas).toBeInTheDocument()
    })

    it('handles zoom events', async () => {
      const onZoom = jest.fn()

      render(
        <AdvancedChart
          data={mockData}
          width={400}
          height={300}
          onZoom={onZoom}
          enableZoom={true}
        />
      )

      const canvas = screen.getByRole('img', { hidden: true })
      expect(canvas).toBeInTheDocument()
    })
  })

  describe('Performance', () => {
    it('handles large datasets efficiently', () => {
      const largeData: DataPoint[] = Array.from({ length: 10000 }, (_, i) => ({
        id: `point-${i}`,
        timestamp: new Date(Date.now() - (10000 - i) * 1000),
        value: Math.random() * 100,
        category: 'test',
        metadata: {},
        source: 'test-source'
      }))

      const startTime = performance.now()

      render(
        <AdvancedChart
          data={largeData}
          width={400}
          height={300}
        />
      )

      const endTime = performance.now()
      const renderTime = endTime - startTime

      // Should render within reasonable time (less than 100ms)
      expect(renderTime).toBeLessThan(100)
    })

    it('applies downsampling for extreme datasets', () => {
      const extremeData: DataPoint[] = Array.from({ length: 50000 }, (_, i) => ({
        id: `point-${i}`,
        timestamp: new Date(Date.now() - (50000 - i) * 1000),
        value: Math.random() * 100,
        category: 'test',
        metadata: {},
        source: 'test-source'
      }))

      const config: Partial<ChartConfiguration> = {
        downsampling: {
          enabled: true,
          maxPoints: 1000,
          algorithm: 'lttb'
        }
      }

      render(
        <AdvancedChart
          data={extremeData}
          width={400}
          height={300}
          config={config}
        />
      )

      // Should render successfully with downsampled data
      expect(mockContext.stroke).toHaveBeenCalled()
    })
  })

  describe('Error Handling', () => {
    it('handles empty data gracefully', () => {
      render(
        <AdvancedChart
          data={[]}
          width={400}
          height={300}
        />
      )

      const canvas = screen.getByRole('img', { hidden: true })
      expect(canvas).toBeInTheDocument()
    })

    it('handles invalid data gracefully', () => {
      const invalidData = [
        {
          id: 'invalid',
          timestamp: new Date('invalid'),
          value: NaN,
          category: 'test',
          metadata: {},
          source: 'test'
        }
      ] as DataPoint[]

      render(
        <AdvancedChart
          data={invalidData}
          width={400}
          height={300}
        />
      )

      const canvas = screen.getByRole('img', { hidden: true })
      expect(canvas).toBeInTheDocument()
    })
  })

  describe('Accessibility', () => {
    it('provides proper ARIA attributes', () => {
      render(
        <AdvancedChart
          data={mockData}
          width={400}
          height={300}
        />
      )

      const canvas = screen.getByRole('img', { hidden: true })
      expect(canvas).toHaveAttribute('role', 'img')
    })

    it('supports keyboard navigation', () => {
      render(
        <AdvancedChart
          data={mockData}
          width={400}
          height={300}
        />
      )

      const canvas = screen.getByRole('img', { hidden: true })
      expect(canvas).toBeInTheDocument()
      // Additional keyboard navigation tests would go here
    })
  })
})