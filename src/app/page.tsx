'use client'

import { useState, useEffect } from 'react'
import { DashboardLayout } from '@/components/dashboard'

export default function Home() {
  const [connectionStatus, setConnectionStatus] = useState<'connecting' | 'connected' | 'disconnected' | 'error'>('disconnected')
  const [isLoading, setIsLoading] = useState(true)

  // Simulate initial loading
  useEffect(() => {
    const timer = setTimeout(() => {
      setIsLoading(false)
      setConnectionStatus('connected')
    }, 2000)

    return () => clearTimeout(timer)
  }, [])

  const handleRefresh = () => {
    setConnectionStatus('connecting')
    // Simulate refresh
    setTimeout(() => {
      setConnectionStatus('connected')
    }, 1000)
  }

  const handleSettings = () => {
    console.log('Settings clicked')
  }

  return (
    <DashboardLayout
      connectionStatus={connectionStatus}
      onRefresh={handleRefresh}
      onSettings={handleSettings}
      isLoading={isLoading}
    />
  )
}