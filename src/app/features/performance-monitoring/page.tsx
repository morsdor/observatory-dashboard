'use client'

import React from 'react'
import { PageLayout } from '@/components/layout/PageLayout'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Activity, TrendingUp, Zap } from 'lucide-react'
import PerformanceMonitorDashboard from '@/components/performance/PerformanceMonitorDashboard'

export default function PerformanceMonitoringPage() {
  return (
    <PageLayout
      title="Performance Monitoring"
      description="Real-time performance metrics, network monitoring, and system diagnostics"
    >
      {/* Feature Badges */}
      <div className="flex flex-wrap gap-2 mb-8">
        <Badge variant="secondary" className="flex items-center gap-1">
          <Activity className="w-3 h-3" />
          Real-time FPS Monitoring
        </Badge>
        <Badge variant="secondary" className="flex items-center gap-1">
          <TrendingUp className="w-3 h-3" />
          Memory Usage Tracking
        </Badge>
        <Badge variant="secondary" className="flex items-center gap-1">
          <Zap className="w-3 h-3" />
          Network Latency Measurement
        </Badge>
      </div>

      {/* Feature Overview */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Activity className="w-5 h-5 text-blue-600" />
              Real-time Metrics
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li>• Frame rate monitoring (FPS)</li>
              <li>• Memory usage tracking</li>
              <li>• Render time measurement</li>
              <li>• Network latency monitoring</li>
              <li>• Data throughput analysis</li>
            </ul>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-green-600" />
              Performance Alerts
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li>• Configurable thresholds</li>
              <li>• Automatic alert generation</li>
              <li>• Performance degradation detection</li>
              <li>• Memory leak identification</li>
              <li>• Network issue notifications</li>
            </ul>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Zap className="w-5 h-5 text-yellow-600" />
              Benchmarking
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li>• Data processing benchmarks</li>
              <li>• Rendering performance tests</li>
              <li>• Memory allocation analysis</li>
              <li>• Comprehensive test suites</li>
              <li>• Performance comparison tools</li>
            </ul>
          </CardContent>
        </Card>
      </div>

      {/* Performance Monitor Dashboard */}
      <PerformanceMonitorDashboard />

      {/* Implementation Details */}
      <Card>
        <CardHeader>
          <CardTitle>Implementation Details</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <h3 className="font-semibold mb-2">Key Features</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
              <div>
                <h4 className="font-medium text-blue-600 mb-1">Performance Monitoring</h4>
                <ul className="space-y-1 text-muted-foreground">
                  <li>• Real-time FPS tracking using requestAnimationFrame</li>
                  <li>• Memory usage monitoring with performance.memory API</li>
                  <li>• Render time measurement with high precision</li>
                  <li>• Automatic performance alerts and thresholds</li>
                </ul>
              </div>
              <div>
                <h4 className="font-medium text-green-600 mb-1">Network Monitoring</h4>
                <ul className="space-y-1 text-muted-foreground">
                  <li>• Network latency measurement via fetch API</li>
                  <li>• Data throughput tracking for WebSocket streams</li>
                  <li>• Connection quality assessment</li>
                  <li>• Network performance alerts</li>
                </ul>
              </div>
              <div>
                <h4 className="font-medium text-purple-600 mb-1">Benchmarking Suite</h4>
                <ul className="space-y-1 text-muted-foreground">
                  <li>• Comprehensive performance benchmarks</li>
                  <li>• Data processing performance tests</li>
                  <li>• Memory allocation benchmarks</li>
                  <li>• Statistical analysis and comparison</li>
                </ul>
              </div>
              <div>
                <h4 className="font-medium text-orange-600 mb-1">Data Export</h4>
                <ul className="space-y-1 text-muted-foreground">
                  <li>• Performance metrics export to JSON</li>
                  <li>• Benchmark results archiving</li>
                  <li>• Historical performance tracking</li>
                  <li>• Alert history and analysis</li>
                </ul>
              </div>
            </div>
          </div>

          <div>
            <h3 className="font-semibold mb-2">Technical Implementation</h3>
            <div className="bg-muted p-4 rounded-lg">
              <pre className="text-sm overflow-x-auto">
{`// Performance monitoring hook usage
const performanceMonitor = usePerformanceMonitor({
  enabled: true,
  fpsMonitoringInterval: 1000,
  memoryMonitoringInterval: 2000,
  renderTimeThreshold: 16.67, // 60fps target
  networkLatencyThreshold: 200, // 200ms baseline
  dataThroughputThreshold: 1000 // 1000 points/sec
})

// Measure render performance
const result = performanceMonitor.measureRenderTime(() => {
  // Your rendering code here
  return renderComponent()
})

// Measure network latency
const latency = await performanceMonitor.measureNetworkLatency()

// Track data throughput (automatically called by WebSocket integration)
// Global function: window.__performanceMonitor_trackDataThroughput(count)`}
              </pre>
            </div>
          </div>
        </CardContent>
      </Card>
    </PageLayout>
  )
}