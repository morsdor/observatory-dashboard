'use client'

import React, { useRef, useEffect, useCallback, useMemo } from 'react'
import * as d3 from 'd3'
import { DataPoint } from '@/types'

export interface ChartDimensions {
  width: number
  height: number
  margin: {
    top: number
    right: number
    bottom: number
    left: number
  }
}

export interface CanvasChartProps {
  data: DataPoint[]
  width: number
  height: number
  margin?: Partial<ChartDimensions['margin']>
  onHover?: (dataPoint: DataPoint | null, event?: MouseEvent) => void
  className?: string
}

const DEFAULT_MARGIN = {
  top: 20,
  right: 30,
  bottom: 40,
  left: 50
}

export const CanvasChart: React.FC<CanvasChartProps> = ({
  data,
  width,
  height,
  margin = {},
  onHover,
  className = ''
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  
  // Merge default margin with provided margin
  const chartMargin = useMemo(() => ({
    ...DEFAULT_MARGIN,
    ...margin
  }), [margin])

  // Calculate chart dimensions
  const dimensions = useMemo<ChartDimensions>(() => ({
    width,
    height,
    margin: chartMargin
  }), [width, height, chartMargin])

  // Calculate inner dimensions (chart area excluding margins)
  const innerWidth = dimensions.width - dimensions.margin.left - dimensions.margin.right
  const innerHeight = dimensions.height - dimensions.margin.top - dimensions.margin.bottom

  // Create scales
  const { xScale, yScale } = useMemo(() => {
    if (!data.length) {
      return {
        xScale: d3.scaleTime().range([0, innerWidth]),
        yScale: d3.scaleLinear().range([innerHeight, 0])
      }
    }

    const xExtent = d3.extent(data, d => d.timestamp) as [Date, Date]
    const yExtent = d3.extent(data, d => d.value) as [number, number]

    // Add padding to y-scale
    const yPadding = (yExtent[1] - yExtent[0]) * 0.1
    
    return {
      xScale: d3.scaleTime()
        .domain(xExtent)
        .range([0, innerWidth]),
      yScale: d3.scaleLinear()
        .domain([yExtent[0] - yPadding, yExtent[1] + yPadding])
        .range([innerHeight, 0])
    }
  }, [data, innerWidth, innerHeight])

  // Line generator
  const line = useMemo(() => 
    d3.line<DataPoint>()
      .x(d => xScale(d.timestamp))
      .y(d => yScale(d.value))
      .curve(d3.curveLinear),
    [xScale, yScale]
  )

  // Clear canvas
  const clearCanvas = useCallback((ctx: CanvasRenderingContext2D) => {
    ctx.clearRect(0, 0, dimensions.width, dimensions.height)
  }, [dimensions])

  // Draw axes
  const drawAxes = useCallback((ctx: CanvasRenderingContext2D) => {
    ctx.save()
    ctx.translate(dimensions.margin.left, dimensions.margin.top)
    
    // Set axis styles
    ctx.strokeStyle = '#e5e7eb' // gray-200
    ctx.lineWidth = 1
    ctx.font = '12px system-ui, sans-serif'
    ctx.fillStyle = '#6b7280' // gray-500

    // Draw X axis
    ctx.beginPath()
    ctx.moveTo(0, innerHeight)
    ctx.lineTo(innerWidth, innerHeight)
    ctx.stroke()

    // Draw Y axis
    ctx.beginPath()
    ctx.moveTo(0, 0)
    ctx.lineTo(0, innerHeight)
    ctx.stroke()

    // Draw X axis ticks and labels
    const xTicks = xScale.ticks(6)
    xTicks.forEach(tick => {
      const x = xScale(tick)
      
      // Draw tick
      ctx.beginPath()
      ctx.moveTo(x, innerHeight)
      ctx.lineTo(x, innerHeight + 6)
      ctx.stroke()
      
      // Draw label
      const label = d3.timeFormat('%H:%M')(tick)
      const textWidth = ctx.measureText(label).width
      ctx.fillText(label, x - textWidth / 2, innerHeight + 20)
    })

    // Draw Y axis ticks and labels
    const yTicks = yScale.ticks(5)
    yTicks.forEach(tick => {
      const y = yScale(tick)
      
      // Draw tick
      ctx.beginPath()
      ctx.moveTo(0, y)
      ctx.lineTo(-6, y)
      ctx.stroke()
      
      // Draw label
      const label = d3.format('.2f')(tick)
      const textWidth = ctx.measureText(label).width
      ctx.fillText(label, -textWidth - 10, y + 4)
    })

    ctx.restore()
  }, [dimensions, xScale, yScale, innerWidth, innerHeight])

  // Draw line chart
  const drawLine = useCallback((ctx: CanvasRenderingContext2D) => {
    if (!data.length) return

    ctx.save()
    ctx.translate(dimensions.margin.left, dimensions.margin.top)
    
    // Set line styles
    ctx.strokeStyle = '#3b82f6' // blue-500
    ctx.lineWidth = 2
    ctx.lineCap = 'round'
    ctx.lineJoin = 'round'

    // Create path
    const pathData = line(data)
    if (pathData) {
      const path = new Path2D(pathData)
      ctx.stroke(path)
    }

    ctx.restore()
  }, [data, dimensions, line])

  // Main render function
  const render = useCallback(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const ctx = canvas.getContext('2d')
    if (!ctx) return

    // Set canvas size for high DPI displays
    const dpr = window.devicePixelRatio || 1
    canvas.width = dimensions.width * dpr
    canvas.height = dimensions.height * dpr
    canvas.style.width = `${dimensions.width}px`
    canvas.style.height = `${dimensions.height}px`
    ctx.scale(dpr, dpr)

    // Clear and draw
    clearCanvas(ctx)
    drawAxes(ctx)
    drawLine(ctx)
  }, [dimensions, clearCanvas, drawAxes, drawLine])

  // Handle mouse events for hover
  const handleMouseMove = useCallback((event: React.MouseEvent<HTMLCanvasElement>) => {
    if (!onHover || !data.length) return

    const canvas = canvasRef.current
    if (!canvas) return

    const rect = canvas.getBoundingClientRect()
    const x = event.clientX - rect.left - dimensions.margin.left
    const y = event.clientY - rect.top - dimensions.margin.top

    // Find closest data point
    const mouseDate = xScale.invert(x)
    const bisector = d3.bisector((d: DataPoint) => d.timestamp).left
    const index = bisector(data, mouseDate)
    
    let closestPoint: DataPoint | null = null
    
    if (index > 0 && index < data.length) {
      const d0 = data[index - 1]
      const d1 = data[index]
      closestPoint = mouseDate.getTime() - d0.timestamp.getTime() > d1.timestamp.getTime() - mouseDate.getTime() ? d1 : d0
    } else if (index === 0) {
      closestPoint = data[0]
    } else if (index === data.length) {
      closestPoint = data[data.length - 1]
    }

    // Check if mouse is close enough to the point
    if (closestPoint) {
      const pointX = xScale(closestPoint.timestamp)
      const pointY = yScale(closestPoint.value)
      const distance = Math.sqrt(Math.pow(x - pointX, 2) + Math.pow(y - pointY, 2))
      
      if (distance < 20) { // 20px threshold
        onHover(closestPoint, event.nativeEvent)
      } else {
        onHover(null)
      }
    }
  }, [data, dimensions, xScale, yScale, onHover])

  const handleMouseLeave = useCallback(() => {
    if (onHover) {
      onHover(null)
    }
  }, [onHover])

  // Render on data or dimension changes
  useEffect(() => {
    render()
  }, [render])

  return (
    <div 
      ref={containerRef}
      className={`relative ${className}`}
      style={{ width: dimensions.width, height: dimensions.height }}
    >
      <canvas
        ref={canvasRef}
        onMouseMove={handleMouseMove}
        onMouseLeave={handleMouseLeave}
        className="cursor-crosshair"
      />
    </div>
  )
}

export default CanvasChart