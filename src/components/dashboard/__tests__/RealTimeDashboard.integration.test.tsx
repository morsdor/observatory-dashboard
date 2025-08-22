import React from 'react'
import { render, screen, waitFor } from '@testing-library/react'
import { Provider } from 'react-redux'
import { configureStore } from '@reduxjs/toolkit'
import { RealTimeDashboard } from '../RealTimeDashboard'
import dataReducer from '@/stores/slices/dataSlice'
import filterReducer from '@/stores/slices/filterSlice'
import uiReducer from '@/stores/slices/uiSlice'
import connectionReducer from '@/stores/slices/connectionSlice'
import performanceReducer from '@/stores/slices/performanceSlice'

// Mock WebSocket
class MockWebSocket {
  static CONNECTING = 0
  static OPEN = 1
  static CLOSING = 2
  static CLOSED = 3

  readyState = MockWebSocket.CONNECTING
  onopen: ((event: Event) => void) | null = null
  onmessage: ((event: MessageEvent) => void) | null = null
  onerror: ((event: Event) => void) | null = null
  onclose: ((event: CloseEvent) => void) | null = null

  constructor(public url: string) {
    // Simulate connection delay
    setTimeout(() => {
      this.readyState = MockWebSocket.OPEN
      this.onopen?.(new Event('open'))
    }, 10)
  }

  send(data: string) {
    // Mock send implementation
  }

  close() {
    this.readyState = MockWebSocket.CLOSED
    this.onclose?.(new CloseEvent('close'))
  }

  // Helper method to simulate incoming data
  simulateMessage(data: any) {
    if (this.readyState === MockWebSocket.OPEN && this.onmessage) {
      this.onmessage(new MessageEvent('message', { data: JSON.stringify(data) }))
    }
  }
}

// Mock global WebSocket
const originalWebSocket = global.WebSocket
beforeAll(() => {
  global.WebSocket = MockWebSocket as any
})

afterAll(() => {
  global.WebSocket = originalWebSocket
})

// Create test store
const createTestStore = () => configureStore({
  reducer: {
    data: dataReducer,
    filter: filterReducer,
    ui: uiReducer,
    connection: connectionReducer,
    performance: performanceReducer
  },
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware({
      serializableCheck: {
        ignoredActions: ['connection/setLastConnected', 'connection/setConnectionStatus'],
        ignoredActionsPaths: ['payload.timestamp', 'payload.lastConnected'],
        ignoredPaths: ['connection.lastConnected', 'data.rawData', 'data.filteredData', 'data.dataBuffer']
      }
    })
})

