// Mock D3 before importing
const mockScale = {
  domain: jest.fn().mockReturnThis(),
  range: jest.fn().mockReturnThis(),
  ticks: jest.fn(() => [])
}

jest.mock('d3', () => ({
  scaleTime: jest.fn(() => mockScale),
  scaleLinear: jest.fn(() => mockScale),
  extent: jest.fn((data, accessor) => {
    if (!data.length) return [0, 100]
    const values = data.map(accessor)
    return [Math.min(...values), Math.max(...values)]
  }),
  timeFormat: jest.fn((format) => jest.fn((date) => {
    if (format === '%H:%M') {
      return date.toISOString().substr(11, 5)
    }
    return '12:00'
  })),
  format: jest.fn((format) => jest.fn((num) => {
    if (format === '.2f') {
      return num.toFixed(2)
    }
    return '10.00'
  })),
  bisector: jest.fn((accessor) => ({
    left: jest.fn((data, target) => {
      for (let i = 0; i < data.length; i++) {
        if (accessor(data[i]) >= target) return i
      }
      return data.length
    })
  })),
  zoomIdentity: {
    rescaleX: jest.fn((scale) => scale)
  }
}))

// Import d3 after mocking
import * as d3 from 'd3'

import {
  calculateExtents,
  createScales,
  formatTickLabel,
  findClosestDataPoint,
  calculateDistance,
  isPointInBounds,
  filterVisibleData,
  downsampleData,
  validateChartData,
  calculateOptimalTickCount,
  applyZoomTransform
} from '../utils/chartUtils'
import { DataPoint } from '@/types'

// Mock data for testing
const createMockDataPoint = (
  id: string,
  timestamp: Date,
  value: number,
  category: string = 'test',
  source: string = 'test-source'
): DataPoint => ({
  id,
  timestamp,
  value,
  category,
  metadata: {},
  source
})

const createMockData = (count: number = 10): DataPoint[] => {
  const now = new Date()
  return Array.from({ length: count }, (_, i) => 
    createMockDataPoint(
      `point-${i}`,
      new Date(now.getTime() + i * 60000), // 1 minute intervals
      Math.random() * 100,
      'test',
      'test-source'
    )
  )
}

