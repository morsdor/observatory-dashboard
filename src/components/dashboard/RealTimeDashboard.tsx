'use client'

import React, { useCallback, useMemo, useState, memo } from 'react'
import { useDataStreaming } from '@/hooks/useDataStreaming'
import { TimeSeriesChart } from '@/components/charts/TimeSeriesChart'
import { VirtualizedTable, defaultDataPointColumns } from './VirtualizedTable'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Alert, AlertDescription } from '@/components/ui/alert'
import {
  Activity,
  Database,
  AlertTriangle,
  Pause,
  Play,
  RotateCcw,
  Trash2
} from 'lucide-react'
import { DataPoint } from '@/types'
import { Button } from '../ui/button'

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
  const [chartHeight] = useState(400)
  const [tableHeight] = useState(400)

  // Initialize data streaming with the new unified service
  const {
    data,
    status,
    isConnected,
    metrics,
    connect,
    disconnect,
    clearBuffer
  } = useDataStreaming({
    autoConnect: true,
    bufferSize: maxBufferSize,
    config: {
      websocketUrl,
      bufferSize: maxBufferSize
    }
  })

  // Memoized chart data for performance
  const chartData = useMemo(() => {
    // Limit chart data to last 1000 points for performance
    const maxChartPoints = 1000
    return data.length > maxChartPoints
      ? data.slice(-maxChartPoints)
      : data
  }, [data])

  // Memoized connection status components for performance
  const connectionStatusIcon = useMemo(() => {
    switch (status) {
      case 'connected':
        return <Activity className="w-4 h-4 text-green-600" />
      case 'connecting':
        return <Activity className="w-4 h-4 text-yellow-600 animate-pulse" />
      case 'disconnected':
        return <Activity className="w-4 h-4 text-gray-400" />
      case 'error':
        return <AlertTriangle className="w-4 h-4 text-red-600" />
      default:
        return <Activity className="w-4 h-4 text-gray-400" />
    }
  }, [status])

  const connectionStatusBadge = useMemo(() => {
    const variants = {
      connected: 'default' as const,
      connecting: 'secondary' as const,
      disconnected: 'outline' as const,
      error: 'destructive' as const
    }

    return (
      <div className="flex items-center gap-1">
        {connectionStatusIcon}
        <span className="capitalize">{status}</span>
      </div>
    )
  }, [status, connectionStatusIcon])

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

  // Handle monitoring toggle (simplified for new system)
  const toggleMonitoring = useCallback(() => {
    // The new streaming service handles monitoring automatically
    // This is kept for UI consistency but doesn't need to do anything
  }, [])

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
                {metrics ? formatMetric(metrics.dataPointsPerSecond, '/s') : '0/s'}
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
                {metrics ? metrics.totalDataPoints.toLocaleString() : '0'}
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
                {metrics ? formatBytes(metrics.memoryUsage * 1024 * 1024) : '0 B'}
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
                {metrics ? formatMetric(metrics.bufferUtilization, '%', 1) : '0%'}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  ), [metrics, formatMetric, formatBytes])

  // Memoized performance details to prevent unnecessary re-renders
  const performanceDetails = useMemo(() => (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <span>Performance Metrics</span>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4 text-sm">
          <div>
            <p className="text-gray-600">Connection Status</p>
            <p className="font-semibold capitalize">{status}</p>
          </div>
          <div>
            <p className="text-gray-600">Data Points</p>
            <p className="font-semibold">{data.length.toLocaleString()}</p>
          </div>
          <div>
            <p className="text-gray-600">Data Rate</p>
            <p className="font-semibold">{metrics ? `${Math.round(metrics.dataPointsPerSecond)}/s` : '0/s'}</p>
          </div>
          <div>
            <p className="text-gray-600">Connection Uptime</p>
            <p className="font-semibold">{metrics ? formatDuration(metrics.connectionUptime / 1000) : '0s'}</p>
          </div>
          <div>
            <p className="text-gray-600">Buffer Size</p>
            <p className="font-semibold">{data.length.toLocaleString()}</p>
          </div>
          <div>
            <p className="text-gray-600">Last Update</p>
            <p className="font-semibold">
              {metrics?.lastUpdateTime
                ? metrics.lastUpdateTime.toLocaleTimeString()
                : 'Never'
              }
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  ), [status, data.length, metrics, formatDuration])

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
                onClick={connect}
                disabled={status === 'connecting'}
              >
                <RotateCcw className="w-4 h-4 mr-1" />
                Reconnect
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={clearBuffer}
              >
                <Trash2 className="w-4 h-4 mr-1" />
                Clear Buffer
              </Button>
            </div>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {status === 'error' && (
            <Alert className="mb-4">
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>Connection error occurred. Retrying...</AlertDescription>
            </Alert>
          )}

          {data.length >= maxBufferSize && (
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
          {data.length === 0 ? (
            <div className="p-8 text-center text-gray-500">
              <p>No data available</p>
              <p className="text-sm">Connection Status: {status}</p>
              {status === 'error' && (
                <p className="text-sm text-red-600">Connection error - attempting to reconnect...</p>
              )}
            </div>
          ) : (
            <VirtualizedTable
              data={data}
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