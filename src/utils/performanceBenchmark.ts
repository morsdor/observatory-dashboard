/**
 * Performance benchmarking utilities for the Observatory Dashboard
 */

export interface BenchmarkResult {
  name: string
  duration: number
  memoryUsed: number
  iterations: number
  averageTime: number
  minTime: number
  maxTime: number
  timestamp: Date
}

export interface BenchmarkConfig {
  iterations?: number
  warmupIterations?: number
  memoryTracking?: boolean
  gcBetweenRuns?: boolean
}

export class PerformanceBenchmark {
  private results: BenchmarkResult[] = []

  /**
   * Run a performance benchmark on a function
   */
  async benchmark<T>(
    name: string,
    fn: () => T | Promise<T>,
    config: BenchmarkConfig = {}
  ): Promise<BenchmarkResult> {
    const {
      iterations = 100,
      warmupIterations = 10,
      memoryTracking = true,
      gcBetweenRuns = false
    } = config

    console.log(`Starting benchmark: ${name}`)

    // Warmup runs
    for (let i = 0; i < warmupIterations; i++) {
      await fn()
    }

    // Force garbage collection before benchmark if available
    if (gcBetweenRuns && 'gc' in window) {
      try {
        (window as any).gc()
      } catch (e) {
        console.warn('Manual GC not available')
      }
    }

    const times: number[] = []
    const initialMemory = memoryTracking ? this.getMemoryUsage() : 0

    // Benchmark runs
    for (let i = 0; i < iterations; i++) {
      const start = performance.now()
      await fn()
      const end = performance.now()
      times.push(end - start)

      // Optional GC between runs
      if (gcBetweenRuns && i % 10 === 0 && 'gc' in window) {
        try {
          (window as any).gc()
        } catch (e) {
          // Ignore GC errors
        }
      }
    }

    const finalMemory = memoryTracking ? this.getMemoryUsage() : 0
    const totalDuration = times.reduce((sum, time) => sum + time, 0)

    const result: BenchmarkResult = {
      name,
      duration: totalDuration,
      memoryUsed: finalMemory - initialMemory,
      iterations,
      averageTime: totalDuration / iterations,
      minTime: Math.min(...times),
      maxTime: Math.max(...times),
      timestamp: new Date()
    }

    this.results.push(result)
    console.log(`Benchmark completed: ${name}`, result)
    return result
  }

  /**
   * Benchmark data processing operations
   */
  async benchmarkDataProcessing(dataSize: number): Promise<BenchmarkResult[]> {
    const testData = this.generateTestData(dataSize)
    const results: BenchmarkResult[] = []

    // Benchmark array operations
    results.push(await this.benchmark(
      `Array Filter (${dataSize} items)`,
      () => testData.filter(item => item.value > 50),
      { iterations: 50 }
    ))

    results.push(await this.benchmark(
      `Array Map (${dataSize} items)`,
      () => testData.map(item => ({ ...item, processed: true })),
      { iterations: 50 }
    ))

    results.push(await this.benchmark(
      `Array Sort (${dataSize} items)`,
      () => [...testData].sort((a, b) => a.value - b.value),
      { iterations: 20 }
    ))

    // Benchmark JSON operations
    results.push(await this.benchmark(
      `JSON Stringify (${dataSize} items)`,
      () => JSON.stringify(testData),
      { iterations: 20 }
    ))

    const jsonString = JSON.stringify(testData)
    results.push(await this.benchmark(
      `JSON Parse (${dataSize} items)`,
      () => JSON.parse(jsonString),
      { iterations: 20 }
    ))

    return results
  }

  /**
   * Benchmark rendering operations
   */
  async benchmarkRendering(): Promise<BenchmarkResult[]> {
    const results: BenchmarkResult[] = []

    // Benchmark DOM operations
    results.push(await this.benchmark(
      'DOM Element Creation',
      () => {
        const div = document.createElement('div')
        div.className = 'test-element'
        div.textContent = 'Test content'
        return div
      },
      { iterations: 1000 }
    ))

    results.push(await this.benchmark(
      'DOM Query Selection',
      () => document.querySelectorAll('div'),
      { iterations: 500 }
    ))

    // Benchmark Canvas operations
    const canvas = document.createElement('canvas')
    canvas.width = 800
    canvas.height = 400
    const ctx = canvas.getContext('2d')!

    results.push(await this.benchmark(
      'Canvas Clear',
      () => ctx.clearRect(0, 0, 800, 400),
      { iterations: 1000 }
    ))

    results.push(await this.benchmark(
      'Canvas Line Drawing',
      () => {
        ctx.beginPath()
        ctx.moveTo(0, 200)
        for (let i = 0; i < 100; i++) {
          ctx.lineTo(i * 8, 200 + Math.sin(i * 0.1) * 50)
        }
        ctx.stroke()
      },
      { iterations: 100 }
    ))

    return results
  }

