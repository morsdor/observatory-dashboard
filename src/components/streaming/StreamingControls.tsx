/**
 * Unified Streaming Controls Component
 * 
 * This component provides consistent streaming controls across all pages.
 * It integrates with the DataStreamingService for centralized data management.
 */

'use client'

import React, { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { 
  Play, 
  Pause, 
  RotateCcw, 
  Settings, 
  Activity, 
  Wifi, 
  WifiOff, 
  AlertTriangle,
  Database,
  Zap
} from 'lucide-react'
import { getDataStreamingService, type StreamingStatus, type DataScenario, type StreamingMetrics } from '@/services/dataStreamingService'

interface StreamingControlsProps {
  className?: string
  showAdvancedControls?: boolean
  compact?: boolean
}

export function StreamingControls({ 
  className = '', 
  showAdvancedControls = false,
  compact = false 
}: StreamingControlsProps) {
  const [status, setStatus] = useState<StreamingStatus>('disconnected')
  const [metrics, setMetrics] = useState<StreamingMetrics | null>(null)
  const [scenario, setScenario] = useState<DataScenario>('normal')
  const [dataRate, setDataRate] = useState(10)
  
  const streamingService = getDataStreamingService()
  
  useEffect(() => {
    // Initialize with current state
    setStatus(streamingService.getStatus())
    setMetrics(streamingService.getMetrics())
    const config = streamingService.getConfig()
    setScenario(config.scenario)
    setDataRate(config.dataPointsPerSecond)
    
    // Set up listeners
    const unsubscribeStatus = streamingService.onStatusChange(setStatus)
    const unsubscribeMetrics = streamingService.onMetricsUpdate(setMetrics)
    
    return () => {
      unsubscribeStatus()
      unsubscribeMetrics()
    }
  }, [streamingService])
  
  const handleConnect = () => {
    streamingService.connect()
  }
  
  const handleDisconnect = () => {
    streamingService.disconnect()
  }
  
  const handleClearBuffer = () => {
    streamingService.clearBuffer()
  }
  
  const handleScenarioChange = (newScenario: DataScenario) => {
    setScenario(newScenario)
    streamingService.changeScenario(newScenario)
  }
  
  const handleDataRateChange = (newRate: number) => {
    setDataRate(newRate)
    streamingService.updateConfig({ dataPointsPerSecond: newRate })
  }
  
  const getStatusIcon = () => {
    switch (status) {
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
  }
  
  const getStatusBadge = () => {
    const variants = {
      connected: 'default' as const,
      connecting: 'secondary' as const,
      disconnected: 'outline' as const,
      error: 'destructive' as const
    }
    
    return (
      <Badge variant={variants[status]} className="flex items-center gap-1">
        {getStatusIcon()}
        <span className="capitalize">{status}</span>
      </Badge>
    )
  }
  
  const formatDuration = (ms: number) => {
    const seconds = Math.floor(ms / 1000)
    if (seconds < 60) return `${seconds}s`
    const minutes = Math.floor(seconds / 60)
    if (minutes < 60) return `${minutes}m ${seconds % 60}s`
    const hours = Math.floor(minutes / 60)
    return `${hours}h ${minutes % 60}m`
  }
  
  const scenarios = [
    { value: 'normal', label: 'Normal' },
    { value: 'high_load', label: 'High Load' },
    { value: 'system_failure', label: 'System Failure' },
    { value: 'maintenance', label: 'Maintenance' },
    { value: 'peak_hours', label: 'Peak Hours' },
    { value: 'weekend', label: 'Weekend' }
  ]
  
  if (compact) {
    return (
      <div className={`flex items-center gap-2 ${className}`}>
        {getStatusBadge()}
        <Button
          variant="outline"
          size="sm"
          onClick={status === 'connected' ? handleDisconnect : handleConnect}
          disabled={status === 'connecting'}
        >
          {status === 'connected' ? (
            <>
              <Pause className="w-3 h-3 mr-1" />
              Stop
            </>
          ) : (
            <>
              <Play className="w-3 h-3 mr-1" />
              Start
            </>
          )}
        </Button>
        {metrics && (
          <span className="text-sm text-muted-foreground">
            {metrics.totalDataPoints.toLocaleString()} points
          </span>
        )}
      </div>
    )
  }
  
  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Database className="w-5 h-5" />
            Data Streaming
          </div>
          {getStatusBadge()}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Connection Controls */}
        <div className="flex items-center gap-2">
          <Button
            onClick={status === 'connected' ? handleDisconnect : handleConnect}
            disabled={status === 'connecting'}
            className="flex-1"
          >
            {status === 'connected' ? (
              <>
                <Pause className="w-4 h-4 mr-2" />
                Stop Streaming
              </>
            ) : (
              <>
                <Play className="w-4 h-4 mr-2" />
                Start Streaming
              </>
            )}
          </Button>
          <Button
            variant="outline"
            onClick={handleClearBuffer}
            disabled={status !== 'connected'}
          >
            <RotateCcw className="w-4 h-4 mr-2" />
            Clear
          </Button>
        </div>
        
        {/* Metrics Display */}
        {metrics && (
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div className="flex items-center gap-2">
              <Database className="w-4 h-4 text-blue-600" />
              <div>
                <div className="font-medium">{metrics.totalDataPoints.toLocaleString()}</div>
                <div className="text-muted-foreground">Total Points</div>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Zap className="w-4 h-4 text-green-600" />
              <div>
                <div className="font-medium">{Math.round(metrics.dataPointsPerSecond)}/s</div>
                <div className="text-muted-foreground">Data Rate</div>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Activity className="w-4 h-4 text-purple-600" />
              <div>
                <div className="font-medium">{formatDuration(metrics.connectionUptime)}</div>
                <div className="text-muted-foreground">Uptime</div>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Settings className="w-4 h-4 text-orange-600" />
              <div>
                <div className="font-medium">{Math.round(metrics.bufferUtilization)}%</div>
                <div className="text-muted-foreground">Buffer</div>
              </div>
            </div>
          </div>
        )}
        
        {/* Advanced Controls */}
        {showAdvancedControls && (
          <div className="space-y-3 pt-3 border-t">
            <div className="space-y-2">
              <Label htmlFor="scenario">Scenario</Label>
              <Select value={scenario} onValueChange={handleScenarioChange}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {scenarios.map(s => (
                    <SelectItem key={s.value} value={s.value}>
                      {s.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="dataRate">Data Rate (points/second)</Label>
              <Input
                id="dataRate"
                type="number"
                value={dataRate}
                onChange={(e) => handleDataRateChange(parseInt(e.target.value) || 10)}
                min="1"
                max="1000"
              />
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}

export default StreamingControls