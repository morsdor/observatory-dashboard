import React from 'react'
import { render } from '@testing-library/react'
import '@testing-library/jest-dom'
import { TimeSeriesChart } from '../TimeSeriesChart'
import { DataPoint } from '@/types'

// Mock D3 for integration test
const mockLine = {
  x: jest.fn().mockReturnThis(),
  y: jest.fn().mockReturnThis(),
  curve: jest.fn().mockReturnThis()
}

jest.mock('d3', () => ({
  scaleTime: jest.fn(() => {
    const scale = {
      domain: jest.fn(() => [new Date('2023-01-01T10:00:00Z'), new Date('2023-01-01T12:00:00Z')]),
      range: jest.fn().mockReturnThis(),
      ticks: jest.fn(() => []),
      invert: jest.fn(() => new Date())
    }
    scale.domain.mockReturnValue([new Date('2023-01-01T10:00:00Z'), new Date('2023-01-01T12:00:00Z')])
    return scale
  }),
  scaleLinear: jest.fn(() => ({
    domain: jest.fn(() => [0, 100]).mockReturnThis(),
    range: jest.fn().mockReturnThis(),
    ticks: jest.fn(() => [])
  })),
  line: jest.fn(() => mockLine),
  extent: jest.fn(() => [new Date(), new Date()]),
  timeFormat: jest.fn(() => jest.fn(() => '12:00')),
  format: jest.fn(() => jest.fn(() => '10.00')),
  bisector: jest.fn(() => ({
    left: jest.fn(() => 0)
  })),
  curveLinear: 'curveLinear',
  zoom: jest.fn(() => ({
    scaleExtent: jest.fn().mockReturnThis(),
    on: jest.fn().mockReturnThis(),
    translateExtent: jest.fn().mockReturnThis()
  })),
  zoomIdentity: {
    rescaleX: jest.fn((scale) => scale)
  },
  select: jest.fn(() => ({
    call: jest.fn(),
    on: jest.fn()
  }))
}))

// Mock canvas
Object.defineProperty(HTMLCanvasElement.prototype, 'getContext', {
  value: jest.fn(() => ({
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
  }))
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

const mockData: DataPoint[] = [
  {
    id: '1',
    timestamp: new Date('2023-01-01T10:00:00Z'),
    value: 10,
    category: 'test',
    metadata: {},
    source: 'test'
  },
  {
    id: '2',
    timestamp: new Date('2023-01-01T11:00:00Z'),
    value: 20,
    category: 'test',
    metadata: {},
    source: 'test'
  }
]

describe('Chart Integration', () => {
  it('should render TimeSeriesChart without errors', () => {
    const { container } = render(
      <TimeSeriesChart
        data={mockData}
        width={800}
        height={400}
      />
    )
    
    expect(container.querySelector('canvas')).toBeInTheDocument()
  })

  it('should handle empty data', () => {
    const { container } = render(
      <TimeSeriesChart
        data={[]}
        width={800}
        height={400}
      />
    )
    
    expect(container.querySelector('canvas')).toBeInTheDocument()
  })

  it('should render with custom props', () => {
    const { container } = render(
      <TimeSeriesChart
        data={mockData}
        width={800}
        height={400}
        showGrid={true}
        enableZoom={true}
        lineColor="#ff0000"
        lineWidth={3}
      />
    )
    
    expect(container.querySelector('canvas')).toBeInTheDocument()
  })
})