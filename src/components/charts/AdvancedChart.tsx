'use client'

import React, { useRef, useEffect, useCallback, useMemo, useState, memo } from 'react'
import * as d3 from 'd3'
import { DataPoint } from '@/types'
import { ChartDimensions } from './CanvasChart'
import { Tooltip } from './Tooltip'
import { ChartConfiguration, ChartSyncConfiguration, ChartType, DEFAULT_CHART_CONFIG, DEFAULT_SYNC_CONFIG } from './ChartTypes'
import { processChartData, ProcessedDataPoint } from './utils/dataProcessing'
import { useChartSync, SyncEvent } from './ChartSyncManager'

export interface AdvancedChartProps {
  data: DataPoint[]
  width: number
  height: number
  margin?: Partial<ChartDimensions['margin']>
  config?: Partial<ChartConfiguration>
  syncConfig?: Partial<ChartSyncConfiguration>
  chartId?: string
  onHover?: (dataPoint: DataPoint | null, event?: MouseEvent) => void
  onZoom?: (transform: d3.ZoomTransform) => void
  onSelection?: (selectedData: DataPoint[]) => void
  enableZoom?: boolean
  enablePan?: boolean
  zoomExtent?: [number, number]
  showGrid?: boolean
  showCrosshair?: boolean
  showTooltip?: boolean
  formatValue?: (value: number) => string
  formatTimestamp?: (timestamp: Date) => string
  className?: string
}

