'use client'

import React, { useRef, useEffect, useCallback, useMemo, useState, memo } from 'react'
import * as d3 from 'd3'
import { DataPoint } from '@/types'
import { ChartDimensions } from './CanvasChart'
import { Tooltip } from './Tooltip'

export interface TimeSeriesChartProps {
  data: DataPoint[]
  width: number
  height: number
  margin?: Partial<ChartDimensions['margin']>
  onHover?: (dataPoint: DataPoint | null, event?: MouseEvent) => void
  enableZoom?: boolean
  enablePan?: boolean
  zoomExtent?: [number, number]
  onZoom?: (transform: d3.ZoomTransform) => void
  showGrid?: boolean
  lineColor?: string
  lineWidth?: number
  showCrosshair?: boolean
  showTooltip?: boolean
  highlightRadius?: number
  formatValue?: (value: number) => string
  formatTimestamp?: (timestamp: Date) => string
  className?: string
}

export const TimeSeriesChart = memo<TimeSeriesChartProps>(function TimeSeriesChart({
  data,
  width,
  height,
  margin,
  onHover,
  enableZoom = true,
  enablePan = true,
  zoomExtent = [0.1, 10],
  onZoom,
  showGrid = true,
  lineColor = '#3b82f6',
  lineWidth = 2,
  showCrosshair = true,
  showTooltip = true,
  highlightRadius = 4,
  formatValue,
  formatTimestamp,
  className = ''
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const [zoomTransform, setZoomTransform] = useState<d3.ZoomTransform>(d3.zoomIdentity)
  const [hoveredPoint, setHoveredPoint] = useState<DataPoint | null>(null)
  const [mousePosition, setMousePosition] = useState<{ x: number; y: number } | null>(null)
  const animationFrameRef = useRef<number | null>(null)

  // Merge default margin with provided margin
  const chartMargin = useMemo(() => ({
    top: 20,
    right: 30,
    bottom: 40,
    left: 50,
    ...margin
  }), [margin])

  // Calculate chart dimensions
  const dimensions = useMemo<ChartDimensions>(() => ({
    width,
    height,
    margin: chartMargin
  }), [width, height, chartMargin])

  // Calculate inner dimensions
  const innerWidth = dimensions.width - dimensions.margin.left - dimensions.margin.right
  const innerHeight = dimensions.height - dimensions.margin.top - dimensions.margin.bottom

  // Create base scales
  const { baseXScale, baseYScale } = useMemo(() => {
    if (!data.length) {
      return {
        baseXScale: d3.scaleTime().range([0, innerWidth]),
        baseYScale: d3.scaleLinear().range([innerHeight, 0])
      }
    }

    const xExtent = d3.extent(data, d => d.timestamp) as [Date, Date]
    const yExtent = d3.extent(data, d => d.value) as [number, number]

    // Add padding to y-scale
    const yPadding = (yExtent[1] - yExtent[0]) * 0.1

    return {
      baseXScale: d3.scaleTime()
        .domain(xExtent)
        .range([0, innerWidth]),
      baseYScale: d3.scaleLinear()
        .domain([yExtent[0] - yPadding, yExtent[1] + yPadding])
        .range([innerHeight, 0])
    }
  }, [data, innerWidth, innerHeight])

  // Apply zoom transform to scales
  const { xScale, yScale } = useMemo(() => ({
    xScale: zoomTransform.rescaleX(baseXScale),
    yScale: baseYScale // Only zoom X-axis for time series
  }), [baseXScale, baseYScale, zoomTransform])

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

  // Draw grid
  const drawGrid = useCallback((ctx: CanvasRenderingContext2D) => {
    if (!showGrid) return

    ctx.save()
    ctx.translate(dimensions.margin.left, dimensions.margin.top)
    
    ctx.strokeStyle = '#f3f4f6' // gray-100
    ctx.lineWidth = 1
    ctx.setLineDash([2, 2])

    // Vertical grid lines
    const xTicks = xScale.ticks(6)
    xTicks.forEach(tick => {
      const x = xScale(tick)
      ctx.beginPath()
      ctx.moveTo(x, 0)
      ctx.lineTo(x, innerHeight)
      ctx.stroke()
    })

    // Horizontal grid lines
    const yTicks = yScale.ticks(5)
    yTicks.forEach(tick => {
      const y = yScale(tick)
      ctx.beginPath()
      ctx.moveTo(0, y)
      ctx.lineTo(innerWidth, y)
      ctx.stroke()
    })

    ctx.setLineDash([])
    ctx.restore()
  }, [dimensions, xScale, yScale, innerWidth, innerHeight, showGrid])

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
    const timeFormat = d3.timeFormat('%H:%M')
    
    xTicks.forEach(tick => {
      const x = xScale(tick)
      
      // Only draw if within bounds
      if (x >= 0 && x <= innerWidth) {
        // Draw tick
        ctx.beginPath()
        ctx.moveTo(x, innerHeight)
        ctx.lineTo(x, innerHeight + 6)
        ctx.stroke()
        
        // Draw label
        const label = timeFormat(tick)
        const textWidth = ctx.measureText(label).width
        ctx.fillText(label, x - textWidth / 2, innerHeight + 20)
      }
    })

    // Draw Y axis ticks and labels
    const yTicks = yScale.ticks(5)
    const numberFormat = d3.format('.2f')
    
    yTicks.forEach(tick => {
      const y = yScale(tick)
      
      // Draw tick
      ctx.beginPath()
      ctx.moveTo(0, y)
      ctx.lineTo(-6, y)
      ctx.stroke()
      
      // Draw label
      const label = numberFormat(tick)
      const textWidth = ctx.measureText(label).width
      ctx.fillText(label, -textWidth - 10, y + 4)
    })

    ctx.restore()
  }, [dimensions, xScale, yScale, innerWidth, innerHeight])

  // Draw line chart with clipping
  const drawLine = useCallback((ctx: CanvasRenderingContext2D) => {
    if (!data.length) return

    ctx.save()
    ctx.translate(dimensions.margin.left, dimensions.margin.top)
    
    // Create clipping region
    ctx.beginPath()
    ctx.rect(0, 0, innerWidth, innerHeight)
    ctx.clip()
    
    // Set line styles
    ctx.strokeStyle = lineColor
    ctx.lineWidth = lineWidth
    ctx.lineCap = 'round'
    ctx.lineJoin = 'round'

    // Filter data to visible range for performance
    const [xMin, xMax] = xScale.domain()
    const visibleData = data.filter(d => 
      d.timestamp >= xMin && d.timestamp <= xMax
    )

    // Create path
    if (visibleData.length > 0) {
      const pathData = line(visibleData)
      if (pathData) {
        const path = new Path2D(pathData)
        ctx.stroke(path)
      }
    }

    ctx.restore()
  }, [data, dimensions, line, innerWidth, innerHeight, lineColor, lineWidth, xScale])

  // Draw crosshair
  const drawCrosshair = useCallback((ctx: CanvasRenderingContext2D) => {
    if (!showCrosshair || !mousePosition || !hoveredPoint) return

    ctx.save()
    ctx.translate(dimensions.margin.left, dimensions.margin.top)
    
    const pointX = xScale(hoveredPoint.timestamp)
    const pointY = yScale(hoveredPoint.value)

    // Set crosshair styles
    ctx.strokeStyle = '#6b7280' // gray-500
    ctx.lineWidth = 1
    ctx.setLineDash([4, 4])

    // Draw vertical line
    ctx.beginPath()
    ctx.moveTo(pointX, 0)
    ctx.lineTo(pointX, innerHeight)
    ctx.stroke()

    // Draw horizontal line
    ctx.beginPath()
    ctx.moveTo(0, pointY)
    ctx.lineTo(innerWidth, pointY)
    ctx.stroke()

    ctx.setLineDash([])
    ctx.restore()
  }, [showCrosshair, mousePosition, hoveredPoint, dimensions, xScale, yScale, innerWidth, innerHeight])

  // Draw highlighted data point
  const drawHighlight = useCallback((ctx: CanvasRenderingContext2D) => {
    if (!hoveredPoint) return

    ctx.save()
    ctx.translate(dimensions.margin.left, dimensions.margin.top)
    
    const pointX = xScale(hoveredPoint.timestamp)
    const pointY = yScale(hoveredPoint.value)

    // Draw outer circle (glow effect)
    ctx.fillStyle = lineColor + '40' // Add transparency
    ctx.beginPath()
    ctx.arc(pointX, pointY, highlightRadius + 2, 0, 2 * Math.PI)
    ctx.fill()

    // Draw inner circle
    ctx.fillStyle = lineColor
    ctx.beginPath()
    ctx.arc(pointX, pointY, highlightRadius, 0, 2 * Math.PI)
    ctx.fill()

    // Draw center dot
    ctx.fillStyle = '#ffffff'
    ctx.beginPath()
    ctx.arc(pointX, pointY, highlightRadius - 1, 0, 2 * Math.PI)
    ctx.fill()

    ctx.restore()
  }, [hoveredPoint, dimensions, xScale, yScale, lineColor, highlightRadius])

  // Main render function with efficient partial redraw
  const render = useCallback((forceFullRedraw: boolean = false) => {
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

    // Clear and draw base chart
    clearCanvas(ctx)
    drawGrid(ctx)
    drawAxes(ctx)
    drawLine(ctx)
    
    // Draw interactive elements
    drawCrosshair(ctx)
    drawHighlight(ctx)
  }, [dimensions, clearCanvas, drawGrid, drawAxes, drawLine, drawCrosshair, drawHighlight])

  // Efficient redraw for interactive elements only
  const renderInteractive = useCallback(() => {
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current)
    }

    animationFrameRef.current = requestAnimationFrame(() => {
      render(false)
    })
  }, [render])

  // Setup zoom behavior
  useEffect(() => {
    if (!enableZoom && !enablePan) return

    const canvas = canvasRef.current
    if (!canvas) return

    const zoom = d3.zoom<HTMLCanvasElement, unknown>()
      .scaleExtent(zoomExtent)
      .on('zoom', (event) => {
        const transform = event.transform as d3.ZoomTransform
        setZoomTransform(transform)
        
        if (onZoom) {
          onZoom(transform)
        }
      })

    // Configure zoom behavior
    if (!enablePan) {
      zoom.translateExtent([[0, 0], [innerWidth, innerHeight]])
    }

    d3.select(canvas).call(zoom)

    return () => {
      d3.select(canvas).on('.zoom', null)
    }
  }, [enableZoom, enablePan, zoomExtent, onZoom, innerWidth, innerHeight])

  // Handle mouse events for hover with enhanced interactivity
  const handleMouseMove = useCallback((event: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current
    if (!canvas || !data.length) return

    const rect = canvas.getBoundingClientRect()
    const x = event.clientX - rect.left - dimensions.margin.left
    const y = event.clientY - rect.top - dimensions.margin.top

    // Update mouse position for crosshair
    setMousePosition({ x: event.clientX - rect.left, y: event.clientY - rect.top })

    // Check if mouse is within chart area
    if (x < 0 || x > innerWidth || y < 0 || y > innerHeight) {
      setHoveredPoint(null)
      if (onHover) onHover(null)
      return
    }

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

    // Check if mouse is close enough to the point for highlighting
    if (closestPoint) {
      const pointX = xScale(closestPoint.timestamp)
      const pointY = yScale(closestPoint.value)
      const distance = Math.sqrt(Math.pow(x - pointX, 2) + Math.pow(y - pointY, 2))
      
      if (distance < 30) { // 30px threshold for better UX
        setHoveredPoint(closestPoint)
        if (onHover) onHover(closestPoint, event.nativeEvent)
        renderInteractive()
      } else {
        setHoveredPoint(null)
        if (onHover) onHover(null)
        renderInteractive()
      }
    }
  }, [data, dimensions, xScale, yScale, onHover, innerWidth, innerHeight, renderInteractive])

  const handleMouseLeave = useCallback(() => {
    setHoveredPoint(null)
    setMousePosition(null)
    if (onHover) {
      onHover(null)
    }
    renderInteractive()
  }, [onHover, renderInteractive])

  // Render on data or dimension changes
  useEffect(() => {
    render(true) // Force full redraw on data/dimension changes
  }, [render])

  // Cleanup animation frames on unmount
  useEffect(() => {
    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current)
      }
    }
  }, [])

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
      {showTooltip && (
        <Tooltip
          dataPoint={hoveredPoint}
          position={mousePosition}
          visible={!!hoveredPoint}
          formatValue={formatValue}
          formatTimestamp={formatTimestamp}
        />
      )}
    </div>
  )
})

export default TimeSeriesChart