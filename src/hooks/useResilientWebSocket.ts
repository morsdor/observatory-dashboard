import { useCallback, useEffect, useRef, useState } from 'react'
import { ConnectionStatus, DataPoint } from '@/types'
import { validateDataArray, DataPointSchema } from '@/types/schemas'
import { classifyError, type EnhancedError } from '@/components/dashboard/ErrorBoundary'

export interface ResilientWebSocketConfig {
  url: string
  reconnectInterval?: number
  maxReconnectAttempts?: number
  reconnectBackoffMultiplier?: number
  maxReconnectInterval?: number
  heartbeatInterval?: number
  connectionTimeout?: number
  enableOfflineMode?: boolean
  fallbackUrls?: string[]
  dataValidation?: boolean
  bufferSize?: number
}

export interface ConnectionHealth {
  latency: number
  packetsLost: number
  reconnectCount: number
  lastSuccessfulConnection: Date | null
  dataIntegrityScore: number
}

export interface ResilientWebSocketReturn {
  connectionStatus: ConnectionStatus
  connectionHealth: ConnectionHealth
  lastMessage: DataPoint[] | null
  error: EnhancedError | null
  sendMessage: (message: any) => void
  reconnect: () => void
  disconnect: () => void
  switchToOfflineMode: () => void
  clearError: () => void
  getConnectionDiagnostics: () => ConnectionDiagnostics
}

interface ConnectionDiagnostics {
  currentUrl: string
  attemptedUrls: string[]
  networkStatus: 'online' | 'offline' | 'slow'
  lastError: EnhancedError | null
  connectionDuration: number
  messagesReceived: number
  messagesLost: number
}

