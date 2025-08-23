'use client'

import React from 'react'
import { useDataStreaming } from '@/hooks/useDataStreaming'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
    Play,
    Pause,
    RotateCcw,
    Zap,
    Database,
    Activity,
    TestTube
} from 'lucide-react'

export function WebSocketDemo() {
    const {
        data,
        recentData,
        status,
        isConnected,
        isConnecting,
        metrics,
        connect,
        disconnect,
        clearBuffer,
        simulateSpike,
        injectTestData
    } = useDataStreaming({ autoConnect: false })

    const handleInjectTestData = () => {
        const testData = [{
            id: `manual-${Date.now()}`,
            timestamp: new Date(),
            value: Math.random() * 100,
            category: 'manual',
            source: 'demo',
            metadata: { injected: true }
        }]
        injectTestData(testData)
    }

    const handleSimulateSpike = () => {
        simulateSpike(3000, 3) // 3 second spike with 3x data rate
    }

    return (
        <div className="p-6 max-w-4xl mx-auto space-y-6">
            <div>
                <h1 className="text-2xl font-bold mb-2">Data Streaming Demo</h1>
                <p className="text-muted-foreground">
                    Unified data streaming system with WebSocket fallback to mock data generation
                </p>
            </div>

            {/* Controls */}
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <Activity className="h-5 w-5" />
                        Streaming Controls
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="flex flex-wrap gap-3">
                        <Button
                            onClick={isConnected ? disconnect : connect}
                            disabled={isConnecting}
                            variant={isConnected ? 'destructive' : 'default'}
                        >
                            {isConnected ? (
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
                            onClick={clearBuffer}
                            variant="outline"
                            disabled={!isConnected}
                        >
                            <RotateCcw className="w-4 h-4 mr-2" />
                            Clear Buffer
                        </Button>
                        <Button
                            onClick={handleInjectTestData}
                            variant="outline"
                        >
                            <TestTube className="w-4 h-4 mr-2" />
                            Inject Test Data
                        </Button>
                        <Button
                            onClick={handleSimulateSpike}
                            variant="outline"
                            disabled={!isConnected}
                        >
                            <Zap className="w-4 h-4 mr-2" />
                            Simulate Spike
                        </Button>
                    </div>
                </CardContent>
            </Card>

            {/* Status */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <Card>
                    <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium">Connection Status</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <Badge
                            variant={
                                status === 'connected' ? 'default' :
                                    status === 'connecting' ? 'secondary' :
                                        status === 'error' ? 'destructive' : 'outline'
                            }
                            className="capitalize"
                        >
                            {status}
                        </Badge>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium">Buffer Size</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{data.length}</div>
                        <p className="text-xs text-muted-foreground">Data points</p>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium">Data Rate</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">
                            {metrics ? `${Math.round(metrics.dataPointsPerSecond)}/s` : '0/s'}
                        </div>
                        <p className="text-xs text-muted-foreground">Points per second</p>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium">Buffer Usage</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">
                            {metrics ? `${Math.round(metrics.bufferUtilization)}%` : '0%'}
                        </div>
                        <p className="text-xs text-muted-foreground">Utilization</p>
                    </CardContent>
                </Card>
            </div>

            {/* Metrics */}
            {metrics && (
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <Database className="h-5 w-5" />
                            Detailed Metrics
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                            <div className="text-center">
                                <div className="text-2xl font-bold text-blue-600">
                                    {metrics.totalDataPoints.toLocaleString()}
                                </div>
                                <div className="text-sm text-muted-foreground">Total Points</div>
                            </div>
                            <div className="text-center">
                                <div className="text-2xl font-bold text-green-600">
                                    {Math.round(metrics.dataPointsPerSecond)}
                                </div>
                                <div className="text-sm text-muted-foreground">Points/Second</div>
                            </div>
                            <div className="text-center">
                                <div className="text-2xl font-bold text-purple-600">
                                    {Math.floor(metrics.connectionUptime / 1000)}s
                                </div>
                                <div className="text-sm text-muted-foreground">Uptime</div>
                            </div>
                            <div className="text-center">
                                <div className="text-2xl font-bold text-orange-600">
                                    {metrics.memoryUsage.toFixed(1)} MB
                                </div>
                                <div className="text-sm text-muted-foreground">Memory Usage</div>
                            </div>
                        </div>
                    </CardContent>
                </Card>
            )}

            {/* Data Display */}
            <Card>
                <CardHeader>
                    <CardTitle>Recent Data Points</CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="max-h-96 overflow-y-auto">
                        {recentData.length === 0 ? (
                            <p className="text-muted-foreground text-center py-8">
                                No data points yet. Start streaming to see data.
                            </p>
                        ) : (
                            <div className="space-y-2">
                                {recentData.slice(-10).reverse().map((point) => (
                                    <div key={point.id} className="border rounded-lg p-3">
                                        <div className="flex justify-between items-start">
                                            <div>
                                                <span className="font-mono text-sm text-muted-foreground">
                                                    {point.id}
                                                </span>
                                                <div className="flex space-x-4 mt-1 text-sm">
                                                    <span>
                                                        <strong>Category:</strong> {point.category}
                                                    </span>
                                                    <span>
                                                        <strong>Source:</strong> {point.source}
                                                    </span>
                                                    <span>
                                                        <strong>Value:</strong> {point.value.toFixed(2)}
                                                    </span>
                                                </div>
                                            </div>
                                            <span className="text-xs text-muted-foreground">
                                                {point.timestamp || point.timestamp.toLocaleTimeString()}
                                            </span>
                                        </div>
                                        {point.metadata?.injected && (
                                            <Badge variant="secondary" className="mt-2">
                                                Manually Injected
                                            </Badge>
                                        )}
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </CardContent>
            </Card>
        </div>
    )
}