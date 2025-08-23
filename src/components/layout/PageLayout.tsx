/**
 * Page Layout Component
 * 
 * This component provides a consistent layout structure for all pages,
 * ensuring the navigation is always present and properly styled.
 * Now includes a global streaming control bar for unified data streaming.
 */

'use client'

import React from 'react'
import { MainNavigation } from '@/components/navigation/MainNavigation'
import { GlobalStreamingControl } from '@/components/streaming/GlobalStreamingControl'

interface PageLayoutProps {
  children: React.ReactNode
  title?: string
  description?: string
  className?: string
  hideGlobalStreaming?: boolean
}

export function PageLayout({
  children,
  title,
  description,
  className = '',
  hideGlobalStreaming = false
}: PageLayoutProps) {
  return (
    <div className="min-h-screen bg-background">
      <MainNavigation />
      
      {/* Global Streaming Control Bar - Visible on all pages */}
      {!hideGlobalStreaming && <GlobalStreamingControl />}
      
      <main className={`container mx-auto py-8 px-4 ${className}`}>
        {/* Page Header */}
        {(title || description) && (
          <div className="mb-8">
            <div className="flex items-start justify-between gap-6">
              <div className="flex-1">
                {title && (
                  <h1 className="text-4xl font-bold mb-4">{title}</h1>
                )}
                {description && (
                  <p className="text-lg text-muted-foreground max-w-3xl">
                    {description}
                  </p>
                )}
              </div>
            </div>
          </div>
        )}
        
        {/* Page Content */}
        {children}
      </main>
    </div>
  )
}

export default PageLayout