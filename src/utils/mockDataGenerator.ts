import type { DataPoint } from '../types'
import { validateData, DataPointSchema } from '../types/schemas'

// Advanced pattern configuration for realistic data generation
export interface DataPattern {
  type: 'linear' | 'exponential' | 'cyclical' | 'random' | 'step' | 'sine' | 'cosine' | 'sawtooth' | 'square' | 'gaussian' | 'brownian' | 'fibonacci' | 'chaos'
  amplitude?: number
  frequency?: number
  phase?: number
  offset?: number
  trend?: number
  decay?: number
  noise?: number
  volatility?: number // For financial-like patterns
  mean?: number // For gaussian patterns
  stdDev?: number // For gaussian patterns
  persistence?: number // For brownian motion
  lyapunovExponent?: number // For chaotic patterns
}

// Seasonality configuration
export interface SeasonalityConfig {
  enabled: boolean
  dailyPattern?: DataPattern
  weeklyPattern?: DataPattern
  monthlyPattern?: DataPattern
  yearlyPattern?: DataPattern
}

// Anomaly injection configuration
export interface AnomalyConfig {
  enabled: boolean
  probability?: number // 0-1, chance of anomaly per data point
  types?: ('spike' | 'drop' | 'drift' | 'outlier')[]
  intensity?: number // 1-10, how extreme the anomalies are
}

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
  seasonality?: boolean | SeasonalityConfig
  patterns?: Record<string, DataPattern> // Category-specific patterns
  anomalies?: AnomalyConfig
  correlations?: Array<{ categories: string[]; strength: number }> // Cross-category correlations
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
  seasonality: { enabled: true },
  patterns: {},
  anomalies: { enabled: false },
  correlations: []
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
    id: `${source}-${category}-${timestamp.getTime()}-${Math.random().toString(36).substring(2, 11)}`,
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

// State for stateful patterns (brownian motion, chaos)
const patternState = new Map<string, any>()

// Apply a specific pattern to generate values
function applyPattern(pattern: DataPattern, time: number, baseValue: number, patternId?: string): number {
  let value = baseValue + (pattern.offset || 0)
  const amplitude = pattern.amplitude || 10
  const frequency = pattern.frequency || 0.1
  const phase = pattern.phase || 0
  const stateKey = patternId || 'default'
  
  switch (pattern.type) {
    case 'linear':
      value += (pattern.trend || 0) * time
      break
    case 'exponential':
      value += amplitude * Math.exp((pattern.trend || 0.01) * time)
      break
    case 'sine':
      value += amplitude * Math.sin(frequency * time + phase)
      break
    case 'cosine':
      value += amplitude * Math.cos(frequency * time + phase)
      break
    case 'cyclical':
      value += amplitude * Math.sin(frequency * time + phase)
      break
    case 'sawtooth':
      value += amplitude * (2 * ((frequency * time + phase) % 1) - 1)
      break
    case 'square':
      value += amplitude * Math.sign(Math.sin(frequency * time + phase))
      break
    case 'step':
      value += amplitude * Math.floor((frequency * time + phase) % 4) / 4
      break
    case 'random':
      value += (Math.random() - 0.5) * 2 * amplitude
      break
    case 'gaussian':
      // Box-Muller transform for gaussian distribution
      const mean = pattern.mean || 0
      const stdDev = pattern.stdDev || 1
      if (!patternState.has(stateKey + '_gaussian_spare')) {
        const u1 = Math.random()
        const u2 = Math.random()
        const z0 = Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2)
        const z1 = Math.sqrt(-2 * Math.log(u1)) * Math.sin(2 * Math.PI * u2)
        patternState.set(stateKey + '_gaussian_spare', z1)
        value += amplitude * (mean + stdDev * z0)
      } else {
        const spare = patternState.get(stateKey + '_gaussian_spare')
        patternState.delete(stateKey + '_gaussian_spare')
        value += amplitude * (mean + stdDev * spare)
      }
      break
    case 'brownian':
      // Brownian motion (random walk)
      const persistence = pattern.persistence || 0.1
      let lastValue = patternState.get(stateKey + '_brownian') || 0
      const randomStep = (Math.random() - 0.5) * 2 * amplitude * persistence
      lastValue += randomStep
      patternState.set(stateKey + '_brownian', lastValue)
      value += lastValue
      break
    case 'fibonacci':
      // Fibonacci-based oscillation
      const fibIndex = Math.floor(time * frequency) % 20 // Limit to first 20 fibonacci numbers
      const fibValue = fibonacci(fibIndex)
      value += amplitude * Math.sin(fibValue * phase + time * frequency)
      break
    case 'chaos':
      // Logistic map for chaotic behavior
      const lyapunov = pattern.lyapunovExponent || 3.7
      let chaosValue = patternState.get(stateKey + '_chaos') || 0.5
      chaosValue = lyapunov * chaosValue * (1 - chaosValue)
      patternState.set(stateKey + '_chaos', chaosValue)
      value += amplitude * (chaosValue - 0.5) * 2
      break
  }
  
  // Apply volatility (for financial-like patterns)
  if (pattern.volatility) {
    const volatilityFactor = 1 + (Math.random() - 0.5) * pattern.volatility
    value *= volatilityFactor
  }
  
  // Apply decay if specified
  if (pattern.decay) {
    value *= Math.exp(-pattern.decay * time)
  }
  
  // Add noise
  if (pattern.noise) {
    value += (Math.random() - 0.5) * 2 * pattern.noise * Math.abs(value)
  }
  
  return value
}