describe('RealTimeDashboard Integration', () => {
  let store: ReturnType<typeof createTestStore>

  beforeEach(() => {
    store = createTestStore()
    jest.clearAllMocks()
  })

  test('renders dashboard components correctly', async () => {
    render(
      <Provider store={store}>
        <RealTimeDashboard websocketUrl="ws://localhost:8080" />
      </Provider>
    )

    // Check for main dashboard elements
    expect(screen.getByText('Real-Time Data Stream')).toBeInTheDocument()
    expect(screen.getByText('Real-Time Chart (0 points)')).toBeInTheDocument()
    expect(screen.getByText('Real-Time Data Grid')).toBeInTheDocument()

    // Check for performance metrics cards
    expect(screen.getByText('Data Rate')).toBeInTheDocument()
    expect(screen.getByText('Total Points')).toBeInTheDocument()
    expect(screen.getByText('Memory')).toBeInTheDocument()
    expect(screen.getByText('Buffer')).toBeInTheDocument()
  })

  test('displays connection status correctly', async () => {
    render(
      <Provider store={store}>
        <RealTimeDashboard websocketUrl="ws://localhost:8080" />
      </Provider>
    )

    // Initially should show connecting or connected status
    await waitFor(() => {
      const statusElements = screen.getAllByText(/connected|connecting/i)
      expect(statusElements.length).toBeGreaterThan(0)
    })
  })

  test('shows performance metrics', async () => {
    render(
      <Provider store={store}>
        <RealTimeDashboard websocketUrl="ws://localhost:8080" />
      </Provider>
    )

    // Check for performance metrics display
    expect(screen.getByText('Performance Metrics')).toBeInTheDocument()
    expect(screen.getByText('FPS')).toBeInTheDocument()
    expect(screen.getByText('Render Time')).toBeInTheDocument()
    expect(screen.getByText('Filter Time')).toBeInTheDocument()
  })

  test('renders control buttons', async () => {
    render(
      <Provider store={store}>
        <RealTimeDashboard websocketUrl="ws://localhost:8080" />
      </Provider>
    )

    // Check for control buttons
    expect(screen.getByText('Reconnect')).toBeInTheDocument()
    expect(screen.getByText('Clear Buffer')).toBeInTheDocument()
    expect(screen.getByText(/Pause|Resume/)).toBeInTheDocument()
  })

  test('displays data grid with correct columns', async () => {
    render(
      <Provider store={store}>
        <RealTimeDashboard websocketUrl="ws://localhost:8080" />
      </Provider>
    )

    // Check for data grid column headers
    await waitFor(() => {
      expect(screen.getByText('ID')).toBeInTheDocument()
      expect(screen.getByText('Timestamp')).toBeInTheDocument()
      expect(screen.getByText('Value')).toBeInTheDocument()
      expect(screen.getByText('Category')).toBeInTheDocument()
      expect(screen.getByText('Source')).toBeInTheDocument()
    })
  })

  test('handles buffer overflow warning', async () => {
    const smallBufferSize = 100
    
    render(
      <Provider store={store}>
        <RealTimeDashboard 
          websocketUrl="ws://localhost:8080" 
          maxBufferSize={smallBufferSize}
        />
      </Provider>
    )

    // The component should render without buffer overflow initially
    expect(screen.queryByText(/Buffer is full/)).not.toBeInTheDocument()
  })

  test('displays correct initial metrics values', async () => {
    render(
      <Provider store={store}>
        <RealTimeDashboard websocketUrl="ws://localhost:8080" />
      </Provider>
    )

    // Check initial metric values
    await waitFor(() => {
      // Data rate should start at 0
      expect(screen.getByText('0/s')).toBeInTheDocument()
      
      // Total points should start at 0
      expect(screen.getByText('0')).toBeInTheDocument()
      
      // Buffer percentage should start at 0%
      expect(screen.getByText('0.0%')).toBeInTheDocument()
    })
  })

  test('renders chart component', async () => {
    render(
      <Provider store={store}>
        <RealTimeDashboard websocketUrl="ws://localhost:8080" />
      </Provider>
    )

    // Check for chart container
    const chartContainer = screen.getByText('Real-Time Chart (0 points)').closest('.space-y-6')
    expect(chartContainer).toBeInTheDocument()
  })

  test('shows performance monitoring controls', async () => {
    render(
      <Provider store={store}>
        <RealTimeDashboard websocketUrl="ws://localhost:8080" />
      </Provider>
    )

    // Check for performance monitoring pause/resume button
    const performanceSection = screen.getByText('Performance Metrics').closest('div')
    expect(performanceSection).toBeInTheDocument()
    
    // Should have pause/resume button
    expect(screen.getByText(/Pause|Resume/)).toBeInTheDocument()
  })

  test('displays memory usage information', async () => {
    render(
      <Provider store={store}>
        <RealTimeDashboard websocketUrl="ws://localhost:8080" />
      </Provider>
    )

    // Check for memory-related displays
    expect(screen.getByText('Memory')).toBeInTheDocument()
    expect(screen.getByText('Buffer')).toBeInTheDocument()
    
    // Should show memory usage in performance details
    expect(screen.getByText('Connection Uptime')).toBeInTheDocument()
    expect(screen.getByText('Buffer Size')).toBeInTheDocument()
    expect(screen.getByText('Last Update')).toBeInTheDocument()
  })
})