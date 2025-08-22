import { DataPoint } from '@/types'

export interface ProcessedDataPoint extends DataPoint {
  aggregatedCount?: number
  originalIndices?: number[]
}

/**
 * Largest Triangle Three Buckets (LTTB) downsampling algorithm
 * Maintains visual fidelity while reducing data points
 */
export function downsampleLTTB(data: DataPoint[], targetPoints: number): ProcessedDataPoint[] {
  if (data.length <= targetPoints || targetPoints < 3) {
    return data.map(d => ({ ...d }))
  }

  const bucketSize = (data.length - 2) / (targetPoints - 2)
  const result: ProcessedDataPoint[] = []
  
  // Always include first point
  result.push({ ...data[0] })
  
  let a = 0 // Initially a is the first point in the triangle
  
  for (let i = 0; i < targetPoints - 2; i++) {
    // Calculate point average for next bucket (containing c)
    let avgX = 0
    let avgY = 0
    let avgRangeStart = Math.floor((i + 2) * bucketSize) + 1
    let avgRangeEnd = Math.floor((i + 3) * bucketSize) + 1
    avgRangeEnd = avgRangeEnd < data.length ? avgRangeEnd : data.length
    
    const avgRangeLength = avgRangeEnd - avgRangeStart
    
    for (; avgRangeStart < avgRangeEnd; avgRangeStart++) {
      avgX += data[avgRangeStart].timestamp.getTime()
      avgY += data[avgRangeStart].value
    }
    avgX /= avgRangeLength
    avgY /= avgRangeLength
    
    // Get the range for this bucket
    let rangeOffs = Math.floor((i + 1) * bucketSize) + 1
    let rangeTo = Math.floor((i + 2) * bucketSize) + 1
    
    // Point a
    const pointAX = data[a].timestamp.getTime()
    const pointAY = data[a].value
    
    let maxArea = -1
    let nextA = rangeOffs
    
    for (; rangeOffs < rangeTo && rangeOffs < data.length; rangeOffs++) {
      // Calculate triangle area over three buckets
      const area = Math.abs(
        (pointAX - avgX) * (data[rangeOffs].value - pointAY) -
        (pointAX - data[rangeOffs].timestamp.getTime()) * (avgY - pointAY)
      ) * 0.5
      
      if (area > maxArea) {
        maxArea = area
        nextA = rangeOffs
      }
    }
    
    result.push({ ...data[nextA] })
    a = nextA
  }
  
  // Always include last point
  result.push({ ...data[data.length - 1] })
  
  return result
}

/**
 * Average-based downsampling
 */
export function downsampleAverage(data: DataPoint[], targetPoints: number): ProcessedDataPoint[] {
  if (data.length <= targetPoints) {
    return data.map(d => ({ ...d }))
  }

  const bucketSize = data.length / targetPoints
  const result: ProcessedDataPoint[] = []
  
  for (let i = 0; i < targetPoints; i++) {
    const start = Math.floor(i * bucketSize)
    const end = Math.floor((i + 1) * bucketSize)
    
    let sumValue = 0
    let sumTime = 0
    let count = 0
    const indices: number[] = []
    
    for (let j = start; j < end && j < data.length; j++) {
      sumValue += data[j].value
      sumTime += data[j].timestamp.getTime()
      count++
      indices.push(j)
    }
    
    if (count > 0) {
      const avgPoint = data[start]
      result.push({
        ...avgPoint,
        timestamp: new Date(sumTime / count),
        value: sumValue / count,
        aggregatedCount: count,
        originalIndices: indices
      })
    }
  }
  
  return result
}

/**
 * Min-Max downsampling - preserves peaks and valleys
 */
