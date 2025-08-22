import React from 'react'
import { render, screen } from '@testing-library/react'
import '@testing-library/jest-dom'
import { DashboardGrid, GridLayouts } from '../DashboardGrid'

describe('DashboardGrid', () => {
  const mockItems = [
    {
      id: 'test-item-1',
      title: 'Test Item 1',
      component: <div>Test Content 1</div>
    },
    {
      id: 'test-item-2',
      title: 'Test Item 2',
      component: <div>Test Content 2</div>,
      colSpan: 2
    },
    {
      id: 'test-item-3',
      title: 'Test Item 3',
      component: <div>Test Content 3</div>,
      colSpan: 1,
      rowSpan: 2
    }
  ]

  it('renders all grid items', () => {
    render(<DashboardGrid items={mockItems} />)
    
    expect(screen.getByText('Test Item 1')).toBeInTheDocument()
    expect(screen.getByText('Test Item 2')).toBeInTheDocument()
    expect(screen.getByText('Test Item 3')).toBeInTheDocument()
    
    expect(screen.getByText('Test Content 1')).toBeInTheDocument()
    expect(screen.getByText('Test Content 2')).toBeInTheDocument()
    expect(screen.getByText('Test Content 3')).toBeInTheDocument()
  })

  it('applies custom className', () => {
    const { container } = render(
      <DashboardGrid items={mockItems} className="custom-grid-class" />
    )
    
    expect(container.firstChild).toHaveClass('custom-grid-class')
  })

  it('renders empty grid when no items provided', () => {
    const { container } = render(<DashboardGrid items={[]} />)
    
    expect(container.firstChild).toBeInTheDocument()
    expect(container.firstChild?.children).toHaveLength(0)
  })

  it('handles items without colSpan or rowSpan', () => {
    const simpleItems = [
      {
        id: 'simple-item',
        title: 'Simple Item',
        component: <div>Simple Content</div>
      }
    ]
    
    render(<DashboardGrid items={simpleItems} />)
    
    expect(screen.getByText('Simple Item')).toBeInTheDocument()
    expect(screen.getByText('Simple Content')).toBeInTheDocument()
  })

  it('applies responsive grid classes', () => {
    const { container } = render(<DashboardGrid items={mockItems} />)
    
    expect(container.firstChild).toHaveClass(
      'grid',
      'grid-cols-1',
      'md:grid-cols-2',
      'lg:grid-cols-3',
      'xl:grid-cols-4'
    )
  })
})

describe('GridLayouts', () => {
  it('exports overview layout configuration', () => {
    expect(GridLayouts.overview).toBeDefined()
    expect(Array.isArray(GridLayouts.overview)).toBe(true)
    expect(GridLayouts.overview.length).toBeGreaterThan(0)
    
    // Check that each layout item has required properties
    GridLayouts.overview.forEach(item => {
      expect(item).toHaveProperty('id')
      expect(item).toHaveProperty('title')
      expect(typeof item.id).toBe('string')
      expect(typeof item.title).toBe('string')
    })
  })

  it('exports charts layout configuration', () => {
    expect(GridLayouts.charts).toBeDefined()
    expect(Array.isArray(GridLayouts.charts)).toBe(true)
    expect(GridLayouts.charts.length).toBeGreaterThan(0)
    
    GridLayouts.charts.forEach(item => {
      expect(item).toHaveProperty('id')
      expect(item).toHaveProperty('title')
    })
  })

  it('exports dataGrid layout configuration', () => {
    expect(GridLayouts.dataGrid).toBeDefined()
    expect(Array.isArray(GridLayouts.dataGrid)).toBe(true)
    expect(GridLayouts.dataGrid.length).toBeGreaterThan(0)
    
    GridLayouts.dataGrid.forEach(item => {
      expect(item).toHaveProperty('id')
      expect(item).toHaveProperty('title')
    })
  })

  it('includes colSpan and rowSpan properties where appropriate', () => {
    const allLayouts = [
      ...GridLayouts.overview,
      ...GridLayouts.charts,
      ...GridLayouts.dataGrid
    ]
    
    // At least some items should have colSpan or rowSpan
    const hasSpanProperties = allLayouts.some(item => 
      item.colSpan !== undefined || item.rowSpan !== undefined
    )
    
    expect(hasSpanProperties).toBe(true)
  })
})