// Helper function for fibonacci sequence
function fibonacci(n: number): number {
  if (n <= 1) return n
  let a = 0, b = 1
  for (let i = 2; i <= n; i++) {
    [a, b] = [b, a + b]
  }
  return b
}

// Apply seasonality patterns
function applySeasonality(
  timestamp: Date,
  baseValue: number,
  seasonality: SeasonalityConfig,
  valueRange: { min: number; max: number }
): number {
  if (!seasonality.enabled) return baseValue
  
  let seasonalValue = baseValue
  const range = valueRange.max - valueRange.min
  
  // Daily pattern (24-hour cycle)
  if (seasonality.dailyPattern) {
    const hourOfDay = timestamp.getHours() + timestamp.getMinutes() / 60
    const dailyTime = (hourOfDay / 24) * 2 * Math.PI
    seasonalValue += applyPattern(seasonality.dailyPattern, dailyTime, 0) * range * 0.1
  }
  
  // Weekly pattern (7-day cycle)
  if (seasonality.weeklyPattern) {
    const dayOfWeek = timestamp.getDay()
    const weeklyTime = (dayOfWeek / 7) * 2 * Math.PI
    seasonalValue += applyPattern(seasonality.weeklyPattern, weeklyTime, 0) * range * 0.05
  }
  
  // Monthly pattern (30-day cycle)
  if (seasonality.monthlyPattern) {
    const dayOfMonth = timestamp.getDate()
    const monthlyTime = (dayOfMonth / 30) * 2 * Math.PI
    seasonalValue += applyPattern(seasonality.monthlyPattern, monthlyTime, 0) * range * 0.03
  }
  
  // Yearly pattern (365-day cycle)
  if (seasonality.yearlyPattern) {
    const dayOfYear = Math.floor((timestamp.getTime() - new Date(timestamp.getFullYear(), 0, 0).getTime()) / (1000 * 60 * 60 * 24))
    const yearlyTime = (dayOfYear / 365) * 2 * Math.PI
    seasonalValue += applyPattern(seasonality.yearlyPattern, yearlyTime, 0) * range * 0.02
  }
  
  return seasonalValue
}

// Inject anomalies into data
function injectAnomalies(
  value: number,
  timestamp: Date,
  category: string,
  anomalies: AnomalyConfig,
  valueRange: { min: number; max: number }
): number {
  if (!anomalies.enabled || Math.random() > (anomalies.probability || 0.01)) {
    return value
  }
  
  const types = anomalies.types || ['spike', 'drop', 'outlier']
  const anomalyType = types[Math.floor(Math.random() * types.length)]
  const intensity = anomalies.intensity || 3
  const range = valueRange.max - valueRange.min
  
  switch (anomalyType) {
    case 'spike':
      return Math.min(valueRange.max, value + range * intensity * 0.1)
    case 'drop':
      return Math.max(valueRange.min, value - range * intensity * 0.1)
    case 'drift':
      // Gradual shift - would need state tracking for proper implementation
      return value + (Math.random() - 0.5) * range * intensity * 0.05
    case 'outlier':
      return Math.random() > 0.5 
        ? Math.min(valueRange.max, value + range * intensity * 0.15)
        : Math.max(valueRange.min, value - range * intensity * 0.15)
    default:
      return value
  }
}

