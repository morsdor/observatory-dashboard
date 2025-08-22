import React from 'react'
import { render, screen, fireEvent } from '@testing-library/react'
import '@testing-library/jest-dom'
import { CanvasChart } from '../CanvasChart'
import { DataPoint } from '@/types'

// Mock D3 to avoid issues with jsdom
const mockLine = {
  x: jest.fn().mockReturnThis(),
  y: jest.fn().mockReturnThis(),
  curve: jest.fn().mockReturnThis()
}

jest.mock('d3', () => ({
  scaleTime: jest.fn(() => ({
    domain: jest.fn().mockReturnThis(),
    range: jest.fn().mockReturnThis(),
    ticks: jest.fn(() => []),
    invert: jest.fn(() => new Date()),
    __call: jest.fn().mockReturnThis()
  })),
  scaleLinear: jest.fn(() => ({
    domain: jest.fn().mockReturnThis(),
    range: jest.fn().mockReturnThis(),
    ticks: jest.fn(() => []),
    __call: jest.fn().mockReturnThis()
  })),
  line: jest.fn(() => mockLine),
  extent: jest.fn(() => [0, 100]),
  timeFormat: jest.fn(() => jest.fn(() => '12:00')),
  format: jest.fn(() => jest.fn(() => '10.00')),
  bisector: jest.fn(() => ({
    left: jest.fn(() => 0)
  })),
  curveLinear: 'curveLinear'
}))

// Mock canvas context
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
  fillText: jest.fn(),
  measureText: jest.fn(() => ({ width: 50 })),
  setLineDash: jest.fn(),
  rect: jest.fn(),
  clip: jest.fn()
}

// Mock HTMLCanvasElement
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

// Mock devicePixelRatio
Object.defineProperty(window, 'devicePixelRatio', {
  value: 2
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

describe('CanvasChart', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('should render canvas element', () => {
    render(
      <CanvasChart
        data={mockData}
        width={800}
        height={400}
      />
    )

    const canvas = screen.getByRole('img', { hidden: true })
    expect(canvas).toBeInTheDocument()
    expect(canvas).toHaveClass('cursor-crosshair')
  })

  it('should set canvas dimensions correctly', () => {
    render(
      <CanvasChart
        data={mockData}
        width={800}
        height={400}
      />
    )

    const canvas = screen.getByRole('img', { hidden: true }) as HTMLCanvasElement
    
    // Should set high DPI dimensions
    expect(canvas.width).toBe(1600) // 800 * 2 (devicePixelRatio)
    expect(canvas.height).toBe(800) // 400 * 2 (devicePixelRatio)
    expect(canvas.style.width).toBe('800px')
    expect(canvas.style.height).toBe('400px')
  })

  it('should apply custom className', () => {
    render(
      <CanvasChart
        data={mockData}
        width={800}
        height={400}
        className="custom-chart"
      />
    )

    const container = screen.getByRole('img', { hidden: true }).parentElement
    expect(container).toHaveClass('custom-chart')
  })

  it('should handle empty data gracefully', () => {
    render(
      <CanvasChart
        data={[]}
        width={800}
        height={400}
      />
    )

    const canvas = screen.getByRole('img', { hidden: true })
    expect(canvas).toBeInTheDocument()
    
    // Should still call canvas methods for axes
    expect(mockContext.clearRect).toHaveBeenCalled()
    expect(mockContext.stroke).toHaveBeenCalled()
  })

  it('should call onHover when mouse moves over canvas', () => {
    const onHover = jest.fn()
    
    render(
      <CanvasChart
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

    // onHover should be called (exact behavior depends on D3 mock implementation)
    expect(onHover).toHaveBeenCalled()
  })

  it('should call onHover with null when mouse leaves canvas', () => {
    const onHover = jest.fn()
    
    render(
      <CanvasChart
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

  it('should use custom margin values', () => {
    const customMargin = {
      top: 30,
      right: 40,
      bottom: 50,
      left: 60
    }

    render(
      <CanvasChart
        data={mockData}
        width={800}
        height={400}
        margin={customMargin}
      />
    )

    // Canvas should still render with custom margins
    const canvas = screen.getByRole('img', { hidden: true })
    expect(canvas).toBeInTheDocument()
    
    // Context translate should be called with custom left and top margins
    expect(mockContext.translate).toHaveBeenCalledWith(60, 30)
  })

  it('should handle canvas context creation failure', () => {
    // Mock getContext to return null
    const originalGetContext = HTMLCanvasElement.prototype.getContext
    HTMLCanvasElement.prototype.getContext = jest.fn(() => null)

    render(
      <CanvasChart
        data={mockData}
        width={800}
        height={400}
      />
    )

    const canvas = screen.getByRole('img', { hidden: true })
    expect(canvas).toBeInTheDocument()

    // Restore original method
    HTMLCanvasElement.prototype.getContext = originalGetContext
  })

  it('should scale context for high DPI displays', () => {
    render(
      <CanvasChart
        data={mockData}
        width={800}
        height={400}
      />
    )

    // Should call scale with devicePixelRatio
    expect(mockContext.scale).toHaveBeenCalledWith(2, 2)
  })

  it('should clear canvas before drawing', () => {
    render(
      <CanvasChart
        data={mockData}
        width={800}
        height={400}
      />
    )

    expect(mockContext.clearRect).toHaveBeenCalledWith(0, 0, 800, 400)
  })

  it('should draw axes and line', () => {
    render(
      <CanvasChart
        data={mockData}
        width={800}
        height={400}
      />
    )

    // Should call drawing methods
    expect(mockContext.beginPath).toHaveBeenCalled()
    expect(mockContext.stroke).toHaveBeenCalled()
    expect(mockContext.fillText).toHaveBeenCalled()
  })

  it('should re-render when data changes', () => {
    const { rerender } = render(
      <CanvasChart
        data={mockData}
        width={800}
        height={400}
      />
    )

    const initialCallCount = mockContext.clearRect.mock.calls.length

    // Change data
    const newData = [
      ...mockData,
      createMockDataPoint('4', new Date('2023-01-01T13:00:00Z'), 40)
    ]

    rerender(
      <CanvasChart
        data={newData}
        width={800}
        height={400}
      />
    )

    // Should have called clearRect again
    expect(mockContext.clearRect.mock.calls.length).toBeGreaterThan(initialCallCount)
  })

  it('should re-render when dimensions change', () => {
    const { rerender } = render(
      <CanvasChart
        data={mockData}
        width={800}
        height={400}
      />
    )

    const initialCallCount = mockContext.clearRect.mock.calls.length

    rerender(
      <CanvasChart
        data={mockData}
        width={900}
        height={500}
      />
    )

    // Should have called clearRect again
    expect(mockContext.clearRect.mock.calls.length).toBeGreaterThan(initialCallCount)
  })
})