'use client'

import React, { useState, useEffect } from 'react'
import { MainNavigation } from '@/components/navigation/MainNavigation'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { 
  Settings, 
  Play, 
  Pause, 
  RotateCcw, 
  TrendingUp,
  Database,
  Zap,
  Activity,
  CheckCircle,
  AlertTriangle,
  BarChart3,
  Waves
} from 'lucide-react'
import { generateTestData, generateHistoricalData, createScenarioConfig } from '@/utils/mockDataGenerator'
import { createMockWebSocketServer } from '@/utils/mockWebSocketServer'

export default function MockDataSystemPage() {
  const [isGenerating, setIsGenerating] = useState(false)
  const [currentScenario, setCurrentScenario] = useState<'normal' | 'high_load' | 'system_failure' | 'maintenance' | 'peak_hours' | 'weekend'>('normal')
  const [dataStats, setDataStats] = useState({
    pointsGenerated: 0,
    generationRate: 0,
    patternType: 'normal',
    categories: 5,
    sources: 3
  })

  const [generationConfig, setGenerationConfig] = useState({
    pointsPerSecond: 10,
    categories: ['cpu', 'memory', 'network', 'disk', 'temperature'],
    sources: ['server-1', 'server-2', 'server-3'],
    pattern: 'sine' as 'sine' | 'linear' | 'random' | 'step'
  })

  // Simulate data generation stats
  useEffect(() => {
    if (isGenerating) {
      const interval = setInterval(() => {
        setDataStats(prev => ({
          pointsGenerated: prev.pointsGenerated + generationConfig.pointsPerSecond,
          generationRate: generationConfig.pointsPerSecond,
          patternType: currentScenario,
          categories: generationConfig.categories.length,
          sources: generationConfig.sources.length
        }))
      }, 1000)

      return () => clearInterval(interval)
    }
  }, [isGenerating, generationConfig.pointsPerSecond, currentScenario, generationConfig.categories.length, generationConfig.sources.length])

  const handleStartGeneration = () => {
    setIsGenerating(true)
    setDataStats(prev => ({ ...prev, pointsGenerated: 0 }))
  }

  const handleStopGeneration = () => {
    setIsGenerating(false)
  }

  const handleResetStats = () => {
    setDataStats(prev => ({ ...prev, pointsGenerated: 0 }))
  }

  const generateSampleData = (pattern: 'spike' | 'gradual' | 'stable' | 'noisy') => {
    const data = generateTestData(pattern, 1000)
    console.log(`Generated ${data.length} data points with ${pattern} pattern`)
    return data
  }

  const scenarios = [
    { value: 'normal', label: 'Normal Operation', description: 'Typical system behavior with regular patterns' },
    { value: 'high_load', label: 'High Load', description: 'System under heavy load with elevated metrics' },
    { value: 'system_failure', label: 'System Failure', description: 'Critical system issues with erratic behavior' },
    { value: 'maintenance', label: 'Maintenance Mode', description: 'Reduced activity during maintenance windows' },
    { value: 'peak_hours', label: 'Peak Hours', description: 'High activity during business hours' },
    { value: 'weekend', label: 'Weekend Mode', description: 'Lower activity during weekends' }
  ]

  const patterns = [
    { value: 'sine', label: 'Sine Wave', description: 'Smooth oscillating pattern' },
    { value: 'linear', label: 'Linear Trend', description: 'Steady increase or decrease' },
    { value: 'random', label: 'Random Walk', description: 'Unpredictable variations' },
    { value: 'step', label: 'Step Function', description: 'Discrete level changes' }
  ]

  return (
    <div className="min-h-screen bg-background">
      <MainNavigation />
      <div className="container mx-auto py-8 px-4">
      <div className="mb-8">
        <h1 className="text-4xl font-bold mb-4">Mock Data System</h1>
        <p className="text-lg text-muted-foreground max-w-3xl">
          Comprehensive data generation system with realistic patterns, scenarios, and configurable parameters 
          for testing and development of high-performance data visualization components.
        </p>
      </div>

      <Tabs defaultValue="generator" className="space-y-6">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="generator">Data Generator</TabsTrigger>
          <TabsTrigger value="patterns">Pattern Library</TabsTrigger>
          <TabsTrigger value="scenarios">Scenario Testing</TabsTrigger>
          <TabsTrigger value="technical">Technical Details</TabsTrigger>
        </TabsList>

        <TabsContent value="generator" className="space-y-6">
          {/* Generation Status */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium flex items-center gap-2">
                  <Database className="h-4 w-4" />
                  Points Generated
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{dataStats.pointsGenerated.toLocaleString()}</div>
                <p className="text-xs text-muted-foreground">Total data points</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium flex items-center gap-2">
                  <Zap className="h-4 w-4" />
                  Generation Rate
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{dataStats.generationRate}/s</div>
                <p className="text-xs text-muted-foreground">Points per second</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium flex items-center gap-2">
                  <Activity className="h-4 w-4" />
                  Active Pattern
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold capitalize">{dataStats.patternType}</div>
                <p className="text-xs text-muted-foreground">Current scenario</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium flex items-center gap-2">
                  <Settings className="h-4 w-4" />
                  Data Sources
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{dataStats.categories} × {dataStats.sources}</div>
                <p className="text-xs text-muted-foreground">Categories × Sources</p>
              </CardContent>
            </Card>
          </div>

          {/* Generation Controls */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Settings className="h-5 w-5" />
                  Generation Configuration
                </CardTitle>
                <CardDescription>Configure data generation parameters</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="rate">Points per Second</Label>
                  <Input
                    id="rate"
                    type="number"
                    value={generationConfig.pointsPerSecond}
                    onChange={(e) => setGenerationConfig(prev => ({ 
                      ...prev, 
                      pointsPerSecond: parseInt(e.target.value) || 10 
                    }))}
                    min="1"
                    max="1000"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="scenario">Scenario</Label>
                  <Select value={currentScenario} onValueChange={(value: any) => setCurrentScenario(value)}>
                    <SelectTrigger>
                      <SelectValue />
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

                <div className="space-y-2">
                  <Label htmlFor="pattern">Base Pattern</Label>
                  <Select value={generationConfig.pattern} onValueChange={(value: any) => 
                    setGenerationConfig(prev => ({ ...prev, pattern: value }))
                  }>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {patterns.map(pattern => (
                        <SelectItem key={pattern.value} value={pattern.value}>
                          {pattern.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="flex gap-2 pt-4">
                  <Button 
                    onClick={handleStartGeneration} 
                    disabled={isGenerating}
                    className="flex-1"
                  >
                    <Play className="h-4 w-4 mr-2" />
                    Start Generation
                  </Button>
                  <Button 
                    onClick={handleStopGeneration} 
                    disabled={!isGenerating}
                    variant="outline"
                    className="flex-1"
                  >
                    <Pause className="h-4 w-4 mr-2" />
                    Stop
                  </Button>
                  <Button 
                    onClick={handleResetStats} 
                    variant="outline"
                  >
                    <RotateCcw className="h-4 w-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Activity className="h-5 w-5" />
                  Generation Status
                </CardTitle>
                <CardDescription>Real-time generation monitoring</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">Generator Status:</span>
                  <Badge variant={isGenerating ? 'default' : 'outline'} className="flex items-center gap-1">
                    {isGenerating ? <Activity className="h-3 w-3 animate-pulse" /> : <Pause className="h-3 w-3" />}
                    {isGenerating ? 'Running' : 'Stopped'}
                  </Badge>
                </div>

                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">Current Scenario:</span>
                  <Badge variant="secondary">{scenarios.find(s => s.value === currentScenario)?.label}</Badge>
                </div>

                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">Data Categories:</span>
                  <span className="text-sm">{generationConfig.categories.join(', ')}</span>
                </div>

                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">Data Sources:</span>
                  <span className="text-sm">{generationConfig.sources.join(', ')}</span>
                </div>

                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">Memory Usage:</span>
                  <span className="text-sm text-green-600">~{Math.round(dataStats.pointsGenerated * 0.001)}MB</span>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Quick Generation Buttons */}
          <Card>
            <CardHeader>
              <CardTitle>Quick Data Generation</CardTitle>
              <CardDescription>Generate sample datasets with predefined patterns</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <Button 
                  variant="outline" 
                  onClick={() => generateSampleData('spike')}
                  className="flex flex-col items-center gap-2 h-auto py-4"
                >
                  <TrendingUp className="h-6 w-6" />
                  <div className="text-center">
                    <div className="font-medium">Spike Pattern</div>
                    <div className="text-xs text-muted-foreground">Sudden increases</div>
                  </div>
                </Button>

                <Button 
                  variant="outline" 
                  onClick={() => generateSampleData('gradual')}
                  className="flex flex-col items-center gap-2 h-auto py-4"
                >
                  <BarChart3 className="h-6 w-6" />
                  <div className="text-center">
                    <div className="font-medium">Gradual Trend</div>
                    <div className="text-xs text-muted-foreground">Steady growth</div>
                  </div>
                </Button>

                <Button 
                  variant="outline" 
                  onClick={() => generateSampleData('stable')}
                  className="flex flex-col items-center gap-2 h-auto py-4"
                >
                  <Activity className="h-6 w-6" />
                  <div className="text-center">
                    <div className="font-medium">Stable Values</div>
                    <div className="text-xs text-muted-foreground">Minimal variation</div>
                  </div>
                </Button>

                <Button 
                  variant="outline" 
                  onClick={() => generateSampleData('noisy')}
                  className="flex flex-col items-center gap-2 h-auto py-4"
                >
                  <Waves className="h-6 w-6" />
                  <div className="text-center">
                    <div className="font-medium">Noisy Data</div>
                    <div className="text-xs text-muted-foreground">High variation</div>
                  </div>
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="patterns" className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Mathematical Patterns</CardTitle>
                <CardDescription>Algorithmic data generation patterns</CardDescription>
              </CardHeader>
              <CardContent>
                <ul className="space-y-3 text-sm">
                  <li className="flex items-start gap-2">
                    <CheckCircle className="h-4 w-4 mt-0.5 text-green-600" />
                    <div>
                      <div className="font-medium">Sine Wave</div>
                      <div className="text-muted-foreground">Smooth oscillating patterns with configurable amplitude and frequency</div>
                    </div>
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle className="h-4 w-4 mt-0.5 text-green-600" />
                    <div>
                      <div className="font-medium">Linear Trends</div>
                      <div className="text-muted-foreground">Steady increases or decreases with optional noise</div>
                    </div>
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle className="h-4 w-4 mt-0.5 text-green-600" />
                    <div>
                      <div className="font-medium">Exponential Growth</div>
                      <div className="text-muted-foreground">Accelerating growth patterns for stress testing</div>
                    </div>
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle className="h-4 w-4 mt-0.5 text-green-600" />
                    <div>
                      <div className="font-medium">Random Walk</div>
                      <div className="text-muted-foreground">Brownian motion with persistence and volatility</div>
                    </div>
                  </li>
                </ul>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Advanced Patterns</CardTitle>
                <CardDescription>Complex mathematical and chaotic patterns</CardDescription>
              </CardHeader>
              <CardContent>
                <ul className="space-y-3 text-sm">
                  <li className="flex items-start gap-2">
                    <CheckCircle className="h-4 w-4 mt-0.5 text-blue-600" />
                    <div>
                      <div className="font-medium">Gaussian Distribution</div>
                      <div className="text-muted-foreground">Normal distribution with configurable mean and standard deviation</div>
                    </div>
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle className="h-4 w-4 mt-0.5 text-blue-600" />
                    <div>
                      <div className="font-medium">Chaotic Systems</div>
                      <div className="text-muted-foreground">Logistic map and other chaotic attractors</div>
                    </div>
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle className="h-4 w-4 mt-0.5 text-blue-600" />
                    <div>
                      <div className="font-medium">Fibonacci Sequences</div>
                      <div className="text-muted-foreground">Mathematical sequences for testing edge cases</div>
                    </div>
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle className="h-4 w-4 mt-0.5 text-blue-600" />
                    <div>
                      <div className="font-medium">Seasonal Patterns</div>
                      <div className="text-muted-foreground">Daily, weekly, monthly, and yearly cyclical patterns</div>
                    </div>
                  </li>
                </ul>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Anomaly Injection</CardTitle>
                <CardDescription>Realistic data anomalies and edge cases</CardDescription>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2 text-sm">
                  <li>• <strong>Spikes:</strong> Sudden value increases for alert testing</li>
                  <li>• <strong>Drops:</strong> Abrupt decreases simulating failures</li>
                  <li>• <strong>Outliers:</strong> Statistical outliers for robustness testing</li>
                  <li>• <strong>Drift:</strong> Gradual baseline shifts over time</li>
                  <li>• <strong>Missing Data:</strong> Gaps and null values</li>
                  <li>• <strong>Corruption:</strong> Invalid or malformed data points</li>
                </ul>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Performance Patterns</CardTitle>
                <CardDescription>Specialized patterns for performance testing</CardDescription>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2 text-sm">
                  <li>• <strong>High Frequency:</strong> 1000+ points/second for stress testing</li>
                  <li>• <strong>Burst Mode:</strong> Periodic high-activity periods</li>
                  <li>• <strong>Memory Stress:</strong> Large datasets for memory testing</li>
                  <li>• <strong>Rendering Stress:</strong> Complex patterns for GPU testing</li>
                  <li>• <strong>Filter Stress:</strong> Diverse data for filter performance</li>
                  <li>• <strong>Network Simulation:</strong> Latency and packet loss simulation</li>
                </ul>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="scenarios" className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {scenarios.map((scenario) => (
              <Card key={scenario.value} className={currentScenario === scenario.value ? 'ring-2 ring-primary' : ''}>
                <CardHeader>
                  <CardTitle className="flex items-center justify-between">
                    {scenario.label}
                    {currentScenario === scenario.value && (
                      <Badge variant="default">Active</Badge>
                    )}
                  </CardTitle>
                  <CardDescription>{scenario.description}</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {scenario.value === 'normal' && (
                      <div className="space-y-2 text-sm">
                        <div className="flex items-center gap-2">
                          <CheckCircle className="h-3 w-3 text-green-600" />
                          <span>CPU: 20-60% with sine wave pattern</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <CheckCircle className="h-3 w-3 text-green-600" />
                          <span>Memory: Gradual increase with daily cycles</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <CheckCircle className="h-3 w-3 text-green-600" />
                          <span>Network: Random spikes with low baseline</span>
                        </div>
                      </div>
                    )}

                    {scenario.value === 'high_load' && (
                      <div className="space-y-2 text-sm">
                        <div className="flex items-center gap-2">
                          <AlertTriangle className="h-3 w-3 text-yellow-600" />
                          <span>CPU: 60-95% with high volatility</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <AlertTriangle className="h-3 w-3 text-yellow-600" />
                          <span>Memory: Exponential growth pattern</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <AlertTriangle className="h-3 w-3 text-yellow-600" />
                          <span>Frequent anomalies and spikes</span>
                        </div>
                      </div>
                    )}

                    {scenario.value === 'system_failure' && (
                      <div className="space-y-2 text-sm">
                        <div className="flex items-center gap-2">
                          <AlertTriangle className="h-3 w-3 text-red-600" />
                          <span>Erratic behavior with chaos patterns</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <AlertTriangle className="h-3 w-3 text-red-600" />
                          <span>High anomaly rate (10%)</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <AlertTriangle className="h-3 w-3 text-red-600" />
                          <span>Missing data and corruption</span>
                        </div>
                      </div>
                    )}

                    {scenario.value === 'maintenance' && (
                      <div className="space-y-2 text-sm">
                        <div className="flex items-center gap-2">
                          <CheckCircle className="h-3 w-3 text-blue-600" />
                          <span>Low activity (5-25% utilization)</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <CheckCircle className="h-3 w-3 text-blue-600" />
                          <span>Stable patterns with minimal noise</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <CheckCircle className="h-3 w-3 text-blue-600" />
                          <span>Periodic service restarts</span>
                        </div>
                      </div>
                    )}

                    {scenario.value === 'peak_hours' && (
                      <div className="space-y-2 text-sm">
                        <div className="flex items-center gap-2">
                          <TrendingUp className="h-3 w-3 text-orange-600" />
                          <span>High baseline with daily peaks</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <TrendingUp className="h-3 w-3 text-orange-600" />
                          <span>Increased data generation rate</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <TrendingUp className="h-3 w-3 text-orange-600" />
                          <span>Correlated metrics across services</span>
                        </div>
                      </div>
                    )}

                    {scenario.value === 'weekend' && (
                      <div className="space-y-2 text-sm">
                        <div className="flex items-center gap-2">
                          <Activity className="h-3 w-3 text-purple-600" />
                          <span>Reduced activity patterns</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <Activity className="h-3 w-3 text-purple-600" />
                          <span>Lower data generation rate</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <Activity className="h-3 w-3 text-purple-600" />
                          <span>Inverted daily cycles</span>
                        </div>
                      </div>
                    )}

                    <Button 
                      variant={currentScenario === scenario.value ? 'default' : 'outline'}
                      onClick={() => setCurrentScenario(scenario.value as any)}
                      className="w-full mt-4"
                    >
                      {currentScenario === scenario.value ? 'Active' : 'Activate Scenario'}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="technical" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Technical Implementation</CardTitle>
              <CardDescription>Architecture and implementation details of the mock data system</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div>
                <h4 className="font-semibold mb-2">Data Generation Engine</h4>
                <p className="text-sm text-muted-foreground mb-2">
                  Modular data generation system with pluggable pattern generators:
                </p>
                <ul className="text-sm space-y-1 ml-4">
                  <li>• Abstract pattern interface for extensible pattern types</li>
                  <li>• Configurable parameters for amplitude, frequency, and noise</li>
                  <li>• Stateful patterns with memory for realistic behavior</li>
                  <li>• Composition of multiple patterns for complex behaviors</li>
                </ul>
              </div>

              <div>
                <h4 className="font-semibold mb-2">WebSocket Mock Server</h4>
                <p className="text-sm text-muted-foreground mb-2">
                  Full-featured WebSocket server simulation for development:
                </p>
                <ul className="text-sm space-y-1 ml-4">
                  <li>• Browser and Node.js compatible implementation</li>
                  <li>• Configurable connection behavior and error simulation</li>
                  <li>• Message queuing and rate limiting simulation</li>
                  <li>• Network latency and packet loss simulation</li>
                </ul>
              </div>

              <div>
                <h4 className="font-semibold mb-2">Performance Optimization</h4>
                <p className="text-sm text-muted-foreground mb-2">
                  Efficient data generation for high-performance testing:
                </p>
                <ul className="text-sm space-y-1 ml-4">
                  <li>• Batch generation for improved throughput</li>
                  <li>• Memory pooling to reduce garbage collection</li>
                  <li>• Web Worker support for background generation</li>
                  <li>• Streaming generation for large datasets</li>
                </ul>
              </div>

              <div>
                <h4 className="font-semibold mb-2">Data Validation and Quality</h4>
                <p className="text-sm text-muted-foreground mb-2">
                  Built-in validation and quality assurance for generated data:
                </p>
                <ul className="text-sm space-y-1 ml-4">
                  <li>• Schema validation using Zod for type safety</li>
                  <li>• Statistical analysis of generated patterns</li>
                  <li>• Anomaly detection and validation</li>
                  <li>• Export capabilities for external analysis</li>
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