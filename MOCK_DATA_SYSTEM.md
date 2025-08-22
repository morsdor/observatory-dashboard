# Mock Data Generation System

## Overview

The Observatory Dashboard includes a comprehensive mock data generation system designed to create realistic, high-volume test data for development, testing, and performance validation. This system supports multiple data patterns, scenarios, and streaming configurations to simulate real-world data conditions.

## Key Features

### 1. Advanced Pattern Generation

The system supports multiple sophisticated data patterns:

- **Linear**: Steady growth or decline trends
- **Exponential**: Accelerating growth patterns
- **Sine/Cosine**: Cyclical patterns with configurable frequency and amplitude
- **Gaussian**: Normal distribution patterns with configurable mean and standard deviation
- **Brownian Motion**: Random walk patterns with persistence
- **Chaotic**: Logistic map-based chaotic patterns
- **Fibonacci**: Fibonacci sequence-based oscillations
- **Sawtooth/Square**: Geometric wave patterns
- **Random**: Pure random noise patterns

### 2. Seasonality Support

Configurable seasonality patterns at multiple time scales:

- **Daily Patterns**: Business hours, peak usage times
- **Weekly Patterns**: Weekday vs weekend variations
- **Monthly Patterns**: Month-end spikes, seasonal trends
- **Yearly Patterns**: Annual cycles and seasonal variations

### 3. Anomaly Injection

Realistic anomaly generation for testing edge cases:

- **Spikes**: Sudden value increases
- **Drops**: Sudden value decreases
- **Outliers**: Values significantly outside normal range
- **Drift**: Gradual baseline shifts
- Configurable probability and intensity

### 4. Specialized Data Generators

#### Business Metrics Data
```typescript
generateBusinessMetricsData(duration, config)
```
Generates realistic business KPIs:
- Revenue, users, orders, conversion rates
- Web, mobile, API traffic patterns
- Seasonal business patterns

#### IoT Sensor Data
```typescript
generateIoTSensorData(sensorCount, duration, config)
```
Simulates IoT device data:
- Temperature, humidity, pressure, light, motion
- Multiple sensor sources
- High-frequency data generation (up to 1 point/second)

#### Financial Market Data
```typescript
generateFinancialData(symbols, duration, config)
```
Creates realistic financial time series:
- Price, volume, volatility patterns
- Brownian motion for price movements
- Market volatility simulation

#### Network Monitoring Data
```typescript
generateNetworkMonitoringData(nodeCount, duration, config)
```
Generates network infrastructure metrics:
- Latency, throughput, packet loss
- CPU and memory usage with correlations
- Multi-node network topology simulation

### 5. Performance Testing Data

Specialized datasets for different testing scenarios:

- **Memory Stress**: Large datasets (100k+ points)
- **Rendering Stress**: High-variation data for chart performance
- **Filter Stress**: Multi-category data with anomalies
- **Streaming Stress**: High-frequency real-time data

### 6. Mock WebSocket Server

Enhanced WebSocket server for real-time data streaming:

#### Features
- Configurable streaming rates (1-1000+ points/second)
- Burst mode simulation
- Network latency and packet loss simulation
- Multiple scenario support
- Connection interruption testing
- Performance metrics tracking

#### Scenarios
- **Normal**: Typical operational patterns
- **High Load**: Stress testing conditions
- **System Failure**: Error condition simulation
- **Maintenance**: Low-activity periods
- **Peak Hours**: High-traffic simulation
- **Weekend**: Reduced activity patterns

#### Advanced Capabilities
```typescript
// Historical data batch generation
server.generateHistoricalBatch(1000)

// Data spike simulation
server.simulateDataSpike(duration, multiplier)

// Gradual load increase
server.simulateGradualLoad(targetRate, duration)

// Detailed performance metrics
server.getDetailedStats()
```

## Usage Examples

### Basic Data Generation

```typescript
import { generateHistoricalData } from './utils/mockDataGenerator'

// Generate 1000 data points with custom patterns
const data = generateHistoricalData(1000, {
  categories: ['cpu', 'memory'],
  sources: ['server-1', 'server-2'],
  patterns: {
    cpu: { type: 'sine', amplitude: 20, frequency: 0.1, offset: 50 },
    memory: { type: 'brownian', amplitude: 10, persistence: 0.1, offset: 60 }
  },
  anomalies: { enabled: true, probability: 0.01, types: ['spike', 'drop'] }
})
```

### Real-time Streaming

```typescript
import { MockWebSocketServer } from './utils/mockWebSocketServer'

const server = new MockWebSocketServer({
  dataPointsPerSecond: 100,
  scenario: 'high_load',
  categories: ['cpu', 'memory', 'network'],
  sources: ['web-1', 'web-2', 'db-1'],
  enableBurstMode: true,
  burstInterval: 30000,
  burstMultiplier: 5
})

await server.start()
```

