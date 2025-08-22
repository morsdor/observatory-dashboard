'use client'

import React from 'react'
import { DataPoint } from '@/types'

export interface TooltipProps {
  dataPoint: DataPoint | null
  position: { x: number; y: number } | null
  visible: boolean
  formatValue?: (value: number) => string
  formatTimestamp?: (timestamp: Date) => string
  className?: string
}

export const Tooltip: React.FC<TooltipProps> = ({
  dataPoint,
  position,
  visible,
  formatValue = (value) => value.toFixed(2),
  formatTimestamp = (timestamp) => timestamp.toLocaleTimeString(),
  className = ''
}) => {
  if (!visible || !dataPoint || !position) {
    return null
  }

  // Calculate tooltip position to avoid going off-screen
  const tooltipStyle: React.CSSProperties = {
    position: 'absolute',
    left: position.x + 10,
    top: position.y - 10,
    transform: position.x > window.innerWidth / 2 ? 'translateX(-100%)' : 'none',
    zIndex: 1000,
    pointerEvents: 'none'
  }

  return (
    <div
      style={tooltipStyle}
      className={`
        bg-gray-900 text-white text-sm rounded-lg shadow-lg border border-gray-700 p-3 min-w-[200px]
        ${className}
      `}
    >
      <div className="space-y-1">
        <div className="font-medium text-gray-200">
          {formatTimestamp(dataPoint.timestamp)}
        </div>
        <div className="flex justify-between items-center">
          <span className="text-gray-400">Value:</span>
          <span className="font-mono font-medium">
            {formatValue(dataPoint.value)}
          </span>
        </div>
        <div className="flex justify-between items-center">
          <span className="text-gray-400">Category:</span>
          <span className="text-blue-300 capitalize">
            {dataPoint.category}
          </span>
        </div>
        <div className="flex justify-between items-center">
          <span className="text-gray-400">Source:</span>
          <span className="text-green-300 text-xs">
            {dataPoint.source}
          </span>
        </div>
        {Object.keys(dataPoint.metadata).length > 0 && (
          <div className="pt-1 border-t border-gray-700">
            <div className="text-gray-400 text-xs mb-1">Metadata:</div>
            {Object.entries(dataPoint.metadata).map(([key, value]) => (
              <div key={key} className="flex justify-between items-center text-xs">
                <span className="text-gray-500">{key}:</span>
                <span className="text-gray-300 font-mono">
                  {typeof value === 'object' ? JSON.stringify(value) : String(value)}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

export default Tooltip