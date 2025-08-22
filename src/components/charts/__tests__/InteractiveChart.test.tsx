import React from 'react'
import { render, screen, fireEvent, act } from '@testing-library/react'
import '@testing-library/jest-dom'
import { TimeSeriesChart } from '../TimeSeriesChart'
import { DataPoint } from '@/types'

// Mock D3 with enhanced functionality for interactive features
const mockZoom = {
  scaleExtent: jest.fn().mockReturnThis(),
  on: jest.fn().mockReturnThis(),
  translateExtent: jest.fn().mockReturnThis()
}

const mockSelect = {
  call: jest.fn(),
  on: jest.fn()
}

// Create proper scale function mocks
const createMockScale = (defaultValue: number = 100) => {
  const scaleFn = jest.fn(() => defaultValue)
  scaleFn.domain = jest.fn().mockReturnValue([new Date('2023-01-01T10:00:00Z'), new Date('2023-01-01T12:00:00Z')])
  scaleFn.range = jest.fn().mockReturnThis()
  scaleFn.ticks = jest.fn(() => [new Date('2023-01-01T10:00:00Z'), new Date('2023-01-01T12:00:00Z')])
  scaleFn.invert = jest.fn(() => new Date('2023-01-01T11:00:00Z'))
  return scaleFn
}

const createMockYScale = (defaultValue: number = 200) => {
  const scaleFn = jest.fn(() => defaultValue)
  scaleFn.domain = jest.fn().mockReturnValue([0, 50])
  scaleFn.range = jest.fn().mockReturnThis()
  scaleFn.ticks = jest.fn(() => [0, 25, 50])
  return scaleFn
}

jest.mock('d3', () => ({
  scaleTime: jest.fn(() => createMockScale()),
  scaleLinear: jest.fn(() => createMockYScale()),
  line: jest.fn(() => ({
    x: jest.fn().mockReturnThis(),
    y: jest.fn().mockReturnThis(),
    curve: jest.fn().mockReturnThis()
  })),
  extent: jest.fn(() => [new Date('2023-01-01T10:00:00Z'), new Date('2023-01-01T12:00:00Z')]),
  timeFormat: jest.fn(() => jest.fn(() => '12:00')),
  format: jest.fn(() => jest.fn(() => '10.00')),
  bisector: jest.fn(() => ({
    left: jest.fn(() => 1)
  })),
  curveLinear: 'curveLinear',
  zoom: jest.fn(() => mockZoom),
  zoomIdentity: {
    rescaleX: jest.fn((scale) => scale)
  },
  select: jest.fn(() => mockSelect)
}))

// Enhanced mock canvas context with interactive drawing methods
const mockContext = {
  clearRect: jest.fn(),
  scale: jest.fn(),
  save: jest.fn(),
  restore: jest.fn(),
  translate: jest.fn(),
  beginPath: jest.fn(),
  moveTo: jest.fn(),
  lineTo: jest.fn(),
  stroke: jest.fn(),
  fill: jest.fn(),
  arc: jest.fn(),
  fillText: jest.fn(),
  measureText: jest.fn(() => ({ width: 50 })),
  setLineDash: jest.fn(),
  rect: jest.fn(),
  clip: jest.fn(),
  strokeStyle: '',
  fillStyle: '',
  lineWidth: 1
}

Object.defineProperty(HTMLCanvasElement.prototype, 'getContext', {
  value: jest.fn(() => mockContext)
})

Object.defineProperty(HTMLCanvasElement.prototype, 'getBoundingClientRect', {
  value: jest.fn(() => ({
    left: 0,
    top: 0,
    width: 800,
    height: 400
  }))
})

Object.defineProperty(window, 'devicePixelRatio', {
  value: 1
})

// Mock requestAnimationFrame
global.requestAnimationFrame = jest.fn((cb) => {
  setTimeout(cb, 16)
  return 1
})

global.cancelAnimationFrame = jest.fn()

const createMockDataPoint = (
  id: string,
  timestamp: Date,
  value: number
): DataPoint => ({
  id,
  timestamp,
  value,
  category: 'test',
  metadata: {},
  source: 'test-source'
})

const mockData: DataPoint[] = [
  createMockDataPoint('1', new Date('2023-01-01T10:00:00Z'), 10),
  createMockDataPoint('2', new Date('2023-01-01T11:00:00Z'), 20),
  createMockDataPoint('3', new Date('2023-01-01T12:00:00Z'), 30)
]