export const AdvancedChart = memo<AdvancedChartProps>(function AdvancedChart({
  data,
  width,
  height,
  margin,
  config: configProp,
  syncConfig: syncConfigProp,
  chartId = `chart_${Math.random().toString(36).substr(2, 9)}`,
  onHover,
  onZoom,
  onSelection,
  enableZoom = true,
  enablePan = true,
  zoomExtent = [0.1, 10],
  showGrid = true,
  showCrosshair = true,
  showTooltip = true,
  formatValue,
  formatTimestamp,
  className = ''
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const [zoomTransform, setZoomTransform] = useState<d3.ZoomTransform>(d3.zoomIdentity)
  const [hoveredPoint, setHoveredPoint] = useState<DataPoint | null>(null)
  const [mousePosition, setMousePosition] = useState<{ x: number; y: number } | null>(null)
  const [selectedData, setSelectedData] = useState<DataPoint[]>([])
  const animationFrameRef = useRef<number | null>(null)

  // Merge configurations with defaults
  const config = useMemo(() => ({
    ...DEFAULT_CHART_CONFIG,
    ...configProp
  }), [configProp])

  const syncConfig = useMemo(() => ({
    ...DEFAULT_SYNC_CONFIG,
    ...syncConfigProp
  }), [syncConfigProp])

  // Process data based on configuration
  const processedData = useMemo(() => {
    return processChartData(data, {
      aggregation: config.aggregation,
      downsampling: config.downsampling
    })
  }, [data, config.aggregation, config.downsampling])

  // Chart synchronization
  const { broadcastEvent, createZoomEvent, createCrosshairEvent } = useChartSync(
    chartId,
    syncConfig,
    useCallback((event: SyncEvent) => {
      switch (event.type) {
        case 'zoom':
          if (syncConfig.syncZoom) {
            const transform = d3.zoomIdentity
              .translate(event.data.x, event.data.y)
              .scale(event.data.k)
            setZoomTransform(transform)
          }
          break
        case 'crosshair':
          if (syncConfig.syncCrosshair) {
            setMousePosition(event.data.position)
            setHoveredPoint(event.data.dataPoint)
          }
          break
      }
    }, [syncConfig])
  )

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
    if (!processedData.length) {
      return {
        baseXScale: d3.scaleTime().range([0, innerWidth]),
        baseYScale: d3.scaleLinear().range([innerHeight, 0])
      }
    }

    const xExtent = d3.extent(processedData, d => d.timestamp) as [Date, Date]
    const yExtent = d3.extent(processedData, d => d.value) as [number, number]

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
  }, [processedData, innerWidth, innerHeight])

  // Apply zoom transform to scales
  const { xScale, yScale } = useMemo(() => ({
    xScale: zoomTransform.rescaleX(baseXScale),
    yScale: baseYScale // Only zoom X-axis for time series
  }), [baseXScale, baseYScale, zoomTransform])

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
      if (x >= 0 && x <= innerWidth) {
        ctx.beginPath()
        ctx.moveTo(x, 0)
        ctx.lineTo(x, innerHeight)
        ctx.stroke()
      }
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

  // Draw chart based on type
  const drawChart = useCallback((ctx: CanvasRenderingContext2D) => {
    if (!processedData.length) return

    ctx.save()
    ctx.translate(dimensions.margin.left, dimensions.margin.top)
    
    // Create clipping region
    ctx.beginPath()
    ctx.rect(0, 0, innerWidth, innerHeight)
    ctx.clip()
    
    // Filter data to visible range for performance
    const [xMin, xMax] = xScale.domain()
    const visibleData = processedData.filter(d => 
      d.timestamp >= xMin && d.timestamp <= xMax
    )

    if (visibleData.length === 0) {
      ctx.restore()
      return
    }

    switch (config.type) {
      case 'line':
        drawLineChart(ctx, visibleData)
        break
      case 'area':
        drawAreaChart(ctx, visibleData)
        break
      case 'scatter':
        drawScatterChart(ctx, visibleData)
        break
      case 'bar':
        drawBarChart(ctx, visibleData)
        break
    }

    ctx.restore()
  }, [processedData, dimensions, innerWidth, innerHeight, xScale, config.type])

  // Draw line chart
  const drawLineChart = useCallback((ctx: CanvasRenderingContext2D, data: ProcessedDataPoint[]) => {
    ctx.strokeStyle = config.colors.stroke || config.colors.primary
    ctx.lineWidth = config.style.lineWidth || 2
    ctx.lineCap = 'round'
    ctx.lineJoin = 'round'
    ctx.globalAlpha = config.style.strokeOpacity || 1

    const line = d3.line<ProcessedDataPoint>()
      .x(d => xScale(d.timestamp))
      .y(d => yScale(d.value))
      .curve(d3.curveLinear)

    const pathData = line(data)
    if (pathData) {
      const path = new Path2D(pathData)
      ctx.stroke(path)
    }
  }, [config, xScale, yScale])

  // Draw area chart
  const drawAreaChart = useCallback((ctx: CanvasRenderingContext2D, data: ProcessedDataPoint[]) => {
    // Draw fill area
    ctx.fillStyle = config.colors.fill || config.colors.primary + '40'
    ctx.globalAlpha = config.style.fillOpacity || 0.3

    const area = d3.area<ProcessedDataPoint>()
      .x(d => xScale(d.timestamp))
      .y0(yScale(yScale.domain()[0]))
      .y1(d => yScale(d.value))
      .curve(d3.curveLinear)

    const areaPath = area(data)
    if (areaPath) {
      const path = new Path2D(areaPath)
      ctx.fill(path)
    }

    // Draw line on top
    ctx.globalAlpha = 1
    drawLineChart(ctx, data)
  }, [config, xScale, yScale, drawLineChart])

  // Draw scatter chart
  const drawScatterChart = useCallback((ctx: CanvasRenderingContext2D, data: ProcessedDataPoint[]) => {
    ctx.fillStyle = config.colors.primary
    ctx.globalAlpha = config.style.strokeOpacity || 1
    const radius = config.style.pointRadius || 3

    data.forEach(d => {
      const x = xScale(d.timestamp)
      const y = yScale(d.value)
      
      if (x >= 0 && x <= innerWidth && y >= 0 && y <= innerHeight) {
        ctx.beginPath()
        ctx.arc(x, y, radius, 0, 2 * Math.PI)
        ctx.fill()
      }
    })
  }, [config, xScale, yScale, innerWidth, innerHeight])

  // Draw bar chart
  const drawBarChart = useCallback((ctx: CanvasRenderingContext2D, data: ProcessedDataPoint[]) => {
    ctx.fillStyle = config.colors.primary
    ctx.globalAlpha = config.style.fillOpacity || 0.8

    const barWidth = Math.max(1, innerWidth / data.length * 0.8)
    const baseY = yScale(yScale.domain()[0])

    data.forEach(d => {
      const x = xScale(d.timestamp) - barWidth / 2
      const y = yScale(d.value)
      const height = Math.abs(baseY - y)
      
      if (x + barWidth >= 0 && x <= innerWidth) {
        ctx.fillRect(x, Math.min(y, baseY), barWidth, height)
      }
    })
  }, [config, xScale, yScale, innerWidth, innerHeight])

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
    const radius = config.style.pointRadius || 4

    // Draw outer circle (glow effect)
    ctx.fillStyle = config.colors.primary + '40'
    ctx.beginPath()
    ctx.arc(pointX, pointY, radius + 2, 0, 2 * Math.PI)
    ctx.fill()

    // Draw inner circle
    ctx.fillStyle = config.colors.primary
    ctx.beginPath()
    ctx.arc(pointX, pointY, radius, 0, 2 * Math.PI)
    ctx.fill()

    // Draw center dot
    ctx.fillStyle = '#ffffff'
    ctx.beginPath()
    ctx.arc(pointX, pointY, radius - 1, 0, 2 * Math.PI)
    ctx.fill()

    ctx.restore()
  }, [hoveredPoint, dimensions, xScale, yScale, config])

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
    drawGrid(ctx)
    drawAxes(ctx)
    drawChart(ctx)
    drawCrosshair(ctx)
    drawHighlight(ctx)
  }, [dimensions, clearCanvas, drawGrid, drawAxes, drawChart, drawCrosshair, drawHighlight])

  // Efficient redraw for interactive elements
  const renderInteractive = useCallback(() => {
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current)
    }

    animationFrameRef.current = requestAnimationFrame(() => {
      render()
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

        // Broadcast zoom event if sync is enabled
        if (syncConfig.enabled && syncConfig.syncZoom) {
          broadcastEvent(createZoomEvent(transform))
        }
      })

    if (!enablePan) {
      zoom.translateExtent([[0, 0], [innerWidth, innerHeight]])
    }

    d3.select(canvas).call(zoom)

    return () => {
      d3.select(canvas).on('.zoom', null)
    }
  }, [enableZoom, enablePan, zoomExtent, onZoom, innerWidth, innerHeight, syncConfig, broadcastEvent, createZoomEvent])

  // Handle mouse events
  const handleMouseMove = useCallback((event: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current
    if (!canvas || !processedData.length) return

    const rect = canvas.getBoundingClientRect()
    const x = event.clientX - rect.left - dimensions.margin.left
    const y = event.clientY - rect.top - dimensions.margin.top

    const mousePos = { x: event.clientX - rect.left, y: event.clientY - rect.top }
    setMousePosition(mousePos)

    // Check if mouse is within chart area
    if (x < 0 || x > innerWidth || y < 0 || y > innerHeight) {
      setHoveredPoint(null)
      if (onHover) onHover(null)
      return
    }

    // Find closest data point
    const mouseDate = xScale.invert(x)
    const bisector = d3.bisector((d: ProcessedDataPoint) => d.timestamp).left
    const index = bisector(processedData, mouseDate)
    
    let closestPoint: ProcessedDataPoint | null = null
    
    if (index > 0 && index < processedData.length) {
      const d0 = processedData[index - 1]
      const d1 = processedData[index]
      closestPoint = mouseDate.getTime() - d0.timestamp.getTime() > d1.timestamp.getTime() - mouseDate.getTime() ? d1 : d0
    } else if (index === 0) {
      closestPoint = processedData[0]
    } else if (index === processedData.length) {
      closestPoint = processedData[processedData.length - 1]
    }

    if (closestPoint) {
      const pointX = xScale(closestPoint.timestamp)
      const pointY = yScale(closestPoint.value)
      const distance = Math.sqrt(Math.pow(x - pointX, 2) + Math.pow(y - pointY, 2))
      
      if (distance < 30) {
        setHoveredPoint(closestPoint)
        if (onHover) onHover(closestPoint, event.nativeEvent)
        
        // Broadcast crosshair event if sync is enabled
        if (syncConfig.enabled && syncConfig.syncCrosshair) {
          broadcastEvent(createCrosshairEvent(mousePos, closestPoint))
        }
        
        renderInteractive()
      } else {
        setHoveredPoint(null)
        if (onHover) onHover(null)
        
        if (syncConfig.enabled && syncConfig.syncCrosshair) {
          broadcastEvent(createCrosshairEvent(null, null))
        }
        
        renderInteractive()
      }
    }
  }, [processedData, dimensions, xScale, yScale, onHover, innerWidth, innerHeight, renderInteractive, syncConfig, broadcastEvent, createCrosshairEvent])

  const handleMouseLeave = useCallback(() => {
    setHoveredPoint(null)
    setMousePosition(null)
    if (onHover) {
      onHover(null)
    }
    
    if (syncConfig.enabled && syncConfig.syncCrosshair) {
      broadcastEvent(createCrosshairEvent(null, null))
    }
    
    renderInteractive()
  }, [onHover, renderInteractive, syncConfig, broadcastEvent, createCrosshairEvent])

  // Render on data or dimension changes
  useEffect(() => {
    render()
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

export default AdvancedChart