export function downsampleMinMax(data: DataPoint[], targetPoints: number): ProcessedDataPoint[] {
  if (data.length <= targetPoints) {
    return data.map(d => ({ ...d }))
  }

  const bucketSize = data.length / (targetPoints / 2) // Each bucket produces 2 points (min and max)
  const result: ProcessedDataPoint[] = []
  
  for (let i = 0; i < targetPoints / 2; i++) {
    const start = Math.floor(i * bucketSize)
    const end = Math.floor((i + 1) * bucketSize)
    
    let minPoint = data[start]
    let maxPoint = data[start]
    
    for (let j = start; j < end && j < data.length; j++) {
      if (data[j].value < minPoint.value) {
        minPoint = data[j]
      }
      if (data[j].value > maxPoint.value) {
        maxPoint = data[j]
      }
    }
    
    // Add points in chronological order
    if (minPoint.timestamp <= maxPoint.timestamp) {
      result.push({ ...minPoint })
      if (minPoint.id !== maxPoint.id) {
        result.push({ ...maxPoint })
      }
    } else {
      result.push({ ...maxPoint })
      if (minPoint.id !== maxPoint.id) {
        result.push({ ...minPoint })
      }
    }
  }
  
  return result.slice(0, targetPoints)
}

/**
 * Aggregate data points by time intervals
 */
export function aggregateData(
  data: DataPoint[], 
  intervalMs: number, 
  method: 'average' | 'sum' | 'min' | 'max' | 'count'
): ProcessedDataPoint[] {
  if (data.length === 0) return []
  
  const buckets = new Map<number, DataPoint[]>()
  
  // Group data points by time buckets
  data.forEach(point => {
    const bucketKey = Math.floor(point.timestamp.getTime() / intervalMs) * intervalMs
    if (!buckets.has(bucketKey)) {
      buckets.set(bucketKey, [])
    }
    buckets.get(bucketKey)!.push(point)
  })
  
  // Aggregate each bucket
  const result: ProcessedDataPoint[] = []
  
  buckets.forEach((points, bucketTime) => {
    let aggregatedValue: number
    const indices = points.map((_, index) => index)
    
    switch (method) {
      case 'average':
        aggregatedValue = points.reduce((sum, p) => sum + p.value, 0) / points.length
        break
      case 'sum':
        aggregatedValue = points.reduce((sum, p) => sum + p.value, 0)
        break
      case 'min':
        aggregatedValue = Math.min(...points.map(p => p.value))
        break
      case 'max':
        aggregatedValue = Math.max(...points.map(p => p.value))
        break
      case 'count':
        aggregatedValue = points.length
        break
      default:
        aggregatedValue = points.reduce((sum, p) => sum + p.value, 0) / points.length
    }
    
    // Use the first point as template
    const template = points[0]
    result.push({
      ...template,
      id: `aggregated_${bucketTime}`,
      timestamp: new Date(bucketTime),
      value: aggregatedValue,
      aggregatedCount: points.length,
      originalIndices: indices,
      metadata: {
        ...template.metadata,
        aggregationMethod: method,
        originalCount: points.length
      }
    })
  })
  
  // Sort by timestamp
  return result.sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime())
}

/**
 * Process data based on configuration
 */
export function processChartData(
  data: DataPoint[],
  config: {
    aggregation?: { enabled: boolean; method: 'average' | 'sum' | 'min' | 'max' | 'count'; interval: number }
    downsampling?: { enabled: boolean; maxPoints: number; algorithm: 'lttb' | 'average' | 'min-max' }
  }
): ProcessedDataPoint[] {
  let processedData: ProcessedDataPoint[] = data.map(d => ({ ...d }))
  
  // Apply aggregation first if enabled
  if (config.aggregation?.enabled) {
    processedData = aggregateData(
      processedData,
      config.aggregation.interval,
      config.aggregation.method
    )
  }
  
  // Apply downsampling if enabled and data exceeds max points
  if (config.downsampling?.enabled && processedData.length > config.downsampling.maxPoints) {
    switch (config.downsampling.algorithm) {
      case 'lttb':
        processedData = downsampleLTTB(processedData, config.downsampling.maxPoints)
        break
      case 'average':
        processedData = downsampleAverage(processedData, config.downsampling.maxPoints)
        break
      case 'min-max':
        processedData = downsampleMinMax(processedData, config.downsampling.maxPoints)
        break
    }
  }
  
  return processedData
}