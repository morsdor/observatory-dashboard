import React from 'react'
import { render, screen } from '@testing-library/react'
import '@testing-library/jest-dom'
import { 
  DashboardSkeleton, 
  ChartLoadingSkeleton, 
  DataGridLoadingSkeleton, 
  LoadingSpinner 
} from '../LoadingStates'

describe('DashboardSkeleton', () => {
  it('renders dashboard skeleton structure', () => {
    const { container } = render(<DashboardSkeleton />)
    
    // Should render a full-screen skeleton layout
    expect(container.firstChild).toHaveClass('h-screen', 'flex', 'flex-col')
  })

  it('renders header skeleton', () => {
    const { container } = render(<DashboardSkeleton />)
    
    // Check for header-like structure
    const headerElements = container.querySelectorAll('[class*="h-6"], [class*="h-8"]')
    expect(headerElements.length).toBeGreaterThan(0)
  })

  it('renders sidebar skeleton', () => {
    const { container } = render(<DashboardSkeleton />)
    
    // Check for sidebar-like structure
    const sidebarElements = container.querySelectorAll('[class*="w-64"]')
    expect(sidebarElements.length).toBeGreaterThan(0)
  })

  it('renders main content skeleton with grid', () => {
    const { container } = render(<DashboardSkeleton />)
    
    // Check for grid structure
    const gridElements = container.querySelectorAll('[class*="grid"]')
    expect(gridElements.length).toBeGreaterThan(0)
  })
})

describe('ChartLoadingSkeleton', () => {
  it('renders chart loading skeleton', () => {
    const { container } = render(<ChartLoadingSkeleton />)
    
    expect(container.firstChild).toHaveClass('w-full', 'h-full', 'flex', 'flex-col')
  })

  it('renders chart header skeleton', () => {
    const { container } = render(<ChartLoadingSkeleton />)
    
    // Should have skeleton elements for chart header
    const skeletonElements = container.querySelectorAll('[class*="h-6"], [class*="h-8"]')
    expect(skeletonElements.length).toBeGreaterThan(0)
  })

  it('renders main chart area skeleton', () => {
    const { container } = render(<ChartLoadingSkeleton />)
    
    // Should have a large skeleton for the chart area
    const chartAreaSkeleton = container.querySelector('[class*="flex-1"]')
    expect(chartAreaSkeleton).toBeInTheDocument()
  })
})

describe('DataGridLoadingSkeleton', () => {
  it('renders data grid loading skeleton', () => {
    const { container } = render(<DataGridLoadingSkeleton />)
    
    expect(container.firstChild).toHaveClass('w-full', 'h-full')
  })

  it('renders table header skeleton', () => {
    const { container } = render(<DataGridLoadingSkeleton />)
    
    // Should have grid structure for table headers
    const gridElements = container.querySelectorAll('[class*="grid-cols-5"]')
    expect(gridElements.length).toBeGreaterThan(0)
  })

  it('renders multiple table row skeletons', () => {
    const { container } = render(<DataGridLoadingSkeleton />)
    
    // Should render multiple rows (at least 10 based on implementation)
    const rowElements = container.querySelectorAll('[class*="grid-cols-5"]')
    expect(rowElements.length).toBeGreaterThanOrEqual(10)
  })

  it('renders control buttons skeleton', () => {
    const { container } = render(<DataGridLoadingSkeleton />)
    
    // Should have skeleton elements for controls
    const controlSkeletons = container.querySelectorAll('[class*="h-8"]')
    expect(controlSkeletons.length).toBeGreaterThan(0)
  })
})

describe('LoadingSpinner', () => {
  it('renders with default message', () => {
    render(<LoadingSpinner />)
    
    expect(screen.getByText('Loading...')).toBeInTheDocument()
  })

  it('renders with custom message', () => {
    render(<LoadingSpinner message="Custom loading message" />)
    
    expect(screen.getByText('Custom loading message')).toBeInTheDocument()
  })

  it('applies custom className', () => {
    const { container } = render(<LoadingSpinner className="custom-spinner-class" />)
    
    expect(container.firstChild).toHaveClass('custom-spinner-class')
  })

  it('renders spinning icon', () => {
    const { container } = render(<LoadingSpinner />)
    
    // Should have an element with animate-spin class
    const spinningElement = container.querySelector('[class*="animate-spin"]')
    expect(spinningElement).toBeInTheDocument()
  })

  it('has proper accessibility structure', () => {
    render(<LoadingSpinner message="Loading data" />)
    
    // Should be properly structured for screen readers
    expect(screen.getByText('Loading data')).toBeInTheDocument()
  })

  it('renders with flex layout classes', () => {
    const { container } = render(<LoadingSpinner />)
    
    expect(container.firstChild).toHaveClass(
      'flex',
      'flex-col',
      'items-center',
      'justify-center'
    )
  })
})