// Calculate base value using advanced patterns
function calculateBaseValue(
  timestamp: Date,
  startDate: Date,
  category: string,
  source: string,
  config: Required<DataGenerationConfig>
): number {
  const timeProgress = (timestamp.getTime() - startDate.getTime()) / 
                     (config.endDate.getTime() - startDate.getTime())
  const timeInSeconds = (timestamp.getTime() - startDate.getTime()) / 1000
  
  const { min, max } = config.valueRange
  const range = max - min
  
  let baseValue = min + range * 0.5 // Start at middle
  
  // Create unique pattern ID for stateful patterns
  const patternId = `${category}-${source}`
  
  // Apply category-specific pattern if available
  if (config.patterns && config.patterns[category]) {
    baseValue = applyPattern(config.patterns[category], timeInSeconds, baseValue, patternId)
  } else {
    // Apply legacy trend type
    switch (config.trendType) {
      case 'linear':
        baseValue += range * 0.3 * timeProgress
        break
      case 'exponential':
        baseValue += range * 0.3 * Math.pow(timeProgress, 2)
        break
      case 'cyclical':
        const cycles = 3
        baseValue += range * 0.2 * Math.sin(timeProgress * cycles * 2 * Math.PI)
        break
      case 'random':
        baseValue += (Math.random() - 0.5) * range * 0.4
        break
    }
  }
  
  // Apply seasonality
  if (config.seasonality) {
    if (typeof config.seasonality === 'boolean' && config.seasonality) {
      // Legacy daily pattern
      const hourOfDay = timestamp.getHours()
      const dailyPattern = Math.sin((hourOfDay / 24) * 2 * Math.PI - Math.PI / 2)
      baseValue += range * 0.15 * dailyPattern
    } else if (typeof config.seasonality === 'object') {
      baseValue = applySeasonality(timestamp, baseValue, config.seasonality, config.valueRange)
    }
  }
  
  // Add source-specific offset
  const sourceHash = source.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0)
  const sourceOffset = (sourceHash % 20 - 10) / 100 * range
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
  
  // Apply anomalies if configured
  if (config.anomalies) {
    baseValue = injectAnomalies(baseValue, timestamp, category, config.anomalies, config.valueRange)
  }
  
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
    
    if (validation.success && validation.data && validation.data.metadata) {
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

// Create realistic scenario configurations
export function createScenarioConfig(scenario: 'normal' | 'high_load' | 'system_failure' | 'maintenance' | 'peak_hours' | 'weekend'): Partial<DataGenerationConfig> {
  const baseConfig: Partial<DataGenerationConfig> = {
    categories: ['cpu', 'memory', 'network', 'disk', 'temperature'],
    sources: ['web-server-1', 'web-server-2', 'database', 'cache', 'load-balancer'],
    valueRange: { min: 0, max: 100 }
  }
  
  switch (scenario) {
    case 'normal':
      return {
        ...baseConfig,
        patterns: {
          cpu: { type: 'sine', amplitude: 15, frequency: 0.1, offset: 35, noise: 0.05 },
          memory: { type: 'linear', trend: 0.001, offset: 45, noise: 0.03 },
          network: { type: 'cyclical', amplitude: 20, frequency: 0.2, offset: 30, noise: 0.1 },
          disk: { type: 'step', amplitude: 10, frequency: 0.05, offset: 70, noise: 0.02 },
          temperature: { type: 'sine', amplitude: 8, frequency: 0.08, offset: 65, noise: 0.04 }
        },
        seasonality: {
          enabled: true,
          dailyPattern: { type: 'sine', amplitude: 10, frequency: 1, phase: -Math.PI/2 }
        },
        anomalies: { enabled: true, probability: 0.005, types: ['spike', 'drop'], intensity: 2 }
      }
      
    case 'high_load':
      return {
        ...baseConfig,
        patterns: {
          cpu: { type: 'linear', trend: 0.01, offset: 60, noise: 0.1 },
          memory: { type: 'exponential', trend: 0.002, offset: 70, noise: 0.05 },
          network: { type: 'random', amplitude: 30, offset: 80, noise: 0.2 },
          disk: { type: 'sine', amplitude: 15, frequency: 0.3, offset: 85, noise: 0.08 },
          temperature: { type: 'linear', trend: 0.005, offset: 75, noise: 0.06 }
        },
        anomalies: { enabled: true, probability: 0.02, types: ['spike', 'outlier'], intensity: 4 }
      }
      
    case 'system_failure':
      return {
        ...baseConfig,
        patterns: {
          cpu: { type: 'random', amplitude: 40, offset: 90, noise: 0.3 },
          memory: { type: 'step', amplitude: 20, frequency: 0.1, offset: 95, noise: 0.1 },
          network: { type: 'sawtooth', amplitude: 50, frequency: 0.5, offset: 50, noise: 0.4 },
          disk: { type: 'square', amplitude: 30, frequency: 0.2, offset: 80, noise: 0.2 },
          temperature: { type: 'exponential', trend: 0.01, offset: 85, noise: 0.15 }
        },
        anomalies: { enabled: true, probability: 0.1, types: ['spike', 'drop', 'outlier'], intensity: 8 }
      }
      
    case 'maintenance':
      return {
        ...baseConfig,
        patterns: {
          cpu: { type: 'step', amplitude: 5, frequency: 0.02, offset: 15, noise: 0.02 },
          memory: { type: 'linear', trend: -0.001, offset: 25, noise: 0.01 },
          network: { type: 'sine', amplitude: 5, frequency: 0.05, offset: 10, noise: 0.03 },
          disk: { type: 'random', amplitude: 3, offset: 20, noise: 0.01 },
          temperature: { type: 'sine', amplitude: 3, frequency: 0.03, offset: 45, noise: 0.02 }
        },
        anomalies: { enabled: false }
      }
      
    case 'peak_hours':
      return {
        ...baseConfig,
        patterns: {
          cpu: { type: 'sine', amplitude: 25, frequency: 0.15, offset: 55, noise: 0.08 },
          memory: { type: 'cyclical', amplitude: 20, frequency: 0.1, offset: 65, noise: 0.06 },
          network: { type: 'sine', amplitude: 35, frequency: 0.2, offset: 70, noise: 0.15 },
          disk: { type: 'linear', trend: 0.002, offset: 75, noise: 0.05 },
          temperature: { type: 'sine', amplitude: 12, frequency: 0.12, offset: 70, noise: 0.07 }
        },
        seasonality: {
          enabled: true,
          dailyPattern: { type: 'sine', amplitude: 20, frequency: 1, phase: 0 }
        },
        anomalies: { enabled: true, probability: 0.01, types: ['spike'], intensity: 3 }
      }
      
    case 'weekend':
      return {
        ...baseConfig,
        patterns: {
          cpu: { type: 'sine', amplitude: 8, frequency: 0.05, offset: 20, noise: 0.03 },
          memory: { type: 'linear', trend: 0.0005, offset: 30, noise: 0.02 },
          network: { type: 'random', amplitude: 10, offset: 15, noise: 0.05 },
          disk: { type: 'sine', amplitude: 5, frequency: 0.03, offset: 40, noise: 0.02 },
          temperature: { type: 'sine', amplitude: 5, frequency: 0.04, offset: 55, noise: 0.03 }
        },
        seasonality: {
          enabled: true,
          dailyPattern: { type: 'sine', amplitude: 5, frequency: 1, phase: Math.PI }
        },
        anomalies: { enabled: true, probability: 0.002, types: ['drop'], intensity: 1 }
      }
      
    default:
      return baseConfig
  }
}

// Generate data with realistic correlations between categories
export function generateCorrelatedData(
  count: number,
  correlations: Array<{ categories: string[]; strength: number }>,
  config: Partial<DataGenerationConfig> = {}
): DataPoint[] {
  const fullConfig = { ...DEFAULT_CONFIG, ...config }
  const dataPoints: DataPoint[] = []
  
  // Generate base data
  const baseData = generateHistoricalData(count, fullConfig)
  
  // Apply correlations
  const dataByTimestamp = new Map<number, DataPoint[]>()
  baseData.forEach(point => {
    const timestamp = point.timestamp.getTime()
    if (!dataByTimestamp.has(timestamp)) {
      dataByTimestamp.set(timestamp, [])
    }
    dataByTimestamp.get(timestamp)!.push(point)
  })
  
  // Process each timestamp group
  dataByTimestamp.forEach(points => {
    correlations.forEach(correlation => {
      const categoryPoints = points.filter(p => correlation.categories.includes(p.category))
      if (categoryPoints.length < 2) return
      
      // Use first category as reference
      const referencePoint = categoryPoints[0]
      const referenceDeviation = referencePoint.value - 50 // Assume 50 is baseline
      
      // Apply correlation to other categories
      categoryPoints.slice(1).forEach(point => {
        const correlatedDeviation = referenceDeviation * correlation.strength
        point.value = Math.max(
          fullConfig.valueRange.min,
          Math.min(fullConfig.valueRange.max, 50 + correlatedDeviation)
        )
      })
    })
    
    dataPoints.push(...points)
  })
  
  return dataPoints.sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime())
}