export function useResilientWebSocket(config: ResilientWebSocketConfig): ResilientWebSocketReturn {
  const {
    url,
    reconnectInterval = 1000,
    maxReconnectAttempts = 10,
    reconnectBackoffMultiplier = 1.5,
    maxReconnectInterval = 30000,
    heartbeatInterval = 30000,
    connectionTimeout = 10000,
    enableOfflineMode = true,
    fallbackUrls = [],
    dataValidation = true,
    bufferSize = 100000
  } = config

  const [connectionStatus, setConnectionStatus] = useState<ConnectionStatus>('disconnected')
  const [lastMessage, setLastMessage] = useState<DataPoint[] | null>(null)
  const [error, setError] = useState<EnhancedError | null>(null)
  const [connectionHealth, setConnectionHealth] = useState<ConnectionHealth>({
    latency: 0,
    packetsLost: 0,
    reconnectCount: 0,
    lastSuccessfulConnection: null,
    dataIntegrityScore: 100
  })

  // Refs for managing connection state
  const wsRef = useRef<WebSocket | null>(null)
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  const heartbeatTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  const connectionTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  const shouldReconnectRef = useRef(true)
  const currentUrlIndexRef = useRef(0)
  const reconnectAttemptsRef = useRef(0)
  const connectionStartTimeRef = useRef<Date | null>(null)
  const messagesReceivedRef = useRef(0)
  const messagesLostRef = useRef(0)
  const lastPingTimeRef = useRef<Date | null>(null)
  const offlineModeRef = useRef(false)
  const dataBufferRef = useRef<DataPoint[]>([])

  // Get all available URLs (primary + fallbacks)
  const getAllUrls = useCallback(() => [url, ...fallbackUrls], [url, fallbackUrls])

  // Clear all timeouts
  const clearAllTimeouts = useCallback(() => {
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current)
      reconnectTimeoutRef.current = null
    }
    if (heartbeatTimeoutRef.current) {
      clearTimeout(heartbeatTimeoutRef.current)
      heartbeatTimeoutRef.current = null
    }
    if (connectionTimeoutRef.current) {
      clearTimeout(connectionTimeoutRef.current)
      connectionTimeoutRef.current = null
    }
  }, [])

  // Calculate reconnect interval with exponential backoff
  const calculateReconnectInterval = useCallback((attempt: number) => {
    const interval = reconnectInterval * Math.pow(reconnectBackoffMultiplier, attempt)
    return Math.min(interval, maxReconnectInterval)
  }, [reconnectInterval, reconnectBackoffMultiplier, maxReconnectInterval])

  // Handle heartbeat/ping mechanism
  const sendHeartbeat = useCallback(() => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      lastPingTimeRef.current = new Date()
      try {
        wsRef.current.send(JSON.stringify({ type: 'ping', timestamp: Date.now() }))
      } catch (error) {
        console.warn('Failed to send heartbeat:', error)
      }
    }
  }, [])

  // Schedule next heartbeat
  const scheduleHeartbeat = useCallback(() => {
    heartbeatTimeoutRef.current = setTimeout(() => {
      sendHeartbeat()
      scheduleHeartbeat()
    }, heartbeatInterval)
  }, [sendHeartbeat, heartbeatInterval])

  // Validate and process incoming data
  const processIncomingData = useCallback((data: any) => {
    if (!dataValidation) {
      setLastMessage(Array.isArray(data) ? data : [data])
      return
    }

    try {
      if (Array.isArray(data)) {
        const { valid, invalid } = validateDataArray(DataPointSchema, data)
        
        if (invalid.length > 0) {
          console.warn(`Data validation failed for ${invalid.length} points:`, invalid)
          messagesLostRef.current += invalid.length
          
          // Update data integrity score
          const totalMessages = valid.length + invalid.length
          const integrityScore = totalMessages > 0 ? (valid.length / totalMessages) * 100 : 100
          setConnectionHealth(prev => ({
            ...prev,
            dataIntegrityScore: (prev.dataIntegrityScore + integrityScore) / 2
          }))
        }
        
        if (valid.length > 0) {
          // Add to buffer with size limit
          dataBufferRef.current = [...dataBufferRef.current, ...valid].slice(-bufferSize)
          setLastMessage(valid)
          messagesReceivedRef.current += valid.length
        }
      } else if (data.type === 'pong' && lastPingTimeRef.current) {
        // Handle pong response for latency calculation
        const latency = Date.now() - lastPingTimeRef.current.getTime()
        setConnectionHealth(prev => ({
          ...prev,
          latency: (prev.latency + latency) / 2 // Moving average
        }))
      } else {
        console.warn('Received non-array data:', data)
      }
    } catch (parseError) {
      const enhancedError = classifyError(
        parseError instanceof Error ? parseError : new Error('Data processing failed'),
        'WebSocket Data Processing'
      )
      setError(enhancedError)
      messagesLostRef.current++
    }
  }, [dataValidation, bufferSize])

  // Create WebSocket connection
  const connect = useCallback(() => {
    if (offlineModeRef.current) {
      console.log('Offline mode enabled, skipping connection')
      return
    }

    if (wsRef.current?.readyState === WebSocket.OPEN) {
      return
    }

    const urls = getAllUrls()
    const currentUrl = urls[currentUrlIndexRef.current % urls.length]
    
    setConnectionStatus('connecting')
    setError(null)
    connectionStartTimeRef.current = new Date()

    // Set connection timeout
    connectionTimeoutRef.current = setTimeout(() => {
      if (wsRef.current?.readyState === WebSocket.CONNECTING) {
        wsRef.current.close()
        const timeoutError = classifyError(
          new Error(`Connection timeout after ${connectionTimeout}ms`),
          'WebSocket Connection'
        )
        setError(timeoutError)
        setConnectionStatus('error')
      }
    }, connectionTimeout)

    try {
      const ws = new WebSocket(currentUrl)
      wsRef.current = ws

      ws.onopen = () => {
        clearAllTimeouts()
        setConnectionStatus('connected')
        setConnectionHealth(prev => ({
          ...prev,
          lastSuccessfulConnection: new Date(),
          reconnectCount: reconnectAttemptsRef.current
        }))
        reconnectAttemptsRef.current = 0
        currentUrlIndexRef.current = 0 // Reset to primary URL on success
        setError(null)
        
        // Start heartbeat
        scheduleHeartbeat()
      }

      ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data)
          processIncomingData(data)
        } catch (parseError) {
          const enhancedError = classifyError(
            parseError instanceof Error ? parseError : new Error('Failed to parse WebSocket message'),
            'WebSocket Message Parsing'
          )
          setError(enhancedError)
        }
      }

      ws.onerror = (event) => {
        console.error('WebSocket error:', event)
        const wsError = classifyError(
          new Error('WebSocket connection error'),
          'WebSocket Connection'
        )
        setError(wsError)
        setConnectionStatus('error')
      }

      ws.onclose = (event) => {
        clearAllTimeouts()
        setConnectionStatus('disconnected')
        
        if (shouldReconnectRef.current && reconnectAttemptsRef.current < maxReconnectAttempts) {
          // Try next URL if available
          if (currentUrlIndexRef.current < urls.length - 1) {
            currentUrlIndexRef.current++
            console.log(`Trying fallback URL: ${urls[currentUrlIndexRef.current]}`)
          }
          
          const nextInterval = calculateReconnectInterval(reconnectAttemptsRef.current)
          
          reconnectTimeoutRef.current = setTimeout(() => {
            reconnectAttemptsRef.current++
            connect()
          }, nextInterval)
        } else if (reconnectAttemptsRef.current >= maxReconnectAttempts) {
          const maxAttemptsError = classifyError(
            new Error(`Failed to reconnect after ${maxReconnectAttempts} attempts`),
            'WebSocket Reconnection'
          )
          setError(maxAttemptsError)
          
          if (enableOfflineMode) {
            switchToOfflineMode()
          }
        }
      }
    } catch (connectionError) {
      const enhancedError = classifyError(
        connectionError instanceof Error ? connectionError : new Error('Failed to create WebSocket connection'),
        'WebSocket Creation'
      )
      setError(enhancedError)
      setConnectionStatus('error')
    }
  }, [
    getAllUrls, 
    connectionTimeout, 
    clearAllTimeouts, 
    scheduleHeartbeat, 
    processIncomingData, 
    maxReconnectAttempts, 
    calculateReconnectInterval,
    enableOfflineMode
  ])

  // Disconnect WebSocket
  const disconnect = useCallback(() => {
    shouldReconnectRef.current = false
    offlineModeRef.current = false
    clearAllTimeouts()
    
    if (wsRef.current) {
      wsRef.current.close()
      wsRef.current = null
    }
    
    setConnectionStatus('disconnected')
    reconnectAttemptsRef.current = 0
    currentUrlIndexRef.current = 0
  }, [clearAllTimeouts])

  // Manual reconnect
  const reconnect = useCallback(() => {
    shouldReconnectRef.current = true
    offlineModeRef.current = false
    reconnectAttemptsRef.current = 0
    currentUrlIndexRef.current = 0
    clearAllTimeouts()
    
    if (wsRef.current) {
      wsRef.current.close()
    }
    
    connect()
  }, [connect, clearAllTimeouts])

  // Switch to offline mode
  const switchToOfflineMode = useCallback(() => {
    offlineModeRef.current = true
    shouldReconnectRef.current = false
    clearAllTimeouts()
    
    if (wsRef.current) {
      wsRef.current.close()
    }
    
    setConnectionStatus('disconnected')
    console.log('Switched to offline mode - using cached data')
    
    // Use cached data if available
    if (dataBufferRef.current.length > 0) {
      setLastMessage(dataBufferRef.current.slice(-1000)) // Last 1000 points
    }
  }, [clearAllTimeouts])

  // Send message with error handling
  const sendMessage = useCallback((message: any) => {
    if (offlineModeRef.current) {
      console.warn('Cannot send message in offline mode')
      return
    }

    if (wsRef.current?.readyState === WebSocket.OPEN) {
      try {
        wsRef.current.send(JSON.stringify(message))
      } catch (sendError) {
        const enhancedError = classifyError(
          sendError instanceof Error ? sendError : new Error('Failed to send WebSocket message'),
          'WebSocket Send'
        )
        setError(enhancedError)
      }
    } else {
      console.warn('WebSocket is not connected. Cannot send message.')
      const notConnectedError = classifyError(
        new Error('WebSocket is not connected'),
        'WebSocket Send'
      )
      setError(notConnectedError)
    }
  }, [])

  // Clear error
  const clearError = useCallback(() => {
    setError(null)
  }, [])

  // Get connection diagnostics
  const getConnectionDiagnostics = useCallback((): ConnectionDiagnostics => {
    const urls = getAllUrls()
    return {
      currentUrl: urls[currentUrlIndexRef.current % urls.length],
      attemptedUrls: urls.slice(0, currentUrlIndexRef.current + 1),
      networkStatus: navigator.onLine ? 'online' : 'offline',
      lastError: error,
      connectionDuration: connectionStartTimeRef.current 
        ? Date.now() - connectionStartTimeRef.current.getTime() 
        : 0,
      messagesReceived: messagesReceivedRef.current,
      messagesLost: messagesLostRef.current
    }
  }, [getAllUrls, error])

  // Initialize connection on mount
  useEffect(() => {
    shouldReconnectRef.current = true
    connect()

    // Listen for online/offline events
    const handleOnline = () => {
      console.log('Network back online, attempting to reconnect')
      if (offlineModeRef.current) {
        offlineModeRef.current = false
        reconnect()
      }
    }

    const handleOffline = () => {
      console.log('Network went offline')
      if (enableOfflineMode) {
        switchToOfflineMode()
      }
    }

    window.addEventListener('online', handleOnline)
    window.addEventListener('offline', handleOffline)

    return () => {
      shouldReconnectRef.current = false
      clearAllTimeouts()
      if (wsRef.current) {
        wsRef.current.close()
      }
      window.removeEventListener('online', handleOnline)
      window.removeEventListener('offline', handleOffline)
    }
  }, [connect, reconnect, switchToOfflineMode, clearAllTimeouts, enableOfflineMode])

  return {
    connectionStatus,
    connectionHealth,
    lastMessage,
    error,
    sendMessage,
    reconnect,
    disconnect,
    switchToOfflineMode,
    clearError,
    getConnectionDiagnostics
  }
}