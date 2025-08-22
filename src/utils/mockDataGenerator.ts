import type { DataPoint } from '../types'
import { validateData, DataPointSchema } from '../types/schemas'

// Configuration for data generation patterns
export interface DataGenerationConfig {
  startDate?: Date
  endDate?: Date
  pointsPerHour?: number
  categories?: string[]
  sources?: string[]
  valueRange?: { min: number; max: number }
  trendType?: 'linear' | 'exponential' | 'cyclical' | 'random'
  noiseLevel?: number // 0-1, amount of random noise
  seasonality?: boolean
}

// Default configuration
const DEFAULT_CONFIG: Required<DataGenerationConfig> = {
  startDate: new Date(Date.now() - 24 * 60 * 60 * 1000), // 24 hours ago
  endDate: new Date(),
  pointsPerHour: 100,
  categories: ['cpu', 'memory', 'network', 'disk', 'temperature'],
  sources: ['server-1', 'server-2', 'server-3', 'database', 'cache'],
  valueRange: { min: 0, max: 100 },
  trendType: 'cyclical',
  noiseLevel: 0.1,
  seasonality: true
}

// Generate a single data point
export function generateDataPoint(
  timestamp: Date,
  category: string,
  source: string,
  baseValue: number,
  config: Partial<DataGenerationConfig> = {}
): DataPoint {
  const fullConfig = { ...DEFAULT_CONFIG, ...config }
  
  // Add noise to the base value
  const noise = (Math.random() - 0.5) * 2 * fullConfig.noiseLevel * baseValue
  const value = Math.max(
    fullConfig.valueRange.min,
    Math.min(fullConfig.valueRange.max, baseValue + noise)
  )
  
  // Generate metadata based on category
  const metadata = generateMetadata(category, source, value)
  
  return {
    id: `${source}-${category}-${timestamp.getTime()}-${Math.random().toString(36).substr(2, 9)}`,
    timestamp,
    value: Math.round(value * 100) / 100, // Round to 2 decimal places
    category,
    metadata,
    source
  }
}

// Generate metadata based on category and value
function generateMetadata(category: string, source: string, value: number): Record<string, any> {
  const baseMetadata = {
    unit: getUnitForCategory(category),
    threshold: getThresholdForCategory(category),
    status: value > getThresholdForCategory(category) ? 'warning' : 'normal'
  }
  
  // Add category-specific metadata
  switch (category) {
    case 'cpu':
      return {
        ...baseMetadata,
        cores: Math.floor(Math.random() * 16) + 1,
        frequency: Math.floor(Math.random() * 2000) + 2000 // 2-4 GHz
      }
    case 'memory':
      return {
        ...baseMetadata,
        total: Math.floor(Math.random() * 32) + 8, // 8-40 GB
        available: Math.floor(value * 0.3) // Rough available memory
      }
    case 'network':
      return {
        ...baseMetadata,
        interface: ['eth0', 'eth1', 'wlan0'][Math.floor(Math.random() * 3)],
        protocol: ['tcp', 'udp', 'http'][Math.floor(Math.random() * 3)]
      }
    case 'disk':
      return {
        ...baseMetadata,
        filesystem: ['/dev/sda1', '/dev/sdb1', '/dev/nvme0n1'][Math.floor(Math.random() * 3)],
        mountPoint: ['/', '/home', '/var'][Math.floor(Math.random() * 3)]
      }
    case 'temperature':
      return {
        ...baseMetadata,
        sensor: ['cpu', 'gpu', 'motherboard'][Math.floor(Math.random() * 3)],
        location: source
      }
    default:
      return baseMetadata
  }
}

// Get appropriate unit for category
function getUnitForCategory(category: string): string {
  const units: Record<string, string> = {
    cpu: '%',
    memory: '%',
    network: 'Mbps',
    disk: '%',
    temperature: '°C'
  }
  return units[category] || 'units'
}

// Get threshold for category
function getThresholdForCategory(category: string): number {
  const thresholds: Record<string, number> = {
    cpu: 80,
    memory: 85,
    network: 90,
    disk: 90,
    temperature: 70
  }
  return thresholds[category] || 80
}

