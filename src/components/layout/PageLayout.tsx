/**
 * Page Layout Component
 * 
 * This component provides a consistent layout structure for all pages,
 * ensuring the navigation is always present and properly styled.
 */

'use client'

import React from 'react'
import { MainNavigation } from '@/components/navigation/MainNavigation'
import { StreamingControls } from '@/components/streaming/StreamingControls'

interface PageLayoutProps {
  children: React.ReactNode
  title?: string
  description?: string
  showStreamingControls?: boolean
  streamingControlsCompact?: boolean
  className?: string
}

export function PageLayout({
  children,
  title,
  description,
  showStreamingControls = false,
  streamingControlsCompact = false,
  className = ''
}: PageLayoutProps) {
  return (
    <div className="min-h-screen bg-background">
      <MainNavigation />
      
      <main className={`container mx-auto py-8 px-4 ${className}`}>
        {/* Page Header */}
        {(title || description || showStreamingControls) && (
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
              
              {showStreamingControls && (
                <div className="flex-shrink-0">
                  <StreamingControls 
                    compact={streamingControlsCompact}
                    showAdvancedControls={!streamingControlsCompact}
                  />
                </div>
              )}
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