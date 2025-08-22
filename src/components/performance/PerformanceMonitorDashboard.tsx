'use client'

import React, { useState, useEffect, useCallback, memo } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Progress } from '@/components/ui/progress'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { 
  Activity, 
  MemoryStick, 
  Zap, 
  AlertTriangle, 
  TrendingUp, 
  TrendingDown,
  Play,
  Pause,
  RotateCcw,
  Download
} from 'lucide-react'
import { usePerformanceMonitor, PerformanceAlert } from '@/hooks/usePerformanceMonitor'
import { PerformanceBenchmark, BenchmarkResult } from '@/utils/performanceBenchmark'

interface PerformanceMonitorDashboardProps {
  className?: string
  autoStart?: boolean
}

const PerformanceMonitorDashboard = memo<PerformanceMonitorDashboardProps>(
  function PerformanceMonitorDashboard({ className = '', autoStart = true }) {
    const performanceMonitor = usePerformanceMonitor({
      enabled: autoStart,
      fpsMonitoringInterval: 1000,
      memoryMonitoringInterval: 2000,
      renderTimeThreshold: 16.67, // 60fps
      memoryThreshold: 100 // 100MB
    })

    const [benchmark] = useState(() => new PerformanceBenchmark())
    const [benchmarkResults, setBenchmarkResults] = useState<BenchmarkResult[]>([])
    const [isRunningBenchmark, setIsRunningBenchmark] = useState(false)

    // Format utilities
    const formatBytes = useCallback((bytes: number) => {
      if (bytes === 0) return '0 B'
      const k = 1024
      const sizes = ['B', 'KB', 'MB', 'GB']
      const i = Math.floor(Math.log(bytes) / Math.log(k))
      return `${(bytes / Math.pow(k, i)).toFixed(1)} ${sizes[i]}`
    }, [])

    const formatMs = useCallback((ms: number) => {
      return `${ms.toFixed(2)}ms`
    }, [])

    const formatFps = useCallback((fps: number) => {
      return `${Math.round(fps)} FPS`
    }, [])

    // Performance status helpers
    const getFpsStatus = useCallback((fps: number) => {
      if (fps >= 55) return { color: 'text-green-600', status: 'Excellent' }
      if (fps >= 45) return { color: 'text-yellow-600', status: 'Good' }
      if (fps >= 30) return { color: 'text-orange-600', status: 'Fair' }
      return { color: 'text-red-600', status: 'Poor' }
    }, [])

    const getMemoryStatus = useCallback((memoryMB: number) => {
      if (memoryMB < 50) return { color: 'text-green-600', status: 'Low' }
      if (memoryMB < 100) return { color: 'text-yellow-600', status: 'Moderate' }
      if (memoryMB < 200) return { color: 'text-orange-600', status: 'High' }
      return { color: 'text-red-600', status: 'Critical' }
    }, [])

    const getRenderTimeStatus = useCallback((renderTime: number) => {
      if (renderTime < 8) return { color: 'text-green-600', status: 'Fast' }
      if (renderTime < 16.67) return { color: 'text-yellow-600', status: 'Good' }
      if (renderTime < 33) return { color: 'text-orange-600', status: 'Slow' }
      return { color: 'text-red-600', status: 'Very Slow' }
    }, [])

    // Benchmark operations
    const runQuickBenchmark = useCallback(async () => {
      setIsRunningBenchmark(true)
      try {
        const results = await benchmark.benchmarkDataProcessing(10000)
        setBenchmarkResults(prev => [...prev, ...results])
      } catch (error) {
        console.error('Benchmark failed:', error)
      } finally {
        setIsRunningBenchmark(false)
      }
    }, [benchmark])

    const runComprehensiveBenchmark = useCallback(async () => {
      setIsRunningBenchmark(true)
      try {
        const results = await benchmark.runComprehensiveBenchmark()
        setBenchmarkResults(prev => [
          ...prev, 
          ...results.dataProcessing,
          ...results.rendering,
          ...results.memory
        ])
      } catch (error) {
        console.error('Comprehensive benchmark failed:', error)
      } finally {
        setIsRunningBenchmark(false)
      }
    }, [benchmark])

    const exportResults = useCallback(() => {
      const exportData = {
        timestamp: new Date().toISOString(),
        performanceMetrics: {
          currentFps: performanceMonitor.currentFps,
          averageFps: performanceMonitor.averageFps,
          currentMemory: performanceMonitor.currentMemory,
          peakMemory: performanceMonitor.peakMemory,
          renderTimes: performanceMonitor.renderTimes
        },
        benchmarkResults,
        alerts: performanceMonitor.alerts
      }

      const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `performance-report-${new Date().toISOString().split('T')[0]}.json`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)
    }, [performanceMonitor, benchmarkResults])

    // Alert severity helpers
    const getAlertSeverity = useCallback((alert: PerformanceAlert) => {
      const ratio = alert.value / alert.threshold
      if (ratio > 2) return 'critical'
      if (ratio > 1.5) return 'high'
      if (ratio > 1.2) return 'medium'
      return 'low'
    }, [])

    const getAlertIcon = useCallback((type: PerformanceAlert['type']) => {
      switch (type) {
        case 'fps': return <Activity className="w-4 h-4" />
        case 'memory': return <MemoryStick className="w-4 h-4" />
        case 'render_time': return <Zap className="w-4 h-4" />
        default: return <AlertTriangle className="w-4 h-4" />
      }
    }, [])

    return (
      <div className={`space-y-6 ${className}`}>
        {/* Header */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                <Activity className="w-5 h-5" />
                Performance Monitor
                <Badge variant={performanceMonitor.isMonitoring ? 'default' : 'secondary'}>
                  {performanceMonitor.isMonitoring ? 'Active' : 'Inactive'}
                </Badge>
              </CardTitle>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={performanceMonitor.isMonitoring ? performanceMonitor.stop : performanceMonitor.start}
                >
                  {performanceMonitor.isMonitoring ? (
                    <>
                      <Pause className="w-4 h-4 mr-1" />
                      Stop
                    </>
                  ) : (
                    <>
                      <Play className="w-4 h-4 mr-1" />
                      Start
                    </>
                  )}
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={performanceMonitor.reset}
                >
                  <RotateCcw className="w-4 h-4 mr-1" />
                  Reset
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={exportResults}
                >
                  <Download className="w-4 h-4 mr-1" />
                  Export
                </Button>
              </div>
            </div>
          </CardHeader>
        </Card>

        <Tabs defaultValue="metrics" className="space-y-4">
          <TabsList>
            <TabsTrigger value="metrics">Real-time Metrics</TabsTrigger>
            <TabsTrigger value="benchmarks">Benchmarks</TabsTrigger>
            <TabsTrigger value="alerts">Alerts</TabsTrigger>
          </TabsList>

          <TabsContent value="metrics" className="space-y-4">
            {/* Current Performance Metrics */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-muted-foreground">Frame Rate</p>
                      <p className="text-2xl font-bold">{formatFps(performanceMonitor.currentFps)}</p>
                      <p className={`text-sm ${getFpsStatus(performanceMonitor.currentFps).color}`}>
                        {getFpsStatus(performanceMonitor.currentFps).status}
                      </p>
                    </div>
                    <Activity className="w-8 h-8 text-blue-600" />
                  </div>
                  <div className="mt-4">
                    <div className="flex justify-between text-xs text-muted-foreground mb-1">
                      <span>Average: {formatFps(performanceMonitor.averageFps)}</span>
                      <span>Target: 60 FPS</span>
                    </div>
                    <Progress 
                      value={Math.min((performanceMonitor.currentFps / 60) * 100, 100)} 
                      className="h-2"
                    />
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-muted-foreground">Memory Usage</p>
                      <p className="text-2xl font-bold">{formatBytes(performanceMonitor.currentMemory * 1024 * 1024)}</p>
                      <p className={`text-sm ${getMemoryStatus(performanceMonitor.currentMemory).color}`}>
                        {getMemoryStatus(performanceMonitor.currentMemory).status}
                      </p>
                    </div>
                    <MemoryStick className="w-8 h-8 text-purple-600" />
                  </div>
                  <div className="mt-4">
                    <div className="flex justify-between text-xs text-muted-foreground mb-1">
                      <span>Peak: {formatBytes(performanceMonitor.peakMemory * 1024 * 1024)}</span>
                      <span>Limit: 200MB</span>
                    </div>
                    <Progress 
                      value={Math.min((performanceMonitor.currentMemory / 200) * 100, 100)} 
                      className="h-2"
                    />
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-muted-foreground">Render Time</p>
                      <p className="text-2xl font-bold">
                        {formatMs(performanceMonitor.renderTimes[performanceMonitor.renderTimes.length - 1] || 0)}
                      </p>
                      <p className={`text-sm ${getRenderTimeStatus(performanceMonitor.renderTimes[performanceMonitor.renderTimes.length - 1] || 0).color}`}>
                        {getRenderTimeStatus(performanceMonitor.renderTimes[performanceMonitor.renderTimes.length - 1] || 0).status}
                      </p>
                    </div>
                    <Zap className="w-8 h-8 text-yellow-600" />
                  </div>
                  <div className="mt-4">
                    <div className="flex justify-between text-xs text-muted-foreground mb-1">
                      <span>Target: &lt;16.67ms</span>
                      <span>60 FPS</span>
                    </div>
                    <Progress 
                      value={Math.min(((performanceMonitor.renderTimes[performanceMonitor.renderTimes.length - 1] || 0) / 33) * 100, 100)} 
                      className="h-2"
                    />
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Memory Management */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <MemoryStick className="w-5 h-5" />
                  Memory Management
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center justify-between">
                  <div className="space-y-2">
                    <p className="text-sm text-muted-foreground">
                      Current usage: {formatBytes(performanceMonitor.currentMemory * 1024 * 1024)} / 
                      Peak: {formatBytes(performanceMonitor.peakMemory * 1024 * 1024)}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Automatic cleanup triggers at 150MB usage
                    </p>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={performanceMonitor.triggerMemoryCleanup}
                  >
                    Trigger Cleanup
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="benchmarks" className="space-y-4">
            {/* Benchmark Controls */}
            <Card>
              <CardHeader>
                <CardTitle>Performance Benchmarks</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center gap-4">
                  <Button
                    onClick={runQuickBenchmark}
                    disabled={isRunningBenchmark}
                  >
                    {isRunningBenchmark ? 'Running...' : 'Quick Benchmark'}
                  </Button>
                  <Button
                    variant="outline"
                    onClick={runComprehensiveBenchmark}
                    disabled={isRunningBenchmark}
                  >
                    {isRunningBenchmark ? 'Running...' : 'Comprehensive Benchmark'}
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => setBenchmarkResults([])}
                  >
                    Clear Results
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* Benchmark Results */}
            {benchmarkResults.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle>Benchmark Results</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {benchmarkResults.map((result, index) => (
                      <div key={index} className="flex items-center justify-between p-3 border rounded-lg">
                        <div>
                          <p className="font-medium">{result.name}</p>
                          <p className="text-sm text-muted-foreground">
                            {result.iterations} iterations • {result.timestamp.toLocaleTimeString()}
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="font-mono text-sm">
                            Avg: {formatMs(result.averageTime)}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            Min: {formatMs(result.minTime)} • Max: {formatMs(result.maxTime)}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          <TabsContent value="alerts" className="space-y-4">
            {/* Performance Alerts */}
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="flex items-center gap-2">
                    <AlertTriangle className="w-5 h-5" />
                    Performance Alerts
                    {performanceMonitor.alerts.length > 0 && (
                      <Badge variant="destructive">
                        {performanceMonitor.alerts.length}
                      </Badge>
                    )}
                  </CardTitle>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={performanceMonitor.clearAlerts}
                  >
                    Clear All
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                {performanceMonitor.alerts.length === 0 ? (
                  <p className="text-muted-foreground text-center py-8">
                    No performance alerts. System is running smoothly!
                  </p>
                ) : (
                  <div className="space-y-2">
                    {performanceMonitor.alerts.map((alert, index) => (
                      <Alert key={index} variant="destructive">
                        <div className="flex items-center gap-2">
                          {getAlertIcon(alert.type)}
                          <div className="flex-1">
                            <AlertDescription>
                              <div className="flex items-center justify-between">
                                <span>{alert.message}</span>
                                <div className="flex items-center gap-2">
                                  <Badge variant="outline" className="text-xs">
                                    {alert.type}
                                  </Badge>
                                  <span className="text-xs text-muted-foreground">
                                    {alert.timestamp.toLocaleTimeString()}
                                  </span>
                                </div>
                              </div>
                            </AlertDescription>
                          </div>
                        </div>
                      </Alert>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    )
  }
)

export { PerformanceMonitorDashboard }
export default PerformanceMonitorDashboard