// Calculate base value using different trend patterns
function calculateBaseValue(
  timestamp: Date,
  startDate: Date,
  category: string,
  source: string,
  config: Required<DataGenerationConfig>
): number {
  const timeProgress = (timestamp.getTime() - startDate.getTime()) / 
                     (config.endDate.getTime() - startDate.getTime())
  
  const { min, max } = config.valueRange
  const range = max - min
  
  let baseValue = min + range * 0.5 // Start at middle
  
  // Apply trend
  switch (config.trendType) {
    case 'linear':
      baseValue += range * 0.3 * timeProgress
      break
    case 'exponential':
      baseValue += range * 0.3 * Math.pow(timeProgress, 2)
      break
    case 'cyclical':
      const cycles = 3 // Number of cycles over the time period
      baseValue += range * 0.2 * Math.sin(timeProgress * cycles * 2 * Math.PI)
      break
    case 'random':
      baseValue += (Math.random() - 0.5) * range * 0.4
      break
  }
  
  // Add seasonality (daily pattern)
  if (config.seasonality) {
    const hourOfDay = timestamp.getHours()
    const dailyPattern = Math.sin((hourOfDay / 24) * 2 * Math.PI - Math.PI / 2) // Peak at noon
    baseValue += range * 0.15 * dailyPattern
  }
  
  // Add source-specific offset
  const sourceHash = source.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0)
  const sourceOffset = (sourceHash % 20 - 10) / 100 * range // ±10% based on source
  baseValue += sourceOffset
  
  // Add category-specific baseline
  const categoryBaselines: Record<string, number> = {
    cpu: 0.3,
    memory: 0.4,
    network: 0.2,
    disk: 0.5,
    temperature: 0.6
  }
  const categoryBaseline = categoryBaselines[category] || 0.4
  baseValue = min + (baseValue - min) * categoryBaseline + range * categoryBaseline
  
  return Math.max(min, Math.min(max, baseValue))
}

// Generate historical data points
export function generateHistoricalData(
  count: number,
  config: Partial<DataGenerationConfig> = {}
): DataPoint[] {
  const fullConfig = { ...DEFAULT_CONFIG, ...config }
  const dataPoints: DataPoint[] = []
  
  const totalDuration = fullConfig.endDate.getTime() - fullConfig.startDate.getTime()
  const timeStep = totalDuration / count
  
  for (let i = 0; i < count; i++) {
    const timestamp = new Date(fullConfig.startDate.getTime() + i * timeStep)
    
    // Generate points for each combination of category and source
    for (const category of fullConfig.categories) {
      for (const source of fullConfig.sources) {
        const baseValue = calculateBaseValue(timestamp, fullConfig.startDate, category, source, fullConfig)
        const dataPoint = generateDataPoint(timestamp, category, source, baseValue, config)
        dataPoints.push(dataPoint)
      }
    }
  }
  
  // Sort by timestamp
  return dataPoints.sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime())
}

// Generate time-series data with specific patterns
export function generateTimeSeriesData(config: Partial<DataGenerationConfig> = {}): DataPoint[] {
  const fullConfig = { ...DEFAULT_CONFIG, ...config }
  const totalDuration = fullConfig.endDate.getTime() - fullConfig.startDate.getTime()
  const totalPoints = Math.floor((totalDuration / (60 * 60 * 1000)) * fullConfig.pointsPerHour)
  
  return generateHistoricalData(totalPoints, config)
}

// Generate real-time streaming data
export async function* generateRealtimeStream(
  config: Partial<DataGenerationConfig> = {},
  ratePerSecond: number = 10
): AsyncGenerator<DataPoint[], void, unknown> {
  const fullConfig = { ...DEFAULT_CONFIG, ...config }
  const intervalMs = 1000 / ratePerSecond
  
  while (true) {
    const batch: DataPoint[] = []
    const now = new Date()
    
    // Generate one point per category/source combination
    for (const category of fullConfig.categories) {
      for (const source of fullConfig.sources) {
        const baseValue = calculateBaseValue(now, fullConfig.startDate, category, source, fullConfig)
        const dataPoint = generateDataPoint(now, category, source, baseValue, config)
        batch.push(dataPoint)
      }
    }
    
    yield batch
    
    // Wait for next interval
    await new Promise(resolve => setTimeout(resolve, intervalMs))
  }
}

