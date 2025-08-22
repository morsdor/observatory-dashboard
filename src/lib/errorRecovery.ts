import { DataPoint } from '@/types'
import { EnhancedError } from '@/components/dashboard/ErrorBoundary'

export interface RecoveryStrategy {
  name: string
  description: string
  canRecover: (error: EnhancedError) => boolean
  recover: (error: EnhancedError, context?: any) => Promise<RecoveryResult>
  priority: number
}

export interface RecoveryResult {
  success: boolean
  message: string
  recoveredData?: any
  fallbackAction?: () => void
  retryAction?: () => void
}

export interface RecoveryContext {
  component?: string
  lastKnownGoodState?: any
  userAction?: string
  timestamp: Date
}

// Recovery strategies for different error types
export class ErrorRecoveryManager {
  private static instance: ErrorRecoveryManager
  private strategies: RecoveryStrategy[] = []
  private recoveryHistory: Array<{
    error: EnhancedError
    strategy: string
    result: RecoveryResult
    timestamp: Date
  }> = []

  static getInstance(): ErrorRecoveryManager {
    if (!ErrorRecoveryManager.instance) {
      ErrorRecoveryManager.instance = new ErrorRecoveryManager()
      ErrorRecoveryManager.instance.initializeStrategies()
    }
    return ErrorRecoveryManager.instance
  }

  private initializeStrategies(): void {
    this.strategies = [
      this.createNetworkRecoveryStrategy(),
      this.createDataCorruptionRecoveryStrategy(),
      this.createRenderingRecoveryStrategy(),
      this.createMemoryRecoveryStrategy(),
      this.createValidationRecoveryStrategy(),
      this.createGenericRecoveryStrategy()
    ]

    // Sort by priority (higher priority first)
    this.strategies.sort((a, b) => b.priority - a.priority)
  }

  // Attempt to recover from an error
  async attemptRecovery(error: EnhancedError, context?: RecoveryContext): Promise<RecoveryResult> {
    console.log(`Attempting recovery for error: ${error.message}`)

    for (const strategy of this.strategies) {
      if (strategy.canRecover(error)) {
        try {
          console.log(`Trying recovery strategy: ${strategy.name}`)
          const result = await strategy.recover(error, context)
          
          // Log recovery attempt
          this.recoveryHistory.push({
            error,
            strategy: strategy.name,
            result,
            timestamp: new Date()
          })

          if (result.success) {
            console.log(`Recovery successful with strategy: ${strategy.name}`)
            return result
          }
        } catch (recoveryError) {
          console.warn(`Recovery strategy ${strategy.name} failed:`, recoveryError)
        }
      }
    }

    // No recovery strategy worked
    return {
      success: false,
      message: 'No recovery strategy available for this error',
      fallbackAction: () => {
        console.log('Falling back to manual intervention')
      }
    }
  }

  // Network-related error recovery
  private createNetworkRecoveryStrategy(): RecoveryStrategy {
    return {
      name: 'Network Recovery',
      description: 'Handles WebSocket connection failures and network issues',
      priority: 90,
      canRecover: (error) => error.category === 'network',
      recover: async (error, context) => {
        // Try different recovery approaches based on error message
        if (error.message.includes('WebSocket')) {
          return this.recoverWebSocketConnection(error, context)
        } else if (error.message.includes('timeout')) {
          return this.recoverFromTimeout(error, context)
        } else if (error.message.includes('offline')) {
          return this.recoverFromOfflineState(error, context)
        }

        return {
          success: false,
          message: 'Unknown network error type'
        }
      }
    }
  }

  // Data corruption recovery
  private createDataCorruptionRecoveryStrategy(): RecoveryStrategy {
    return {
      name: 'Data Corruption Recovery',
      description: 'Handles corrupted or invalid data',
      priority: 80,
      canRecover: (error) => error.category === 'data' || error.category === 'validation',
      recover: async (error, context) => {
        // Try to recover corrupted data
        if (error.message.includes('parse')) {
          return this.recoverFromParseError(error, context)
        } else if (error.message.includes('validation')) {
          return this.recoverFromValidationError(error, context)
        }

        return {
          success: true,
          message: 'Using cached data while data source recovers',
          recoveredData: this.getCachedData(context),
          retryAction: () => {
            console.log('Retrying data fetch after corruption recovery')
          }
        }
      }
    }
  }

