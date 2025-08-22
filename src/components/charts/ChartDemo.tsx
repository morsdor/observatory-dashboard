'use client'

import React, { useState, useEffect } from 'react'
import { TimeSeriesChart } from './TimeSeriesChart'
import { DataPoint } from '@/types'

// Generate sample data for demonstration
const generateSampleData = (count: number = 100): DataPoint[] => {
  const now = new Date()
  const data: DataPoint[] = []
  
  for (let i = 0; i < count; i++) {
    const timestamp = new Date(now.getTime() - (count - i) * 60000) // 1 minute intervals
    const value = 50 + Math.sin(i * 0.1) * 20 + Math.random() * 10 - 5 // Sine wave with noise
    
    data.push({
      id: `point-${i}`,
      timestamp,
      value,
      category: 'demo',
      metadata: { index: i },
      source: 'demo-generator'
    })
  }
  
  return data
}

export const ChartDemo: React.FC = () => {
  const [data, setData] = useState<DataPoint[]>([])
  const [hoveredPoint, setHoveredPoint] = useState<DataPoint | null>(null)

  useEffect(() => {
    // Generate initial data
    setData(generateSampleData(100))
    
    // Simulate real-time updates
    const interval = setInterval(() => {
      setData(prevData => {
        const newData = [...prevData]
        const lastTimestamp = newData[newData.length - 1]?.timestamp || new Date()
        const newTimestamp = new Date(lastTimestamp.getTime() + 60000)
        const newValue = 50 + Math.sin(newData.length * 0.1) * 20 + Math.random() * 10 - 5
        
        newData.push({
          id: `point-${newData.length}`,
          timestamp: newTimestamp,
          value: newValue,
          category: 'demo',
          metadata: { index: newData.length },
          source: 'demo-generator'
        })
        
        // Keep only last 100 points
        return newData.slice(-100)
      })
    }, 2000) // Add new point every 2 seconds
    
    return () => clearInterval(interval)
  }, [])

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
            The chart supports zoom, pan, and hover interactions.
          </p>
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
          <TimeSeriesChart
            data={data}
            width={800}
            height={400}
            onHover={handleHover}
            enableZoom={true}
            enablePan={true}
            showGrid={true}
            lineColor="#3b82f6"
            lineWidth={2}
          />
        </div>

        <div className="mt-4 text-sm text-gray-500">
          <p>Data points: {data.length}</p>
          <p>Updates every 2 seconds</p>
          <p>Use mouse wheel to zoom, drag to pan, hover for details</p>
        </div>
      </div>
    </div>
  )
}

export default ChartDemo