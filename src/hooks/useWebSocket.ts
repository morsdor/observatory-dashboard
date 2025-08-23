import { useCallback, useEffect, useRef, useState } from 'react'
import { ConnectionStatus, DataPoint } from '@/types'
import { validateDataArray, DataPointSchema } from '@/types/schemas'

export interface WebSocketConfig {
  url: string
  reconnectInterval?: number
  maxReconnectAttempts?: number
  reconnectBackoffMultiplier?: number
  maxReconnectInterval?: number
}

export interface WebSocketHookReturn {
  connectionStatus: ConnectionStatus
  lastMessage: DataPoint[] | null
  sendMessage: (message: any) => void
  reconnect: () => void
  disconnect: () => void
  error: string | null
  reconnectAttempts: number
}

export function useWebSocket(config: WebSocketConfig): WebSocketHookReturn {
  const {
    url,
    reconnectInterval = 1000,
    maxReconnectAttempts = 10,
    reconnectBackoffMultiplier = 1.5,
    maxReconnectInterval = 30000
  } = config

  const [connectionStatus, setConnectionStatus] = useState<ConnectionStatus>('disconnected')
  const [lastMessage, setLastMessage] = useState<DataPoint[] | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [reconnectAttempts, setReconnectAttempts] = useState(0)

  const wsRef = useRef<WebSocket | null>(null)
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  const shouldReconnectRef = useRef(true)
  const currentReconnectIntervalRef = useRef(reconnectInterval)

  const clearReconnectTimeout = useCallback(() => {
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current)
      reconnectTimeoutRef.current = null
    }
  }, [])

  const calculateReconnectInterval = useCallback((attempt: number) => {
    const interval = reconnectInterval * Math.pow(reconnectBackoffMultiplier, attempt)
    return Math.min(interval, maxReconnectInterval)
  }, [reconnectInterval, reconnectBackoffMultiplier, maxReconnectInterval])

  const connect = useCallback(() => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      return
    }

    setConnectionStatus('connecting')
    setError(null)

    try {
      const ws = new WebSocket(url)
      wsRef.current = ws

      ws.onopen = () => {
        setConnectionStatus('connected')
        setReconnectAttempts(0)
        currentReconnectIntervalRef.current = reconnectInterval
        setError(null)
      }

      ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data)
          
          // Validate incoming data
          if (Array.isArray(data)) {
            // Convert Date objects to ISO strings for validation
            const normalizedData = data.map(item => ({
              ...item,
              timestamp: item.timestamp instanceof Date ? item.timestamp.toISOString() : item.timestamp
            }))
            
            const { valid, invalid } = validateDataArray(DataPointSchema, normalizedData)
            
            if (invalid.length > 0) {
              console.warn('Invalid data points received:', invalid)
            }
            
            if (valid.length > 0) {
              // Convert timestamp strings back to Date objects for internal use
              const processedData = valid.map(item => ({
                ...item,
                timestamp: new Date(item.timestamp),
                metadata: item.metadata || {}
              }))
              setLastMessage(processedData as DataPoint[])
            }
          } else {
            console.warn('Received non-array data:', data)
          }
        } catch (parseError) {
          console.error('Failed to parse WebSocket message:', parseError)
          setError('Failed to parse incoming data')
        }
      }

      ws.onerror = (event) => {
        console.error('WebSocket error:', event)
        setError('WebSocket connection error')
        setConnectionStatus('error')
      }

      ws.onclose = (event) => {
        setConnectionStatus('disconnected')
        
        if (shouldReconnectRef.current && reconnectAttempts < maxReconnectAttempts) {
          const nextInterval = calculateReconnectInterval(reconnectAttempts)
          currentReconnectIntervalRef.current = nextInterval
          
          reconnectTimeoutRef.current = setTimeout(() => {
            setReconnectAttempts(prev => prev + 1)
            connect()
          }, nextInterval)
        } else if (reconnectAttempts >= maxReconnectAttempts) {
          setError(`Failed to reconnect after ${maxReconnectAttempts} attempts`)
        }
      }
    } catch (connectionError) {
      console.error('Failed to create WebSocket connection:', connectionError)
      setError('Failed to create WebSocket connection')
      setConnectionStatus('error')
    }
  }, [url, reconnectAttempts, maxReconnectAttempts, calculateReconnectInterval, reconnectInterval])

  const disconnect = useCallback(() => {
    shouldReconnectRef.current = false
    clearReconnectTimeout()
    
    if (wsRef.current) {
      wsRef.current.close()
      wsRef.current = null
    }
    
    setConnectionStatus('disconnected')
    setReconnectAttempts(0)
    currentReconnectIntervalRef.current = reconnectInterval
  }, [clearReconnectTimeout, reconnectInterval])

  const reconnect = useCallback(() => {
    shouldReconnectRef.current = true
    setReconnectAttempts(0)
    currentReconnectIntervalRef.current = reconnectInterval
    clearReconnectTimeout()
    
    if (wsRef.current) {
      wsRef.current.close()
    }
    
    connect()
  }, [connect, clearReconnectTimeout, reconnectInterval])

  const sendMessage = useCallback((message: any) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      try {
        wsRef.current.send(JSON.stringify(message))
      } catch (sendError) {
        console.error('Failed to send WebSocket message:', sendError)
        setError('Failed to send message')
      }
    } else {
      console.warn('WebSocket is not connected. Cannot send message.')
      setError('WebSocket is not connected')
    }
  }, [])

  // Initialize connection on mount
  useEffect(() => {
    shouldReconnectRef.current = true
    connect()

    return () => {
      shouldReconnectRef.current = false
      clearReconnectTimeout()
      if (wsRef.current) {
        wsRef.current.close()
      }
    }
  }, [connect, clearReconnectTimeout])

  return {
    connectionStatus,
    lastMessage,
    sendMessage,
    reconnect,
    disconnect,
    error,
    reconnectAttempts
  }
}