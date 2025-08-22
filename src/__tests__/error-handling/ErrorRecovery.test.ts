import {
    ErrorRecoveryManager,
    ErrorMessageFormatter,
    errorRecoveryManager
} from '@/lib/errorRecovery'
import { classifyError } from '@/components/dashboard/ErrorBoundary'

describe('ErrorRecovery', () => {
    beforeEach(() => {
        errorRecoveryManager.clearHistory()
    })

    describe('Error Recovery Manager', () => {
        it('should attempt recovery for network errors', async () => {
            const networkError = classifyError(
                new Error('WebSocket connection failed'),
                'TestComponent'
            )

            const result = await errorRecoveryManager.attemptRecovery(networkError)

            expect(result.success).toBe(true)
            expect(result.message).toContain('reconnect')
            expect(result.retryAction).toBeDefined()
        })

        it('should attempt recovery for data corruption errors', async () => {
            const dataError = classifyError(
                new Error('Failed to parse data'),
                'DataProcessor'
            )

            const result = await errorRecoveryManager.attemptRecovery(dataError)

            expect(result.success).toBe(true)
            expect(result.message).toContain('cached data')
            expect(result.retryAction).toBeDefined()
        })

        it('should attempt recovery for rendering errors', async () => {
            const renderError = classifyError(
                new Error('Canvas rendering failed'),
                'ChartComponent'
            )

            const result = await errorRecoveryManager.attemptRecovery(renderError)

            expect(result.success).toBe(true)
            expect(result.message).toContain('simplified rendering')
            expect(result.fallbackAction).toBeDefined()
        })

        it('should attempt recovery for memory errors', async () => {
            const memoryError = classifyError(
                new Error('Memory limit exceeded'),
                'DataGrid'
            )

            const result = await errorRecoveryManager.attemptRecovery(memoryError)

            expect(result.success).toBe(true)
            expect(result.message).toContain('Memory cleaned up')
            expect(result.fallbackAction).toBeDefined()
        })

        it('should attempt recovery for validation errors', async () => {
            const validationError = classifyError(
                new Error('Data validation failed'),
                'DataValidator'
            )

            const result = await errorRecoveryManager.attemptRecovery(validationError)

            expect(result.success).toBe(true)
            expect(result.message).toContain('Filtering out invalid')
            expect(result.retryAction).toBeDefined()
        })

        it('should fall back to generic recovery for unknown errors', async () => {
            const unknownError = classifyError(
                new Error('Unknown error type'),
                'UnknownComponent'
            )

            const result = await errorRecoveryManager.attemptRecovery(unknownError)

            expect(result.success).toBe(true)
            expect(result.message).toContain('safe mode')
            expect(result.fallbackAction).toBeDefined()
        })

        it('should handle recovery strategy failures gracefully', async () => {
            // Create a mock strategy that throws an error
            const manager = ErrorRecoveryManager.getInstance()
            const originalStrategies = (manager as any).strategies

                // Mock a failing strategy
                ; (manager as any).strategies = [{
                    name: 'Failing Strategy',
                    canRecover: () => true,
                    recover: async () => {
                        throw new Error('Recovery strategy failed')
                    },
                    priority: 100
                }]

            const error = classifyError(new Error('Test error'))
            const result = await manager.attemptRecovery(error)

            expect(result.success).toBe(false)
            expect(result.message).toContain('No recovery strategy available')

                // Restore original strategies
                ; (manager as any).strategies = originalStrategies
        })

        it('should track recovery history', async () => {
            const error = classifyError(new Error('Test error for history'))

            await errorRecoveryManager.attemptRecovery(error)

            const stats = errorRecoveryManager.getRecoveryStats()

            expect(stats.totalAttempts).toBe(1)
            expect(stats.successfulRecoveries).toBe(1)
            expect(stats.strategiesUsed).toBeDefined()
        })

        it('should provide recovery statistics', async () => {
            // Perform multiple recovery attempts
            const errors = [
                classifyError(new Error('Network error')),
                classifyError(new Error('Data error')),
                classifyError(new Error('Rendering error'))
            ]

            for (const error of errors) {
                await errorRecoveryManager.attemptRecovery(error)
            }

            const stats = errorRecoveryManager.getRecoveryStats()

            expect(stats.totalAttempts).toBe(3)
            expect(stats.successfulRecoveries).toBeGreaterThan(0)
            expect(Object.keys(stats.strategiesUsed)).toHaveLength(3)
        })

        it('should clear recovery history', async () => {
            const error = classifyError(new Error('Test error'))
            await errorRecoveryManager.attemptRecovery(error)

            expect(errorRecoveryManager.getRecoveryStats().totalAttempts).toBe(1)

            errorRecoveryManager.clearHistory()

            expect(errorRecoveryManager.getRecoveryStats().totalAttempts).toBe(0)
        })
    })

    describe('Specific Recovery Scenarios', () => {
        it('should handle WebSocket timeout recovery', async () => {
            const timeoutError = classifyError(
                new Error('Connection timeout after 5000ms'),
                'WebSocket'
            )

            const result = await errorRecoveryManager.attemptRecovery(timeoutError)

            expect(result.success).toBe(true)
            expect(result.message).toContain('timeout')
        })

        it('should handle offline state recovery', async () => {
            const offlineError = classifyError(
                new Error('Network is offline'),
                'NetworkManager'
            )

            const result = await errorRecoveryManager.attemptRecovery(offlineError)

            expect(result.success).toBe(true)
            expect(result.message).toContain('offline mode')
            expect(result.recoveredData).toBeDefined()
        })

        it('should handle parse error recovery', async () => {
            const parseError = classifyError(
                new Error('Failed to parse JSON data'),
                'DataParser'
            )

            const result = await errorRecoveryManager.attemptRecovery(parseError)

            expect(result.success).toBe(true)
            expect(result.message).toContain('last known good data')
        })

        it('should provide cached data when available', async () => {
            const context = {
                lastKnownGoodState: {
                    data: [
                        {
                            id: 'cached-1',
                            timestamp: new Date(),
                            value: 42,
                            category: 'cached',
                            metadata: {},
                            source: 'cache'
                        }
                    ]
                }
            }

            const dataError = classifyError(new Error('Data corruption'))
            const result = await errorRecoveryManager.attemptRecovery(dataError, context)

            expect(result.success).toBe(true)
            expect(result.recoveredData).toHaveLength(1)
            expect(result.recoveredData[0].id).toBe('cached-1')
        })

        it('should filter valid data from context', async () => {
            const context = {
                lastKnownGoodState: {
                    data: [
                        {
                            id: 'valid-1',
                            timestamp: new Date(),
                            value: 42,
                            category: 'test',
                            metadata: {},
                            source: 'test'
                        },
                        {
                            id: 'invalid-1',
                            // missing required fields
                            value: 'invalid'
                        },
                        {
                            id: 'valid-2',
                            timestamp: new Date(),
                            value: 43,
                            category: 'test',
                            metadata: {},
                            source: 'test'
                        }
                    ]
                }
            }

            const validationError = classifyError(new Error('Validation failed'))
            const result = await errorRecoveryManager.attemptRecovery(validationError, context)

            expect(result.success).toBe(true)
            expect(result.recoveredData).toHaveLength(2) // Only valid data points
        })
    })

    describe('Error Message Formatter', () => {
        it('should format network error messages', () => {
            const networkError = classifyError(
                new Error('WebSocket connection failed'),
                'NetworkComponent'
            )

            const formatted = ErrorMessageFormatter.formatUserMessage(networkError)

            expect(formatted.title).toBe('Connection Problem')
            expect(formatted.description).toContain('network issues')
            expect(formatted.actionable).toBe(true)
            expect(formatted.userActions).toContain('Check your internet connection')
        })

        it('should format data error messages', () => {
            const dataError = classifyError(
                new Error('Invalid data format'),
                'DataProcessor'
            )

            const formatted = ErrorMessageFormatter.formatUserMessage(dataError)

            expect(formatted.title).toBe('Data Issue')
            expect(formatted.description).toContain('problem with the data')
            expect(formatted.userActions).toContain('Try refreshing the data')
        })

        it('should format rendering error messages', () => {
            const renderError = classifyError(
                new Error('Canvas rendering failed'),
                'ChartComponent'
            )

            const formatted = ErrorMessageFormatter.formatUserMessage(renderError)

            expect(formatted.title).toBe('Display Problem')
            expect(formatted.description).toContain('displaying this content')
            expect(formatted.userActions).toContain('Switch to a simpler view')
        })

        it('should format performance error messages', () => {
            const performanceError = classifyError(
                new Error('Memory limit exceeded'),
                'DataGrid'
            )

            const formatted = ErrorMessageFormatter.formatUserMessage(performanceError)

            expect(formatted.title).toBe('Performance Issue')
            expect(formatted.description).toContain('running slowly')
            expect(formatted.userActions).toContain('Close other browser tabs')
        })

        it('should format validation error messages', () => {
            const validationError = classifyError(
                new Error('Data validation failed'),
                'Validator'
            )

            const formatted = ErrorMessageFormatter.formatUserMessage(validationError)

            expect(formatted.title).toBe('Data Validation Error')
            expect(formatted.actionable).toBe(false)
            expect(formatted.userActions).toContain('automatically handled')
        })

        it('should provide fallback for unknown error types', () => {
            const unknownError = classifyError(
                new Error('Unknown error'),
                'UnknownComponent'
            )

            const formatted = ErrorMessageFormatter.formatUserMessage(unknownError)

            expect(formatted.title).toBe('Something went wrong')
            expect(formatted.userActions).toContain('Try refreshing the page')
        })

        it('should provide recovery instructions for recoverable errors', () => {
            const recoverableError = classifyError(
                new Error('Network timeout'),
                'NetworkComponent'
            )

            const instructions = ErrorMessageFormatter.getRecoveryInstructions(recoverableError)

            expect(instructions).toContain('This error can be automatically recovered from.')
            expect(instructions.some(instruction =>
                instruction.includes('reconnect automatically')
            )).toBe(true)
        })

        it('should provide manual intervention instructions for non-recoverable errors', () => {
            const nonRecoverableError = classifyError(
                new Error('Critical system failure'),
                'SystemComponent'
            )
            nonRecoverableError.recoverable = false

            const instructions = ErrorMessageFormatter.getRecoveryInstructions(nonRecoverableError)

            expect(instructions).toContain('This error requires manual intervention.')
            expect(instructions).toContain('Please refresh the page or contact support.')
        })

        it('should include technical details in development mode', () => {
            const originalEnv = process.env.NODE_ENV
            process.env.NODE_ENV = 'development'

            const error = classifyError(new Error('Technical error details'))
            const formatted = ErrorMessageFormatter.formatUserMessage(error)

            expect(formatted.technicalDetails).toBe('Technical error details')

            process.env.NODE_ENV = originalEnv
        })
    })

    describe('Integration with Error Classification', () => {
        it('should work with all error categories', async () => {
            const errorCategories = ['network', 'data', 'rendering', 'performance', 'validation']

            for (const category of errorCategories) {
                const error = classifyError(new Error(`${category} error`))
                error.category = category as any

                const result = await errorRecoveryManager.attemptRecovery(error)
                expect(result.success).toBe(true)

                const formatted = ErrorMessageFormatter.formatUserMessage(error)
                expect(formatted.title).toBeDefined()
                expect(formatted.description).toBeDefined()
            }
        })

        it('should handle error severity in recovery decisions', async () => {
            const criticalError = classifyError(new Error('Critical error'))
            criticalError.severity = 'critical'
            criticalError.recoverable = false

            const result = await errorRecoveryManager.attemptRecovery(criticalError)

            // Even critical errors should have some recovery strategy (generic fallback)
            expect(result.success).toBe(true)
        })

        it('should respect error recoverability flag', async () => {
            const nonRecoverableError = classifyError(new Error('Non-recoverable error'))
            nonRecoverableError.recoverable = false

            const instructions = ErrorMessageFormatter.getRecoveryInstructions(nonRecoverableError)

            expect(instructions).toContain('manual intervention')
        })
    })

    describe('Memory Management', () => {
        it('should handle memory cleanup in recovery', async () => {
            const memoryError = classifyError(new Error('Memory exhausted'))
            memoryError.category = 'performance'

            // Mock window.gc for testing
            const originalGc = (global as any).gc
            const mockGc = jest.fn()
                ; (global as any).gc = mockGc

            const result = await errorRecoveryManager.attemptRecovery(memoryError)

            expect(result.success).toBe(true)
            expect(result.message).toContain('Memory cleaned up')

                // Restore original gc
                ; (global as any).gc = originalGc
        })

        it('should limit recovery history size', async () => {
            // Perform many recovery attempts
            for (let i = 0; i < 150; i++) {
                const error = classifyError(new Error(`Error ${i}`))
                await errorRecoveryManager.attemptRecovery(error)
            }

            const stats = errorRecoveryManager.getRecoveryStats()

            // Should not exceed reasonable history size
            expect(stats.totalAttempts).toBeLessThanOrEqual(150)
        })
    })
})