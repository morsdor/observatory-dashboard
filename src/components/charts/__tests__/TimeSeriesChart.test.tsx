import React from 'react'
import { render, screen, fireEvent } from '@testing-library/react'
import '@testing-library/jest-dom'
import { TimeSeriesChart } from '../TimeSeriesChart'
import { DataPoint } from '@/types'

// Mock D3
const mockZoom = {
  scaleExtent: jest.fn().mockReturnThis(),
  on: jest.fn().mockReturnThis(),
  translateExtent: jest.fn().mockReturnThis()
}

const mockSelect = {
  call: jest.fn(),
  on: jest.fn()
}

const mockLine = {
  x: jest.fn().mockReturnThis(),
  y: jest.fn().mockReturnThis(),
  curve: jest.fn().mockReturnThis()
}

// Create proper scale function mocks
const createMockTimeScale = () => {
  const scaleFn = jest.fn(() => 100)
  scaleFn.domain = jest.fn().mockReturnValue([new Date('2023-01-01T10:00:00Z'), new Date('2023-01-01T12:00:00Z')])
  scaleFn.range = jest.fn().mockReturnThis()
  scaleFn.ticks = jest.fn(() => [new Date('2023-01-01T10:00:00Z'), new Date('2023-01-01T12:00:00Z')])
  scaleFn.invert = jest.fn(() => new Date('2023-01-01T11:00:00Z'))
  return scaleFn
}

const createMockLinearScale = () => {
  const scaleFn = jest.fn(() => 200)
  scaleFn.domain = jest.fn().mockReturnValue([0, 50])
  scaleFn.range = jest.fn().mockReturnThis()
  scaleFn.ticks = jest.fn(() => [0, 25, 50])
  return scaleFn
}

