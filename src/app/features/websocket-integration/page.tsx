'use client'

import React, { useState, useEffect } from 'react'
import { MainNavigation } from '@/components/navigation/MainNavigation'
import { WebSocketDemo } from '@/components/WebSocketDemo'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { 
  Wifi, 
  WifiOff, 
  Activity, 
  Zap, 
  Shield,
  RefreshCw,
  CheckCircle,
  AlertCircle,
  Clock,
  Database,
  Network,
  Settings
} from 'lucide-react'

export default function WebSocketIntegrationPage() {
  const [connectionStatus, setConnectionStatus] = useState<'connecting' | 'connected' | 'disconnected' | 'error'>('disconnected')
  const [connectionStats, setConnectionStats] = useState({
    messagesReceived: 0,
    reconnectAttempts: 0,
    uptime: 0,
    latency: 0,
    dataRate: 0,
    errorCount: 0
  })

  const [isConnecting, setIsConnecting] = useState(false)

  // Simulate connection status and stats
  useEffect(() => {
    if (connectionStatus === 'connected') {
      const interval = setInterval(() => {
        setConnectionStats(prev => ({
          messagesReceived: prev.messagesReceived + Math.floor(Math.random() * 10) + 5,
          reconnectAttempts: prev.reconnectAttempts,
          uptime: prev.uptime + 1,
          latency: Math.random() * 20 + 10,
          dataRate: Math.random() * 50 + 20,
          errorCount: prev.errorCount + (Math.random() > 0.95 ? 1 : 0)
        }))
      }, 1000)

      return () => clearInterval(interval)
    }
  }, [connectionStatus])

  const handleConnect = () => {
    setIsConnecting(true)
    setConnectionStatus('connecting')
    
    setTimeout(() => {
      setConnectionStatus('connected')
      setIsConnecting(false)
      setConnectionStats(prev => ({ ...prev, uptime: 0 }))
    }, 2000)
  }

  const handleDisconnect = () => {
    setConnectionStatus('disconnected')
    setConnectionStats(prev => ({ ...prev, uptime: 0 }))
  }

  const simulateReconnect = () => {
    setConnectionStatus('error')
    setConnectionStats(prev => ({ ...prev, reconnectAttempts: prev.reconnectAttempts + 1 }))
    
    setTimeout(() => {
      setConnectionStatus('connecting')
      setTimeout(() => {
        setConnectionStatus('connected')
        setConnectionStats(prev => ({ ...prev, uptime: 0 }))
      }, 1500)
    }, 1000)
  }

  const getConnectionIcon = () => {
    switch (connectionStatus) {
      case 'connected':
        return <Wifi className="h-4 w-4 text-green-600" />
      case 'connecting':
        return <Activity className="h-4 w-4 text-yellow-600 animate-pulse" />
      case 'error':
        return <WifiOff className="h-4 w-4 text-red-600" />
      default:
        return <WifiOff className="h-4 w-4 text-gray-400" />
    }
  }

  const getConnectionBadge = () => {
    const variants = {
      connected: 'default',
      connecting: 'secondary',
      error: 'destructive',
      disconnected: 'outline'
    } as const

    return (
      <Badge variant={variants[connectionStatus]} className="flex items-center gap-1">
        {getConnectionIcon()}
        {connectionStatus.charAt(0).toUpperCase() + connectionStatus.slice(1)}
      </Badge>
    )
  }

  return (
    <div className="min-h-screen bg-background">
      <MainNavigation />
      <div className="container mx-auto py-8 px-4">
      <div className="mb-8">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-4xl font-bold mb-2">WebSocket Integration</h1>
            <p className="text-lg text-muted-foreground">
              Robust WebSocket client with automatic reconnection, error handling, and real-time data streaming
            </p>
          </div>
          <div className="flex items-center gap-4">
            {getConnectionBadge()}
            <div className="flex gap-2">
              <Button 
                onClick={handleConnect} 
                disabled={connectionStatus === 'connected' || isConnecting}
                variant="default"
              >
                {isConnecting ? <RefreshCw className="h-4 w-4 mr-2 animate-spin" /> : <Wifi className="h-4 w-4 mr-2" />}
                Connect
              </Button>
              <Button 
                onClick={handleDisconnect} 
                disabled={connectionStatus === 'disconnected'}
                variant="outline"
              >
                <WifiOff className="h-4 w-4 mr-2" />
                Disconnect
              </Button>
              <Button 
                onClick={simulateReconnect} 
                variant="secondary"
              >
                <RefreshCw className="h-4 w-4 mr-2" />
                Test Reconnect
              </Button>
            </div>
          </div>
        </div>

        {/* Connection Status Alerts */}
        {connectionStatus === 'connected' && (
          <Alert className="mb-6 border-green-200 bg-green-50">
            <CheckCircle className="h-4 w-4 text-green-600" />
            <AlertDescription className="text-green-800">
              WebSocket connection established successfully. Real-time data streaming is active.
            </AlertDescription>
          </Alert>
        )}

        {connectionStatus === 'error' && (
          <Alert className="mb-6 border-red-200 bg-red-50">
            <AlertCircle className="h-4 w-4 text-red-600" />
            <AlertDescription className="text-red-800">
              Connection failed. Attempting automatic reconnection with exponential backoff...
            </AlertDescription>
          </Alert>
        )}

        {connectionStatus === 'connecting' && (
          <Alert className="mb-6 border-yellow-200 bg-yellow-50">
            <Activity className="h-4 w-4 text-yellow-600 animate-pulse" />
            <AlertDescription className="text-yellow-800">
              Establishing WebSocket connection...
            </AlertDescription>
          </Alert>
        )}
      </div>

      <Tabs defaultValue="demo" className="space-y-6">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="demo">Live Demo</TabsTrigger>
          <TabsTrigger value="features">Connection Features</TabsTrigger>
          <TabsTrigger value="monitoring">Monitoring</TabsTrigger>
          <TabsTrigger value="technical">Technical Details</TabsTrigger>
        </TabsList>

        <TabsContent value="demo" className="space-y-6">
          {/* Connection Metrics */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium flex items-center gap-2">
                  <Database className="h-4 w-4" />
                  Messages Received
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{connectionStats.messagesReceived.toLocaleString()}</div>
                <p className="text-xs text-muted-foreground">Total messages</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium flex items-center gap-2">
                  <Clock className="h-4 w-4" />
                  Connection Uptime
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {connectionStatus === 'connected' ? `${connectionStats.uptime}s` : '--'}
                </div>
                <p className="text-xs text-muted-foreground">Current session</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium flex items-center gap-2">
                  <Zap className="h-4 w-4" />
                  Latency
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {connectionStatus === 'connected' ? `${connectionStats.latency.toFixed(0)}ms` : '--'}
                </div>
                <p className="text-xs text-muted-foreground">Round-trip time</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium flex items-center gap-2">
                  <Network className="h-4 w-4" />
                  Data Rate
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {connectionStatus === 'connected' ? `${connectionStats.dataRate.toFixed(0)}/s` : '--'}
                </div>
                <p className="text-xs text-muted-foreground">Messages per second</p>
              </CardContent>
            </Card>
          </div>

          {/* WebSocket Demo Component */}
          <WebSocketDemo />
        </TabsContent>

        <TabsContent value="features" className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <RefreshCw className="h-5 w-5" />
                  Automatic Reconnection
                </CardTitle>
                <CardDescription>Intelligent connection recovery mechanisms</CardDescription>
              </CardHeader>
              <CardContent>
                <ul className="space-y-3 text-sm">
                  <li className="flex items-start gap-2">
                    <CheckCircle className="h-4 w-4 mt-0.5 text-green-600" />
                    <div>
                      <div className="font-medium">Exponential Backoff</div>
                      <div className="text-muted-foreground">Intelligent retry intervals: 1s, 2s, 4s, 8s, 16s, 30s</div>
                    </div>
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle className="h-4 w-4 mt-0.5 text-green-600" />
                    <div>
                      <div className="font-medium">Connection Health Monitoring</div>
                      <div className="text-muted-foreground">Heartbeat pings to detect connection issues</div>
                    </div>
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle className="h-4 w-4 mt-0.5 text-green-600" />
                    <div>
                      <div className="font-medium">Graceful Degradation</div>
                      <div className="text-muted-foreground">Fallback to polling when WebSocket unavailable</div>
                    </div>
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle className="h-4 w-4 mt-0.5 text-green-600" />
                    <div>
                      <div className="font-medium">State Recovery</div>
                      <div className="text-muted-foreground">Restore subscription state after reconnection</div>
                    </div>
                  </li>
                </ul>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Shield className="h-5 w-5" />
                  Error Handling
                </CardTitle>
                <CardDescription>Comprehensive error detection and recovery</CardDescription>
              </CardHeader>
              <CardContent>
                <ul className="space-y-3 text-sm">
                  <li className="flex items-start gap-2">
                    <AlertCircle className="h-4 w-4 mt-0.5 text-orange-600" />
                    <div>
                      <div className="font-medium">Connection Errors</div>
                      <div className="text-muted-foreground">Network failures, server unavailable, timeout handling</div>
                    </div>
                  </li>
                  <li className="flex items-start gap-2">
                    <AlertCircle className="h-4 w-4 mt-0.5 text-orange-600" />
                    <div>
                      <div className="font-medium">Message Validation</div>
                      <div className="text-muted-foreground">JSON parsing errors, schema validation, data integrity</div>
                    </div>
                  </li>
                  <li className="flex items-start gap-2">
                    <AlertCircle className="h-4 w-4 mt-0.5 text-orange-600" />
                    <div>
                      <div className="font-medium">Rate Limiting</div>
                      <div className="text-muted-foreground">Handle server-side rate limits and backpressure</div>
                    </div>
                  </li>
                  <li className="flex items-start gap-2">
                    <AlertCircle className="h-4 w-4 mt-0.5 text-orange-600" />
                    <div>
                      <div className="font-medium">User Notifications</div>
                      <div className="text-muted-foreground">Clear error messages and recovery suggestions</div>
                    </div>
                  </li>
                </ul>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Database className="h-5 w-5" />
                  Data Management
                </CardTitle>
                <CardDescription>Efficient data handling and processing</CardDescription>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2 text-sm">
                  <li>• Message queuing during disconnection periods</li>
                  <li>• Duplicate message detection and filtering</li>
                  <li>• Message ordering and sequence validation</li>
                  <li>• Compression support for large payloads</li>
                  <li>• Binary data handling (ArrayBuffer, Blob)</li>
                  <li>• Custom protocol support and message routing</li>
                </ul>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Settings className="h-5 w-5" />
                  Configuration Options
                </CardTitle>
                <CardDescription>Flexible connection and behavior settings</CardDescription>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2 text-sm">
                  <li>• Configurable reconnection strategies and timeouts</li>
                  <li>• Custom heartbeat intervals and ping/pong handling</li>
                  <li>• Message buffer size and overflow handling</li>
                  <li>• Debug logging and performance monitoring</li>
                  <li>• Protocol selection (ws://, wss://, subprotocols)</li>
                  <li>• Authentication and authorization integration</li>
                </ul>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="monitoring" className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Connection Statistics</CardTitle>
                <CardDescription>Real-time connection performance metrics</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex justify-between">
                  <span className="text-sm font-medium">Connection Status:</span>
                  <span className="text-sm">{connectionStatus}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm font-medium">Messages Received:</span>
                  <span className="text-sm">{connectionStats.messagesReceived.toLocaleString()}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm font-medium">Reconnection Attempts:</span>
                  <span className="text-sm">{connectionStats.reconnectAttempts}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm font-medium">Current Uptime:</span>
                  <span className="text-sm">{connectionStats.uptime}s</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm font-medium">Average Latency:</span>
                  <span className="text-sm">{connectionStats.latency.toFixed(1)}ms</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm font-medium">Error Count:</span>
                  <span className="text-sm">{connectionStats.errorCount}</span>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Performance Metrics</CardTitle>
                <CardDescription>Connection quality and performance indicators</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex justify-between">
                  <span className="text-sm font-medium">Connection Quality:</span>
                  <Badge variant={connectionStats.latency < 50 ? 'default' : connectionStats.latency < 100 ? 'secondary' : 'destructive'}>
                    {connectionStats.latency < 50 ? 'Excellent' : connectionStats.latency < 100 ? 'Good' : 'Poor'}
                  </Badge>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm font-medium">Data Throughput:</span>
                  <span className="text-sm text-green-600">{connectionStats.dataRate.toFixed(1)} msg/s</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm font-medium">Error Rate:</span>
                  <span className="text-sm">
                    {connectionStats.messagesReceived > 0 
                      ? ((connectionStats.errorCount / connectionStats.messagesReceived) * 100).toFixed(2)
                      : '0.00'
                    }%
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm font-medium">Reliability Score:</span>
                  <span className="text-sm text-green-600">
                    {Math.max(0, 100 - connectionStats.reconnectAttempts * 10 - connectionStats.errorCount * 5).toFixed(0)}%
                  </span>
                </div>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Connection Health Dashboard</CardTitle>
              <CardDescription>Visual representation of connection status and performance</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="text-center">
                  <div className="text-2xl font-bold text-green-600">
                    {connectionStatus === 'connected' ? '✓' : '✗'}
                  </div>
                  <div className="text-sm text-muted-foreground">Connection Status</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-blue-600">
                    {connectionStats.latency.toFixed(0)}ms
                  </div>
                  <div className="text-sm text-muted-foreground">Latency</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-purple-600">
                    {connectionStats.dataRate.toFixed(0)}/s
                  </div>
                  <div className="text-sm text-muted-foreground">Message Rate</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-orange-600">
                    {connectionStats.uptime}s
                  </div>
                  <div className="text-sm text-muted-foreground">Uptime</div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="technical" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Technical Implementation</CardTitle>
              <CardDescription>Architecture and implementation details</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div>
                <h4 className="font-semibold mb-2">WebSocket Hook Architecture</h4>
                <p className="text-sm text-muted-foreground mb-2">
                  Custom React hook providing WebSocket functionality with advanced features:
                </p>
                <ul className="text-sm space-y-1 ml-4">
                  <li>• useWebSocket hook with connection state management</li>
                  <li>• Automatic cleanup on component unmount</li>
                  <li>• Event-driven architecture with custom event handlers</li>
                  <li>• TypeScript support with strict type checking</li>
                </ul>
              </div>

              <div>
                <h4 className="font-semibold mb-2">Reconnection Strategy</h4>
                <p className="text-sm text-muted-foreground mb-2">
                  Intelligent reconnection with exponential backoff and jitter:
                </p>
                <ul className="text-sm space-y-1 ml-4">
                  <li>• Base delay: 1000ms, max delay: 30000ms</li>
                  <li>• Exponential multiplier: 2x with random jitter</li>
                  <li>• Maximum reconnection attempts: configurable (default: unlimited)</li>
                  <li>• Connection health checks with ping/pong heartbeat</li>
                </ul>
              </div>

              <div>
                <h4 className="font-semibold mb-2">Message Processing Pipeline</h4>
                <p className="text-sm text-muted-foreground mb-2">
                  Efficient message handling with validation and error recovery:
                </p>
                <ul className="text-sm space-y-1 ml-4">
                  <li>• JSON parsing with error handling and fallback</li>
                  <li>• Schema validation using Zod or similar library</li>
                  <li>• Message queuing during disconnection periods</li>
                  <li>• Duplicate detection using message IDs or timestamps</li>
                </ul>
              </div>

              <div>
                <h4 className="font-semibold mb-2">Performance Optimizations</h4>
                <p className="text-sm text-muted-foreground mb-2">
                  Multiple optimization strategies for high-performance operation:
                </p>
                <ul className="text-sm space-y-1 ml-4">
                  <li>• Debounced message processing to prevent UI blocking</li>
                  <li>• Message batching for high-frequency updates</li>
                  <li>• Memory-efficient buffer management with circular buffers</li>
                  <li>• Background processing with Web Workers for heavy operations</li>
                </ul>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
      </div>
    </div>
  )
}