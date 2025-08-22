import * as d3 from 'd3'
import { DataPoint } from '@/types'

export interface ChartExtent {
  xExtent: [Date, Date]
  yExtent: [number, number]
}

export interface ScaleConfig {
  xScale: d3.ScaleTime<number, number>
  yScale: d3.ScaleLinear<number, number>
}

/**
 * Calculate data extents for chart scales
 */
export function calculateExtents(data: DataPoint[]): ChartExtent {
  if (!data.length) {
    const now = new Date()
    return {
      xExtent: [new Date(now.getTime() - 3600000), now], // 1 hour ago to now
      yExtent: [0, 100]
    }
  }

  const xExtent = d3.extent(data, d => d.timestamp) as [Date, Date]
  const yExtent = d3.extent(data, d => d.value) as [number, number]

  return { xExtent, yExtent }
}

/**
 * Create chart scales with proper domains and ranges
 */
export function createScales(
  data: DataPoint[],
  width: number,
  height: number,
  yPadding: number = 0.1
): ScaleConfig {
  const { xExtent, yExtent } = calculateExtents(data)
  
  // Add padding to y-scale
  const yRange = yExtent[1] - yExtent[0]
  const yPaddingValue = yRange * yPadding

  const xScale = d3.scaleTime()
    .domain(xExtent)
    .range([0, width])

  const yScale = d3.scaleLinear()
    .domain([yExtent[0] - yPaddingValue, yExtent[1] + yPaddingValue])
    .range([height, 0])

  return { xScale, yScale }
}

/**
 * Generate tick values for axes
 */
export function generateTicks(
  scale: d3.ScaleTime<number, number> | d3.ScaleLinear<number, number>,
  count: number = 6
): (Date | number)[] {
  if ('ticks' in scale) {
    return scale.ticks(count)
  }
  return []
}

/**
 * Format tick labels based on scale type
 */
export function formatTickLabel(
  value: Date | number,
  scaleType: 'time' | 'linear'
): string {
  if (scaleType === 'time' && value instanceof Date) {
    return d3.timeFormat('%H:%M')(value)
  } else if (scaleType === 'linear' && typeof value === 'number') {
    return d3.format('.2f')(value)
  }
  return String(value)
}

/**
 * Find the closest data point to a given coordinate
 */
export function findClosestDataPoint(
  data: DataPoint[],
  targetDate: Date
): DataPoint | null {
  if (!data.length) return null

  const bisector = d3.bisector((d: DataPoint) => d.timestamp).left
  const index = bisector(data, targetDate)
  
  let closestPoint: DataPoint | null = null
  
  if (index > 0 && index < data.length) {
    const d0 = data[index - 1]
    const d1 = data[index]
    closestPoint = targetDate.getTime() - d0.timestamp.getTime() > 
                   d1.timestamp.getTime() - targetDate.getTime() ? d1 : d0
  } else if (index === 0) {
    closestPoint = data[0]
  } else if (index === data.length) {
    closestPoint = data[data.length - 1]
  }

  return closestPoint
}

/**
 * Calculate distance between two points
 */
export function calculateDistance(
  x1: number,
  y1: number,
  x2: number,
  y2: number
): number {
  return Math.sqrt(Math.pow(x2 - x1, 2) + Math.pow(y2 - y1, 2))
}

/**
 * Check if a point is within the chart bounds
 */
export function isPointInBounds(
  x: number,
  y: number,
  width: number,
  height: number
): boolean {
  return x >= 0 && x <= width && y >= 0 && y <= height
}

/**
 * Filter data to visible range for performance optimization
 */
export function filterVisibleData(
  data: DataPoint[],
  xScale: d3.ScaleTime<number, number>,
  buffer: number = 0.1
): DataPoint[] {
  if (!data.length) return []

  const [xMin, xMax] = xScale.domain()
  const timeRange = xMax.getTime() - xMin.getTime()
  const bufferTime = timeRange * buffer

  const startTime = new Date(xMin.getTime() - bufferTime)
  const endTime = new Date(xMax.getTime() + bufferTime)

  return data.filter(d => 
    d.timestamp >= startTime && d.timestamp <= endTime
  )
}

/**
 * Downsample data for performance when dealing with large datasets
 */
export function downsampleData(
  data: DataPoint[],
  maxPoints: number = 1000
): DataPoint[] {
  if (data.length <= maxPoints) return data

  const step = Math.ceil(data.length / maxPoints)
  const downsampled: DataPoint[] = []

  for (let i = 0; i < data.length; i += step) {
    downsampled.push(data[i])
  }

  // Always include the last point
  if (downsampled[downsampled.length - 1] !== data[data.length - 1]) {
    downsampled.push(data[data.length - 1])
  }

  return downsampled
}

/**
 * Create a line path string for Canvas rendering
 */
export function createLinePath(
  data: DataPoint[],
  xScale: d3.ScaleTime<number, number>,
  yScale: d3.ScaleLinear<number, number>
): string {
  const line = d3.line<DataPoint>()
    .x(d => xScale(d.timestamp))
    .y(d => yScale(d.value))
    .curve(d3.curveLinear)

  return line(data) || ''
}

/**
 * Calculate optimal tick count based on available space
 */
export function calculateOptimalTickCount(
  availableSpace: number,
  minSpacing: number = 60
): number {
  return Math.max(2, Math.floor(availableSpace / minSpacing))
}

/**
 * Get high DPI canvas context with proper scaling
 */
export function getHighDPIContext(
  canvas: HTMLCanvasElement,
  width: number,
  height: number
): CanvasRenderingContext2D | null {
  const ctx = canvas.getContext('2d')
  if (!ctx) return null

  const dpr = window.devicePixelRatio || 1
  
  canvas.width = width * dpr
  canvas.height = height * dpr
  canvas.style.width = `${width}px`
  canvas.style.height = `${height}px`
  
  ctx.scale(dpr, dpr)
  
  return ctx
}

