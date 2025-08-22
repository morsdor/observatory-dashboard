import React from 'react'
import { render, screen, fireEvent } from '@testing-library/react'
import '@testing-library/jest-dom'
import { DashboardHeader } from '../DashboardHeader'

describe('DashboardHeader', () => {
  const defaultProps = {
    connectionStatus: 'connected' as const,
    onRefresh: jest.fn(),
    onSettings: jest.fn()
  }

  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('renders the dashboard title', () => {
    render(<DashboardHeader {...defaultProps} />)
    expect(screen.getByText('Observatory Dashboard')).toBeInTheDocument()
  })

  it('displays correct connection status for connected state', () => {
    render(<DashboardHeader {...defaultProps} connectionStatus="connected" />)
    expect(screen.getByText('Connected')).toBeInTheDocument()
  })

  it('displays correct connection status for connecting state', () => {
    render(<DashboardHeader {...defaultProps} connectionStatus="connecting" />)
    expect(screen.getByText('Connecting...')).toBeInTheDocument()
  })

  it('displays correct connection status for disconnected state', () => {
    render(<DashboardHeader {...defaultProps} connectionStatus="disconnected" />)
    expect(screen.getByText('Disconnected')).toBeInTheDocument()
  })

  it('displays correct connection status for error state', () => {
    render(<DashboardHeader {...defaultProps} connectionStatus="error" />)
    expect(screen.getByText('Connection Error')).toBeInTheDocument()
  })

  it('calls onRefresh when refresh button is clicked', () => {
    render(<DashboardHeader {...defaultProps} />)
    const refreshButton = screen.getByRole('button', { name: /refresh/i })
    fireEvent.click(refreshButton)
    expect(defaultProps.onRefresh).toHaveBeenCalledTimes(1)
  })

  it('calls onSettings when settings button is clicked', () => {
    render(<DashboardHeader {...defaultProps} />)
    const settingsButton = screen.getByRole('button', { name: /settings/i })
    fireEvent.click(settingsButton)
    expect(defaultProps.onSettings).toHaveBeenCalledTimes(1)
  })

  it('renders refresh and settings buttons', () => {
    render(<DashboardHeader {...defaultProps} />)
    expect(screen.getByRole('button', { name: /refresh/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /settings/i })).toBeInTheDocument()
  })

  it('handles missing callback props gracefully', () => {
    render(<DashboardHeader connectionStatus="connected" />)
    const refreshButton = screen.getByRole('button', { name: /refresh/i })
    const settingsButton = screen.getByRole('button', { name: /settings/i })
    
    // Should not throw errors when callbacks are undefined
    expect(() => {
      fireEvent.click(refreshButton)
      fireEvent.click(settingsButton)
    }).not.toThrow()
  })
})