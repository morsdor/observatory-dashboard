'use client'

import React, { useState, useMemo, useCallback } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { DataPoint } from '@/types'
import { AdvancedChart } from './AdvancedChart'
import { ChartConfigPanel } from './ChartConfigPanel'
import { ChartConfiguration, ChartSyncConfiguration, DEFAULT_CHART_CONFIG, DEFAULT_SYNC_CONFIG } from './ChartTypes'
import { generateMockTimeSeriesData } from '@/utils/mockDataGenerator'

export interface AdvancedChartDemoProps {
  className?: string
}

export const AdvancedChartDemo: React.FC<AdvancedChartDemoProps> = ({
  className = ''
}) => {
  // Chart configurations
  const [chart1Config, setChart1Config] = useState<ChartConfiguration>({
    ...DEFAULT_CHART_CONFIG,
    type: 'line'
  })
  
  const [chart2Config, setChart2Config] = useState<ChartConfiguration>({
    ...DEFAULT_CHART_CONFIG,
    type: 'area',
    colors: {
      primary: '#10b981',
      secondary: '#34d399',
      fill: '#10b98140',
      stroke: '#10b981'
    }
  })

  const [chart3Config, setChart3Config] = useState<ChartConfiguration>({
    ...DEFAULT_CHART_CONFIG,
    type: 'scatter',
    colors: {
      primary: '#f59e0b',
      secondary: '#fbbf24',
      fill: '#f59e0b40',
      stroke: '#f59e0b'
    }
  })

  const [chart4Config, setChart4Config] = useState<ChartConfiguration>({
    ...DEFAULT_CHART_CONFIG,
    type: 'bar',
    colors: {
      primary: '#ef4444',
      secondary: '#f87171',
      fill: '#ef444440',
      stroke: '#ef4444'
    }
  })

  // Sync configurations
  const [syncConfig1, setSyncConfig1] = useState<ChartSyncConfiguration>({
    ...DEFAULT_SYNC_CONFIG,
    enabled: true,
    groupId: 'demo-group-1'
  })

  const [syncConfig2, setSyncConfig2] = useState<ChartSyncConfiguration>({
    ...DEFAULT_SYNC_CONFIG,
    enabled: true,
    groupId: 'demo-group-1'
  })

  const [syncConfig3, setSyncConfig3] = useState<ChartSyncConfiguration>({
    ...DEFAULT_SYNC_CONFIG,
    enabled: false
  })

  const [syncConfig4, setSyncConfig4] = useState<ChartSyncConfiguration>({
    ...DEFAULT_SYNC_CONFIG,
    enabled: false
  })

  // Data generation
  const [dataSize, setDataSize] = useState<'small' | 'medium' | 'large' | 'extreme'>('medium')
  const [activeChart, setActiveChart] = useState<'chart1' | 'chart2' | 'chart3' | 'chart4'>('chart1')

  // Generate mock data based on size
  const mockData = useMemo(() => {
    const sizes = {
      small: 1000,
      medium: 10000,
      large: 50000,
      extreme: 100000
    }

    const count = sizes[dataSize]
    const endTime = new Date()
    const startTime = new Date(endTime.getTime() - 24 * 60 * 60 * 1000) // 24 hours ago

    return generateMockTimeSeriesData({
      count,
      startTime,
      endTime,
      categories: ['cpu', 'memory', 'network'],
      sources: ['server-1', 'server-2'],
      valueRange: [0, 100],
      addNoise: true,
      trendStrength: 0.3
    })
  }, [dataSize])

  // Performance metrics
  const [performanceMetrics, setPerformanceMetrics] = useState<{
    renderTime: number
    dataPoints: number
    processedPoints: number
  }>({
    renderTime: 0,
    dataPoints: 0,
    processedPoints: 0
  })

  const handleDataSizeChange = useCallback((size: 'small' | 'medium' | 'large' | 'extreme') => {
    const startTime = performance.now()
    setDataSize(size)
    
    // Simulate performance measurement
    setTimeout(() => {
      const endTime = performance.now()
      setPerformanceMetrics({
        renderTime: endTime - startTime,
        dataPoints: mockData.length,
        processedPoints: mockData.length // This would be updated by actual processing
      })
    }, 100)
  }, [mockData.length])

  const getActiveConfig = () => {
    switch (activeChart) {
      case 'chart1': return { config: chart1Config, syncConfig: syncConfig1 }
      case 'chart2': return { config: chart2Config, syncConfig: syncConfig2 }
      case 'chart3': return { config: chart3Config, syncConfig: syncConfig3 }
      case 'chart4': return { config: chart4Config, syncConfig: syncConfig4 }
    }
  }

  const setActiveConfig = (config: ChartConfiguration, syncConfig: ChartSyncConfiguration) => {
    switch (activeChart) {
      case 'chart1':
        setChart1Config(config)
        setSyncConfig1(syncConfig)
        break
      case 'chart2':
        setChart2Config(config)
        setSyncConfig2(syncConfig)
        break
      case 'chart3':
        setChart3Config(config)
        setSyncConfig3(syncConfig)
        break
      case 'chart4':
        setChart4Config(config)
        setSyncConfig4(syncConfig)
        break
    }
  }

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Header */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            Advanced Chart Features Demo
            <div className="flex items-center space-x-2">
              <Badge variant="outline">
                {mockData.length.toLocaleString()} data points
              </Badge>
              <Badge variant="outline">
                {performanceMetrics.renderTime.toFixed(1)}ms render
              </Badge>
            </div>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center space-x-4">
            <span className="text-sm font-medium">Dataset Size:</span>
            {(['small', 'medium', 'large', 'extreme'] as const).map((size) => (
              <Button
                key={size}
                variant={dataSize === size ? 'default' : 'outline'}
                size="sm"
                onClick={() => handleDataSizeChange(size)}
              >
                {size.charAt(0).toUpperCase() + size.slice(1)}
                <Badge variant="secondary" className="ml-2">
                  {size === 'small' && '1K'}
                  {size === 'medium' && '10K'}
                  {size === 'large' && '50K'}
                  {size === 'extreme' && '100K'}
                </Badge>
              </Button>
            ))}
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Charts */}
        <div className="lg:col-span-2 space-y-6">
          {/* Synchronized Charts */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                Synchronized Charts
                <Badge variant="outline">Group: demo-group-1</Badge>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <h4 className="text-sm font-medium">Line Chart</h4>
                  <AdvancedChart
                    data={mockData}
                    width={400}
                    height={200}
                    config={chart1Config}
                    syncConfig={syncConfig1}
                    chartId="demo-chart-1"
                    showTooltip={true}
                    showCrosshair={true}
                    showGrid={true}
                  />
                </div>
                <div className="space-y-2">
                  <h4 className="text-sm font-medium">Area Chart</h4>
                  <AdvancedChart
                    data={mockData}
                    width={400}
                    height={200}
                    config={chart2Config}
                    syncConfig={syncConfig2}
                    chartId="demo-chart-2"
                    showTooltip={true}
                    showCrosshair={true}
                    showGrid={true}
                  />
                </div>
              </div>
              <p className="text-sm text-muted-foreground">
                These charts are synchronized - zoom, pan, and crosshair interactions are shared between them.
              </p>
            </CardContent>
          </Card>

          {/* Individual Charts */}
          <Card>
            <CardHeader>
              <CardTitle>Individual Chart Types</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <h4 className="text-sm font-medium">Scatter Plot</h4>
                  <AdvancedChart
                    data={mockData.filter((_, i) => i % 10 === 0)} // Reduce points for scatter
                    width={400}
                    height={200}
                    config={chart3Config}
                    syncConfig={syncConfig3}
                    chartId="demo-chart-3"
                    showTooltip={true}
                    showCrosshair={false}
                    showGrid={true}
                  />
                </div>
                <div className="space-y-2">
                  <h4 className="text-sm font-medium">Bar Chart</h4>
                  <AdvancedChart
                    data={mockData.filter((_, i) => i % 50 === 0)} // Reduce points for bars
                    width={400}
                    height={200}
                    config={chart4Config}
                    syncConfig={syncConfig4}
                    chartId="demo-chart-4"
                    showTooltip={true}
                    showCrosshair={false}
                    showGrid={true}
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Performance Metrics */}
          <Card>
            <CardHeader>
              <CardTitle>Performance Metrics</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-3 gap-4">
                <div className="text-center">
                  <div className="text-2xl font-bold text-blue-600">
                    {mockData.length.toLocaleString()}
                  </div>
                  <div className="text-sm text-muted-foreground">Raw Data Points</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-green-600">
                    {performanceMetrics.renderTime.toFixed(1)}ms
                  </div>
                  <div className="text-sm text-muted-foreground">Render Time</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-purple-600">
                    {Math.round(mockData.length / Math.max(performanceMetrics.renderTime, 1) * 1000).toLocaleString()}
                  </div>
                  <div className="text-sm text-muted-foreground">Points/Second</div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Configuration Panel */}
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Chart Selection</CardTitle>
            </CardHeader>
            <CardContent>
              <Tabs value={activeChart} onValueChange={(value) => setActiveChart(value as any)}>
                <TabsList className="grid w-full grid-cols-2">
                  <TabsTrigger value="chart1">Line</TabsTrigger>
                  <TabsTrigger value="chart2">Area</TabsTrigger>
                </TabsList>
                <TabsList className="grid w-full grid-cols-2 mt-2">
                  <TabsTrigger value="chart3">Scatter</TabsTrigger>
                  <TabsTrigger value="chart4">Bar</TabsTrigger>
                </TabsList>
              </Tabs>
            </CardContent>
          </Card>

          <ChartConfigPanel
            config={getActiveConfig().config}
            syncConfig={getActiveConfig().syncConfig}
            onConfigChange={(config) => setActiveConfig(config, getActiveConfig().syncConfig)}
            onSyncConfigChange={(syncConfig) => setActiveConfig(getActiveConfig().config, syncConfig)}
          />
        </div>
      </div>
    </div>
  )
}

export default AdvancedChartDemo