// Generate performance test datasets with specific characteristics
export function generatePerformanceTestData(testType: 'memory_stress' | 'rendering_stress' | 'filter_stress' | 'streaming_stress'): DataPoint[] {
  switch (testType) {
    case 'memory_stress':
      return generateLargeDataset(100000) // 100k points
      
    case 'rendering_stress':
      return generateHistoricalData(50000, {
        categories: ['cpu', 'memory', 'network'],
        sources: ['server-1'],
        patterns: {
          cpu: { type: 'random', amplitude: 50, noise: 0.3 },
          memory: { type: 'sawtooth', amplitude: 40, frequency: 0.5, noise: 0.2 },
          network: { type: 'square', amplitude: 60, frequency: 0.3, noise: 0.4 }
        }
      })
      
    case 'filter_stress':
      return generateHistoricalData(75000, {
        categories: ['cpu', 'memory', 'network', 'disk', 'temperature', 'bandwidth', 'latency', 'errors'],
        sources: ['web-1', 'web-2', 'db-1', 'db-2', 'cache-1', 'cache-2', 'lb-1', 'lb-2'],
        anomalies: { enabled: true, probability: 0.05, types: ['spike', 'drop', 'outlier'], intensity: 5 }
      })
      
    case 'streaming_stress':
      return generateTimeSeriesData({
        startDate: new Date(Date.now() - 60 * 60 * 1000), // 1 hour
        endDate: new Date(),
        pointsPerHour: 3600, // 1 point per second
        categories: ['realtime'],
        sources: ['stream']
      })
      
    default:
      return generateLargeDataset(10000)
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

// Performance benchmarking utilities
export function benchmarkDataGeneration(size: number, iterations: number = 5): {
  averageTime: number
  minTime: number
  maxTime: number
  pointsPerSecond: number
} {
  const times: number[] = []
  
  for (let i = 0; i < iterations; i++) {
    const startTime = performance.now()
    generateLargeDataset(size)
    const endTime = performance.now()
    times.push(endTime - startTime)
  }
  
  const averageTime = times.reduce((sum, time) => sum + time, 0) / times.length
  const minTime = Math.min(...times)
  const maxTime = Math.max(...times)
  const pointsPerSecond = size / (averageTime / 1000)
  
  return {
    averageTime,
    minTime,
    maxTime,
    pointsPerSecond
  }
}

// Generate data with realistic business patterns
export function generateBusinessMetricsData(
  duration: number = 24 * 60 * 60 * 1000, // 24 hours in ms
  config: Partial<DataGenerationConfig> = {}
): DataPoint[] {
  const businessConfig: Partial<DataGenerationConfig> = {
    categories: ['revenue', 'users', 'orders', 'conversion_rate', 'bounce_rate'],
    sources: ['web', 'mobile', 'api', 'admin'],
    patterns: {
      revenue: { type: 'sine', amplitude: 1000, frequency: 0.1, offset: 5000, noise: 0.1 },
      users: { type: 'gaussian', amplitude: 500, mean: 0, stdDev: 1, offset: 2000, noise: 0.05 },
      orders: { type: 'brownian', amplitude: 50, persistence: 0.2, offset: 200, noise: 0.08 },
      conversion_rate: { type: 'sine', amplitude: 2, frequency: 0.05, offset: 8, noise: 0.02 },
      bounce_rate: { type: 'chaos', amplitude: 10, lyapunovExponent: 3.8, offset: 45, noise: 0.03 }
    },
    seasonality: {
      enabled: true,
      dailyPattern: { type: 'sine', amplitude: 20, frequency: 1, phase: -Math.PI/2 },
      weeklyPattern: { type: 'sine', amplitude: 15, frequency: 1/7, phase: 0 }
    },
    anomalies: { enabled: true, probability: 0.01, types: ['spike', 'drop'], intensity: 3 },
    ...config
  }
  
  const endDate = new Date()
  const startDate = new Date(endDate.getTime() - duration)
  
  return generateTimeSeriesData({
    ...businessConfig,
    startDate,
    endDate,
    pointsPerHour: 60 // One point per minute
  })
}

// Generate IoT sensor data with realistic patterns
export function generateIoTSensorData(
  sensorCount: number = 10,
  duration: number = 60 * 60 * 1000, // 1 hour in ms
  config: Partial<DataGenerationConfig> = {}
): DataPoint[] {
  const sensors = Array.from({ length: sensorCount }, (_, i) => `sensor-${i + 1}`)
  
  const iotConfig: Partial<DataGenerationConfig> = {
    categories: ['temperature', 'humidity', 'pressure', 'light', 'motion'],
    sources: sensors,
    patterns: {
      temperature: { type: 'sine', amplitude: 5, frequency: 0.02, offset: 22, noise: 0.1 },
      humidity: { type: 'brownian', amplitude: 3, persistence: 0.1, offset: 65, noise: 0.05 },
      pressure: { type: 'linear', trend: 0.001, offset: 1013, noise: 0.02 },
      light: { type: 'square', amplitude: 500, frequency: 0.001, offset: 300, noise: 0.1 },
      motion: { type: 'random', amplitude: 1, offset: 0, noise: 0.3 }
    },
    valueRange: { min: 0, max: 1000 },
    anomalies: { enabled: true, probability: 0.005, types: ['spike', 'outlier'], intensity: 2 },
    ...config
  }
  
  const endDate = new Date()
  const startDate = new Date(endDate.getTime() - duration)
  
  return generateTimeSeriesData({
    ...iotConfig,
    startDate,
    endDate,
    pointsPerHour: 3600 // One point per second
  })
}

// Generate financial market data
export function generateFinancialData(
  symbols: string[] = ['AAPL', 'GOOGL', 'MSFT', 'TSLA'],
  duration: number = 7 * 24 * 60 * 60 * 1000, // 1 week in ms
  config: Partial<DataGenerationConfig> = {}
): DataPoint[] {
  const financialConfig: Partial<DataGenerationConfig> = {
    categories: ['price', 'volume', 'volatility'],
    sources: symbols,
    patterns: {
      price: { type: 'brownian', amplitude: 10, persistence: 0.05, volatility: 0.02, offset: 150, noise: 0.01 },
      volume: { type: 'gaussian', amplitude: 1000000, mean: 0, stdDev: 0.5, offset: 5000000, noise: 0.1 },
      volatility: { type: 'chaos', amplitude: 5, lyapunovExponent: 3.9, offset: 15, noise: 0.05 }
    },
    valueRange: { min: 0, max: 1000 },
    seasonality: {
      enabled: true,
      dailyPattern: { type: 'sine', amplitude: 5, frequency: 1, phase: Math.PI/4 }
    },
    anomalies: { enabled: true, probability: 0.02, types: ['spike', 'drop'], intensity: 4 },
    ...config
  }
  
  const endDate = new Date()
  const startDate = new Date(endDate.getTime() - duration)
  
  return generateTimeSeriesData({
    ...financialConfig,
    startDate,
    endDate,
    pointsPerHour: 240 // Every 15 seconds during market hours
  })
}

// Generate network monitoring data
export function generateNetworkMonitoringData(
  nodeCount: number = 5,
  duration: number = 2 * 60 * 60 * 1000, // 2 hours in ms
  config: Partial<DataGenerationConfig> = {}
): DataPoint[] {
  const nodes = Array.from({ length: nodeCount }, (_, i) => `node-${i + 1}`)
  
  const networkConfig: Partial<DataGenerationConfig> = {
    categories: ['latency', 'throughput', 'packet_loss', 'cpu_usage', 'memory_usage'],
    sources: nodes,
    patterns: {
      latency: { type: 'gaussian', amplitude: 20, mean: 0, stdDev: 1, offset: 50, noise: 0.1 },
      throughput: { type: 'sine', amplitude: 100, frequency: 0.1, offset: 500, noise: 0.15 },
      packet_loss: { type: 'random', amplitude: 2, offset: 1, noise: 0.5 },
      cpu_usage: { type: 'brownian', amplitude: 15, persistence: 0.1, offset: 45, noise: 0.05 },
      memory_usage: { type: 'linear', trend: 0.002, offset: 60, noise: 0.03 }
    },
    valueRange: { min: 0, max: 100 },
    anomalies: { enabled: true, probability: 0.008, types: ['spike', 'drop', 'outlier'], intensity: 3 },
    correlations: [
      { categories: ['cpu_usage', 'memory_usage'], strength: 0.6 },
      { categories: ['latency', 'packet_loss'], strength: 0.4 }
    ],
    ...config
  }
  
  const endDate = new Date()
  const startDate = new Date(endDate.getTime() - duration)
  
  return generateCorrelatedData(
    Math.floor(duration / (10 * 1000)), // One point every 10 seconds
    networkConfig.correlations || [],
    {
      ...networkConfig,
      startDate,
      endDate
    }
  )
}

// Generate data with configurable streaming rates for testing
export function generateStreamingTestData(
  ratePerSecond: number = 100,
  categories: string[] = ['metric1', 'metric2', 'metric3'],
  sources: string[] = ['source1', 'source2']
): AsyncGenerator<DataPoint[], void, unknown> {
  const config: Partial<DataGenerationConfig> = {
    categories,
    sources,
    patterns: {
      metric1: { type: 'sine', amplitude: 20, frequency: 0.1, offset: 50, noise: 0.1 },
      metric2: { type: 'brownian', amplitude: 10, persistence: 0.2, offset: 30, noise: 0.05 },
      metric3: { type: 'gaussian', amplitude: 15, mean: 0, stdDev: 1, offset: 70, noise: 0.08 }
    },
    anomalies: { enabled: true, probability: 0.01, types: ['spike', 'drop'], intensity: 2 }
  }
  
  return generateRealtimeStream(config, ratePerSecond)
}

// Generate data for specific testing scenarios
export function generateScenarioTestData(
  scenario: 'load_test' | 'memory_test' | 'filter_test' | 'chart_test' | 'anomaly_test',
  size: number = 10000
): DataPoint[] {
  switch (scenario) {
    case 'load_test':
      return generateLargeDataset(size)
      
    case 'memory_test':
      return generateHistoricalData(size, {
        categories: ['memory_intensive'],
        sources: ['test'],
        patterns: {
          memory_intensive: { type: 'random', amplitude: 50, noise: 0.3 }
        }
      })
      
    case 'filter_test':
      return generateHistoricalData(size, {
        categories: ['filterable_1', 'filterable_2', 'filterable_3', 'filterable_4'],
        sources: ['source_a', 'source_b', 'source_c', 'source_d'],
        anomalies: { enabled: true, probability: 0.1, types: ['spike', 'drop', 'outlier'], intensity: 5 }
      })
      
    case 'chart_test':
      return generateHistoricalData(size, {
        categories: ['smooth_line', 'jagged_line', 'stepped_line'],
        sources: ['chart_source'],
        patterns: {
          smooth_line: { type: 'sine', amplitude: 30, frequency: 0.05, offset: 50, noise: 0.02 },
          jagged_line: { type: 'random', amplitude: 40, offset: 50, noise: 0.4 },
          stepped_line: { type: 'step', amplitude: 25, frequency: 0.1, offset: 50, noise: 0.05 }
        }
      })
      
    case 'anomaly_test':
      return generateHistoricalData(size, {
        categories: ['normal_data'],
        sources: ['anomaly_source'],
        patterns: {
          normal_data: { type: 'sine', amplitude: 10, frequency: 0.1, offset: 50, noise: 0.05 }
        },
        anomalies: { enabled: true, probability: 0.05, types: ['spike', 'drop', 'outlier'], intensity: 8 }
      })
      
    default:
      return generateLargeDataset(size)
  }
}

// Clear pattern state (useful for testing)
export function clearPatternState(): void {
  patternState.clear()
}

// Get pattern state for debugging
export function getPatternState(): Map<string, any> {
  return new Map(patternState)
}