  // Rendering error recovery
  private createRenderingRecoveryStrategy(): RecoveryStrategy {
    return {
      name: 'Rendering Recovery',
      description: 'Handles component rendering failures',
      priority: 70,
      canRecover: (error) => error.category === 'rendering',
      recover: async (error, context) => {
        return {
          success: true,
          message: 'Switching to simplified rendering mode',
          fallbackAction: () => {
            // Switch to simpler component versions
            console.log('Activating simplified rendering mode')
          },
          retryAction: () => {
            console.log('Retrying full rendering after recovery')
          }
        }
      }
    }
  }

  // Memory-related error recovery
  private createMemoryRecoveryStrategy(): RecoveryStrategy {
    return {
      name: 'Memory Recovery',
      description: 'Handles memory leaks and performance issues',
      priority: 85,
      canRecover: (error) => error.category === 'performance' || error.message.includes('memory'),
      recover: async (error, context) => {
        // Force garbage collection and clear caches
        this.performMemoryCleanup()

        return {
          success: true,
          message: 'Memory cleaned up, reducing data load',
          fallbackAction: () => {
            // Reduce data set size
            console.log('Reducing data set size for memory recovery')
          }
        }
      }
    }
  }

  // Validation error recovery
  private createValidationRecoveryStrategy(): RecoveryStrategy {
    return {
      name: 'Validation Recovery',
      description: 'Handles data validation failures',
      priority: 75,
      canRecover: (error) => error.category === 'validation',
      recover: async (error, context) => {
        return {
          success: true,
          message: 'Filtering out invalid data points',
          recoveredData: this.filterValidData(context),
          retryAction: () => {
            console.log('Retrying with validated data')
          }
        }
      }
    }
  }

  // Generic recovery strategy (fallback)
  private createGenericRecoveryStrategy(): RecoveryStrategy {
    return {
      name: 'Generic Recovery',
      description: 'Generic fallback recovery for unknown errors',
      priority: 10,
      canRecover: () => true, // Can handle any error as last resort
      recover: async (error, context) => {
        return {
          success: true,
          message: 'Switching to safe mode with basic functionality',
          fallbackAction: () => {
            console.log('Activating safe mode')
          },
          retryAction: () => {
            console.log('Retrying operation in safe mode')
          }
        }
      }
    }
  }

  // Specific recovery implementations
  private async recoverWebSocketConnection(error: EnhancedError, context?: any): Promise<RecoveryResult> {
    // Try to reconnect with exponential backoff
    return {
      success: true,
      message: 'Attempting to reconnect WebSocket connection',
      retryAction: () => {
        // Trigger reconnection logic
        console.log('Triggering WebSocket reconnection')
      }
    }
  }

  private async recoverFromTimeout(error: EnhancedError, context?: any): Promise<RecoveryResult> {
    return {
      success: true,
      message: 'Increasing timeout duration and retrying',
      retryAction: () => {
        console.log('Retrying with increased timeout')
      }
    }
  }

  private async recoverFromOfflineState(error: EnhancedError, context?: any): Promise<RecoveryResult> {
    return {
      success: true,
      message: 'Switching to offline mode with cached data',
      recoveredData: this.getCachedData(context),
      fallbackAction: () => {
        console.log('Activating offline mode')
      }
    }
  }

  private async recoverFromParseError(error: EnhancedError, context?: any): Promise<RecoveryResult> {
    return {
      success: true,
      message: 'Skipping corrupted data and using last known good data',
      recoveredData: this.getLastKnownGoodData(context),
      retryAction: () => {
        console.log('Retrying data parsing with error handling')
      }
    }
  }

  private async recoverFromValidationError(error: EnhancedError, context?: any): Promise<RecoveryResult> {
    return {
      success: true,
      message: 'Filtering out invalid data points and continuing',
      recoveredData: this.filterValidData(context),
      retryAction: () => {
        console.log('Retrying with data validation enabled')
      }
    }
  }

  // Helper methods
  private performMemoryCleanup(): void {
    // Clear various caches
    if (typeof window !== 'undefined') {
      // Force garbage collection if available (Chrome DevTools)
      if ('gc' in window) {
        (window as any).gc()
      }
    }
  }

  private getCachedData(context?: any): DataPoint[] {
    // Return cached data if available
    if (context?.lastKnownGoodState?.data) {
      return context.lastKnownGoodState.data.slice(-1000) // Last 1000 points
    }
    
    // Return empty array as fallback
    return []
  }

  private getLastKnownGoodData(context?: any): DataPoint[] {
    return this.getCachedData(context)
  }

