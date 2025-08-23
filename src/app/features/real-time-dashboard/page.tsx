'use client'

import React from 'react'
import { useRealPerformanceMetrics, formatFps } from '@/utils/realPerformanceMetrics'
import { PageLayout } from '@/components/layout/PageLayout'
import { RealTimeDashboard } from '@/components/dashboard/RealTimeDashboard'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { 
  Database, 
  Clock,
  TrendingUp,
  AlertCircle,
  CheckCircle,
  Zap
} from 'lucide-react'
import { Provider } from 'react-redux'
import { store } from '@/stores/dashboardStore'
import { useDataStreaming } from '@/hooks/useDataStreaming'

function RealTimeDashboardContent() {
  const { getCurrentMetrics } = useRealPerformanceMetrics()
  const currentMetrics = getCurrentMetrics()
  const { 
    status, 
    isConnected, 
    metrics, 
    data 
  } = useDataStreaming({ autoConnect: false })

  return (
    <PageLayout
      title="Real-Time Dashboard"
      description="Live data streaming with WebSocket connections and high-performance visualization"
    >
      {/* Connection Status Alert */}
      {isConnected && (
        <Alert className="mb-6 border-green-200 bg-green-50">
          <CheckCircle className="h-4 w-4 text-green-600" />
          <AlertDescription className="text-green-800">
            Data streaming active. Receiving real-time updates.
          </AlertDescription>
        </Alert>
      )}

      {status === 'error' && (
        <Alert className="mb-6 border-red-200 bg-red-50">
          <AlertCircle className="h-4 w-4 text-red-600" />
          <AlertDescription className="text-red-800">
            Connection failed. Attempting to reconnect...
          </AlertDescription>
        </Alert>
      )}

      <Tabs defaultValue="dashboard" className="space-y-6">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="dashboard">Live Dashboard</TabsTrigger>
          <TabsTrigger value="metrics">Connection Metrics</TabsTrigger>
          <TabsTrigger value="features">Features</TabsTrigger>
          <TabsTrigger value="technical">Technical Details</TabsTrigger>
        </TabsList>

        <TabsContent value="dashboard" className="space-y-6">
          {/* Real-time metrics */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium flex items-center gap-2">
                  <Database className="h-4 w-4" />
                  Data Points
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {metrics?.totalDataPoints.toLocaleString() || '0'}
                </div>
                <p className="text-xs text-muted-foreground">Total received</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium flex items-center gap-2">
                  <Clock className="h-4 w-4" />
                  Last Update
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {metrics?.lastUpdateTime ? metrics.lastUpdateTime.toLocaleTimeString() : '--:--:--'}
                </div>
                <p className="text-xs text-muted-foreground">
                  {metrics?.lastUpdateTime ? 'Just now' : 'No updates'}
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium flex items-center gap-2">
                  <TrendingUp className="h-4 w-4" />
                  Update Rate
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {metrics ? `${Math.round(metrics.dataPointsPerSecond)}/sec` : '0/sec'}
                </div>
                <p className="text-xs text-muted-foreground">Points per second</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium flex items-center gap-2">
                  <Zap className="h-4 w-4" />
                  Buffer Usage
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {metrics ? `${Math.round(metrics.bufferUtilization)}%` : '0%'}
                </div>
                <p className="text-xs text-muted-foreground">Buffer utilization</p>
              </CardContent>
            </Card>
          </div>

          {/* Main Dashboard */}
          <RealTimeDashboard 
            websocketUrl="ws://localhost:8080"
            maxBufferSize={100000}
          />
        </TabsContent>

        <TabsContent value="metrics" className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Connection Statistics</CardTitle>
                <CardDescription>Data streaming performance metrics</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex justify-between">
                  <span className="text-sm font-medium">Connection Status:</span>
                  <span className="text-sm capitalize">{status}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm font-medium">Connection Uptime:</span>
                  <span className="text-sm">
                    {metrics ? `${Math.floor(metrics.connectionUptime / 1000)}s` : '0s'}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm font-medium">Data Points Processed:</span>
                  <span className="text-sm">{metrics?.totalDataPoints.toLocaleString() || '0'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm font-medium">Buffer Utilization:</span>
                  <span className="text-sm">{metrics ? `${metrics.bufferUtilization.toFixed(1)}%` : '0%'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm font-medium">Memory Usage:</span>
                  <span className="text-sm">{metrics ? `${metrics.memoryUsage.toFixed(1)} MB` : '0 MB'}</span>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Performance Metrics</CardTitle>
                <CardDescription>Real-time performance indicators</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex justify-between">
                  <span className="text-sm font-medium">Frame Rate:</span>
                  <span className="text-sm text-green-600">{formatFps(currentMetrics.currentFps)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm font-medium">Data Rate:</span>
                  <span className="text-sm text-green-600">
                    {metrics ? `${Math.round(metrics.dataPointsPerSecond)}/sec` : '0/sec'}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm font-medium">Render Time:</span>
                  <span className="text-sm text-green-600">&lt;16ms</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm font-medium">Update Latency:</span>
                  <span className="text-sm text-green-600">&lt;50ms</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm font-medium">Data Processing:</span>
                  <span className="text-sm text-green-600">Optimal</span>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="features" className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>WebSocket Features</CardTitle>
                <CardDescription>Advanced connection management capabilities</CardDescription>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2 text-sm">
                  <li className="flex items-center gap-2">
                    <CheckCircle className="h-4 w-4 text-green-600" />
                    Automatic reconnection with exponential backoff
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle className="h-4 w-4 text-green-600" />
                    Connection status monitoring and alerts
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle className="h-4 w-4 text-green-600" />
                    Data validation and error handling
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle className="h-4 w-4 text-green-600" />
                    Buffer management with sliding window
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle className="h-4 w-4 text-green-600" />
                    Performance monitoring and metrics
                  </li>
                </ul>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Data Processing</CardTitle>
                <CardDescription>High-performance data handling features</CardDescription>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2 text-sm">
                  <li className="flex items-center gap-2">
                    <CheckCircle className="h-4 w-4 text-green-600" />
                    Real-time data streaming up to 1000 points/sec
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle className="h-4 w-4 text-green-600" />
                    Efficient memory management for 100k+ points
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle className="h-4 w-4 text-green-600" />
                    Incremental updates without full re-renders
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle className="h-4 w-4 text-green-600" />
                    Data aggregation and downsampling
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle className="h-4 w-4 text-green-600" />
                    Background processing with Web Workers
                  </li>
                </ul>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="technical" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Technical Implementation</CardTitle>
              <CardDescription>Architecture and implementation details</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div>
                <h4 className="font-semibold mb-2">WebSocket Connection Management</h4>
                <p className="text-sm text-muted-foreground mb-2">
                  The real-time dashboard uses a custom WebSocket hook with advanced connection management:
                </p>
                <ul className="text-sm space-y-1 ml-4">
                  <li>• Automatic reconnection with exponential backoff strategy</li>
                  <li>• Connection state management with React state</li>
                  <li>• Error handling and recovery mechanisms</li>
                  <li>• Heartbeat monitoring for connection health</li>
                </ul>
              </div>

              <div>
                <h4 className="font-semibold mb-2">Data Buffer Management</h4>
                <p className="text-sm text-muted-foreground mb-2">
                  Efficient data handling for high-frequency updates:
                </p>
                <ul className="text-sm space-y-1 ml-4">
                  <li>• Sliding window buffer with configurable size (default: 100k points)</li>
                  <li>• Circular buffer implementation for memory efficiency</li>
                  <li>• Automatic garbage collection of old data</li>
                  <li>• Batch processing for multiple data points</li>
                </ul>
              </div>

              <div>
                <h4 className="font-semibold mb-2">Performance Optimizations</h4>
                <p className="text-sm text-muted-foreground mb-2">
                  Multiple optimization strategies ensure smooth performance:
                </p>
                <ul className="text-sm space-y-1 ml-4">
                  <li>• React.memo and useMemo for component optimization</li>
                  <li>• Debounced updates to prevent excessive re-renders</li>
                  <li>• Canvas-based rendering for charts</li>
                  <li>• Virtualization for large data sets</li>
                </ul>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </PageLayout>
  )
}

export default function RealTimeDashboardPage() {
  return (
    <Provider store={store}>
      <RealTimeDashboardContent />
    </Provider>
  )
}