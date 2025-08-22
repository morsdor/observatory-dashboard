import React from 'react'
import { render } from '@testing-library/react'
import '@testing-library/jest-dom'
import { ChartConfiguration, ChartSyncConfiguration, ChartType } from '../ChartTypes'
import { processChartData } from '../utils/dataProcessing'
import { DataPoint } from '@/types'

// Mock data generator
const generateTestData = (count: number): DataPoint[] => {
  return Array.from({ length: count }, (_, i) => ({
    id: `point-${i}`,
    timestamp: new Date(Date.now() - (count - i) * 60000),
    value: Math.sin(i * 0.1) * 50 + 50,
    category: 'test',
    metadata: {},
    source: 'test-source'
  }))
}

describe('Advanced Chart Integration', () => {
  describe('Chart Type Configuration', () => {
    const chartTypes: ChartType[] = ['line', 'area', 'scatter', 'bar']
    
    chartTypes.forEach(type => {
      it(`supports ${type} chart configuration`, () => {
        const config: ChartConfiguration = {
          type,
          colors: {
            primary: '#3b82f6',
            secondary: '#60a5fa',
            fill: '#3b82f620',
            stroke: '#3b82f6'
          },
          style: {
            lineWidth: 2,
            pointRadius: 3,
            fillOpacity: 0.3,
            strokeOpacity: 1
          },
          aggregation: {
            enabled: false,
            method: 'average',
            interval: 60000
          },
          downsampling: {
            enabled: false,
            maxPoints: 1000,
            algorithm: 'lttb'
          }
        }

        expect(config.type).toBe(type)
        expect(config.colors.primary).toBe('#3b82f6')
        expect(config.style.lineWidth).toBe(2)
      })
    })
  })

  describe('Data Processing Integration', () => {
    it('processes large datasets with aggregation and downsampling', () => {
      const largeData = generateTestData(10000)
      
      const config = {
        aggregation: {
          enabled: true,
          method: 'average' as const,
          interval: 300000 // 5 minutes
        },
        downsampling: {
          enabled: true,
          maxPoints: 500,
          algorithm: 'lttb' as const
        }
      }

      const processedData = processChartData(largeData, config)

      // Should be significantly reduced
      expect(processedData.length).toBeLessThan(largeData.length)
      expect(processedData.length).toBeLessThanOrEqual(500)
      
      // Should maintain temporal order
      for (let i = 1; i < processedData.length; i++) {
        expect(processedData[i].timestamp.getTime()).toBeGreaterThanOrEqual(
          processedData[i - 1].timestamp.getTime()
        )
      }
    })

    it('handles different aggregation methods', () => {
      const testData = generateTestData(100)
      const methods: Array<'average' | 'sum' | 'min' | 'max' | 'count'> = 
        ['average', 'sum', 'min', 'max', 'count']

      methods.forEach(method => {
        const config = {
          aggregation: {
            enabled: true,
            method,
            interval: 300000
          },
          downsampling: {
            enabled: false,
            maxPoints: 1000,
            algorithm: 'lttb' as const
          }
        }

        const result = processChartData(testData, config)
        
        expect(result.length).toBeGreaterThan(0)
        expect(result.length).toBeLessThan(testData.length)
        
        // Check aggregation metadata
        result.forEach(point => {
          expect(point.metadata.aggregationMethod).toBe(method)
          expect(point.aggregatedCount).toBeGreaterThan(0)
        })
      })
    })

    it('handles different downsampling algorithms', () => {
      const testData = generateTestData(1000)
      const algorithms: Array<'lttb' | 'average' | 'min-max'> = ['lttb', 'average', 'min-max']

      algorithms.forEach(algorithm => {
        const config = {
          aggregation: {
            enabled: false,
            method: 'average' as const,
            interval: 60000
          },
          downsampling: {
            enabled: true,
            maxPoints: 100,
            algorithm
          }
        }

        const result = processChartData(testData, config)
        
        expect(result.length).toBeLessThanOrEqual(100)
        expect(result.length).toBeGreaterThan(0)
        
        // Should maintain temporal order
        for (let i = 1; i < result.length; i++) {
          expect(result[i].timestamp.getTime()).toBeGreaterThanOrEqual(
            result[i - 1].timestamp.getTime()
          )
        }
      })
    })
  })

  describe('Chart Synchronization Configuration', () => {
    it('creates valid sync configurations', () => {
      const syncConfig: ChartSyncConfiguration = {
        enabled: true,
        syncZoom: true,
        syncPan: true,
        syncCrosshair: true,
        syncSelection: false,
        groupId: 'test-group'
      }

      expect(syncConfig.enabled).toBe(true)
      expect(syncConfig.groupId).toBe('test-group')
      expect(syncConfig.syncZoom).toBe(true)
      expect(syncConfig.syncPan).toBe(true)
      expect(syncConfig.syncCrosshair).toBe(true)
      expect(syncConfig.syncSelection).toBe(false)
    })

    it('handles disabled synchronization', () => {
      const syncConfig: ChartSyncConfiguration = {
        enabled: false,
        syncZoom: false,
        syncPan: false,
        syncCrosshair: false,
        syncSelection: false
      }

      expect(syncConfig.enabled).toBe(false)
      expect(Object.values(syncConfig).every(val => val === false)).toBe(true)
    })
  })

  describe('Performance Characteristics', () => {
    it('processes extreme datasets efficiently', () => {
      const extremeData = generateTestData(50000)
      
      const startTime = performance.now()
      
      const config = {
        aggregation: {
          enabled: true,
          method: 'average' as const,
          interval: 60000
        },
        downsampling: {
          enabled: true,
          maxPoints: 1000,
          algorithm: 'lttb' as const
        }
      }

      const result = processChartData(extremeData, config)
      
      const endTime = performance.now()
      const processingTime = endTime - startTime

      expect(result.length).toBeLessThanOrEqual(1000)
      expect(processingTime).toBeLessThan(2000) // Should complete in under 2 seconds
    })

    it('maintains performance with multiple processing steps', () => {
      const data = generateTestData(10000)
      
      const startTime = performance.now()
      
      // Apply multiple processing steps
      const step1 = processChartData(data, {
        aggregation: { enabled: true, method: 'average', interval: 300000 },
        downsampling: { enabled: false, maxPoints: 1000, algorithm: 'lttb' }
      })
      
      const step2 = processChartData(step1, {
        aggregation: { enabled: false, method: 'average', interval: 60000 },
        downsampling: { enabled: true, maxPoints: 500, algorithm: 'lttb' }
      })
      
      const endTime = performance.now()
      const totalTime = endTime - startTime

      expect(step2.length).toBeLessThanOrEqual(500)
      expect(totalTime).toBeLessThan(1000) // Should complete in under 1 second
    })
  })

  describe('Data Integrity', () => {
    it('preserves data structure through processing', () => {
      const originalData = generateTestData(1000)
      
      const config = {
        aggregation: {
          enabled: true,
          method: 'average' as const,
          interval: 300000
        },
        downsampling: {
          enabled: true,
          maxPoints: 100,
          algorithm: 'lttb' as const
        }
      }

      const processedData = processChartData(originalData, config)

      // Check that all processed points have required fields
      processedData.forEach(point => {
        expect(point).toHaveProperty('id')
        expect(point).toHaveProperty('timestamp')
        expect(point).toHaveProperty('value')
        expect(point).toHaveProperty('category')
        expect(point).toHaveProperty('metadata')
        expect(point).toHaveProperty('source')
        
        expect(point.timestamp).toBeInstanceOf(Date)
        expect(typeof point.value).toBe('number')
        expect(typeof point.id).toBe('string')
      })
    })

    it('handles edge cases gracefully', () => {
      // Empty data
      expect(processChartData([], {
        aggregation: { enabled: true, method: 'average', interval: 60000 },
        downsampling: { enabled: true, maxPoints: 100, algorithm: 'lttb' }
      })).toEqual([])

      // Single data point
      const singlePoint = generateTestData(1)
      const result = processChartData(singlePoint, {
        aggregation: { enabled: true, method: 'average', interval: 60000 },
        downsampling: { enabled: true, maxPoints: 100, algorithm: 'lttb' }
      })
      expect(result).toHaveLength(1)

      // Data smaller than target
      const smallData = generateTestData(10)
      const smallResult = processChartData(smallData, {
        aggregation: { enabled: false, method: 'average', interval: 60000 },
        downsampling: { enabled: true, maxPoints: 100, algorithm: 'lttb' }
      })
      expect(smallResult).toHaveLength(10)
    })
  })

  describe('Configuration Validation', () => {
    it('handles invalid configuration gracefully', () => {
      const data = generateTestData(100)
      
      // Invalid aggregation interval
      const result1 = processChartData(data, {
        aggregation: { enabled: true, method: 'average', interval: 0 },
        downsampling: { enabled: false, maxPoints: 100, algorithm: 'lttb' }
      })
      expect(result1.length).toBeGreaterThan(0)

      // Invalid max points
      const result2 = processChartData(data, {
        aggregation: { enabled: false, method: 'average', interval: 60000 },
        downsampling: { enabled: true, maxPoints: 0, algorithm: 'lttb' }
      })
      expect(result2.length).toBeGreaterThan(0)
    })
  })
})