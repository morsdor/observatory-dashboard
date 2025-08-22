import React from 'react'
import { render, screen, fireEvent } from '@testing-library/react'
import '@testing-library/jest-dom'
import { DashboardSidebar } from '../DashboardSidebar'

describe('DashboardSidebar', () => {
  const defaultProps = {
    activeView: 'overview',
    onViewChange: jest.fn()
  }

  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('renders all navigation items', () => {
    render(<DashboardSidebar {...defaultProps} />)
    
    // Check main navigation items
    expect(screen.getByText('Overview')).toBeInTheDocument()
    expect(screen.getByText('Charts')).toBeInTheDocument()
    expect(screen.getByText('Data Grid')).toBeInTheDocument()
    expect(screen.getByText('Filters')).toBeInTheDocument()
  })

  it('renders all utility items', () => {
    render(<DashboardSidebar {...defaultProps} />)
    
    // Check utility items
    expect(screen.getByText('Data Sources')).toBeInTheDocument()
    expect(screen.getByText('Settings')).toBeInTheDocument()
    expect(screen.getByText('Help')).toBeInTheDocument()
  })

  it('highlights the active view', () => {
    render(<DashboardSidebar {...defaultProps} activeView="charts" />)
    
    const chartsButton = screen.getByRole('button', { name: /charts/i })
    expect(chartsButton).toHaveClass('bg-primary') // shadcn/ui default variant class
  })

  it('calls onViewChange when navigation item is clicked', () => {
    render(<DashboardSidebar {...defaultProps} />)
    
    const chartsButton = screen.getByRole('button', { name: /charts/i })
    fireEvent.click(chartsButton)
    
    expect(defaultProps.onViewChange).toHaveBeenCalledWith('charts')
  })

  it('calls onViewChange when utility item is clicked', () => {
    render(<DashboardSidebar {...defaultProps} />)
    
    const settingsButton = screen.getByRole('button', { name: /settings/i })
    fireEvent.click(settingsButton)
    
    expect(defaultProps.onViewChange).toHaveBeenCalledWith('settings')
  })

  it('renders section headers', () => {
    render(<DashboardSidebar {...defaultProps} />)
    
    expect(screen.getByText('Views')).toBeInTheDocument()
    expect(screen.getByText('Tools')).toBeInTheDocument()
  })

  it('applies custom className', () => {
    const { container } = render(
      <DashboardSidebar {...defaultProps} className="custom-class" />
    )
    
    expect(container.firstChild).toHaveClass('custom-class')
  })

  it('handles multiple view changes correctly', () => {
    render(<DashboardSidebar {...defaultProps} />)
    
    const overviewButton = screen.getByRole('button', { name: /overview/i })
    const dataGridButton = screen.getByRole('button', { name: /data grid/i })
    const filtersButton = screen.getByRole('button', { name: /filters/i })
    
    fireEvent.click(overviewButton)
    fireEvent.click(dataGridButton)
    fireEvent.click(filtersButton)
    
    expect(defaultProps.onViewChange).toHaveBeenCalledTimes(3)
    expect(defaultProps.onViewChange).toHaveBeenNthCalledWith(1, 'overview')
    expect(defaultProps.onViewChange).toHaveBeenNthCalledWith(2, 'data-grid')
    expect(defaultProps.onViewChange).toHaveBeenNthCalledWith(3, 'filters')
  })
})