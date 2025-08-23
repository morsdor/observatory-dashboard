/**
 * Global Streaming Control Component
 * 
 * This component provides a unified streaming control bar that appears
 * at the top of all pages, giving users a single place to control
 * data streaming across the entire application.
 */

'use client'

import React, { useState } from 'react'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
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
  Zap,
  ChevronDown,
  ChevronUp
} from 'lucide-react'
import { useDataStreaming } from '@/hooks/useDataStreaming'
import type { DataScenario } from '@/services/dataStreamingService'

export function GlobalStreamingControl() {
  const [isExpanded, setIsExpanded] = useState(false)
  
  const {
    status,
    isConnected,
    isConnecting,
    metrics,
    connect,
    disconnect,
    clearBuffer,
    changeScenario,
    updateConfig
  } = useDataStreaming({ autoConnect: false })

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

  const scenarios: { value: DataScenario; label: string }[] = [
    { value: 'normal', label: 'Normal' },
    { value: 'high_load', label: 'High Load' },
    { value: 'system_failure', label: 'System Failure' },
    { value: 'maintenance', label: 'Maintenance' },
    { value: 'peak_hours', label: 'Peak Hours' },
    { value: 'weekend', label: 'Weekend' }
  ]

  const handleDataRateChange = (rate: string) => {
    updateConfig({ dataPointsPerSecond: parseInt(rate) })
  }

  return (
    <div className="border-b bg-muted/30 sticky top-0 z-40">
      <div className="container mx-auto px-4">
        <Card className="border-0 shadow-none bg-transparent">
          <div className="p-3">
            {/* Compact View */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-2">
                  <Database className="w-5 h-5 text-blue-600" />
                  <span className="font-semibold text-sm">Data Streaming</span>
                  {getStatusBadge()}
                </div>
                
                {metrics && (
                  <div className="flex items-center gap-4 text-sm text-muted-foreground">
                    <div className="flex items-center gap-1">
                      <Zap className="w-3 h-3" />
                      <span>{Math.round(metrics.dataPointsPerSecond)}/s</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <Database className="w-3 h-3" />
                      <span>{metrics.totalDataPoints.toLocaleString()}</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <Activity className="w-3 h-3" />
                      <span>{Math.round(metrics.bufferUtilization)}%</span>
                    </div>
                  </div>
                )}
              </div>

              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={isConnected ? disconnect : connect}
                  disabled={isConnecting}
                >
                  {isConnected ? (
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
                
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setIsExpanded(!isExpanded)}
                >
                  <Settings className="w-3 h-3 mr-1" />
                  {isExpanded ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                </Button>
              </div>
            </div>

            {/* Expanded View */}
            {isExpanded && (
              <div className="mt-4 pt-4 border-t">
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                  {/* Detailed Metrics */}
                  <div className="space-y-2">
                    <h4 className="font-medium text-sm">Metrics</h4>
                    <div className="space-y-1 text-xs">
                      <div className="flex justify-between">
                        <span>Total Points:</span>
                        <span className="font-mono">{metrics?.totalDataPoints.toLocaleString() || '0'}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Data Rate:</span>
                        <span className="font-mono">{metrics ? `${Math.round(metrics.dataPointsPerSecond)}/s` : '0/s'}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Uptime:</span>
                        <span className="font-mono">
                          {metrics ? `${Math.floor(metrics.connectionUptime / 1000)}s` : '0s'}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span>Memory:</span>
                        <span className="font-mono">{metrics ? `${metrics.memoryUsage.toFixed(1)}MB` : '0MB'}</span>
                      </div>
                    </div>
                  </div>

                  {/* Scenario Control */}
                  <div className="space-y-2">
                    <h4 className="font-medium text-sm">Scenario</h4>
                    <Select onValueChange={(value) => changeScenario(value as DataScenario)}>
                      <SelectTrigger className="h-8">
                        <SelectValue placeholder="Normal" />
                      </SelectTrigger>
                      <SelectContent>
                        {scenarios.map(scenario => (
                          <SelectItem key={scenario.value} value={scenario.value}>
                            {scenario.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Data Rate Control */}
                  <div className="space-y-2">
                    <h4 className="font-medium text-sm">Data Rate</h4>
                    <Select onValueChange={handleDataRateChange}>
                      <SelectTrigger className="h-8">
                        <SelectValue placeholder="10/s" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="1">1/s</SelectItem>
                        <SelectItem value="5">5/s</SelectItem>
                        <SelectItem value="10">10/s</SelectItem>
                        <SelectItem value="25">25/s</SelectItem>
                        <SelectItem value="50">50/s</SelectItem>
                        <SelectItem value="100">100/s</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Actions */}
                  <div className="space-y-2">
                    <h4 className="font-medium text-sm">Actions</h4>
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={clearBuffer}
                        disabled={!isConnected}
                      >
                        <RotateCcw className="w-3 h-3 mr-1" />
                        Clear
                      </Button>
                    </div>
                  </div>
                </div>

                {/* Status Messages */}
                <div className="mt-4 pt-4 border-t">
                  <div className="text-xs text-muted-foreground">
                    {status === 'connected' && (
                      <div className="flex items-center gap-1 text-green-600">
                        <Wifi className="w-3 h-3" />
                        <span>Connected - Real-time data streaming active</span>
                      </div>
                    )}
                    {status === 'connecting' && (
                      <div className="flex items-center gap-1 text-yellow-600">
                        <Activity className="w-3 h-3 animate-pulse" />
                        <span>Connecting to data stream...</span>
                      </div>
                    )}
                    {status === 'disconnected' && (
                      <div className="flex items-center gap-1 text-gray-500">
                        <WifiOff className="w-3 h-3" />
                        <span>Disconnected - Click Start to begin streaming</span>
                      </div>
                    )}
                    {status === 'error' && (
                      <div className="flex items-center gap-1 text-red-600">
                        <AlertTriangle className="w-3 h-3" />
                        <span>Connection error - Attempting to reconnect with mock data</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>
        </Card>
      </div>
    </div>
  )
}

export default GlobalStreamingControl