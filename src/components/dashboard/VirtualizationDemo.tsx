'use client'

import React, { useState, useEffect } from 'react'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'

export function VirtualizationDemo() {
  const [domElementCount, setDomElementCount] = useState(0)
  const [isVirtualized, setIsVirtualized] = useState(true)

  useEffect(() => {
    // Count DOM elements in the table
    const countElements = () => {
      const tableRows = document.querySelectorAll('[data-testid="table-row"]')
      setDomElementCount(tableRows.length)
    }

    countElements()
    
    // Update count periodically
    const interval = setInterval(countElements, 1000)
    return () => clearInterval(interval)
  }, [])

  return (
    <Card className="p-6 mb-4">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="text-lg font-semibold">Virtualization Status</h3>
          <p className="text-sm text-gray-600">
            Virtualization renders only visible rows in the DOM for better performance
          </p>
        </div>
        <div className="flex items-center gap-4">
          <div className="text-center">
            <div className="text-2xl font-bold text-green-600">{domElementCount}</div>
            <div className="text-xs text-gray-500">DOM Elements</div>
          </div>
          <Badge variant={isVirtualized ? 'default' : 'secondary'} className="bg-green-500">
            {isVirtualized ? 'Virtualized' : 'Standard'}
          </Badge>
        </div>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
        <div className="bg-green-50 p-3 rounded">
          <div className="font-medium text-green-800">✅ Virtualized Benefits</div>
          <ul className="text-green-700 mt-1 space-y-1">
            <li>• Only ~20-30 DOM elements</li>
            <li>• Smooth scrolling</li>
            <li>• Constant memory usage</li>
            <li>• 60fps performance</li>
          </ul>
        </div>
        
        <div className="bg-red-50 p-3 rounded">
          <div className="font-medium text-red-800">❌ Non-Virtualized Issues</div>
          <ul className="text-red-700 mt-1 space-y-1">
            <li>• 10,000+ DOM elements</li>
            <li>• Laggy scrolling</li>
            <li>• High memory usage</li>
            <li>• Browser freezing</li>
          </ul>
        </div>
        
        <div className="bg-blue-50 p-3 rounded">
          <div className="font-medium text-blue-800">🔍 How to Verify</div>
          <ul className="text-blue-700 mt-1 space-y-1">
            <li>• Open DevTools</li>
            <li>• Check Elements tab</li>
            <li>• Scroll the table</li>
            <li>• Watch DOM count stay low</li>
          </ul>
        </div>
      </div>
      
      <div className="mt-4 p-3 bg-yellow-50 rounded border border-yellow-200">
        <div className="flex items-start gap-2">
          <div className="text-yellow-600 font-bold">💡</div>
          <div className="text-yellow-800 text-sm">
            <strong>Pro Tip:</strong> Open your browser's DevTools and watch the console. 
            You'll see only visible rows being rendered as you scroll. The green bar on the left 
            of each row indicates it's virtualized. Row numbers show which rows are actually in the DOM.
          </div>
        </div>
      </div>
    </Card>
  )
}