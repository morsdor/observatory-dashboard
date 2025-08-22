import * as d3 from 'd3'
import { DataPoint } from '@/types'
import { ChartSyncConfiguration } from './ChartTypes'

export interface SyncEvent {
  type: 'zoom' | 'pan' | 'crosshair' | 'selection'
  data: any
  sourceId: string
  groupId?: string
}

export interface ChartInstance {
  id: string
  groupId?: string
  config: ChartSyncConfiguration
  onSync: (event: SyncEvent) => void
}

/**
 * Manages synchronization between multiple chart instances
 */
export class ChartSyncManager {
  private static instance: ChartSyncManager
  private charts = new Map<string, ChartInstance>()
  private eventListeners = new Map<string, Set<(event: SyncEvent) => void>>()

  static getInstance(): ChartSyncManager {
    if (!ChartSyncManager.instance) {
      ChartSyncManager.instance = new ChartSyncManager()
    }
    return ChartSyncManager.instance
  }

  /**
   * Register a chart for synchronization
   */
  registerChart(chart: ChartInstance): void {
    this.charts.set(chart.id, chart)
    
    if (chart.groupId && !this.eventListeners.has(chart.groupId)) {
      this.eventListeners.set(chart.groupId, new Set())
    }
  }

  /**
   * Unregister a chart from synchronization
   */
  unregisterChart(chartId: string): void {
    const chart = this.charts.get(chartId)
    if (chart?.groupId) {
      const listeners = this.eventListeners.get(chart.groupId)
      if (listeners) {
        listeners.delete(chart.onSync)
        if (listeners.size === 0) {
          this.eventListeners.delete(chart.groupId)
        }
      }
    }
    this.charts.delete(chartId)
  }

  /**
   * Broadcast a sync event to other charts in the same group
   */
  broadcastEvent(event: SyncEvent): void {
    const sourceChart = this.charts.get(event.sourceId)
    if (!sourceChart?.config.enabled || !sourceChart.groupId) {
      return
    }

    // Get all charts in the same group
    const targetCharts = Array.from(this.charts.values()).filter(
      chart => 
        chart.id !== event.sourceId && 
        chart.groupId === sourceChart.groupId &&
        chart.config.enabled &&
        this.shouldSyncEvent(chart.config, event.type)
    )

    // Broadcast to target charts
    targetCharts.forEach(chart => {
      try {
        chart.onSync(event)
      } catch (error) {
        console.warn(`Failed to sync event to chart ${chart.id}:`, error)
      }
    })
  }

  /**
   * Check if a chart should receive a specific sync event type
   */
  private shouldSyncEvent(config: ChartSyncConfiguration, eventType: SyncEvent['type']): boolean {
    switch (eventType) {
      case 'zoom':
        return config.syncZoom
      case 'pan':
        return config.syncPan
      case 'crosshair':
        return config.syncCrosshair
      case 'selection':
        return config.syncSelection
      default:
        return false
    }
  }

  /**
   * Create a zoom sync event
   */
  createZoomEvent(sourceId: string, transform: d3.ZoomTransform): SyncEvent {
    return {
      type: 'zoom',
      data: {
        k: transform.k,
        x: transform.x,
        y: transform.y
      },
      sourceId
    }
  }

  /**
   * Create a crosshair sync event
   */
  createCrosshairEvent(sourceId: string, position: { x: number; y: number } | null, dataPoint: DataPoint | null): SyncEvent {
    return {
      type: 'crosshair',
      data: {
        position,
        dataPoint
      },
      sourceId
    }
  }

  /**
   * Create a selection sync event
   */
  createSelectionEvent(sourceId: string, selectedData: DataPoint[]): SyncEvent {
    return {
      type: 'selection',
      data: {
        selectedData
      },
      sourceId
    }
  }

  /**
   * Get all charts in a specific group
   */
  getChartsInGroup(groupId: string): ChartInstance[] {
    return Array.from(this.charts.values()).filter(chart => chart.groupId === groupId)
  }

  /**
   * Update sync configuration for a chart
   */
  updateChartConfig(chartId: string, config: Partial<ChartSyncConfiguration>): void {
    const chart = this.charts.get(chartId)
    if (chart) {
      chart.config = { ...chart.config, ...config }
    }
  }

  /**
   * Get sync statistics for debugging
   */
  getSyncStats(): { totalCharts: number; groups: Record<string, number> } {
    const groups: Record<string, number> = {}
    
    this.charts.forEach(chart => {
      if (chart.groupId) {
        groups[chart.groupId] = (groups[chart.groupId] || 0) + 1
      }
    })

    return {
      totalCharts: this.charts.size,
      groups
    }
  }
}

/**
 * Hook for using chart synchronization
 */
export function useChartSync(
  chartId: string,
  config: ChartSyncConfiguration,
  onSyncReceived: (event: SyncEvent) => void
) {
  const syncManager = ChartSyncManager.getInstance()

  // Register chart on mount
  React.useEffect(() => {
    const chartInstance: ChartInstance = {
      id: chartId,
      groupId: config.groupId,
      config,
      onSync: onSyncReceived
    }

    syncManager.registerChart(chartInstance)

    return () => {
      syncManager.unregisterChart(chartId)
    }
  }, [chartId, config.groupId])

  // Update config when it changes
  React.useEffect(() => {
    syncManager.updateChartConfig(chartId, config)
  }, [chartId, config])

  // Return broadcast function
  return {
    broadcastEvent: (event: SyncEvent) => syncManager.broadcastEvent(event),
    createZoomEvent: (transform: d3.ZoomTransform) => 
      syncManager.createZoomEvent(chartId, transform),
    createCrosshairEvent: (position: { x: number; y: number } | null, dataPoint: DataPoint | null) =>
      syncManager.createCrosshairEvent(chartId, position, dataPoint),
    createSelectionEvent: (selectedData: DataPoint[]) =>
      syncManager.createSelectionEvent(chartId, selectedData)
  }
}

// Add React import for the hook
import React from 'react'