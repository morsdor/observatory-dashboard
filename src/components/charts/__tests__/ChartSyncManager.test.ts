import { ChartSyncManager, ChartInstance, SyncEvent } from '../ChartSyncManager'
import { ChartSyncConfiguration } from '../ChartTypes'

// Mock D3
const mockD3 = {
  zoomIdentity: {
    translate: jest.fn().mockReturnThis(),
    scale: jest.fn().mockReturnThis(),
    k: 1,
    x: 0,
    y: 0
  }
}

jest.mock('d3', () => mockD3)

describe('ChartSyncManager', () => {
  let syncManager: ChartSyncManager
  let mockChart1: ChartInstance
  let mockChart2: ChartInstance
  let mockChart3: ChartInstance

  beforeEach(() => {
    // Get fresh instance for each test
    syncManager = ChartSyncManager.getInstance()
    
    // Clear any existing charts
    ;(syncManager as any).charts.clear()
    ;(syncManager as any).eventListeners.clear()

    // Create mock chart instances
    mockChart1 = {
      id: 'chart1',
      groupId: 'group1',
      config: {
        enabled: true,
        syncZoom: true,
        syncPan: true,
        syncCrosshair: true,
        syncSelection: false
      },
      onSync: jest.fn()
    }

    mockChart2 = {
      id: 'chart2',
      groupId: 'group1',
      config: {
        enabled: true,
        syncZoom: true,
        syncPan: false,
        syncCrosshair: true,
        syncSelection: true
      },
      onSync: jest.fn()
    }

    mockChart3 = {
      id: 'chart3',
      groupId: 'group2',
      config: {
        enabled: true,
        syncZoom: true,
        syncPan: true,
        syncCrosshair: false,
        syncSelection: false
      },
      onSync: jest.fn()
    }
  })

  describe('Chart Registration', () => {
    it('registers charts successfully', () => {
      syncManager.registerChart(mockChart1)
      syncManager.registerChart(mockChart2)

      const stats = syncManager.getSyncStats()
      expect(stats.totalCharts).toBe(2)
      expect(stats.groups['group1']).toBe(2)
    })

    it('unregisters charts successfully', () => {
      syncManager.registerChart(mockChart1)
      syncManager.registerChart(mockChart2)
      
      syncManager.unregisterChart('chart1')

      const stats = syncManager.getSyncStats()
      expect(stats.totalCharts).toBe(1)
      expect(stats.groups['group1']).toBe(1)
    })

    it('handles multiple groups', () => {
      syncManager.registerChart(mockChart1)
      syncManager.registerChart(mockChart2)
      syncManager.registerChart(mockChart3)

      const stats = syncManager.getSyncStats()
      expect(stats.totalCharts).toBe(3)
      expect(stats.groups['group1']).toBe(2)
      expect(stats.groups['group2']).toBe(1)
    })
  })

  describe('Event Broadcasting', () => {
    beforeEach(() => {
      syncManager.registerChart(mockChart1)
      syncManager.registerChart(mockChart2)
      syncManager.registerChart(mockChart3)
    })

    it('broadcasts zoom events to same group', () => {
      const zoomEvent: SyncEvent = {
        type: 'zoom',
        data: { k: 2, x: 100, y: 0 },
        sourceId: 'chart1'
      }

      syncManager.broadcastEvent(zoomEvent)

      // Chart2 should receive the event (same group, sync enabled)
      expect(mockChart2.onSync).toHaveBeenCalledWith(zoomEvent)
      
      // Chart3 should not receive the event (different group)
      expect(mockChart3.onSync).not.toHaveBeenCalled()
      
      // Chart1 should not receive its own event
      expect(mockChart1.onSync).not.toHaveBeenCalled()
    })

    it('respects sync configuration for different event types', () => {
      const panEvent: SyncEvent = {
        type: 'pan',
        data: { x: 50, y: 0 },
        sourceId: 'chart1'
      }

      syncManager.broadcastEvent(panEvent)

      // Chart2 has syncPan disabled, should not receive pan events
      expect(mockChart2.onSync).not.toHaveBeenCalled()
    })

    it('broadcasts crosshair events correctly', () => {
      const crosshairEvent: SyncEvent = {
        type: 'crosshair',
        data: { position: { x: 100, y: 150 }, dataPoint: null },
        sourceId: 'chart1'
      }

      syncManager.broadcastEvent(crosshairEvent)

      // Chart2 should receive crosshair events
      expect(mockChart2.onSync).toHaveBeenCalledWith(crosshairEvent)
    })

    it('does not broadcast when sync is disabled', () => {
      mockChart1.config.enabled = false
      
      const zoomEvent: SyncEvent = {
        type: 'zoom',
        data: { k: 2, x: 100, y: 0 },
        sourceId: 'chart1'
      }

      syncManager.broadcastEvent(zoomEvent)

      expect(mockChart2.onSync).not.toHaveBeenCalled()
    })
  })

  describe('Event Creation Helpers', () => {
    it('creates zoom events correctly', () => {
      const transform = { k: 2, x: 100, y: 50 } as any
      const event = syncManager.createZoomEvent('chart1', transform)

      expect(event).toEqual({
        type: 'zoom',
        data: { k: 2, x: 100, y: 50 },
        sourceId: 'chart1'
      })
    })

    it('creates crosshair events correctly', () => {
      const position = { x: 100, y: 150 }
      const dataPoint = {
        id: 'test',
        timestamp: new Date(),
        value: 50,
        category: 'test',
        metadata: {},
        source: 'test'
      }

      const event = syncManager.createCrosshairEvent('chart1', position, dataPoint)

      expect(event).toEqual({
        type: 'crosshair',
        data: { position, dataPoint },
        sourceId: 'chart1'
      })
    })

    it('creates selection events correctly', () => {
      const selectedData = [
        {
          id: 'test1',
          timestamp: new Date(),
          value: 50,
          category: 'test',
          metadata: {},
          source: 'test'
        }
      ]

      const event = syncManager.createSelectionEvent('chart1', selectedData)

      expect(event).toEqual({
        type: 'selection',
        data: { selectedData },
        sourceId: 'chart1'
      })
    })
  })

  describe('Configuration Management', () => {
    beforeEach(() => {
      syncManager.registerChart(mockChart1)
    })

    it('updates chart configuration', () => {
      const newConfig: Partial<ChartSyncConfiguration> = {
        syncZoom: false,
        syncPan: true
      }

      syncManager.updateChartConfig('chart1', newConfig)

      const charts = syncManager.getChartsInGroup('group1')
      expect(charts[0].config.syncZoom).toBe(false)
      expect(charts[0].config.syncPan).toBe(true)
    })

    it('gets charts in specific group', () => {
      syncManager.registerChart(mockChart2)
      syncManager.registerChart(mockChart3)

      const group1Charts = syncManager.getChartsInGroup('group1')
      const group2Charts = syncManager.getChartsInGroup('group2')

      expect(group1Charts).toHaveLength(2)
      expect(group2Charts).toHaveLength(1)
      expect(group1Charts.map(c => c.id)).toEqual(['chart1', 'chart2'])
      expect(group2Charts.map(c => c.id)).toEqual(['chart3'])
    })
  })

  describe('Error Handling', () => {
    beforeEach(() => {
      syncManager.registerChart(mockChart1)
      syncManager.registerChart(mockChart2)
    })

    it('handles sync callback errors gracefully', () => {
      // Make chart2 throw an error
      mockChart2.onSync = jest.fn(() => {
        throw new Error('Sync callback error')
      })

      const consoleSpy = jest.spyOn(console, 'warn').mockImplementation()

      const zoomEvent: SyncEvent = {
        type: 'zoom',
        data: { k: 2, x: 100, y: 0 },
        sourceId: 'chart1'
      }

      // Should not throw, but should log warning
      expect(() => syncManager.broadcastEvent(zoomEvent)).not.toThrow()
      expect(consoleSpy).toHaveBeenCalledWith(
        'Failed to sync event to chart chart2:',
        expect.any(Error)
      )

      consoleSpy.mockRestore()
    })

    it('handles unregistering non-existent charts', () => {
      expect(() => syncManager.unregisterChart('non-existent')).not.toThrow()
    })

    it('handles updating config for non-existent charts', () => {
      expect(() => 
        syncManager.updateChartConfig('non-existent', { syncZoom: false })
      ).not.toThrow()
    })
  })

  describe('Performance', () => {
    it('handles large number of charts efficiently', () => {
      const charts: ChartInstance[] = []
      
      // Register 100 charts
      for (let i = 0; i < 100; i++) {
        const chart: ChartInstance = {
          id: `chart${i}`,
          groupId: 'large-group',
          config: {
            enabled: true,
            syncZoom: true,
            syncPan: true,
            syncCrosshair: true,
            syncSelection: false
          },
          onSync: jest.fn()
        }
        charts.push(chart)
        syncManager.registerChart(chart)
      }

      const startTime = performance.now()

      const zoomEvent: SyncEvent = {
        type: 'zoom',
        data: { k: 2, x: 100, y: 0 },
        sourceId: 'chart0'
      }

      syncManager.broadcastEvent(zoomEvent)

      const endTime = performance.now()
      const broadcastTime = endTime - startTime

      // Should broadcast to 99 charts in reasonable time (< 10ms)
      expect(broadcastTime).toBeLessThan(10)
      
      // Verify all other charts received the event
      for (let i = 1; i < 100; i++) {
        expect(charts[i].onSync).toHaveBeenCalledWith(zoomEvent)
      }
    })
  })

  describe('Singleton Pattern', () => {
    it('returns same instance', () => {
      const instance1 = ChartSyncManager.getInstance()
      const instance2 = ChartSyncManager.getInstance()

      expect(instance1).toBe(instance2)
    })
  })
})