/**
 * Apply zoom transform to scale
 */
export function applyZoomTransform(
  baseScale: d3.ScaleTime<number, number>,
  transform: d3.ZoomTransform
): d3.ScaleTime<number, number> {
  return transform.rescaleX(baseScale)
}

/**
 * Validate chart data
 */
export function validateChartData(data: DataPoint[]): {
  isValid: boolean
  errors: string[]
} {
  const errors: string[] = []

  if (!Array.isArray(data)) {
    errors.push('Data must be an array')
    return { isValid: false, errors }
  }

  if (data.length === 0) {
    return { isValid: true, errors: [] } // Empty data is valid
  }

  data.forEach((point, index) => {
    if (!point.timestamp || !(point.timestamp instanceof Date)) {
      errors.push(`Invalid timestamp at index ${index}`)
    }
    
    if (typeof point.value !== 'number' || !isFinite(point.value)) {
      errors.push(`Invalid value at index ${index}`)
    }
    
    if (!point.id || typeof point.id !== 'string') {
      errors.push(`Invalid id at index ${index}`)
    }
  })

  return {
    isValid: errors.length === 0,
    errors
  }
}

/**
 * Draw crosshair lines on canvas
 */
export function drawCrosshair(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  width: number,
  height: number,
  style: {
    color?: string
    lineWidth?: number
    dashPattern?: number[]
  } = {}
): void {
  const {
    color = '#6b7280',
    lineWidth = 1,
    dashPattern = [4, 4]
  } = style

  ctx.save()
  ctx.strokeStyle = color
  ctx.lineWidth = lineWidth
  ctx.setLineDash(dashPattern)

  // Draw vertical line
  ctx.beginPath()
  ctx.moveTo(x, 0)
  ctx.lineTo(x, height)
  ctx.stroke()

  // Draw horizontal line
  ctx.beginPath()
  ctx.moveTo(0, y)
  ctx.lineTo(width, y)
  ctx.stroke()

  ctx.setLineDash([])
  ctx.restore()
}

/**
 * Draw highlighted data point on canvas
 */
export function drawDataPointHighlight(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  style: {
    radius?: number
    color?: string
    glowColor?: string
    centerColor?: string
  } = {}
): void {
  const {
    radius = 4,
    color = '#3b82f6',
    glowColor = color + '40',
    centerColor = '#ffffff'
  } = style

  ctx.save()

  // Draw outer circle (glow effect)
  ctx.fillStyle = glowColor
  ctx.beginPath()
  ctx.arc(x, y, radius + 2, 0, 2 * Math.PI)
  ctx.fill()

  // Draw main circle
  ctx.fillStyle = color
  ctx.beginPath()
  ctx.arc(x, y, radius, 0, 2 * Math.PI)
  ctx.fill()

  // Draw center dot
  ctx.fillStyle = centerColor
  ctx.beginPath()
  ctx.arc(x, y, radius - 1, 0, 2 * Math.PI)
  ctx.fill()

  ctx.restore()
}

/**
 * Check if mouse position is near a data point
 */
export function isNearDataPoint(
  mouseX: number,
  mouseY: number,
  pointX: number,
  pointY: number,
  threshold: number = 30
): boolean {
  const distance = calculateDistance(mouseX, mouseY, pointX, pointY)
  return distance <= threshold
}

/**
 * Get optimal tooltip position to avoid screen edges
 */
export function getTooltipPosition(
  mouseX: number,
  mouseY: number,
  tooltipWidth: number = 200,
  tooltipHeight: number = 100,
  containerWidth: number,
  containerHeight: number,
  offset: { x: number; y: number } = { x: 10, y: -10 }
): { x: number; y: number; placement: 'right' | 'left' | 'top' | 'bottom' } {
  let x = mouseX + offset.x
  let y = mouseY + offset.y
  let placement: 'right' | 'left' | 'top' | 'bottom' = 'right'

  // Adjust horizontal position
  if (x + tooltipWidth > containerWidth) {
    x = mouseX - tooltipWidth - Math.abs(offset.x)
    placement = 'left'
  }

  // Adjust vertical position
  if (y < 0) {
    y = mouseY + Math.abs(offset.y)
    placement = placement === 'left' ? 'left' : 'bottom'
  } else if (y + tooltipHeight > containerHeight) {
    y = mouseY - tooltipHeight + offset.y
    placement = placement === 'left' ? 'left' : 'top'
  }

  return { x, y, placement }
}

/**
 * Throttle function for performance optimization
 */
export function throttle<T extends (...args: any[]) => any>(
  func: T,
  delay: number
): (...args: Parameters<T>) => void {
  let timeoutId: NodeJS.Timeout | null = null
  let lastExecTime = 0

  return (...args: Parameters<T>) => {
    const currentTime = Date.now()

    if (currentTime - lastExecTime > delay) {
      func(...args)
      lastExecTime = currentTime
    } else {
      if (timeoutId) {
        clearTimeout(timeoutId)
      }
      timeoutId = setTimeout(() => {
        func(...args)
        lastExecTime = Date.now()
      }, delay - (currentTime - lastExecTime))
    }
  }
}

/**
 * Debounce function for performance optimization
 */
export function debounce<T extends (...args: any[]) => any>(
  func: T,
  delay: number
): (...args: Parameters<T>) => void {
  let timeoutId: NodeJS.Timeout | null = null

  return (...args: Parameters<T>) => {
    if (timeoutId) {
      clearTimeout(timeoutId)
    }
    timeoutId = setTimeout(() => func(...args), delay)
  }
}