describe('chartUtils', () => {
  describe('calculateExtents', () => {
    it('should calculate correct extents for valid data', () => {
      const data = [
        createMockDataPoint('1', new Date('2023-01-01T10:00:00Z'), 10),
        createMockDataPoint('2', new Date('2023-01-01T11:00:00Z'), 50),
        createMockDataPoint('3', new Date('2023-01-01T12:00:00Z'), 30)
      ]

      const extents = calculateExtents(data)

      expect(extents.xExtent[0]).toEqual(new Date('2023-01-01T10:00:00Z'))
      expect(extents.xExtent[1]).toEqual(new Date('2023-01-01T12:00:00Z'))
      expect(extents.yExtent[0]).toBe(10)
      expect(extents.yExtent[1]).toBe(50)
    })

    it('should return default extents for empty data', () => {
      const extents = calculateExtents([])

      expect(extents.xExtent[0]).toBeInstanceOf(Date)
      expect(extents.xExtent[1]).toBeInstanceOf(Date)
      expect(extents.yExtent[0]).toBe(0)
      expect(extents.yExtent[1]).toBe(100)
    })
  })

  describe('createScales', () => {
    it('should create scales with correct domains and ranges', () => {
      const data = [
        createMockDataPoint('1', new Date('2023-01-01T10:00:00Z'), 10),
        createMockDataPoint('2', new Date('2023-01-01T11:00:00Z'), 50)
      ]

      const { xScale, yScale } = createScales(data, 800, 400)

      expect(xScale.range()).toEqual([0, 800])
      expect(yScale.range()).toEqual([400, 0])
      
      // Check domains
      expect(xScale.domain()[0]).toEqual(new Date('2023-01-01T10:00:00Z'))
      expect(xScale.domain()[1]).toEqual(new Date('2023-01-01T11:00:00Z'))
      
      // Y domain should include padding
      expect(yScale.domain()[0]).toBeLessThan(10)
      expect(yScale.domain()[1]).toBeGreaterThan(50)
    })

    it('should handle custom y-padding', () => {
      const data = [
        createMockDataPoint('1', new Date('2023-01-01T10:00:00Z'), 10),
        createMockDataPoint('2', new Date('2023-01-01T11:00:00Z'), 50)
      ]

      const { yScale } = createScales(data, 800, 400, 0.2)
      const domain = yScale.domain()
      
      // With 20% padding, the range should be expanded more
      expect(domain[1] - domain[0]).toBeGreaterThan(40 * 1.2)
    })
  })

  describe('formatTickLabel', () => {
    it('should format time labels correctly', () => {
      const date = new Date('2023-01-01T14:30:00Z')
      const label = formatTickLabel(date, 'time')
      expect(label).toBe('14:30')
    })

    it('should format numeric labels correctly', () => {
      const label = formatTickLabel(123.456, 'linear')
      expect(label).toBe('123.46')
    })

    it('should handle invalid inputs gracefully', () => {
      const label = formatTickLabel('invalid' as any, 'time')
      expect(label).toBe('invalid')
    })
  })

  describe('findClosestDataPoint', () => {
    it('should find the closest data point', () => {
      const data = [
        createMockDataPoint('1', new Date('2023-01-01T10:00:00Z'), 10),
        createMockDataPoint('2', new Date('2023-01-01T11:00:00Z'), 20),
        createMockDataPoint('3', new Date('2023-01-01T12:00:00Z'), 30)
      ]

      const targetDate = new Date('2023-01-01T10:30:00Z')
      const closest = findClosestDataPoint(data, targetDate)

      expect(closest?.id).toBe('2')
    })

    it('should return null for empty data', () => {
      const closest = findClosestDataPoint([], new Date())
      expect(closest).toBeNull()
    })

    it('should handle edge cases at boundaries', () => {
      const data = [
        createMockDataPoint('1', new Date('2023-01-01T10:00:00Z'), 10),
        createMockDataPoint('2', new Date('2023-01-01T11:00:00Z'), 20)
      ]

      // Before first point
      const beforeFirst = findClosestDataPoint(data, new Date('2023-01-01T09:00:00Z'))
      expect(beforeFirst?.id).toBe('1')

      // After last point
      const afterLast = findClosestDataPoint(data, new Date('2023-01-01T13:00:00Z'))
      expect(afterLast?.id).toBe('2')
    })
  })

  describe('calculateDistance', () => {
    it('should calculate correct distance between points', () => {
      const distance = calculateDistance(0, 0, 3, 4)
      expect(distance).toBe(5) // 3-4-5 triangle
    })

    it('should handle same points', () => {
      const distance = calculateDistance(5, 5, 5, 5)
      expect(distance).toBe(0)
    })
  })

  describe('isPointInBounds', () => {
    it('should return true for points within bounds', () => {
      expect(isPointInBounds(50, 50, 100, 100)).toBe(true)
      expect(isPointInBounds(0, 0, 100, 100)).toBe(true)
      expect(isPointInBounds(100, 100, 100, 100)).toBe(true)
    })

    it('should return false for points outside bounds', () => {
      expect(isPointInBounds(-1, 50, 100, 100)).toBe(false)
      expect(isPointInBounds(50, -1, 100, 100)).toBe(false)
      expect(isPointInBounds(101, 50, 100, 100)).toBe(false)
      expect(isPointInBounds(50, 101, 100, 100)).toBe(false)
    })
  })

  describe('filterVisibleData', () => {
    it('should filter data to visible range', () => {
      const data = [
        createMockDataPoint('1', new Date('2023-01-01T10:00:00Z'), 10),
        createMockDataPoint('2', new Date('2023-01-01T11:00:00Z'), 20),
        createMockDataPoint('3', new Date('2023-01-01T12:00:00Z'), 30),
        createMockDataPoint('4', new Date('2023-01-01T13:00:00Z'), 40)
      ]

      const xScale = d3.scaleTime()
        .domain([new Date('2023-01-01T10:30:00Z'), new Date('2023-01-01T12:30:00Z')])
        .range([0, 800])

      const filtered = filterVisibleData(data, xScale, 0)

      // Should include points 2 and 3 (within range)
      expect(filtered.length).toBe(2)
      expect(filtered[0].id).toBe('2')
      expect(filtered[1].id).toBe('3')
    })

    it('should include buffer when specified', () => {
      const data = createMockData(10)
      const xScale = d3.scaleTime()
        .domain([data[2].timestamp, data[7].timestamp])
        .range([0, 800])

      const filtered = filterVisibleData(data, xScale, 0.2)

      // Should include more points due to buffer
      expect(filtered.length).toBeGreaterThan(5)
    })
  })

  describe('downsampleData', () => {
    it('should downsample large datasets', () => {
      const data = createMockData(1000)
      const downsampled = downsampleData(data, 100)

      expect(downsampled.length).toBeLessThanOrEqual(101) // +1 for last point
      expect(downsampled[0]).toBe(data[0]) // First point preserved
      expect(downsampled[downsampled.length - 1]).toBe(data[data.length - 1]) // Last point preserved
    })

    it('should return original data if already small enough', () => {
      const data = createMockData(50)
      const downsampled = downsampleData(data, 100)

      expect(downsampled).toBe(data)
    })
  })

  describe('validateChartData', () => {
    it('should validate correct data', () => {
      const data = createMockData(5)
      const result = validateChartData(data)

      expect(result.isValid).toBe(true)
      expect(result.errors).toHaveLength(0)
    })

    it('should detect invalid data types', () => {
      const invalidData = [
        { ...createMockDataPoint('1', new Date(), 10), timestamp: 'invalid' }
      ] as any

      const result = validateChartData(invalidData)

      expect(result.isValid).toBe(false)
      expect(result.errors).toContain('Invalid timestamp at index 0')
    })

    it('should detect invalid values', () => {
      const invalidData = [
        { ...createMockDataPoint('1', new Date(), 10), value: NaN }
      ]

      const result = validateChartData(invalidData)

      expect(result.isValid).toBe(false)
      expect(result.errors).toContain('Invalid value at index 0')
    })

    it('should handle non-array input', () => {
      const result = validateChartData('not an array' as any)

      expect(result.isValid).toBe(false)
      expect(result.errors).toContain('Data must be an array')
    })

    it('should accept empty arrays', () => {
      const result = validateChartData([])

      expect(result.isValid).toBe(true)
      expect(result.errors).toHaveLength(0)
    })
  })

  describe('calculateOptimalTickCount', () => {
    it('should calculate optimal tick count based on space', () => {
      expect(calculateOptimalTickCount(600, 60)).toBe(10)
      expect(calculateOptimalTickCount(300, 60)).toBe(5)
      expect(calculateOptimalTickCount(100, 60)).toBe(2) // Minimum of 2
    })

    it('should respect minimum tick count', () => {
      expect(calculateOptimalTickCount(30, 60)).toBe(2)
    })
  })

  describe('applyZoomTransform', () => {
    it('should apply zoom transform to scale', () => {
      const baseScale = d3.scaleTime()
        .domain([new Date('2023-01-01T10:00:00Z'), new Date('2023-01-01T12:00:00Z')])
        .range([0, 800])

      const transform = d3.zoomIdentity.scale(2).translate(100, 0)
      const zoomedScale = applyZoomTransform(baseScale, transform)

      // Zoomed scale should have different domain
      expect(zoomedScale.domain()).not.toEqual(baseScale.domain())
      expect(zoomedScale.range()).toEqual(baseScale.range())
    })
  })
})