### Specialized Data Types

```typescript
// Business metrics for dashboard testing
const businessData = generateBusinessMetricsData(24 * 60 * 60 * 1000) // 24 hours

// IoT sensor simulation
const sensorData = generateIoTSensorData(10, 60 * 60 * 1000) // 10 sensors, 1 hour

// Financial market data
const marketData = generateFinancialData(['AAPL', 'GOOGL'], 7 * 24 * 60 * 60 * 1000) // 1 week

// Network monitoring
const networkData = generateNetworkMonitoringData(5, 2 * 60 * 60 * 1000) // 5 nodes, 2 hours
```

### Performance Testing

```typescript
// Generate large datasets for performance testing
const memoryStressData = generatePerformanceTestData('memory_stress') // 100k points
const filterStressData = generatePerformanceTestData('filter_stress') // Multi-category with anomalies
const chartStressData = generatePerformanceTestData('rendering_stress') // High-variation data

// Benchmark data generation performance
const benchmark = benchmarkDataGeneration(10000, 5)
console.log(`Generated ${benchmark.pointsPerSecond} points/second`)
```

## Configuration Options

### DataGenerationConfig

```typescript
interface DataGenerationConfig {
  startDate?: Date
  endDate?: Date
  pointsPerHour?: number
  categories?: string[]
  sources?: string[]
  valueRange?: { min: number; max: number }
  trendType?: 'linear' | 'exponential' | 'cyclical' | 'random'
  noiseLevel?: number
  seasonality?: boolean | SeasonalityConfig
  patterns?: Record<string, DataPattern>
  anomalies?: AnomalyConfig
  correlations?: Array<{ categories: string[]; strength: number }>
}
```

### DataPattern

```typescript
interface DataPattern {
  type: 'linear' | 'exponential' | 'cyclical' | 'random' | 'step' | 
        'sine' | 'cosine' | 'sawtooth' | 'square' | 'gaussian' | 
        'brownian' | 'fibonacci' | 'chaos'
  amplitude?: number
  frequency?: number
  phase?: number
  offset?: number
  trend?: number
  decay?: number
  noise?: number
  volatility?: number
  mean?: number
  stdDev?: number
  persistence?: number
  lyapunovExponent?: number
}
```

## Performance Characteristics

### Data Generation Speed
- Small datasets (1k points): ~1000+ points/second
- Large datasets (100k points): ~500+ points/second
- Memory efficient with batched generation

### WebSocket Streaming
- Supports up to 1000+ points/second streaming
- Sub-100ms latency for real-time updates
- Configurable burst modes for stress testing
- Network simulation capabilities

### Memory Usage
- Efficient sliding window for large datasets
- Garbage collection strategies
- Memory monitoring and reporting

## Testing Coverage

The system includes comprehensive test suites:

- **Unit Tests**: Individual function validation
- **Integration Tests**: Component interaction testing
- **Performance Tests**: Speed and memory benchmarks
- **Stress Tests**: High-load scenario validation
- **Consistency Tests**: Data quality and uniqueness verification

### Test Categories

1. **Pattern Generation Tests**: Verify all pattern types work correctly
2. **Seasonality Tests**: Validate time-based patterns
3. **Anomaly Tests**: Ensure anomaly injection works as expected
4. **Performance Tests**: Benchmark generation speed and memory usage
5. **WebSocket Tests**: Validate streaming functionality
6. **Data Quality Tests**: Ensure generated data meets requirements

## Best Practices

### For Development
- Use smaller datasets (1k-10k points) for rapid iteration
- Enable anomalies to test edge case handling
- Use realistic scenarios that match your use case

### For Testing
- Use performance test data generators for load testing
- Enable burst mode for stress testing
- Test with various data patterns to ensure robustness

### For Performance Validation
- Use memory stress datasets (100k+ points) for memory testing
- Monitor generation performance with benchmarking tools
- Test streaming at target production rates

## Integration with Observatory Dashboard

The mock data system integrates seamlessly with the Observatory Dashboard:

1. **Development**: Provides realistic data during development
2. **Testing**: Enables comprehensive testing of all dashboard features
3. **Performance**: Validates dashboard performance under load
4. **Demonstration**: Creates compelling demo scenarios

## Future Enhancements

Potential areas for expansion:

- Additional pattern types (Fourier series, wavelets)
- Machine learning-based pattern generation
- Real-time pattern adaptation
- Advanced correlation modeling
- Time series forecasting integration
- Custom pattern definition language

## Conclusion

The Mock Data Generation System provides a comprehensive foundation for developing, testing, and validating the Observatory Dashboard with realistic, high-volume data. Its flexible architecture supports a wide range of use cases from simple development testing to complex performance validation scenarios.