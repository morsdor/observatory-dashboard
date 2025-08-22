'use client'

import React, { useEffect, useState } from 'react'
import { useDataStream } from '@/hooks/useDataStream'
import { MockWebSocketServer } from '@/utils/mockWebSocketServer'

export function WebSocketDemo() {
    const [mockServer, setMockServer] = useState<MockWebSocketServer | null>(null)
    const [serverRunning, setServerRunning] = useState(false)

    const dataStream = useDataStream({
        url: 'ws://localhost:8080',
        maxSize: 50,
        enableMetrics: true,
        autoConnect: false // Don't auto-connect until server is ready
    })

    useEffect(() => {
        // Initialize mock server
        const server = new MockWebSocketServer({
            dataPointsPerSecond: 5,
            categories: ['cpu', 'memory', 'network'],
            sources: ['server-1', 'server-2']
        })
        setMockServer(server)

        return () => {
            server.stop()
        }
    }, [])

    const startServer = async () => {
        if (mockServer && !serverRunning) {
            await mockServer.start()
            setServerRunning(true)
            // Connect to the server
            dataStream.connect()
        }
    }

    const stopServer = async () => {
        if (mockServer && serverRunning) {
            dataStream.disconnect()
            await mockServer.stop()
            setServerRunning(false)
        }
    }

    const injectTestData = () => {
        dataStream.injectData([
            {
                id: `manual-${Date.now()}`,
                timestamp: new Date(),
                value: Math.random() * 100,
                category: 'manual',
                source: 'demo',
                metadata: { injected: true }
            }
        ])
    }

    const metrics = dataStream.getMetrics()

    return (
        <div className="p-6 max-w-4xl mx-auto">
            <h1 className="text-2xl font-bold mb-6">WebSocket Data Streaming Demo</h1>

            {/* Controls */}
            <div className="mb-6 space-x-4">
                <button
                    onClick={startServer}
                    disabled={serverRunning}
                    className="px-4 py-2 bg-green-500 text-white rounded disabled:bg-gray-300"
                >
                    Start Mock Server
                </button>
                <button
                    onClick={stopServer}
                    disabled={!serverRunning}
                    className="px-4 py-2 bg-red-500 text-white rounded disabled:bg-gray-300"
                >
                    Stop Server
                </button>
                <button
                    onClick={injectTestData}
                    className="px-4 py-2 bg-blue-500 text-white rounded"
                >
                    Inject Test Data
                </button>
                <button
                    onClick={dataStream.clearBuffer}
                    className="px-4 py-2 bg-yellow-500 text-white rounded"
                >
                    Clear Buffer
                </button>
            </div>

            {/* Status */}
            <div className="mb-6 grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="bg-gray-100 p-4 rounded">
                    <h3 className="font-semibold">Connection Status</h3>
                    <p className={`text-lg ${dataStream.connectionStatus === 'connected' ? 'text-green-600' :
                        dataStream.connectionStatus === 'connecting' ? 'text-yellow-600' :
                            dataStream.connectionStatus === 'error' ? 'text-red-600' :
                                'text-gray-600'
                        }`}>
                        {dataStream.connectionStatus}
                    </p>
                </div>
                <div className="bg-gray-100 p-4 rounded">
                    <h3 className="font-semibold">Buffer Size</h3>
                    <p className="text-lg">{dataStream.bufferSize}</p>
                </div>
                <div className="bg-gray-100 p-4 rounded">
                    <h3 className="font-semibold">Buffer Full</h3>
                    <p className="text-lg">{dataStream.isBufferFull ? 'Yes' : 'No'}</p>
                </div>
                <div className="bg-gray-100 p-4 rounded">
                    <h3 className="font-semibold">Server Running</h3>
                    <p className="text-lg">{serverRunning ? 'Yes' : 'No'}</p>
                </div>
            </div>

            {/* Metrics */}
            <div className="mb-6">
                <h2 className="text-xl font-semibold mb-4">Metrics</h2>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div className="bg-blue-50 p-4 rounded">
                        <h3 className="font-semibold">Points Received</h3>
                        <p className="text-lg">{metrics.totalPointsReceived}</p>
                    </div>
                    <div className="bg-red-50 p-4 rounded">
                        <h3 className="font-semibold">Points Dropped</h3>
                        <p className="text-lg">{metrics.totalPointsDropped}</p>
                    </div>
                    <div className="bg-green-50 p-4 rounded">
                        <h3 className="font-semibold">Buffer Utilization</h3>
                        <p className="text-lg">{metrics.bufferUtilization.toFixed(1)}%</p>
                    </div>
                    <div className="bg-purple-50 p-4 rounded">
                        <h3 className="font-semibold">Points/Second</h3>
                        <p className="text-lg">{metrics.averagePointsPerSecond.toFixed(1)}</p>
                    </div>
                </div>
            </div>

            {/* Error Display */}
            {dataStream.error && (
                <div className="mb-6 p-4 bg-red-100 border border-red-400 text-red-700 rounded">
                    <h3 className="font-semibold">Error:</h3>
                    <p>{dataStream.error}</p>
                </div>
            )}

            {/* Data Display */}
            <div>
                <h2 className="text-xl font-semibold mb-4">Recent Data Points</h2>
                <div className="bg-gray-50 p-4 rounded max-h-96 overflow-y-auto">
                    {dataStream.data.length === 0 ? (
                        <p className="text-gray-500">No data points yet. Start the server to begin streaming.</p>
                    ) : (
                        <div className="space-y-2">
                            {dataStream.data.slice(-10).reverse().map((point) => (
                                <div key={point.id} className="bg-white p-3 rounded border">
                                    <div className="flex justify-between items-start">
                                        <div>
                                            <span className="font-mono text-sm text-gray-600">{point.id}</span>
                                            <div className="flex space-x-4 mt-1">
                                                <span className="text-sm">
                                                    <strong>Category:</strong> {point.category}
                                                </span>
                                                <span className="text-sm">
                                                    <strong>Source:</strong> {point.source}
                                                </span>
                                                <span className="text-sm">
                                                    <strong>Value:</strong> {point.value.toFixed(2)}
                                                </span>
                                            </div>
                                        </div>
                                        <span className="text-xs text-gray-500">
                                            {point.timestamp}
                                        </span>
                                    </div>
                                    {point.metadata?.injected && (
                                        <span className="inline-block mt-2 px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded">
                                            Manually Injected
                                        </span>
                                    )}
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>
        </div>
    )
}