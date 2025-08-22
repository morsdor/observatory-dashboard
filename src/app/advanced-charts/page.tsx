'use client'

import React from 'react'
import { AdvancedChartDemo } from '@/components/charts/AdvancedChartDemo'

export default function AdvancedChartsPage() {
  return (
    <div className="container mx-auto py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-4">Advanced Chart Features</h1>
        <p className="text-muted-foreground text-lg">
          Explore the advanced charting capabilities including multiple chart types, 
          synchronization, data processing, and performance optimizations.
        </p>
      </div>
      
      <AdvancedChartDemo />
    </div>
  )
}