describe('Interactive Chart Features', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    // Reset mock scale functions
    mockScale.invert.mockReturnValue(new Date('2023-01-01T11:00:00Z'))
    mockScale.__call = jest.fn((value) => 100) // Mock scale function call
    mockYScale.__call = jest.fn((value) => 200) // Mock y scale function call
  })

  describe('Crosshair functionality', () => {
    it('should draw crosshair when hovering over data point', async () => {
      const onHover = jest.fn()
      
      render(
        <TimeSeriesChart
          data={mockData}
          width={800}
          height={400}
          onHover={onHover}
          showCrosshair={true}
        />
      )

      const canvas = screen.getByRole('img', { hidden: true })
      
      await act(async () => {
        fireEvent.mouseMove(canvas, {
          clientX: 100,
          clientY: 100
        })
      })

      // Should draw crosshair lines
      expect(mockContext.setLineDash).toHaveBeenCalledWith([4, 4])
      expect(mockContext.moveTo).toHaveBeenCalled()
      expect(mockContext.lineTo).toHaveBeenCalled()
      expect(mockContext.stroke).toHaveBeenCalled()
    })

    it('should not draw crosshair when disabled', async () => {
      render(
        <TimeSeriesChart
          data={mockData}
          width={800}
          height={400}
          showCrosshair={false}
        />
      )

      const canvas = screen.getByRole('img', { hidden: true })
      
      await act(async () => {
        fireEvent.mouseMove(canvas, {
          clientX: 100,
          clientY: 100
        })
      })

      // Should not set dash pattern for crosshair
      const dashCalls = mockContext.setLineDash.mock.calls.filter(call => 
        call[0].length > 0 && call[0][0] === 4
      )
      expect(dashCalls).toHaveLength(0)
    })
  })

  describe('Data point highlighting', () => {
    it('should highlight data point on hover', async () => {
      const onHover = jest.fn()
      
      render(
        <TimeSeriesChart
          data={mockData}
          width={800}
          height={400}
          onHover={onHover}
          highlightRadius={6}
        />
      )

      const canvas = screen.getByRole('img', { hidden: true })
      
      await act(async () => {
        fireEvent.mouseMove(canvas, {
          clientX: 100,
          clientY: 100
        })
      })

      // Should draw highlight circles
      expect(mockContext.arc).toHaveBeenCalled()
      expect(mockContext.fill).toHaveBeenCalled()
    })

    it('should use custom highlight radius', async () => {
      const customRadius = 8
      
      render(
        <TimeSeriesChart
          data={mockData}
          width={800}
          height={400}
          highlightRadius={customRadius}
        />
      )

      const canvas = screen.getByRole('img', { hidden: true })
      
      await act(async () => {
        fireEvent.mouseMove(canvas, {
          clientX: 100,
          clientY: 100
        })
      })

      // Should use custom radius in arc calls
      const arcCalls = mockContext.arc.mock.calls
      expect(arcCalls.some(call => call[2] === customRadius + 2)).toBe(true) // Glow
      expect(arcCalls.some(call => call[2] === customRadius)).toBe(true) // Main circle
    })
  })

  describe('Tooltip functionality', () => {
    it('should show tooltip when hovering over data point', async () => {
      render(
        <TimeSeriesChart
          data={mockData}
          width={800}
          height={400}
          showTooltip={true}
        />
      )

      const canvas = screen.getByRole('img', { hidden: true })
      
      await act(async () => {
        fireEvent.mouseMove(canvas, {
          clientX: 100,
          clientY: 100
        })
      })

      // Tooltip should be rendered (check for tooltip content)
      expect(screen.getByText('test')).toBeInTheDocument()
      expect(screen.getByText('test-source')).toBeInTheDocument()
    })

    it('should hide tooltip when not hovering', async () => {
      render(
        <TimeSeriesChart
          data={mockData}
          width={800}
          height={400}
          showTooltip={true}
        />
      )

      const canvas = screen.getByRole('img', { hidden: true })
      
      await act(async () => {
        fireEvent.mouseLeave(canvas)
      })

      // Tooltip should not be visible
      expect(screen.queryByText('test')).not.toBeInTheDocument()
    })

    it('should not show tooltip when disabled', async () => {
      render(
        <TimeSeriesChart
          data={mockData}
          width={800}
          height={400}
          showTooltip={false}
        />
      )

      const canvas = screen.getByRole('img', { hidden: true })
      
      await act(async () => {
        fireEvent.mouseMove(canvas, {
          clientX: 100,
          clientY: 100
        })
      })

      // Tooltip should not be rendered
      expect(screen.queryByText('test')).not.toBeInTheDocument()
    })

    it('should use custom formatters in tooltip', async () => {
      const formatValue = (value: number) => `${value}%`
      const formatTimestamp = (timestamp: Date) => 'Custom Time'
      
      render(
        <TimeSeriesChart
          data={mockData}
          width={800}
          height={400}
          showTooltip={true}
          formatValue={formatValue}
          formatTimestamp={formatTimestamp}
        />
      )

      const canvas = screen.getByRole('img', { hidden: true })
      
      await act(async () => {
        fireEvent.mouseMove(canvas, {
          clientX: 100,
          clientY: 100
        })
      })

      // Should use custom formatters
      expect(screen.getByText('Custom Time')).toBeInTheDocument()
    })
  })

  describe('Performance optimizations', () => {
    it('should use requestAnimationFrame for interactive updates', async () => {
      render(
        <TimeSeriesChart
          data={mockData}
          width={800}
          height={400}
        />
      )

      const canvas = screen.getByRole('img', { hidden: true })
      
      await act(async () => {
        fireEvent.mouseMove(canvas, {
          clientX: 100,
          clientY: 100
        })
      })

      expect(global.requestAnimationFrame).toHaveBeenCalled()
    })

    it('should cancel animation frame on unmount', () => {
      const { unmount } = render(
        <TimeSeriesChart
          data={mockData}
          width={800}
          height={400}
        />
      )

      unmount()

      expect(global.cancelAnimationFrame).toHaveBeenCalled()
    })

    it('should throttle mouse move events', async () => {
      const onHover = jest.fn()
      
      render(
        <TimeSeriesChart
          data={mockData}
          width={800}
          height={400}
          onHover={onHover}
        />
      )

      const canvas = screen.getByRole('img', { hidden: true })
      
      // Rapid mouse movements
      await act(async () => {
        for (let i = 0; i < 10; i++) {
          fireEvent.mouseMove(canvas, {
            clientX: 100 + i,
            clientY: 100 + i
          })
        }
      })

      // Should use requestAnimationFrame to throttle updates
      expect(global.requestAnimationFrame).toHaveBeenCalled()
    })
  })

  describe('Mouse interaction boundaries', () => {
    it('should not trigger hover outside chart area', async () => {
      const onHover = jest.fn()
      
      render(
        <TimeSeriesChart
          data={mockData}
          width={800}
          height={400}
          margin={{ top: 20, right: 30, bottom: 40, left: 50 }}
          onHover={onHover}
        />
      )

      const canvas = screen.getByRole('img', { hidden: true })
      
      await act(async () => {
        // Mouse in left margin
        fireEvent.mouseMove(canvas, {
          clientX: 10,
          clientY: 100
        })
      })

      expect(onHover).toHaveBeenCalledWith(null)
    })

    it('should handle mouse events within chart bounds', async () => {
      const onHover = jest.fn()
      
      render(
        <TimeSeriesChart
          data={mockData}
          width={800}
          height={400}
          margin={{ top: 20, right: 30, bottom: 40, left: 50 }}
          onHover={onHover}
        />
      )

      const canvas = screen.getByRole('img', { hidden: true })
      
      await act(async () => {
        // Mouse within chart area
        fireEvent.mouseMove(canvas, {
          clientX: 100, // Within chart bounds
          clientY: 100
        })
      })

      expect(onHover).toHaveBeenCalled()
      // Should not be called with null for valid position
      expect(onHover).not.toHaveBeenCalledWith(null)
    })
  })

  describe('Data point detection', () => {
    it('should find closest data point within threshold', async () => {
      const onHover = jest.fn()
      
      render(
        <TimeSeriesChart
          data={mockData}
          width={800}
          height={400}
          onHover={onHover}
        />
      )

      const canvas = screen.getByRole('img', { hidden: true })
      
      await act(async () => {
        fireEvent.mouseMove(canvas, {
          clientX: 100,
          clientY: 100
        })
      })

      // Should call onHover with a data point
      expect(onHover).toHaveBeenCalledWith(
        expect.objectContaining({
          id: expect.any(String),
          timestamp: expect.any(Date),
          value: expect.any(Number)
        }),
        expect.any(Object)
      )
    })

    it('should not detect data point when too far away', async () => {
      const onHover = jest.fn()
      
      // Mock distance calculation to return large distance
      const d3 = require('d3')
      d3.bisector.mockReturnValue({
        left: jest.fn(() => 0) // Return first point
      })
      
      render(
        <TimeSeriesChart
          data={mockData}
          width={800}
          height={400}
          onHover={onHover}
        />
      )

      const canvas = screen.getByRole('img', { hidden: true })
      
      await act(async () => {
        // Mouse far from any data point
        fireEvent.mouseMove(canvas, {
          clientX: 50,
          clientY: 50
        })
      })

      // May be called with null if no point is close enough
      const calls = onHover.mock.calls
      const hasNullCall = calls.some(call => call[0] === null)
      expect(hasNullCall).toBe(true)
    })
  })

  describe('Zoom integration with interactions', () => {
    it('should maintain interactions during zoom', async () => {
      const onZoom = jest.fn()
      const onHover = jest.fn()
      
      render(
        <TimeSeriesChart
          data={mockData}
          width={800}
          height={400}
          onZoom={onZoom}
          onHover={onHover}
          enableZoom={true}
        />
      )

      // Simulate zoom event
      const zoomHandler = mockZoom.on.mock.calls.find(call => call[0] === 'zoom')?.[1]
      if (zoomHandler) {
        const mockTransform = { k: 2, x: 100, y: 0, rescaleX: jest.fn(s => s) }
        await act(async () => {
          zoomHandler({ transform: mockTransform })
        })
      }

      const canvas = screen.getByRole('img', { hidden: true })
      
      // Should still handle hover after zoom
      await act(async () => {
        fireEvent.mouseMove(canvas, {
          clientX: 100,
          clientY: 100
        })
      })

      expect(onHover).toHaveBeenCalled()
    })
  })
})