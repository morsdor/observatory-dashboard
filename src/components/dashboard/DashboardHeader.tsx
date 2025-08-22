'use client'

import React from 'react'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Separator } from '@/components/ui/separator'
import { 
  Activity, 
  Settings, 
  RefreshCw,
  Wifi,
  WifiOff
} from 'lucide-react'

interface DashboardHeaderProps {
  connectionStatus: 'connecting' | 'connected' | 'disconnected' | 'error'
  onRefresh?: () => void
  onSettings?: () => void
}

export function DashboardHeader({ 
  connectionStatus, 
  onRefresh, 
  onSettings 
}: DashboardHeaderProps) {
  const getConnectionIcon = () => {
    switch (connectionStatus) {
      case 'connected':
        return <Wifi className="h-4 w-4 text-green-500" />
      case 'connecting':
        return <RefreshCw className="h-4 w-4 text-yellow-500 animate-spin" />
      case 'disconnected':
      case 'error':
        return <WifiOff className="h-4 w-4 text-red-500" />
      default:
        return <WifiOff className="h-4 w-4 text-gray-500" />
    }
  }

  const getConnectionText = () => {
    switch (connectionStatus) {
      case 'connected':
        return 'Connected'
      case 'connecting':
        return 'Connecting...'
      case 'disconnected':
        return 'Disconnected'
      case 'error':
        return 'Connection Error'
      default:
        return 'Unknown'
    }
  }

  return (
    <Card className="border-b rounded-none">
      <div className="flex items-center justify-between p-4">
        <div className="flex items-center space-x-4">
          <div className="flex items-center space-x-2">
            <Activity className="h-6 w-6 text-blue-600" />
            <h1 className="text-2xl font-bold text-gray-900">Observatory Dashboard</h1>
          </div>
          <Separator orientation="vertical" className="h-6" />
          <div className="flex items-center space-x-2">
            {getConnectionIcon()}
            <span className="text-sm font-medium">{getConnectionText()}</span>
          </div>
        </div>
        
        <div className="flex items-center space-x-2">
          <Button
            variant="outline"
            size="sm"
            onClick={onRefresh}
            className="flex items-center space-x-2"
          >
            <RefreshCw className="h-4 w-4" />
            <span>Refresh</span>
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={onSettings}
            className="flex items-center space-x-2"
          >
            <Settings className="h-4 w-4" />
            <span>Settings</span>
          </Button>
        </div>
      </div>
    </Card>
  )
}