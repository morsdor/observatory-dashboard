// Mock D3 before importing
const createMockScale = () => {
  const scaleFn = jest.fn(() => 100)
  scaleFn.domain = jest.fn().mockReturnValue([0, 100])
  scaleFn.range = jest.fn().mockReturnValue([0, 800])
  scaleFn.ticks = jest.fn(() => [])
  return scaleFn
}

const createMockTimeScale = () => {
  const scaleFn = jest.fn(() => 100)
  scaleFn.domain = jest.fn().mockReturnValue([new Date('2023-01-01T10:00:00Z'), new Date('2023-01-01T12:00:00Z')])
  scaleFn.range = jest.fn().mockReturnValue([0, 800])
  scaleFn.ticks = jest.fn(() => [])
  return scaleFn
}

jest.mock('d3', () => ({
  scaleTime: jest.fn(() => createMockTimeScale()),
  scaleLinear: jest.fn(() => createMockScale()),
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
    rescaleX: jest.fn((scale) => scale),
    scale: jest.fn().mockReturnThis(),
    translate: jest.fn().mockReturnThis()
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
  applyZoomTransform,
  drawCrosshair,
  drawDataPointHighlight,
  isNearDataPoint,
  getTooltipPosition,
  throttle,
  debounce
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

      // Check that scales were created
      expect(xScale).toBeDefined()
      expect(yScale).toBeDefined()
      
      // Check that domain and range methods were called
      expect(xScale.domain).toHaveBeenCalled()
      expect(xScale.range).toHaveBeenCalled()
      expect(yScale.domain).toHaveBeenCalled()
      expect(yScale.range).toHaveBeenCalled()
    })

    it('should handle custom y-padding', () => {
      const data = [
        createMockDataPoint('1', new Date('2023-01-01T10:00:00Z'), 10),
        createMockDataPoint('2', new Date('2023-01-01T11:00:00Z'), 50)
      ]

      const { yScale } = createScales(data, 800, 400, 0.2)
      
      // Check that scale was created with custom padding
      expect(yScale).toBeDefined()
      expect(yScale.domain).toHaveBeenCalled()
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

      const xScale = createMockTimeScale()
      // Mock domain to return specific range
      xScale.domain = jest.fn().mockReturnValue([
        new Date('2023-01-01T10:30:00Z'), 
        new Date('2023-01-01T12:30:00Z')
      ])

      const filtered = filterVisibleData(data, xScale, 0)

      // Should filter based on timestamp range
      expect(filtered.length).toBeGreaterThan(0)
      expect(filtered.length).toBeLessThanOrEqual(data.length)
    })

    it('should include buffer when specified', () => {
      const data = createMockData(10)
      const xScale = createMockTimeScale()
      
      // Mock domain to return range from data
      xScale.domain = jest.fn().mockReturnValue([
        data[2].timestamp, 
        data[7].timestamp
      ])

      const filtered = filterVisibleData(data, xScale, 0.2)

      // Should include points with buffer
      expect(filtered.length).toBeGreaterThan(0)
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

  describe('Interactive Features Utilities', () => {
    // Mock canvas context for drawing tests
    const mockContext = {
      save: jest.fn(),
      restore: jest.fn(),
      beginPath: jest.fn(),
      moveTo: jest.fn(),
      lineTo: jest.fn(),
      stroke: jest.fn(),
      fill: jest.fn(),
      arc: jest.fn(),
      setLineDash: jest.fn(),
      strokeStyle: '',
      fillStyle: '',
      lineWidth: 1
    } as any

    beforeEach(() => {
      jest.clearAllMocks()
    })

    describe('drawCrosshair', () => {
      it('should draw crosshair with default styles', () => {
        drawCrosshair(mockContext, 100, 200, 800, 400)

        expect(mockContext.save).toHaveBeenCalled()
        expect(mockContext.restore).toHaveBeenCalled()
        expect(mockContext.setLineDash).toHaveBeenCalledWith([4, 4])
        expect(mockContext.beginPath).toHaveBeenCalledTimes(2) // Vertical and horizontal lines
        expect(mockContext.stroke).toHaveBeenCalledTimes(2)
        expect(mockContext.strokeStyle).toBe('#6b7280')
        expect(mockContext.lineWidth).toBe(1)
      })

      it('should draw crosshair with custom styles', () => {
        const customStyle = {
          color: '#ff0000',
          lineWidth: 2,
          dashPattern: [2, 2]
        }

        drawCrosshair(mockContext, 100, 200, 800, 400, customStyle)

        expect(mockContext.strokeStyle).toBe('#ff0000')
        expect(mockContext.lineWidth).toBe(2)
        expect(mockContext.setLineDash).toHaveBeenCalledWith([2, 2])
      })

      it('should draw lines at correct positions', () => {
        drawCrosshair(mockContext, 150, 250, 800, 400)

        // Check vertical line
        expect(mockContext.moveTo).toHaveBeenCalledWith(150, 0)
        expect(mockContext.lineTo).toHaveBeenCalledWith(150, 400)

        // Check horizontal line
        expect(mockContext.moveTo).toHaveBeenCalledWith(0, 250)
        expect(mockContext.lineTo).toHaveBeenCalledWith(800, 250)
      })
    })

    describe('drawDataPointHighlight', () => {
      it('should draw highlight with default styles', () => {
        drawDataPointHighlight(mockContext, 100, 200)

        expect(mockContext.save).toHaveBeenCalled()
        expect(mockContext.restore).toHaveBeenCalled()
        expect(mockContext.arc).toHaveBeenCalledTimes(3) // Glow, main, center
        expect(mockContext.fill).toHaveBeenCalledTimes(3)
      })

      it('should draw highlight with custom styles', () => {
        const customStyle = {
          radius: 8,
          color: '#ff0000',
          glowColor: '#ff000040',
          centerColor: '#000000'
        }

        drawDataPointHighlight(mockContext, 100, 200, customStyle)

        // Check glow circle
        expect(mockContext.arc).toHaveBeenCalledWith(100, 200, 10, 0, 2 * Math.PI) // radius + 2
        // Check main circle
        expect(mockContext.arc).toHaveBeenCalledWith(100, 200, 8, 0, 2 * Math.PI)
        // Check center circle
        expect(mockContext.arc).toHaveBeenCalledWith(100, 200, 7, 0, 2 * Math.PI) // radius - 1
      })
    })

    describe('isNearDataPoint', () => {
      it('should return true when within threshold', () => {
        expect(isNearDataPoint(100, 100, 105, 105, 10)).toBe(true)
        expect(isNearDataPoint(100, 100, 100, 100, 10)).toBe(true) // Same point
      })

      it('should return false when outside threshold', () => {
        expect(isNearDataPoint(100, 100, 150, 150, 10)).toBe(false)
        expect(isNearDataPoint(100, 100, 120, 120, 10)).toBe(false)
      })

      it('should use custom threshold', () => {
        expect(isNearDataPoint(100, 100, 120, 120, 50)).toBe(true)
        expect(isNearDataPoint(100, 100, 120, 120, 20)).toBe(false)
      })
    })

    describe('getTooltipPosition', () => {
      it('should position tooltip to the right by default', () => {
        const position = getTooltipPosition(100, 200, 200, 100, 1000, 600)

        expect(position.x).toBe(110) // mouseX + offset.x
        expect(position.y).toBe(190) // mouseY + offset.y
        expect(position.placement).toBe('right')
      })

      it('should position tooltip to the left when near right edge', () => {
        const position = getTooltipPosition(900, 200, 200, 100, 1000, 600)

        expect(position.x).toBe(690) // mouseX - tooltipWidth - offset.x
        expect(position.placement).toBe('left')
      })

      it('should adjust vertical position when near top edge', () => {
        const position = getTooltipPosition(100, 5, 200, 100, 1000, 600)

        expect(position.y).toBe(15) // mouseY + abs(offset.y)
        expect(position.placement).toBe('bottom')
      })

      it('should adjust vertical position when near bottom edge', () => {
        const position = getTooltipPosition(100, 580, 200, 100, 1000, 600)

        expect(position.y).toBe(470) // mouseY - tooltipHeight + offset.y
        expect(position.placement).toBe('top')
      })

      it('should handle corner cases', () => {
        const position = getTooltipPosition(900, 580, 200, 100, 1000, 600)

        expect(position.placement).toBe('left') // Prioritizes horizontal adjustment
        expect(position.x).toBe(690)
        expect(position.y).toBe(470)
      })
    })

    describe('throttle', () => {
      jest.useFakeTimers()

      it('should throttle function calls', () => {
        const mockFn = jest.fn()
        const throttledFn = throttle(mockFn, 100)

        throttledFn('arg1')
        throttledFn('arg2')
        throttledFn('arg3')

        // Should only call once immediately
        expect(mockFn).toHaveBeenCalledTimes(1)
        expect(mockFn).toHaveBeenCalledWith('arg1')

        // Fast forward time
        jest.advanceTimersByTime(100)

        // Should call with the last arguments
        expect(mockFn).toHaveBeenCalledTimes(2)
        expect(mockFn).toHaveBeenLastCalledWith('arg3')
      })

      it('should allow calls after delay period', () => {
        const mockFn = jest.fn()
        const throttledFn = throttle(mockFn, 100)

        throttledFn('arg1')
        expect(mockFn).toHaveBeenCalledTimes(1)

        jest.advanceTimersByTime(150)

        throttledFn('arg2')
        expect(mockFn).toHaveBeenCalledTimes(2)
        expect(mockFn).toHaveBeenLastCalledWith('arg2')
      })
    })

    describe('debounce', () => {
      jest.useFakeTimers()

      it('should debounce function calls', () => {
        const mockFn = jest.fn()
        const debouncedFn = debounce(mockFn, 100)

        debouncedFn('arg1')
        debouncedFn('arg2')
        debouncedFn('arg3')

        // Should not call immediately
        expect(mockFn).not.toHaveBeenCalled()

        // Fast forward time
        jest.advanceTimersByTime(100)

        // Should call once with last arguments
        expect(mockFn).toHaveBeenCalledTimes(1)
        expect(mockFn).toHaveBeenCalledWith('arg3')
      })

      it('should reset timer on subsequent calls', () => {
        const mockFn = jest.fn()
        const debouncedFn = debounce(mockFn, 100)

        debouncedFn('arg1')
        jest.advanceTimersByTime(50)

        debouncedFn('arg2')
        jest.advanceTimersByTime(50)

        // Should not have called yet
        expect(mockFn).not.toHaveBeenCalled()

        jest.advanceTimersByTime(50)

        // Should call with last arguments
        expect(mockFn).toHaveBeenCalledTimes(1)
        expect(mockFn).toHaveBeenCalledWith('arg2')
      })
    })
  })
})