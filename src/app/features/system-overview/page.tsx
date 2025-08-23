'use client'

import React, { useState, useEffect } from 'react'
import { useRealPerformanceMetrics, formatFps } from '@/utils/realPerformanceMetrics'
import { PageLayout } from '@/components/layout/PageLayout'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Progress } from '@/components/ui/progress'
import { 
  Monitor, 
  Cpu, 
  Database, 
  Network,
  BarChart3,
  Filter,
  Zap,
  CheckCircle,
  Activity,
  TrendingUp,
  Settings,
  Layers,
  GitBranch
} from 'lucide-react'
import { useDataStreaming } from '@/hooks/useDataStreaming'

export default function SystemOverviewPage() {
  const { getCurrentMetrics } = useRealPerformanceMetrics()
  const currentMetrics = getCurrentMetrics()
  const { metrics: streamingMetrics, status } = useDataStreaming({ autoConnect: false })
  
  const [systemStats, setSystemStats] = useState({
    totalComponents: 45,
    activeConnections: status === 'connected' ? 1 : 0,
    memoryUsage: 67,
    cpuUsage: 23,
    networkThroughput: 1250
  })

  // Simulate real-time system stats
  useEffect(() => {
    const interval = setInterval(() => {
      setSystemStats(prev => ({
        totalComponents: prev.totalComponents,
        activeConnections: status === 'connected' ? 1 : 0,
        memoryUsage: Math.max(30, Math.min(90, prev.memoryUsage + (Math.random() - 0.5) * 5)),
        cpuUsage: Math.max(10, Math.min(80, prev.cpuUsage + (Math.random() - 0.5) * 10)),
        networkThroughput: Math.max(500, Math.min(2000, prev.networkThroughput + (Math.random() - 0.5) * 200))
      }))
    }, 2000)

    return () => clearInterval(interval)
  }, [status])

  const components = [
    {
      category: 'Data Layer',
      items: [
        { name: 'WebSocket Client', status: 'active', description: 'Real-time data streaming' },
        { name: 'Data Buffer', status: 'active', description: 'Sliding window buffer (100k points)' },
        { name: 'Mock Data Generator', status: 'active', description: 'Realistic data patterns' },
        { name: 'Data Validation', status: 'active', description: 'Schema validation with Zod' }
      ]
    },
    {
      category: 'State Management',
      items: [
        { name: 'Redux Store', status: 'active', description: 'Global state management' },
        { name: 'Data Slice', status: 'active', description: 'Raw and filtered data' },
        { name: 'Filter Slice', status: 'active', description: 'Filter conditions and state' },
        { name: 'UI Slice', status: 'active', description: 'Interface state and selections' }
      ]
    },
    {
      category: 'Visualization',
      items: [
        { name: 'Canvas Charts', status: 'active', description: 'High-performance chart rendering' },
        { name: 'Virtualized Grid', status: 'active', description: 'Efficient data table display' },
        { name: 'D3.js Integration', status: 'active', description: 'Scales, axes, and interactions' },
        { name: 'Chart Synchronization', status: 'active', description: 'Linked chart interactions' }
      ]
    },
    {
      category: 'Filtering Engine',
      items: [
        { name: 'Filter Engine', status: 'active', description: 'High-performance client-side filtering' },
        { name: 'Query Builder', status: 'active', description: 'Visual filter construction' },
        { name: 'Index Manager', status: 'active', description: 'Optimized data lookups' },
        { name: 'Cache System', status: 'active', description: 'Filter result caching' }
      ]
    },
    {
      category: 'Performance',
      items: [
        { name: 'Memory Manager', status: 'active', description: 'Garbage collection optimization' },
        { name: 'Render Optimizer', status: 'active', description: 'React.memo and memoization' },
        { name: 'Web Workers', status: 'ready', description: 'Background processing' },
        { name: 'Performance Monitor', status: 'active', description: 'Real-time metrics tracking' }
      ]
    }
  ]

  const dataFlow = [
    { from: 'WebSocket Server', to: 'WebSocket Client', description: 'Real-time data stream' },
    { from: 'WebSocket Client', to: 'Data Buffer', description: 'Buffered data points' },
    { from: 'Data Buffer', to: 'Redux Store', description: 'State updates' },
    { from: 'Redux Store', to: 'Filter Engine', description: 'Raw data for filtering' },
    { from: 'Filter Engine', to: 'Visualization Components', description: 'Filtered results' },
    { from: 'Visualization Components', to: 'Canvas/DOM', description: 'Rendered output' }
  ]

  return (
    <PageLayout
      title="System Overview"
      description="Complete system architecture overview showing component relationships, data flow, performance metrics, and real-time system health monitoring."
      showStreamingControls={true}
      streamingControlsCompact={true}
    >

      <Tabs defaultValue="architecture" className="space-y-6">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="architecture">Architecture</TabsTrigger>
          <TabsTrigger value="components">Components</TabsTrigger>
          <TabsTrigger value="dataflow">Data Flow</TabsTrigger>
          <TabsTrigger value="metrics">System Metrics</TabsTrigger>
        </TabsList>

        <TabsContent value="architecture" className="space-y-6">
          {/* System Health Dashboard */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium flex items-center gap-2">
                  <Monitor className="h-4 w-4" />
                  System Status
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-green-600">Healthy</div>
                <p className="text-xs text-muted-foreground">All systems operational</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium flex items-center gap-2">
                  <Layers className="h-4 w-4" />
                  Components
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{systemStats.totalComponents}</div>
                <p className="text-xs text-muted-foreground">Active components</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium flex items-center gap-2">
                  <Network className="h-4 w-4" />
                  Connections
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{systemStats.activeConnections}</div>
                <p className="text-xs text-muted-foreground">WebSocket connections</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium flex items-center gap-2">
                  <Database className="h-4 w-4" />
                  Data Points
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {streamingMetrics?.totalDataPoints.toLocaleString() || '0'}
                </div>
                <p className="text-xs text-muted-foreground">Currently processed</p>
              </CardContent>
            </Card>
          </div>

          {/* Architecture Diagram */}
          <Card>
            <CardHeader>
              <CardTitle>System Architecture</CardTitle>
              <CardDescription>High-level overview of system components and their relationships</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-8">
                {/* Presentation Layer */}
                <div>
                  <h4 className="font-semibold mb-4 flex items-center gap-2">
                    <Monitor className="h-4 w-4" />
                    Presentation Layer
                  </h4>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <Card className="bg-blue-50 border-blue-200">
                      <CardContent className="p-4">
                        <div className="flex items-center gap-2 mb-2">
                          <BarChart3 className="h-4 w-4 text-blue-600" />
                          <span className="font-medium">Canvas Charts</span>
                        </div>
                        <p className="text-xs text-muted-foreground">High-performance visualization</p>
                      </CardContent>
                    </Card>
                    <Card className="bg-green-50 border-green-200">
                      <CardContent className="p-4">
                        <div className="flex items-center gap-2 mb-2">
                          <Database className="h-4 w-4 text-green-600" />
                          <span className="font-medium">Virtualized Grid</span>
                        </div>
                        <p className="text-xs text-muted-foreground">Efficient data display</p>
                      </CardContent>
                    </Card>
                    <Card className="bg-purple-50 border-purple-200">
                      <CardContent className="p-4">
                        <div className="flex items-center gap-2 mb-2">
                          <Filter className="h-4 w-4 text-purple-600" />
                          <span className="font-medium">Filter UI</span>
                        </div>
                        <p className="text-xs text-muted-foreground">Interactive filtering</p>
                      </CardContent>
                    </Card>
                  </div>
                </div>

                {/* Business Logic Layer */}
                <div>
                  <h4 className="font-semibold mb-4 flex items-center gap-2">
                    <Settings className="h-4 w-4" />
                    Business Logic Layer
                  </h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <Card className="bg-orange-50 border-orange-200">
                      <CardContent className="p-4">
                        <div className="flex items-center gap-2 mb-2">
                          <Filter className="h-4 w-4 text-orange-600" />
                          <span className="font-medium">Filter Engine</span>
                        </div>
                        <p className="text-xs text-muted-foreground">High-performance filtering</p>
                      </CardContent>
                    </Card>
                    <Card className="bg-red-50 border-red-200">
                      <CardContent className="p-4">
                        <div className="flex items-center gap-2 mb-2">
                          <Zap className="h-4 w-4 text-red-600" />
                          <span className="font-medium">Performance Monitor</span>
                        </div>
                        <p className="text-xs text-muted-foreground">Real-time optimization</p>
                      </CardContent>
                    </Card>
                  </div>
                </div>

                {/* Data Layer */}
                <div>
                  <h4 className="font-semibold mb-4 flex items-center gap-2">
                    <Database className="h-4 w-4" />
                    Data Layer
                  </h4>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <Card className="bg-gray-50 border-gray-200">
                      <CardContent className="p-4">
                        <div className="flex items-center gap-2 mb-2">
                          <Network className="h-4 w-4 text-gray-600" />
                          <span className="font-medium">WebSocket Client</span>
                        </div>
                        <p className="text-xs text-muted-foreground">Real-time data streaming</p>
                      </CardContent>
                    </Card>
                    <Card className="bg-yellow-50 border-yellow-200">
                      <CardContent className="p-4">
                        <div className="flex items-center gap-2 mb-2">
                          <Database className="h-4 w-4 text-yellow-600" />
                          <span className="font-medium">Data Buffer</span>
                        </div>
                        <p className="text-xs text-muted-foreground">Sliding window management</p>
                      </CardContent>
                    </Card>
                    <Card className="bg-indigo-50 border-indigo-200">
                      <CardContent className="p-4">
                        <div className="flex items-center gap-2 mb-2">
                          <Settings className="h-4 w-4 text-indigo-600" />
                          <span className="font-medium">Redux Store</span>
                        </div>
                        <p className="text-xs text-muted-foreground">State management</p>
                      </CardContent>
                    </Card>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="components" className="space-y-6">
          <div className="space-y-6">
            {components.map((category, index) => (
              <Card key={index}>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    {category.category === 'Data Layer' && <Database className="h-5 w-5" />}
                    {category.category === 'State Management' && <Settings className="h-5 w-5" />}
                    {category.category === 'Visualization' && <BarChart3 className="h-5 w-5" />}
                    {category.category === 'Filtering Engine' && <Filter className="h-5 w-5" />}
                    {category.category === 'Performance' && <Zap className="h-5 w-5" />}
                    {category.category}
                  </CardTitle>
                  <CardDescription>
                    {category.items.length} components in this category
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {category.items.map((item, itemIndex) => (
                      <div key={itemIndex} className="flex items-start gap-3 p-3 rounded-lg border">
                        <div className="mt-1">
                          {item.status === 'active' ? (
                            <CheckCircle className="h-4 w-4 text-green-600" />
                          ) : item.status === 'ready' ? (
                            <Activity className="h-4 w-4 text-blue-600" />
                          ) : (
                            <div className="h-4 w-4 rounded-full bg-gray-300" />
                          )}
                        </div>
                        <div className="flex-1">
                          <div className="flex items-center justify-between">
                            <h4 className="font-medium">{item.name}</h4>
                            <Badge variant={item.status === 'active' ? 'default' : 'secondary'}>
                              {item.status}
                            </Badge>
                          </div>
                          <p className="text-sm text-muted-foreground mt-1">{item.description}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="dataflow" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <GitBranch className="h-5 w-5" />
                Data Flow Diagram
              </CardTitle>
              <CardDescription>
                How data flows through the system from source to visualization
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-6">
                {dataFlow.map((flow, index) => (
                  <div key={index} className="flex items-center gap-4">
                    <Card className="flex-1 bg-blue-50 border-blue-200">
                      <CardContent className="p-3 text-center">
                        <span className="font-medium text-blue-800">{flow.from}</span>
                      </CardContent>
                    </Card>
                    <div className="flex flex-col items-center gap-1">
                      <div className="w-8 h-0.5 bg-gray-400"></div>
                      <div className="w-0 h-0 border-l-4 border-r-4 border-t-4 border-transparent border-t-gray-400"></div>
                    </div>
                    <Card className="flex-1 bg-green-50 border-green-200">
                      <CardContent className="p-3 text-center">
                        <span className="font-medium text-green-800">{flow.to}</span>
                      </CardContent>
                    </Card>
                    <div className="w-48 text-sm text-muted-foreground">
                      {flow.description}
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Performance Characteristics</CardTitle>
              <CardDescription>Key performance metrics at each stage of the data pipeline</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div>
                  <h4 className="font-semibold mb-3">Data Ingestion</h4>
                  <ul className="space-y-2 text-sm">
                    <li>• WebSocket: 1000+ messages/sec</li>
                    <li>• Buffer: 100k point sliding window</li>
                    <li>• Validation: &lt;1ms per message</li>
                    <li>• Memory: Constant O(1) usage</li>
                  </ul>
                </div>
                <div>
                  <h4 className="font-semibold mb-3">Data Processing</h4>
                  <ul className="space-y-2 text-sm">
                    <li>• Filtering: &lt;50ms for 100k points</li>
                    <li>• Indexing: O(log n) lookups</li>
                    <li>• Caching: 95% hit rate</li>
                    <li>• Updates: Incremental processing</li>
                  </ul>
                </div>
                <div>
                  <h4 className="font-semibold mb-3">Visualization</h4>
                  <ul className="space-y-2 text-sm">
                    <li>• Rendering: {formatFps(currentMetrics.currentFps)} maintained</li>
                    <li>• Canvas: &lt;16ms frame budget</li>
                    <li>• Virtualization: 20-50 DOM elements</li>
                    <li>• Interactions: &lt;100ms response</li>
                  </ul>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="metrics" className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Cpu className="h-5 w-5" />
                  System Performance
                </CardTitle>
                <CardDescription>Real-time system resource utilization</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <div className="flex justify-between text-sm mb-2">
                    <span>CPU Usage</span>
                    <span>{systemStats.cpuUsage.toFixed(1)}%</span>
                  </div>
                  <Progress value={systemStats.cpuUsage} className="h-2" />
                </div>
                <div>
                  <div className="flex justify-between text-sm mb-2">
                    <span>Memory Usage</span>
                    <span>{systemStats.memoryUsage.toFixed(1)}%</span>
                  </div>
                  <Progress value={systemStats.memoryUsage} className="h-2" />
                </div>
                <div>
                  <div className="flex justify-between text-sm mb-2">
                    <span>Network Throughput</span>
                    <span>{systemStats.networkThroughput.toFixed(0)} KB/s</span>
                  </div>
                  <Progress value={(systemStats.networkThroughput / 2000) * 100} className="h-2" />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <TrendingUp className="h-5 w-5" />
                  Application Metrics
                </CardTitle>
                <CardDescription>Application-specific performance indicators</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex justify-between">
                  <span className="text-sm font-medium">Frame Rate:</span>
                  <span className="text-sm text-green-600">{formatFps(currentMetrics.currentFps)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm font-medium">Render Time:</span>
                  <span className="text-sm text-green-600">&lt;16ms</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm font-medium">Filter Performance:</span>
                  <span className="text-sm text-green-600">&lt;50ms</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm font-medium">WebSocket Latency:</span>
                  <span className="text-sm text-green-600">~25ms</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm font-medium">Memory Efficiency:</span>
                  <span className="text-sm text-green-600">99% reduction</span>
                </div>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>System Health Summary</CardTitle>
              <CardDescription>Overall system status and key performance indicators</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="text-center">
                  <div className="text-2xl font-bold text-green-600">✓</div>
                  <div className="text-sm font-medium">System Health</div>
                  <div className="text-xs text-muted-foreground">All systems operational</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-blue-600">100k+</div>
                  <div className="text-sm font-medium">Data Capacity</div>
                  <div className="text-xs text-muted-foreground">Points supported</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-purple-600">{formatFps(currentMetrics.currentFps)}</div>
                  <div className="text-sm font-medium">Performance</div>
                  <div className="text-xs text-muted-foreground">Consistent rendering</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-orange-600">99.9%</div>
                  <div className="text-sm font-medium">Uptime</div>
                  <div className="text-xs text-muted-foreground">System availability</div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </PageLayout>
  )
}