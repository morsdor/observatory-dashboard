import React from 'react'
import { render, screen } from '@testing-library/react'
import '@testing-library/jest-dom'
import { Tooltip } from '../Tooltip'
import { DataPoint } from '@/types'

const createMockDataPoint = (
  id: string,
  timestamp: Date,
  value: number,
  category: string = 'test',
  metadata: Record<string, any> = {}
): DataPoint => ({
  id,
  timestamp,
  value,
  category,
  metadata,
  source: 'test-source'
})

describe('Tooltip', () => {
  const mockDataPoint = createMockDataPoint(
    '1',
    new Date('2023-01-01T12:00:00Z'),
    42.5,
    'cpu',
    { server: 'web-01', region: 'us-east-1' }
  )

  const mockPosition = { x: 100, y: 200 }

  it('should render tooltip when visible with data point', () => {
    render(
      <Tooltip
        dataPoint={mockDataPoint}
        position={mockPosition}
        visible={true}
      />
    )

    expect(screen.getByText('42.50')).toBeInTheDocument()
    expect(screen.getByText('cpu')).toBeInTheDocument()
    expect(screen.getByText('test-source')).toBeInTheDocument()
  })

  it('should not render when not visible', () => {
    const { container } = render(
      <Tooltip
        dataPoint={mockDataPoint}
        position={mockPosition}
        visible={false}
      />
    )

    expect(container.firstChild).toBeNull()
  })

  it('should not render when dataPoint is null', () => {
    const { container } = render(
      <Tooltip
        dataPoint={null}
        position={mockPosition}
        visible={true}
      />
    )

    expect(container.firstChild).toBeNull()
  })

  it('should not render when position is null', () => {
    const { container } = render(
      <Tooltip
        dataPoint={mockDataPoint}
        position={null}
        visible={true}
      />
    )

    expect(container.firstChild).toBeNull()
  })

  it('should use custom formatters', () => {
    const formatValue = (value: number) => `$${value.toFixed(0)}`
    const formatTimestamp = (timestamp: Date) => timestamp.toISOString()

    render(
      <Tooltip
        dataPoint={mockDataPoint}
        position={mockPosition}
        visible={true}
        formatValue={formatValue}
        formatTimestamp={formatTimestamp}
      />
    )

    expect(screen.getByText('$43')).toBeInTheDocument()
    expect(screen.getByText('2023-01-01T12:00:00.000Z')).toBeInTheDocument()
  })

  it('should display metadata when present', () => {
    render(
      <Tooltip
        dataPoint={mockDataPoint}
        position={mockPosition}
        visible={true}
      />
    )

    expect(screen.getByText('Metadata:')).toBeInTheDocument()
    expect(screen.getByText('server:')).toBeInTheDocument()
    expect(screen.getByText('web-01')).toBeInTheDocument()
    expect(screen.getByText('region:')).toBeInTheDocument()
    expect(screen.getByText('us-east-1')).toBeInTheDocument()
  })

  it('should not display metadata section when empty', () => {
    const dataPointWithoutMetadata = createMockDataPoint(
      '1',
      new Date('2023-01-01T12:00:00Z'),
      42.5,
      'cpu',
      {}
    )

    render(
      <Tooltip
        dataPoint={dataPointWithoutMetadata}
        position={mockPosition}
        visible={true}
      />
    )

    expect(screen.queryByText('Metadata:')).not.toBeInTheDocument()
  })

  it('should handle complex metadata values', () => {
    const dataPointWithComplexMetadata = createMockDataPoint(
      '1',
      new Date('2023-01-01T12:00:00Z'),
      42.5,
      'cpu',
      { 
        config: { enabled: true, threshold: 80 },
        tags: ['production', 'critical']
      }
    )

    render(
      <Tooltip
        dataPoint={dataPointWithComplexMetadata}
        position={mockPosition}
        visible={true}
      />
    )

    expect(screen.getByText('config:')).toBeInTheDocument()
    expect(screen.getByText('{"enabled":true,"threshold":80}')).toBeInTheDocument()
    expect(screen.getByText('tags:')).toBeInTheDocument()
    expect(screen.getByText('["production","critical"]')).toBeInTheDocument()
  })

  it('should apply custom className', () => {
    const { container } = render(
      <Tooltip
        dataPoint={mockDataPoint}
        position={mockPosition}
        visible={true}
        className="custom-tooltip"
      />
    )

    const tooltip = container.firstChild as HTMLElement
    expect(tooltip).toHaveClass('custom-tooltip')
  })

  it('should position tooltip correctly', () => {
    const { container } = render(
      <Tooltip
        dataPoint={mockDataPoint}
        position={mockPosition}
        visible={true}
      />
    )

    const tooltip = container.firstChild as HTMLElement
    expect(tooltip).toHaveStyle({
      position: 'absolute',
      left: '110px', // position.x + 10
      top: '190px'   // position.y - 10
    })
  })

  it('should adjust position for right edge of screen', () => {
    // Mock window.innerWidth
    Object.defineProperty(window, 'innerWidth', {
      writable: true,
      configurable: true,
      value: 150
    })

    const { container } = render(
      <Tooltip
        dataPoint={mockDataPoint}
        position={mockPosition}
        visible={true}
      />
    )

    const tooltip = container.firstChild as HTMLElement
    expect(tooltip).toHaveStyle({
      transform: 'translateX(-100%)'
    })
  })
})