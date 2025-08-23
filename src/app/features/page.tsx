'use client'

import React from 'react'
import { useRealPerformanceMetrics, formatFps } from '@/utils/realPerformanceMetrics'
import Link from 'next/link'
import { MainNavigation } from '@/components/navigation/MainNavigation'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { 
  BarChart3, 
  Database, 
  Filter, 
  Zap, 
  Activity, 
  Settings,
  TrendingUp,
  Network,
  Monitor
} from 'lucide-react'

const features = [
  {
    id: 'real-time-dashboard',
    title: 'Real-Time Dashboard',
    description: 'Live data streaming with WebSocket connections, handling 100k+ data points with sub-100ms updates',
    icon: Activity,
    path: '/features/real-time-dashboard',
    status: 'Complete',
    highlights: ['WebSocket streaming', 'Auto-reconnection', 'Buffer management', 'Performance monitoring']
  },
  {
    id: 'advanced-charts',
    title: 'Advanced Charts',
    description: 'Canvas-based high-performance charts with zoom, pan, and interactive features',
    icon: BarChart3,
    path: '/features/advanced-charts',
    status: 'Complete',
    highlights: ['Canvas rendering', 'D3.js integration', 'Multiple chart types', 'Real-time updates']
  },
  {
    id: 'virtualized-data-grid',
    title: 'Virtualized Data Grid',
    description: 'High-performance data table supporting 100k+ rows with smooth scrolling',
    icon: Database,
    path: '/features/virtualized-data-grid',
    status: 'Complete',
    highlights: ['Virtual scrolling', 'Dynamic columns', 'Row selection', 'Sorting & filtering']
  },
  {
    id: 'advanced-filtering',
    title: 'Advanced Filtering',
    description: 'Multi-faceted filtering system with visual query builder and complex logic',
    icon: Filter,
    path: '/features/advanced-filtering',
    status: 'Complete',
    highlights: ['Visual query builder', 'AND/OR logic', 'Real-time filtering', 'Filter persistence']
  },
  {
    id: 'performance-monitoring',
    title: 'Performance Monitoring',
    description: 'Built-in performance metrics and optimization tools for large datasets',
    icon: TrendingUp,
    path: '/features/performance-monitoring',
    status: 'In Progress',
    highlights: ['Memory tracking', 'FPS monitoring', 'Benchmark tools', 'Optimization alerts']
  },
  {
    id: 'websocket-integration',
    title: 'WebSocket Integration',
    description: 'Robust WebSocket client with reconnection, error handling, and data validation',
    icon: Network,
    path: '/features/websocket-integration',
    status: 'Complete',
    highlights: ['Auto-reconnection', 'Error recovery', 'Connection monitoring', 'Data validation']
  },
  {
    id: 'mock-data-system',
    title: 'Mock Data System',
    description: 'Comprehensive data generation system with realistic patterns and scenarios',
    icon: Settings,
    path: '/features/mock-data-system',
    status: 'Complete',
    highlights: ['Pattern generation', 'Scenario simulation', 'Stress testing', 'Data validation']
  },
  {
    id: 'system-overview',
    title: 'System Overview',
    description: 'Complete system architecture and component integration showcase',
    icon: Monitor,
    path: '/features/system-overview',
    status: 'New',
    highlights: ['Architecture view', 'Component map', 'Data flow', 'Performance stats']
  }
]

export default function FeaturesPage() {
  const { getCurrentMetrics } = useRealPerformanceMetrics()
  const currentMetrics = getCurrentMetrics()
  return (
    <div className="min-h-screen bg-background">
      <MainNavigation />
      <div className="container mx-auto py-8 px-4">
      <div className="mb-8">
        <h1 className="text-4xl font-bold mb-4">Observatory Dashboard Features</h1>
        <p className="text-lg text-muted-foreground max-w-3xl">
          Explore the comprehensive feature set of the Observatory Dashboard - a high-performance 
          real-time data visualization platform built with Next.js, designed to handle large-scale 
          datasets with exceptional performance and user experience.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {features.map((feature) => {
          const IconComponent = feature.icon
          return (
            <Card key={feature.id} className="hover:shadow-lg transition-shadow">
              <CardHeader>
                <div className="flex items-center justify-between mb-2">
                  <IconComponent className="h-8 w-8 text-primary" />
                  <Badge 
                    variant={
                      feature.status === 'Complete' ? 'default' : 
                      feature.status === 'In Progress' ? 'secondary' : 
                      'outline'
                    }
                  >
                    {feature.status}
                  </Badge>
                </div>
                <CardTitle className="text-xl">{feature.title}</CardTitle>
                <CardDescription className="text-sm">
                  {feature.description}
                </CardDescription>
              </CardHeader>
              
              <CardContent>
                <div className="space-y-4">
                  <div>
                    <h4 className="font-semibold text-sm mb-2">Key Features:</h4>
                    <div className="flex flex-wrap gap-1">
                      {feature.highlights.map((highlight, index) => (
                        <Badge key={index} variant="outline" className="text-xs">
                          {highlight}
                        </Badge>
                      ))}
                    </div>
                  </div>
                  
                  <Link href={feature.path}>
                    <Button className="w-full">
                      <Zap className="h-4 w-4 mr-2" />
                      Explore Feature
                    </Button>
                  </Link>
                </div>
              </CardContent>
            </Card>
          )
        })}
      </div>

      <div className="mt-12 p-6 bg-muted rounded-lg">
        <h2 className="text-2xl font-bold mb-4">Technical Specifications</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="text-center">
            <div className="text-3xl font-bold text-primary">100k+</div>
            <div className="text-sm text-muted-foreground">Data Points Supported</div>
          </div>
          <div className="text-center">
            <div className="text-3xl font-bold text-primary">&lt;100ms</div>
            <div className="text-sm text-muted-foreground">Update Latency</div>
          </div>
          <div className="text-center">
            <div className="text-3xl font-bold text-primary">{formatFps(currentMetrics.currentFps)}</div>
            <div className="text-sm text-muted-foreground">Rendering Performance</div>
          </div>
          <div className="text-center">
            <div className="text-3xl font-bold text-primary">1000/s</div>
            <div className="text-sm text-muted-foreground">Data Points Per Second</div>
          </div>
        </div>
      </div>
      </div>
    </div>
  )
}