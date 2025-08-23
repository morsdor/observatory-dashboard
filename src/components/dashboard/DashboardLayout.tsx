'use client'

import React, { useState, Suspense } from 'react'
import { DashboardHeader } from './DashboardHeader'
import { DashboardSidebar } from './DashboardSidebar'
import { DashboardGrid, GridLayouts } from './DashboardGrid'
import { ErrorBoundary, ChartErrorFallback, DataGridErrorFallback } from './ErrorBoundary'
import { DashboardSkeleton, ChartLoadingSkeleton, DataGridLoadingSkeleton, LoadingSpinner } from './LoadingStates'
import { DataTableDemo } from './DataTableDemo'
import { Card } from '@/components/ui/card'

interface DashboardLayoutProps {
  connectionStatus?: 'connecting' | 'connected' | 'disconnected' | 'error'
  onRefresh?: () => void
  onSettings?: () => void
  isLoading?: boolean
  children?: React.ReactNode
}

export function DashboardLayout({
  connectionStatus = 'disconnected',
  onRefresh,
  onSettings,
  isLoading = false,
  children
}: DashboardLayoutProps) {
  const [activeView, setActiveView] = useState('overview')
  const [sidebarCollapsed] = useState(false)

  // Show loading skeleton while initializing
  if (isLoading) {
    return <DashboardSkeleton />
  }

  const renderMainContent = () => {
    if (children) {
      return children
    }

    switch (activeView) {
      case 'overview':
        return (
          <DashboardGrid
            items={GridLayouts.overview.map(layout => ({
              ...layout,
              component: <PlaceholderComponent type={layout.id} />
            }))}
          />
        )
      case 'charts':
        return (
          <ErrorBoundary fallback={ChartErrorFallback}>
            <Suspense fallback={<ChartLoadingSkeleton />}>
              <DashboardGrid
                items={GridLayouts.charts.map(layout => ({
                  ...layout,
                  component: <PlaceholderComponent type={layout.id} />
                }))}
              />
            </Suspense>
          </ErrorBoundary>
        )
      case 'data-grid':
        return (
          <ErrorBoundary fallback={DataGridErrorFallback}>
            <Suspense fallback={<DataGridLoadingSkeleton />}>
              <div className="p-4">
                <DataTableDemo />
              </div>
            </Suspense>
          </ErrorBoundary>
        )
      case 'filters':
        return (
          <div className="p-4">
            <Card className="p-6">
              <PlaceholderComponent type="filters" />
            </Card>
          </div>
        )
      case 'data-sources':
        return (
          <div className="p-4">
            <Card className="p-6">
              <PlaceholderComponent type="data-sources" />
            </Card>
          </div>
        )
      case 'settings':
        return (
          <div className="p-4">
            <Card className="p-6">
              <PlaceholderComponent type="settings" />
            </Card>
          </div>
        )
      case 'help':
        return (
          <div className="p-4">
            <Card className="p-6">
              <PlaceholderComponent type="help" />
            </Card>
          </div>
        )
      default:
        return (
          <div className="p-4">
            <Card className="p-6">
              <PlaceholderComponent type="unknown" />
            </Card>
          </div>
        )
    }
  }

  return (
    <div className="h-screen flex flex-col bg-gray-50">
      {/* Header */}
      <ErrorBoundary>
        <DashboardHeader
          connectionStatus={connectionStatus}
          onRefresh={onRefresh}
          onSettings={onSettings}
        />
      </ErrorBoundary>

      {/* Main Layout */}
      <div className="flex flex-1 overflow-hidden">
        {/* Sidebar */}
        {/* <ErrorBoundary>
          <div className={`transition-all duration-300 ${sidebarCollapsed ? 'w-0' : 'w-64'}`}>
            <DashboardSidebar
              activeView={activeView}
              onViewChange={setActiveView}
              className="h-full"
            />
          </div>
        </ErrorBoundary> */}

        {/* Main Content */}
        <div className="flex-1 overflow-auto">
          <ErrorBoundary>
            {renderMainContent()}
          </ErrorBoundary>
        </div>
      </div>
    </div>
  )
}

// Placeholder component for development
function PlaceholderComponent({ type }: { type: string }) {
  const getPlaceholderContent = () => {
    switch (type) {
      case 'metrics-summary':
        return (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="text-center">
                <div className="text-2xl font-bold text-blue-600">1,234</div>
                <div className="text-sm text-gray-600">Active Connections</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-green-600">98.5%</div>
                <div className="text-sm text-gray-600">Uptime</div>
              </div>
            </div>
          </div>
        )
      case 'connection-status':
        return (
          <div className="text-center space-y-2">
            <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center mx-auto">
              <div className="w-6 h-6 bg-green-500 rounded-full"></div>
            </div>
            <div className="text-sm font-medium">Connected</div>
          </div>
        )
      case 'data-rate':
        return (
          <div className="text-center space-y-2">
            <div className="text-xl font-bold text-blue-600">150/sec</div>
            <div className="text-sm text-gray-600">Data Points</div>
          </div>
        )
      default:
        return (
          <div className="flex items-center justify-center h-full">
            <LoadingSpinner message={`Loading ${type.replace('-', ' ')}...`} />
          </div>
        )
    }
  }

  return (
    <div className="w-full h-full">
      {getPlaceholderContent()}
    </div>
  )
}

export default DashboardLayout