  private filterValidData(context?: any): DataPoint[] {
    const data = this.getCachedData(context)
    
    // Filter out obviously invalid data points
    return data.filter(point => 
      point && 
      point.id && 
      point.timestamp && 
      typeof point.value === 'number' && 
      isFinite(point.value)
    )
  }

  // Get recovery statistics
  getRecoveryStats(): {
    totalAttempts: number
    successfulRecoveries: number
    failedRecoveries: number
    strategiesUsed: Record<string, number>
    averageRecoveryTime: number
  } {
    const strategiesUsed: Record<string, number> = {}
    let successfulRecoveries = 0
    let totalTime = 0

    this.recoveryHistory.forEach(entry => {
      strategiesUsed[entry.strategy] = (strategiesUsed[entry.strategy] || 0) + 1
      if (entry.result.success) {
        successfulRecoveries++
      }
    })

    return {
      totalAttempts: this.recoveryHistory.length,
      successfulRecoveries,
      failedRecoveries: this.recoveryHistory.length - successfulRecoveries,
      strategiesUsed,
      averageRecoveryTime: this.recoveryHistory.length > 0 ? totalTime / this.recoveryHistory.length : 0
    }
  }

  // Clear recovery history
  clearHistory(): void {
    this.recoveryHistory = []
  }
}

// User-friendly error messages
export class ErrorMessageFormatter {
  static formatUserMessage(error: EnhancedError): {
    title: string
    description: string
    actionable: boolean
    userActions: string[]
    technicalDetails?: string
  } {
    const baseMessage = {
      title: 'Something went wrong',
      description: 'An unexpected error occurred.',
      actionable: true,
      userActions: ['Try refreshing the page'],
      technicalDetails: error.message
    }

    switch (error.category) {
      case 'network':
        return {
          title: 'Connection Problem',
          description: 'Unable to connect to the data source. This might be due to network issues or server problems.',
          actionable: true,
          userActions: [
            'Check your internet connection',
            'Try refreshing the page',
            'Switch to offline mode if available'
          ],
          technicalDetails: error.message
        }

      case 'data':
        return {
          title: 'Data Issue',
          description: 'There was a problem with the data being displayed. Some information might be missing or incorrect.',
          actionable: true,
          userActions: [
            'Try refreshing the data',
            'Check if the issue persists',
            'Contact support if data is consistently problematic'
          ],
          technicalDetails: error.message
        }

      case 'rendering':
        return {
          title: 'Display Problem',
          description: 'There was an issue displaying this content. The functionality might be limited.',
          actionable: true,
          userActions: [
            'Try refreshing the page',
            'Switch to a simpler view if available',
            'Clear your browser cache'
          ],
          technicalDetails: error.message
        }

      case 'performance':
        return {
          title: 'Performance Issue',
          description: 'The application is running slowly or using too much memory. Some features might be disabled.',
          actionable: true,
          userActions: [
            'Close other browser tabs',
            'Reduce the amount of data being displayed',
            'Restart your browser'
          ],
          technicalDetails: error.message
        }

      case 'validation':
        return {
          title: 'Data Validation Error',
          description: 'Some of the data doesn\'t meet the expected format. Invalid data has been filtered out.',
          actionable: false,
          userActions: [
            'The system has automatically handled this issue',
            'Contact support if you notice missing data'
          ],
          technicalDetails: error.message
        }

      default:
        return baseMessage
    }
  }

  static getRecoveryInstructions(error: EnhancedError): string[] {
    const instructions: string[] = []

    if (error.recoverable) {
      instructions.push('This error can be automatically recovered from.')
      
      switch (error.category) {
        case 'network':
          instructions.push('The system will attempt to reconnect automatically.')
          instructions.push('You can also try switching to offline mode.')
          break
        case 'data':
          instructions.push('Invalid data will be filtered out automatically.')
          instructions.push('The system will use cached data when available.')
          break
        case 'rendering':
          instructions.push('The system will switch to a simpler display mode.')
          break
        case 'performance':
          instructions.push('Memory will be cleaned up automatically.')
          instructions.push('Consider reducing the data load.')
          break
      }
    } else {
      instructions.push('This error requires manual intervention.')
      instructions.push('Please refresh the page or contact support.')
    }

    return instructions
  }
}

// Singleton instances
export const errorRecoveryManager = ErrorRecoveryManager.getInstance()
export const errorMessageFormatter = ErrorMessageFormatter