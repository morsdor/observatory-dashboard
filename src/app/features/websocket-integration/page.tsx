'use client'

import React from 'react'
import { PageLayout } from '@/components/layout/PageLayout'
import { WebSocketDemo } from '@/components/WebSocketDemo'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Info, Network, Database, Zap } from 'lucide-react'

export default function WebSocketIntegrationPage() {
  return (
    <PageLayout
      title="WebSocket Integration"
      description="Demonstration of the unified data streaming system with WebSocket connections and automatic fallback to mock data generation."
    >
      {/* Information Alert */}
      <Alert className="mb-6">
        <Info className="h-4 w-4" />
        <AlertDescription>
          <strong>Note:</strong> This page demonstrates the unified streaming system. 
          Use the global streaming control at the top of the page to start/stop data streaming. 
          The controls below are for testing and demonstration purposes only.
        </AlertDescription>
      </Alert>

      {/* Feature Overview */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Network className="w-5 h-5 text-blue-600" />
              WebSocket Connection
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li>• Attempts WebSocket connection first</li>
              <li>• Real-time data streaming</li>
              <li>• Automatic reconnection</li>
              <li>• Connection status monitoring</li>
            </ul>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Database className="w-5 h-5 text-green-600" />
              Mock Data Fallback
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li>• Automatic fallback when WebSocket fails</li>
              <li>• Realistic data patterns</li>
              <li>• Multiple scenarios supported</li>
              <li>• Configurable data rates</li>
            </ul>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Zap className="w-5 h-5 text-purple-600" />
              Unified System
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li>• Single streaming service</li>
              <li>• Global control interface</li>
              <li>• Consistent behavior across pages</li>
              <li>• Performance monitoring</li>
            </ul>
          </CardContent>
        </Card>
      </div>

      {/* Demo Component */}
      <WebSocketDemo />
    </PageLayout>
  )
}