// Generate data with specific patterns for testing
export function generateTestData(pattern: 'spike' | 'gradual' | 'stable' | 'noisy', count: number = 1000): DataPoint[] {
  const baseConfig: Partial<DataGenerationConfig> = {
    categories: ['test'],
    sources: ['test-source'],
    pointsPerHour: count,
    startDate: new Date(Date.now() - 60 * 60 * 1000), // 1 hour ago
    endDate: new Date()
  }
  
  switch (pattern) {
    case 'spike':
      return generateHistoricalData(count, {
        ...baseConfig,
        trendType: 'exponential',
        noiseLevel: 0.05
      })
    case 'gradual':
      return generateHistoricalData(count, {
        ...baseConfig,
        trendType: 'linear',
        noiseLevel: 0.1
      })
    case 'stable':
      return generateHistoricalData(count, {
        ...baseConfig,
        trendType: 'random',
        noiseLevel: 0.02,
        valueRange: { min: 45, max: 55 }
      })
    case 'noisy':
      return generateHistoricalData(count, {
        ...baseConfig,
        trendType: 'cyclical',
        noiseLevel: 0.3
      })
    default:
      return generateHistoricalData(count, baseConfig)
  }
}

// Validate generated data
export function validateGeneratedData(dataPoints: DataPoint[]): {
  valid: DataPoint[]
  invalid: { index: number; errors: string[] }[]
  summary: {
    total: number
    valid: number
    invalid: number
    categories: Set<string>
    sources: Set<string>
    timeRange: { start: Date; end: Date } | null
  }
} {
  const valid: DataPoint[] = []
  const invalid: { index: number; errors: string[] }[] = []
  const categories = new Set<string>()
  const sources = new Set<string>()
  let minTime: Date | null = null
  let maxTime: Date | null = null
  
  dataPoints.forEach((point, index) => {
    const validation = validateData(DataPointSchema, point)
    
    if (validation.success && validation.data) {
      valid.push(validation.data)
      categories.add(validation.data.category)
      sources.add(validation.data.source)
      
      if (!minTime || validation.data.timestamp < minTime) {
        minTime = validation.data.timestamp
      }
      if (!maxTime || validation.data.timestamp > maxTime) {
        maxTime = validation.data.timestamp
      }
    } else {
      invalid.push({
        index,
        errors: validation.errors || ['Unknown validation error']
      })
    }
  })
  
  return {
    valid,
    invalid,
    summary: {
      total: dataPoints.length,
      valid: valid.length,
      invalid: invalid.length,
      categories,
      sources,
      timeRange: minTime && maxTime ? { start: minTime, end: maxTime } : null
    }
  }
}

// Utility to create large datasets for performance testing
export function generateLargeDataset(size: number): DataPoint[] {
  const batchSize = 10000
  const batches = Math.ceil(size / batchSize)
  const allData: DataPoint[] = []
  
  // Calculate how many points per category/source combination
  const categories = ['cpu', 'memory']
  const sources = ['server-1', 'server-2']
  const combinationsCount = categories.length * sources.length
  const pointsPerCombination = Math.ceil(size / combinationsCount)
  
  for (let i = 0; i < batches; i++) {
    const batchCount = Math.min(batchSize, size - i * batchSize)
    const batchPointsPerCombination = Math.ceil(batchCount / combinationsCount)
    const startDate = new Date(Date.now() - (batches - i) * 60 * 60 * 1000)
    const endDate = new Date(Date.now() - (batches - i - 1) * 60 * 60 * 1000)
    
    const batchData = generateHistoricalData(batchPointsPerCombination, {
      startDate,
      endDate,
      categories,
      sources
    })
    
    allData.push(...batchData)
  }
  
  // Trim to exact size and sort
  return allData
    .slice(0, size)
    .sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime())
}