  /**
   * Benchmark memory operations
   */
  async benchmarkMemory(): Promise<BenchmarkResult[]> {
    const results: BenchmarkResult[] = []

    // Benchmark array allocation
    results.push(await this.benchmark(
      'Array Allocation (10k items)',
      () => new Array(10000).fill(0).map((_, i) => ({ id: i, value: Math.random() })),
      { iterations: 100, memoryTracking: true }
    ))

    results.push(await this.benchmark(
      'Array Allocation (100k items)',
      () => new Array(100000).fill(0).map((_, i) => ({ id: i, value: Math.random() })),
      { iterations: 10, memoryTracking: true }
    ))

    // Benchmark object creation
    results.push(await this.benchmark(
      'Object Creation',
      () => {
        const objects = []
        for (let i = 0; i < 1000; i++) {
          objects.push({
            id: i,
            timestamp: new Date(),
            value: Math.random(),
            metadata: { category: 'test', source: 'benchmark' }
          })
        }
        return objects
      },
      { iterations: 100, memoryTracking: true }
    ))

    return results
  }

  /**
   * Run comprehensive performance suite
   */
  async runComprehensiveBenchmark(): Promise<{
    dataProcessing: BenchmarkResult[]
    rendering: BenchmarkResult[]
    memory: BenchmarkResult[]
    summary: {
      totalTests: number
      totalDuration: number
      averageMemoryUsage: number
    }
  }> {
    console.log('Starting comprehensive performance benchmark...')

    const dataProcessing = await this.benchmarkDataProcessing(10000)
    const rendering = await this.benchmarkRendering()
    const memory = await this.benchmarkMemory()

    const allResults = [...dataProcessing, ...rendering, ...memory]
    const summary = {
      totalTests: allResults.length,
      totalDuration: allResults.reduce((sum, result) => sum + result.duration, 0),
      averageMemoryUsage: allResults.reduce((sum, result) => sum + result.memoryUsed, 0) / allResults.length
    }

    console.log('Comprehensive benchmark completed', summary)

    return {
      dataProcessing,
      rendering,
      memory,
      summary
    }
  }

  /**
   * Get current memory usage
   */
  private getMemoryUsage(): number {
    if ('memory' in performance) {
      return (performance as any).memory.usedJSHeapSize
    }
    return 0
  }

  /**
   * Generate test data for benchmarks
   */
  private generateTestData(size: number) {
    return Array.from({ length: size }, (_, i) => ({
      id: i,
      timestamp: new Date(Date.now() - (size - i) * 1000),
      value: Math.random() * 100,
      category: ['cpu', 'memory', 'network', 'disk'][i % 4],
      source: `server-${(i % 5) + 1}`,
      metadata: {
        region: ['us-east', 'us-west', 'eu-central'][i % 3],
        environment: ['prod', 'staging', 'dev'][i % 3]
      }
    }))
  }

  /**
   * Get all benchmark results
   */
  getResults(): BenchmarkResult[] {
    return [...this.results]
  }

  /**
   * Clear benchmark results
   */
  clearResults(): void {
    this.results = []
  }

  /**
   * Export results to JSON
   */
  exportResults(): string {
    return JSON.stringify({
      timestamp: new Date().toISOString(),
      userAgent: navigator.userAgent,
      results: this.results
    }, null, 2)
  }

  /**
   * Compare two benchmark results
   */
  static compare(baseline: BenchmarkResult, current: BenchmarkResult): {
    speedImprovement: number
    memoryImprovement: number
    isImprovement: boolean
  } {
    const speedImprovement = ((baseline.averageTime - current.averageTime) / baseline.averageTime) * 100
    const memoryImprovement = ((baseline.memoryUsed - current.memoryUsed) / baseline.memoryUsed) * 100
    
    return {
      speedImprovement,
      memoryImprovement,
      isImprovement: speedImprovement > 0 || memoryImprovement > 0
    }
  }
}

// Global benchmark instance
export const globalBenchmark = new PerformanceBenchmark()

// Utility functions for quick benchmarking
export const quickBenchmark = async <T>(
  name: string,
  fn: () => T | Promise<T>,
  iterations = 10
): Promise<BenchmarkResult> => {
  return globalBenchmark.benchmark(name, fn, { iterations })
}

export const measureRenderTime = <T>(fn: () => T): { result: T; duration: number } => {
  const start = performance.now()
  const result = fn()
  const duration = performance.now() - start
  return { result, duration }
}

export const measureAsyncRenderTime = async <T>(fn: () => Promise<T>): Promise<{ result: T; duration: number }> => {
  const start = performance.now()
  const result = await fn()
  const duration = performance.now() - start
  return { result, duration }
}