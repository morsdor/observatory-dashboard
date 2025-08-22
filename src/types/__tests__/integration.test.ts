import { generateHistoricalData, generateTestData, validateGeneratedData } from '../../utils/mockDataGenerator'
import { DataPointSchema, FilterConditionSchema, FilterCriteriaSchema } from '../schemas'
import type { DataPoint, FilterCondition, FilterCriteria } from '../index'

describe('Data Models Integration Tests', () => {
    describe('Mock Data Generator Integration', () => {
        it('should generate data that passes schema validation', () => {
            const dataPoints = generateHistoricalData(100, {
                categories: ['cpu', 'memory'],
                sources: ['server-1', 'server-2']
            })

            // All generated data should be valid
            dataPoints.forEach(point => {
                expect(() => DataPointSchema.parse(point)).not.toThrow()
            })

            // Validate using our validation utility
            const result = validateGeneratedData(dataPoints)
            expect(result.valid).toHaveLength(dataPoints.length)
            expect(result.invalid).toHaveLength(0)
        })

        it('should generate realistic data for different patterns', () => {
            const patterns = ['spike', 'gradual', 'stable', 'noisy'] as const

            patterns.forEach(pattern => {
                const data = generateTestData(pattern, 50)

                // All data should be valid
                data.forEach(point => {
                    expect(() => DataPointSchema.parse(point)).not.toThrow()
                })

                // Should have expected structure
                expect(data).toHaveLength(50)
                expect(data[0].category).toBe('test')
                expect(data[0].source).toBe('test-source')
            })
        })

        it('should generate data with proper metadata structure', () => {
            const dataPoints = generateHistoricalData(10, {
                categories: ['cpu', 'memory', 'network', 'disk', 'temperature'],
                sources: ['server-1']
            })

            dataPoints.forEach(point => {
                // Validate the point structure
                expect(() => DataPointSchema.parse(point)).not.toThrow()

                // Check metadata has expected fields
                expect(point.metadata).toHaveProperty('unit')
                expect(point.metadata).toHaveProperty('threshold')
                expect(point.metadata).toHaveProperty('status')

                // Check category-specific metadata
                switch (point.category) {
                    case 'cpu':
                        expect(point.metadata).toHaveProperty('cores')
                        expect(point.metadata).toHaveProperty('frequency')
                        break
                    case 'memory':
                        expect(point.metadata).toHaveProperty('total')
                        expect(point.metadata).toHaveProperty('available')
                        break
                    case 'network':
                        expect(point.metadata).toHaveProperty('interface')
                        expect(point.metadata).toHaveProperty('protocol')
                        break
                    case 'disk':
                        expect(point.metadata).toHaveProperty('filesystem')
                        expect(point.metadata).toHaveProperty('mountPoint')
                        break
                    case 'temperature':
                        expect(point.metadata).toHaveProperty('sensor')
                        expect(point.metadata).toHaveProperty('location')
                        break
                }
            })
        })
    })

    describe('Filter Schema Integration', () => {
        it('should validate complex filter criteria', () => {
            const filterCriteria: FilterCriteria = {
                conditions: [
                    {
                        id: 'filter-1',
                        field: 'value',
                        operator: 'gt',
                        value: 50,
                        logicalOperator: 'AND'
                    },
                    {
                        id: 'filter-2',
                        field: 'category',
                        operator: 'eq',
                        value: 'cpu'
                    }
                ],
                grouping: [
                    {
                        id: 'group-1',
                        conditions: [
                            {
                                id: 'filter-3',
                                field: 'source',
                                operator: 'contains',
                                value: 'server'
                            }
                        ],
                        logicalOperator: 'OR'
                    }
                ],
                sortBy: {
                    field: 'timestamp',
                    direction: 'desc'
                }
            }

            expect(() => FilterCriteriaSchema.parse(filterCriteria)).not.toThrow()
        })

        it('should validate individual filter conditions', () => {
            const conditions: FilterCondition[] = [
                {
                    id: 'numeric-filter',
                    field: 'value',
                    operator: 'between',
                    value: [10, 90]
                },
                {
                    id: 'text-filter',
                    field: 'category',
                    operator: 'in',
                    value: ['cpu', 'memory', 'disk']
                },
                {
                    id: 'string-filter',
                    field: 'source',
                    operator: 'contains',
                    value: 'server',
                    logicalOperator: 'AND'
                }
            ]

            conditions.forEach(condition => {
                expect(() => FilterConditionSchema.parse(condition)).not.toThrow()
            })
        })
    })

    describe('Data Type Consistency', () => {
        it('should maintain type consistency across generated data', () => {
            const data = generateHistoricalData(50, {
                categories: ['cpu'],
                sources: ['server-1']
            })

            data.forEach(point => {
                // Type checks
                expect(typeof point.id).toBe('string')
                expect(point.timestamp).toBeInstanceOf(Date)
                expect(typeof point.value).toBe('number')
                expect(typeof point.category).toBe('string')
                expect(typeof point.source).toBe('string')
                expect(typeof point.metadata).toBe('object')

                // Value constraints
                expect(point.id.length).toBeGreaterThan(0)
                expect(point.category.length).toBeGreaterThan(0)
                expect(point.source.length).toBeGreaterThan(0)
                expect(Number.isFinite(point.value)).toBe(true)
                expect(point.timestamp.getTime()).not.toBeNaN()
            })
        })

        it('should generate timestamps in chronological order', () => {
            const data = generateHistoricalData(20, {
                categories: ['cpu'],
                sources: ['server-1']
            })

            for (let i = 1; i < data.length; i++) {
                expect(data[i].timestamp.getTime()).toBeGreaterThanOrEqual(
                    data[i - 1].timestamp.getTime()
                )
            }
        })

        it('should generate unique IDs for all data points', () => {
            const data = generateHistoricalData(100, {
                categories: ['cpu', 'memory'],
                sources: ['server-1', 'server-2']
            })

            const ids = new Set(data.map(point => point.id))
            expect(ids.size).toBe(data.length)
        })
    })

    describe('Performance Validation', () => {
        it('should handle large dataset generation efficiently', () => {
            const startTime = Date.now()

            const data = generateHistoricalData(500, {
                categories: ['cpu', 'memory'],
                sources: ['server-1']
            })

            const endTime = Date.now()
            const executionTime = endTime - startTime

            // Should complete within reasonable time
            expect(executionTime).toBeLessThan(2000) // 2 seconds
            // Should generate 500 * 2 categories * 1 source = 1000 points
            expect(data).toHaveLength(1000)

            // All data should be valid
            const validationResult = validateGeneratedData(data)
            expect(validationResult.valid).toHaveLength(1000)
            expect(validationResult.invalid).toHaveLength(0)
        })

        it('should validate large datasets efficiently', () => {
            const data = generateHistoricalData(500, {
                categories: ['cpu'],
                sources: ['server-1']
            })

            const startTime = Date.now()
            const result = validateGeneratedData(data)
            const endTime = Date.now()

            const validationTime = endTime - startTime

            // Validation should be fast
            expect(validationTime).toBeLessThan(1000) // 1 second
            expect(result.valid).toHaveLength(500)
            expect(result.summary.categories.has('cpu')).toBe(true)
            expect(result.summary.sources.has('server-1')).toBe(true)
        })
    })
})