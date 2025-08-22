import React from 'react'
import { render, screen, fireEvent } from '@testing-library/react'
import '@testing-library/jest-dom'
import { DashboardLayout } from '../DashboardLayout'

// Mock the child components to avoid complex rendering
jest.mock('../DashboardHeader', () => ({
  DashboardHeader: ({ connectionStatus, onRefresh, onSettings }: {
    connectionStatus: strinoard-header">
      <span>Status: {connectionStatus}</span>
      <button onClick={onRefresh}>Refresh</button>
      <button onClick={onSettings}>Settings</button>
    </div>
  )
}))

jest.mock('../DashboardSidebar', () => ({
  DashboardSidebar: ({ activeView, onViewChange }: any) => (
    <div data-testid="dashboard-sidebar">
      <span>Active: {activeView}</span>
      <button onClick={() => onViewChange('charts')}>Charts</button>
      <button onClick={() => onViewChange('data-grid')}>Data Grid</button>
    </div>
  )
}))

jest.mock('../DashboardGrid', () => ({
  DashboardGrid: ({ items }: any) => (
    <div data-testid="dashboard-grid">
      Grid with {items.length} items
    </div>
  ),
  GridLayouts: {
    overview: [{ id: 'test-overview', title: 'Test Overview' }],
    charts: [{ id: 'test-chart', title: 'Test Chart' }],
    dataGrid: [{ id: 'test-grid', title: 'Test Grid' }]
  }
}))

jest.mock('../LoadingStates', () => ({
  DashboardSkeleton: () => <div data-testid="dashboard-skeleton">Loading...</div>
}))

describe('DashboardLayout', () => {
  const defaultProps = {
    connectionStatus: 'connected' as const,
    onRefresh: jest.fn(),
    onSettings: jest.fn(),
    isLoading: false
  }

  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('renders loading skeleton when isLoading is true', () => {
    render(<DashboardLayout {...defaultProps} isLoading={true} />)
    
    expect(screen.getByTestId('dashboard-skeleton')).toBeInTheDocument()
    expect(screen.queryByTestId('dashboard-header')).not.toBeInTheDocument()
  })

  it('renders main dashboard layout when not loading', () => {
    render(<DashboardLayout {...defaultProps} />)
    
    expect(screen.getByTestId('dashboard-header')).toBeInTheDocument()
    expect(screen.getByTestId('dashboard-sidebar')).toBeInTheDocument()
    expect(screen.getByTestId('dashboard-grid')).toBeInTheDocument()
  })

  it('passes connection status to header', () => {
    render(<DashboardLayout {...defaultProps} connectionStatus="connecting" />)
    
    expect(screen.getByText('Status: connecting')).toBeInTheDocument()
  })

  it('passes callbacks to header', () => {
    render(<DashboardLayout {...defaultProps} />)
    
    const refreshButton = screen.getByRole('button', { name: 'Refresh' })
    const settingsButton = screen.getByRole('button', { name: 'Settings' })
    
    fireEvent.click(refreshButton)
    fireEvent.click(settingsButton)
    
    expect(defaultProps.onRefresh).toHaveBeenCalledTimes(1)
    expect(defaultProps.onSettings).toHaveBeenCalledTimes(1)
  })

  it('starts with overview as active view', () => {
    render(<DashboardLayout {...defaultProps} />)
    
    expect(screen.getByText('Active: overview')).toBeInTheDocument()
  })

  it('changes active view when sidebar navigation is used', () => {
    render(<DashboardLayout {...defaultProps} />)
    
    const chartsButton = screen.getByRole('button', { name: 'Charts' })
    fireEvent.click(chartsButton)
    
    expect(screen.getByText('Active: charts')).toBeInTheDocument()
  })

  it('renders different content based on active view', () => {
    render(<DashboardLayout {...defaultProps} />)
    
    // Start with overview
    expect(screen.getByText('Grid with 1 items')).toBeInTheDocument()
    
    // Switch to charts
    const chartsButton = screen.getByRole('button', { name: 'Charts' })
    fireEvent.click(chartsButton)
    
    expect(screen.getByText('Grid with 1 items')).toBeInTheDocument()
  })

  it('renders custom children when provided', () => {
    render(
      <DashboardLayout {...defaultProps}>
        <div data-testid="custom-content">Custom Content</div>
      </DashboardLayout>
    )
    
    expect(screen.getByTestId('custom-content')).toBeInTheDocument()
    expect(screen.queryByTestId('dashboard-grid')).not.toBeInTheDocument()
  })

  it('handles missing callback props gracefully', () => {
    render(<DashboardLayout connectionStatus="connected" />)
    
    const refreshButton = screen.getByRole('button', { name: 'Refresh' })
    const settingsButton = screen.getByRole('button', { name: 'Settings' })
    
    // Should not throw errors when callbacks are undefined
    expect(() => {
      fireEvent.click(refreshButton)
      fireEvent.click(settingsButton)
    }).not.toThrow()
  })

  it('applies proper layout classes', () => {
    const { container } = render(<DashboardLayout {...defaultProps} />)
    
    expect(container.firstChild).toHaveClass(
      'h-screen',
      'flex',
      'flex-col',
      'bg-gray-50'
    )
  })

  it('handles view changes to all navigation options', () => {
    render(<DashboardLayout {...defaultProps} />)
    
    // Test switching to data-grid view
    const dataGridButton = screen.getByRole('button', { name: 'Data Grid' })
    fireEvent.click(dataGridButton)
    
    expect(screen.getByText('Active: data-grid')).toBeInTheDocument()
  })

  it('maintains responsive layout structure', () => {
    const { container } = render(<DashboardLayout {...defaultProps} />)
    
    // Check for main layout structure
    const mainLayout = container.querySelector('.flex.flex-1')
    expect(mainLayout).toBeInTheDocument()
    
    // Check for sidebar and main content areas
    const sidebarArea = container.querySelector('[class*="w-64"]')
    const mainContent = container.querySelector('.flex-1.overflow-auto')
    
    expect(sidebarArea).toBeInTheDocument()
    expect(mainContent).toBeInTheDocument()
  })
})