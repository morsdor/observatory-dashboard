'use client'

import React, { useCallback, useMemo, useState, memo } from 'react'
import { useRealTimeIntegration } from '@/hooks/useRealTimeIntegration'
import { TimeSeriesChart } from '@/components/charts/TimeSeriesChart'
import { VirtualizedTable, defaultDataPointColumns } from './VirtualizedTable'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Alert, AlertDescription } from '@/components/ui/alert'
import {
  Activity,
  Database,
  Wifi,
  WifiOff,
  AlertTriangle,
  RotateCcw,
  Play,
  Pause,
  Trash2
} from 'lucide-react'
import { DataPoint } from '@/types'

interface RealTimeDashboardProps {
  websocketUrl?: string
  maxBufferSize?: number
  className?: string
}

const RealTimeDashboard = memo<RealTimeDashboardProps>(function RealTimeDashboard({
  websocketUrl = 'ws://localhost:8080',
  maxBufferSize = 100000,
  className = ''
}) {
  const [isMonitoring, setIsMonitoring] = useState(true)
  const [chartHeight] = useState(400)
  const [tableHeight] = useState(400)

  // Initialize real-time integration with performance optimizations
  const realTime = useRealTimeIntegration({
    websocketUrl,
    maxBufferSize,
    autoConnect: true
  })



  // Memoized chart data for performance
  const chartData = useMemo(() => {
    // Limit chart data to last 1000 points for performance
    const maxChartPoints = 1000
    return realTime.data.length > maxChartPoints
      ? realTime.data.slice(-maxChartPoints)
      : realTime.data
  }, [realTime.data])

  // Memoized connection status components for performance
  const connectionStatusIcon = useMemo(() => {
    switch (realTime.connectionStatus) {
      case 'connected':
        return <Wifi className="w-4 h-4 text-green-600" />
      case 'connecting':
        return <Activity className="w-4 h-4 text-yellow-600 animate-pulse" />
      case 'disconnected':
        return <WifiOff className="w-4 h-4 text-gray-400" />
      case 'error':
        return <AlertTriangle className="w-4 h-4 text-red-600" />
      default:
        return <WifiOff className="w-4 h-4 text-gray-400" />
    }
  }, [realTime.connectionStatus])

  const connectionStatusBadge = useMemo(() => {
    const variants = {
      connected: 'default' as const,
      connecting: 'secondary' as const,
      disconnected: 'outline' as const,
      error: 'destructive' as const
    }

    return (
      <Badge variant={variants[realTime.connectionStatus as keyof typeof variants] || 'outline'}>
        {connectionStatusIcon}
        <span className="ml-1 capitalize">{realTime.connectionStatus}</span>
      </Badge>
    )
  }, [realTime.connectionStatus, connectionStatusIcon])

  // Format metrics for display
  const formatMetric = useCallback((value: number, unit: string = '', decimals: number = 0) => {
    if (isNaN(value)) return 'N/A'
    return `${value.toFixed(decimals)}${unit}`
  }, [])

  const formatBytes = useCallback((bytes: number) => {
    if (bytes === 0) return '0 B'
    const k = 1024
    const sizes = ['B', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return `${(bytes / Math.pow(k, i)).toFixed(1)} ${sizes[i]}`
  }, [])

  const formatDuration = useCallback((seconds: number) => {
    if (seconds < 60) return `${Math.floor(seconds)}s`
    if (seconds < 3600) return `${Math.floor(seconds / 60)}m ${Math.floor(seconds % 60)}s`
    return `${Math.floor(seconds / 3600)}h ${Math.floor((seconds % 3600) / 60)}m`
  }, [])

  // Handle monitoring toggle
  const toggleMonitoring = useCallback(() => {
    if (isMonitoring) {
      realTime.stopPerformanceMonitoring()
      setIsMonitoring(false)
    } else {
      realTime.startPerformanceMonitoring()
      setIsMonitoring(true)
    }
  }, [isMonitoring, realTime])

  // Memoized chart hover handler to prevent unnecessary re-renders
  const handleChartHover = useCallback((_dataPoint: DataPoint | null) => {
    // Debounce hover events to prevent excessive re-renders
    // The chart component already handles this internally
  }, [])

  // Memoized performance metrics to prevent unnecessary re-renders
  const performanceMetrics = useMemo(() => (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
      <Card>
        <CardContent className="p-4">
          <div className="flex items-center space-x-2">
            <Activity className="w-4 h-4 text-blue-600" />
            <div>
              <p className="text-sm font-medium">Data Rate</p>
              <p className="text-2xl font-bold text-blue-600">
                {formatMetric(realTime.metrics.dataPointsPerSecond, '/s')}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-4">
          <div className="flex items-center space-x-2">
            <Database className="w-4 h-4 text-green-600" />
            <div>
              <p className="text-sm font-medium">Total Points</p>
              <p className="text-2xl font-bold text-green-600">
                {realTime.metrics.totalDataPoints.toLocaleString()}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-4">
          <div className="flex items-center space-x-2">
            <Activity className="w-4 h-4 text-purple-600" />
            <div>
              <p className="text-sm font-medium">Memory</p>
              <p className="text-2xl font-bold text-purple-600">
                {formatBytes(realTime.metrics.memoryUsage * 1024 * 1024)}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-4">
          <div className="flex items-center space-x-2">
            <Activity className="w-4 h-4 text-orange-600" />
            <div>
              <p className="text-sm font-medium">Buffer</p>
              <p className="text-2xl font-bold text-orange-600">
                {formatMetric(realTime.metrics.bufferUtilization, '%', 1)}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  ), [realTime.metrics, formatMetric, formatBytes])

  // Memoized performance details to prevent unnecessary re-renders
  const performanceDetails = useMemo(() => (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <span>Performance Metrics</span>
          <div className="flex items-center space-x-2">
            <Button
              variant="outline"
              size="sm"
              onClick={toggleMonitoring}
            >
              {isMonitoring ? (
                <>
                  <Pause className="w-4 h-4 mr-1" />
                  Pause
                </>
              ) : (
                <>
                  <Play className="w-4 h-4 mr-1" />
                  Resume
                </>
              )}
            </Button>
          </div>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4 text-sm">
          <div>
            <p className="text-gray-600">FPS</p>
            <p className="font-semibold">{formatMetric(realTime.performanceMetrics.fps)}</p>
          </div>
          <div>
            <p className="text-gray-600">Render Time</p>
            <p className="font-semibold">{formatMetric(realTime.performanceMetrics.renderTime, 'ms', 2)}</p>
          </div>
          <div>
            <p className="text-gray-600">Filter Time</p>
            <p className="font-semibold">{formatMetric(realTime.performanceMetrics.filterTime, 'ms', 2)}</p>
          </div>
          <div>
            <p className="text-gray-600">Connection Uptime</p>
            <p className="font-semibold">{formatDuration(realTime.metrics.connectionUptime)}</p>
          </div>
          <div>
            <p className="text-gray-600">Buffer Size</p>
            <p className="font-semibold">{realTime.bufferSize.toLocaleString()}</p>
          </div>
          <div>
            <p className="text-gray-600">Last Update</p>
            <p className="font-semibold">
              {realTime.metrics.lastUpdateTime
                ? realTime.metrics.lastUpdateTime.toLocaleTimeString()
                : 'Never'
              }
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  ), [realTime.performanceMetrics, realTime.metrics, formatMetric, formatDuration, isMonitoring, toggleMonitoring])

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Connection Status and Controls */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <span>Real-Time Data Stream</span>
              {connectionStatusBadge}
            </div>
            <div className="flex items-center space-x-2">
              <Button
                variant="outline"
                size="sm"
                onClick={realTime.reconnect}
                disabled={realTime.connectionStatus === 'connecting'}
              >
                <RotateCcw className="w-4 h-4 mr-1" />
                Reconnect
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={realTime.clearBuffer}
              >
                <Trash2 className="w-4 h-4 mr-1" />
                Clear Buffer
              </Button>
            </div>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {realTime.error && (
            <Alert className="mb-4">
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>{realTime.error}</AlertDescription>
            </Alert>
          )}

          {realTime.isBufferFull && (
            <Alert className="mb-4">
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>
                Buffer is full ({maxBufferSize.toLocaleString()} points).
                Older data is being automatically removed.
              </AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>

      {/* Real-Time Metrics */}
      {performanceMetrics}

      {/* Performance Details */}
      {performanceDetails}

      {/* Real-Time Chart */}
      <Card>
        <CardHeader>
          <CardTitle>Real-Time Chart ({chartData.length.toLocaleString()} points)</CardTitle>
        </CardHeader>
        <CardContent>
          <div style={{ width: '100%', height: chartHeight }}>
            <TimeSeriesChart
              data={chartData}
              width={800}
              height={chartHeight}
              onHover={handleChartHover}
              enableZoom={true}
              enablePan={true}
              showGrid={true}
              showCrosshair={true}
              showTooltip={true}
              lineColor="#3b82f6"
              lineWidth={2}
            />
          </div>
        </CardContent>
      </Card>

      {/* Real-Time Data Grid */}
      <Card>
        <CardHeader>
          <CardTitle>Real-Time Data Grid</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {realTime.data.length === 0 ? (
            <div className="p-8 text-center text-gray-500">
              <p>No data available</p>
              <p className="text-sm">Connection Status: {realTime.connectionStatus}</p>
              {realTime.error && (
                <p className="text-sm text-red-600">Error: {realTime.error}</p>
              )}
            </div>
          ) : (
            <VirtualizedTable
              data={realTime.data}
              columns={defaultDataPointColumns}
              height={tableHeight}
            />
          )}
        </CardContent>
      </Card>
    </div>
  )
})

export { RealTimeDashboard }
export default RealTimeDashboard