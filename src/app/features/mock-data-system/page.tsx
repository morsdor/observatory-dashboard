'use client'

import React from 'react'
import { PageLayout } from '@/components/layout/PageLayout'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { 
  Info, 
  Database, 
  Settings, 
  Zap, 
  TrendingUp, 
  Activity,
  TestTube,
  BarChart3
} from 'lucide-react'
import { useDataStreaming } from '@/hooks/useDataStreaming'

export default function MockDataSystemPage() {
  const { 
    status, 
    isConnected, 
    metrics, 
    changeScenario, 
    simulateSpike, 
    injectTestData 
  } = useDataStreaming({ autoConnect: false })

  const handleSimulateSpike = () => {
    simulateSpike(5000, 4) // 5 second spike with 4x data rate
  }

  const handleInjectTestData = () => {
    const testData = Array.from({ length: 10 }, (_, i) => ({
      id: `test-${Date.now()}-${i}`,
      timestamp: new Date(),
      value: Math.random() * 100,
      category: 'test',
      source: 'manual',
      metadata: { injected: true, batch: Date.now() }
    }))
    injectTestData(testData)
  }

  const scenarios = [
    { 
      id: 'normal', 
      name: 'Normal Operations', 
      description: 'Typical system behavior with moderate fluctuations',
      color: 'bg-green-100 text-green-800'
    },
    { 
      id: 'high_load', 
      name: 'High Load', 
      description: 'Increased system activity and resource usage',
      color: 'bg-yellow-100 text-yellow-800'
    },
    { 
      id: 'system_failure', 
      name: 'System Failure', 
      description: 'Simulated system errors and failures',
      color: 'bg-red-100 text-red-800'
    },
    { 
      id: 'maintenance', 
      name: 'Maintenance Mode', 
      description: 'Reduced activity during maintenance windows',
      color: 'bg-blue-100 text-blue-800'
    },
    { 
      id: 'peak_hours', 
      name: 'Peak Hours', 
      description: 'High traffic periods with increased load',
      color: 'bg-orange-100 text-orange-800'
    },
    { 
      id: 'weekend', 
      name: 'Weekend Pattern', 
      description: 'Lower activity typical of weekend periods',
      color: 'bg-purple-100 text-purple-800'
    }
  ]

  return (
    <PageLayout
      title="Mock Data System"
      description="Comprehensive data generation system with realistic patterns, scenarios, and testing utilities for development and demonstration."
    >
      {/* Information Alert */}
      <Alert className="mb-6">
        <Info className="h-4 w-4" />
        <AlertDescription>
          <strong>Unified System:</strong> The mock data system is now integrated into the global streaming service. 
          Use the global streaming control at the top to start data generation. The controls below allow you to 
          test different scenarios and inject custom data while streaming is active.
        </AlertDescription>
      </Alert>

      {/* Current Status */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Activity className="w-5 h-5" />
            Current Status
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="text-center">
              <div className="text-2xl font-bold capitalize">{status}</div>
              <div className="text-sm text-muted-foreground">Connection Status</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold">
                {metrics ? metrics.totalDataPoints.toLocaleString() : '0'}
              </div>
              <div className="text-sm text-muted-foreground">Data Points</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold">
                {metrics ? `${Math.round(metrics.dataPointsPerSecond)}/s` : '0/s'}
              </div>
              <div className="text-sm text-muted-foreground">Generation Rate</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold">
                {metrics ? `${Math.round(metrics.bufferUtilization)}%` : '0%'}
              </div>
              <div className="text-sm text-muted-foreground">Buffer Usage</div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Scenario Testing */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Settings className="w-5 h-5" />
            Data Scenarios
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {scenarios.map((scenario) => (
              <div key={scenario.id} className="border rounded-lg p-4">
                <div className="flex items-center justify-between mb-2">
                  <h4 className="font-medium">{scenario.name}</h4>
                  <Badge className={scenario.color}>
                    {scenario.id.replace('_', ' ')}
                  </Badge>
                </div>
                <p className="text-sm text-muted-foreground mb-3">
                  {scenario.description}
                </p>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => changeScenario(scenario.id as any)}
                  disabled={!isConnected}
                  className="w-full"
                >
                  Apply Scenario
                </Button>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Testing Tools */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Zap className="w-5 h-5" />
              Data Spike Testing
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground mb-4">
              Simulate temporary data spikes to test system performance under load.
            </p>
            <Button
              onClick={handleSimulateSpike}
              disabled={!isConnected}
              className="w-full"
            >
              <TrendingUp className="w-4 h-4 mr-2" />
              Simulate 5s Data Spike (4x Rate)
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TestTube className="w-5 h-5" />
              Manual Data Injection
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground mb-4">
              Inject custom test data points for testing specific scenarios.
            </p>
            <Button
              onClick={handleInjectTestData}
              variant="outline"
              className="w-full"
            >
              <Database className="w-4 h-4 mr-2" />
              Inject 10 Test Data Points
            </Button>
          </CardContent>
        </Card>
      </div>

      {/* Technical Details */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BarChart3 className="w-5 h-5" />
            Technical Implementation
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <h4 className="font-semibold mb-3">Data Generation Features</h4>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li>• Realistic data patterns with mathematical models</li>
                <li>• Multiple data categories (CPU, memory, network, etc.)</li>
                <li>• Configurable data sources and generation rates</li>
                <li>• Scenario-based behavior modification</li>
                <li>• Automatic WebSocket fallback integration</li>
                <li>• Performance-optimized batch generation</li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold mb-3">Integration Benefits</h4>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li>• Seamless transition from WebSocket to mock data</li>
                <li>• Consistent API across real and mock data</li>
                <li>• Global control and monitoring</li>
                <li>• Unified metrics and performance tracking</li>
                <li>• Development and testing utilities</li>
                <li>• Production-ready fallback system</li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>
    </PageLayout>
  )
}