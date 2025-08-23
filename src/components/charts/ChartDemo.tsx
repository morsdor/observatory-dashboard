'use client'

import React, { useState, useMemo } from 'react'
import { TimeSeriesChart } from './TimeSeriesChart'
import { DataPoint } from '@/types'
import { useGlobalDataStream } from '@/providers/DataStreamProvider'

export const ChartDemo: React.FC = () => {
  const [hoveredPoint, setHoveredPoint] = useState<DataPoint | null>(null)
  
  // Use global data stream
  const { data: globalData, status, metrics } = useGlobalDataStream()
  
  // Use last 1000 points for chart performance
  const chartData = useMemo(() => {
    const maxPoints = 1000
    return globalData.length > maxPoints 
      ? globalData.slice(-maxPoints)
      : globalData
  }, [globalData])

  const handleHover = (point: DataPoint | null) => {
    setHoveredPoint(point)
  }

  return (
    <div className="p-6 space-y-4">
      <div className="bg-white rounded-lg shadow-lg p-6">
        <h2 className="text-2xl font-bold mb-4">Canvas-Based Time Series Chart Demo</h2>
        
        <div className="mb-4">
          <p className="text-gray-600">
            This demo shows a real-time updating time series chart built with HTML5 Canvas and D3.js.
            The chart supports zoom, pan, and hover interactions. Data is streamed from the global data source.
          </p>
          <div className="mt-2 text-sm text-blue-600">
            Status: {status} | Data Points: {globalData.length.toLocaleString()} | 
            Rate: {metrics ? `${Math.round(metrics.dataPointsPerSecond)}/s` : '0/s'}
          </div>
        </div>

        {hoveredPoint && (
          <div className="mb-4 p-3 bg-blue-50 rounded-lg">
            <h3 className="font-semibold text-blue-800">Hovered Point:</h3>
            <p className="text-blue-700">
              Time: {hoveredPoint.timestamp.toLocaleTimeString()}, 
              Value: {hoveredPoint.value.toFixed(2)}
            </p>
          </div>
        )}

        <div className="border rounded-lg p-4 bg-gray-50">
          {chartData.length > 0 ? (
            <TimeSeriesChart
              data={chartData}
              width={800}
              height={400}
              onHover={handleHover}
              enableZoom={true}
              enablePan={true}
              showGrid={true}
              lineColor="#3b82f6"
              lineWidth={2}
            />
          ) : (
            <div className="flex items-center justify-center h-96 text-gray-500">
              <div className="text-center">
                <p>No data available</p>
                <p className="text-sm">Start streaming from the global control to see data</p>
              </div>
            </div>
          )}
        </div>

        <div className="mt-4 text-sm text-gray-500">
          <p>Chart data points: {chartData.length.toLocaleString()}</p>
          <p>Total data points: {globalData.length.toLocaleString()}</p>
          <p>Use mouse wheel to zoom, drag to pan, hover for details</p>
        </div>
      </div>
    </div>
  )
}

export default ChartDemo