jest.mock('d3', () => ({
  scaleTime: jest.fn(() => createMockTimeScale()),
  scaleLinear: jest.fn(() => createMockLinearScale()),
  line: jest.fn(() => mockLine),
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

// Mock canvas context with all required properties
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
  strokeStyle: '#3b82f6',
  fillStyle: '#ffffff',
  lineWidth: 2
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

describe('TimeSeriesChart', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('should render canvas element', () => {
    render(
      <TimeSeriesChart
        data={mockData}
        width={800}
        height={400}
      />
    )

    const canvas = screen.getByRole('img', { hidden: true })
    expect(canvas).toBeInTheDocument()
    expect(canvas).toHaveClass('cursor-crosshair')
  })

  it('should enable zoom by default', () => {
    render(
      <TimeSeriesChart
        data={mockData}
        width={800}
        height={400}
      />
    )

    // Should set up zoom behavior
    expect(mockZoom.scaleExtent).toHaveBeenCalledWith([0.1, 10])
    expect(mockZoom.on).toHaveBeenCalledWith('zoom', expect.any(Function))
    expect(mockSelect.call).toHaveBeenCalledWith(mockZoom)
  })

  it('should disable zoom when enableZoom is false', () => {
    render(
      <TimeSeriesChart
        data={mockData}
        width={800}
        height={400}
        enableZoom={false}
        enablePan={false}
      />
    )

    // Should not set up zoom behavior
    expect(mockSelect.call).not.toHaveBeenCalled()
  })

  it('should use custom zoom extent', () => {
    render(
      <TimeSeriesChart
        data={mockData}
        width={800}
        height={400}
        zoomExtent={[0.5, 5]}
      />
    )

    expect(mockZoom.scaleExtent).toHaveBeenCalledWith([0.5, 5])
  })

  it('should call onZoom when zoom event occurs', () => {
    const onZoom = jest.fn()
    
    render(
      <TimeSeriesChart
        data={mockData}
        width={800}
        height={400}
        onZoom={onZoom}
      />
    )

    // Simulate zoom event
    const zoomHandler = mockZoom.on.mock.calls.find(call => call[0] === 'zoom')?.[1]
    if (zoomHandler) {
      const mockTransform = { k: 2, x: 100, y: 0 }
      zoomHandler({ transform: mockTransform })
      expect(onZoom).toHaveBeenCalledWith(mockTransform)
    }
  })

  it('should draw grid when showGrid is true', () => {
    render(
      <TimeSeriesChart
        data={mockData}
        width={800}
        height={400}
        showGrid={true}
      />
    )

    // Should set line dash for grid
    expect(mockContext.setLineDash).toHaveBeenCalledWith([2, 2])
    expect(mockContext.setLineDash).toHaveBeenCalledWith([])
  })

  it('should not draw grid when showGrid is false', () => {
    render(
      <TimeSeriesChart
        data={mockData}
        width={800}
        height={400}
        showGrid={false}
      />
    )

    // Should not set line dash for grid (only called once for reset)
    const lineDashCalls = mockContext.setLineDash.mock.calls
    expect(lineDashCalls.filter(call => call[0].length > 0)).toHaveLength(0)
  })

  it('should use custom line color and width', () => {
    render(
      <TimeSeriesChart
        data={mockData}
        width={800}
        height={400}
        lineColor="#ff0000"
        lineWidth={3}
      />
    )

    // Should set custom stroke style and line width
    expect(mockContext.strokeStyle).toBe('#ff0000')
    expect(mockContext.lineWidth).toBe(3)
  })

  it('should handle mouse hover events', () => {
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
    
    // Mouse move within chart area
    fireEvent.mouseMove(canvas, {
      clientX: 100,
      clientY: 100
    })

    expect(onHover).toHaveBeenCalled()
  })

  it('should handle mouse move outside chart area', () => {
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
    
    // Mouse move outside chart area (in margin)
    fireEvent.mouseMove(canvas, {
      clientX: 10, // Within left margin
      clientY: 100
    })

    expect(onHover).toHaveBeenCalledWith(null)
  })

  it('should handle mouse leave events', () => {
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
    
    fireEvent.mouseLeave(canvas)

    expect(onHover).toHaveBeenCalledWith(null)
  })

  it('should apply clipping to chart area', () => {
    render(
      <TimeSeriesChart
        data={mockData}
        width={800}
        height={400}
      />
    )

    // Should create clipping region
    expect(mockContext.rect).toHaveBeenCalled()
    expect(mockContext.clip).toHaveBeenCalled()
  })

  it('should handle empty data gracefully', () => {
    render(
      <TimeSeriesChart
        data={[]}
        width={800}
        height={400}
      />
    )

    const canvas = screen.getByRole('img', { hidden: true })
    expect(canvas).toBeInTheDocument()
    
    // Should still render axes
    expect(mockContext.stroke).toHaveBeenCalled()
  })

  it('should restrict pan when enablePan is false', () => {
    render(
      <TimeSeriesChart
        data={mockData}
        width={800}
        height={400}
        enablePan={false}
      />
    )

    // Should set translate extent to restrict panning
    expect(mockZoom.translateExtent).toHaveBeenCalled()
  })

  it('should cleanup zoom behavior on unmount', () => {
    const { unmount } = render(
      <TimeSeriesChart
        data={mockData}
        width={800}
        height={400}
      />
    )

    unmount()

    // Should remove zoom event listeners
    expect(mockSelect.on).toHaveBeenCalledWith('.zoom', null)
  })

  it('should re-render when data changes', () => {
    const { rerender } = render(
      <TimeSeriesChart
        data={mockData}
        width={800}
        height={400}
      />
    )

    const initialCallCount = mockContext.clearRect.mock.calls.length

    const newData = [
      ...mockData,
      createMockDataPoint('4', new Date('2023-01-01T13:00:00Z'), 40)
    ]

    rerender(
      <TimeSeriesChart
        data={newData}
        width={800}
        height={400}
      />
    )

    expect(mockContext.clearRect.mock.calls.length).toBeGreaterThan(initialCallCount)
  })

  it('should format axis labels correctly', () => {
    render(
      <TimeSeriesChart
        data={mockData}
        width={800}
        height={400}
      />
    )

    // Should call fillText for axis labels
    expect(mockContext.fillText).toHaveBeenCalled()
    
    // Check that time and number formatting functions were called
    const d3 = require('d3')
    expect(d3.timeFormat).toHaveBeenCalledWith('%H:%M')
    expect(d3.format).toHaveBeenCalledWith('.2f')
  })

  describe('Interactive Features', () => {
    it('should show crosshair by default', () => {
      render(
        <TimeSeriesChart
          data={mockData}
          width={800}
          height={400}
          showCrosshair={true}
        />
      )

      const canvas = screen.getByRole('img', { hidden: true })
      
      fireEvent.mouseMove(canvas, {
        clientX: 100,
        clientY: 100
      })

      // Should draw crosshair lines
      expect(mockContext.setLineDash).toHaveBeenCalledWith([4, 4])
    })

    it('should hide crosshair when disabled', () => {
      render(
        <TimeSeriesChart
          data={mockData}
          width={800}
          height={400}
          showCrosshair={false}
        />
      )

      const canvas = screen.getByRole('img', { hidden: true })
      
      fireEvent.mouseMove(canvas, {
        clientX: 100,
        clientY: 100
      })

      // Should not draw crosshair
      const dashCalls = mockContext.setLineDash.mock.calls.filter(call => 
        call[0].length > 0 && call[0][0] === 4
      )
      expect(dashCalls).toHaveLength(0)
    })

    it('should highlight data points on hover', () => {
      render(
        <TimeSeriesChart
          data={mockData}
          width={800}
          height={400}
          highlightRadius={6}
        />
      )

      const canvas = screen.getByRole('img', { hidden: true })
      
      fireEvent.mouseMove(canvas, {
        clientX: 100,
        clientY: 100
      })

      // Should draw highlight circles
      expect(mockContext.arc).toHaveBeenCalled()
      expect(mockContext.fill).toHaveBeenCalled()
    })

    it('should show tooltip by default', () => {
      render(
        <TimeSeriesChart
          data={mockData}
          width={800}
          height={400}
          showTooltip={true}
        />
      )

      const canvas = screen.getByRole('img', { hidden: true })
      
      fireEvent.mouseMove(canvas, {
        clientX: 100,
        clientY: 100
      })

      // Should render tooltip content
      expect(screen.getByText('test')).toBeInTheDocument()
    })

    it('should hide tooltip when disabled', () => {
      render(
        <TimeSeriesChart
          data={mockData}
          width={800}
          height={400}
          showTooltip={false}
        />
      )

      const canvas = screen.getByRole('img', { hidden: true })
      
      fireEvent.mouseMove(canvas, {
        clientX: 100,
        clientY: 100
      })

      // Should not render tooltip
      expect(screen.queryByText('test')).not.toBeInTheDocument()
    })

    it('should use custom formatters', () => {
      const formatValue = (value: number) => `${value}%`
      const formatTimestamp = (timestamp: Date) => 'Custom Time'
      
      render(
        <TimeSeriesChart
          data={mockData}
          width={800}
          height={400}
          formatValue={formatValue}
          formatTimestamp={formatTimestamp}
        />
      )

      const canvas = screen.getByRole('img', { hidden: true })
      
      fireEvent.mouseMove(canvas, {
        clientX: 100,
        clientY: 100
      })

      // Should use custom formatters in tooltip
      expect(screen.getByText('Custom Time')).toBeInTheDocument()
    })

    it('should clear hover state on mouse leave', () => {
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
      
      fireEvent.mouseMove(canvas, {
        clientX: 100,
        clientY: 100
      })

      fireEvent.mouseLeave(canvas)

      expect(onHover).toHaveBeenLastCalledWith(null)
    })
  })
})