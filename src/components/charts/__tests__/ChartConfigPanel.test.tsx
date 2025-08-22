import React from 'react'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import '@testing-library/jest-dom'
import { ChartConfiguration, ChartSyncConfiguration, DEFAULT_CHART_CONFIG, DEFAULT_SYNC_CONFIG } from '../ChartTypes'

// Mock UI components
jest.mock('@/components/ui/card', () => ({
  Card: ({ children, className }: any) => <div className={className}>{children}</div>,
  CardContent: ({ children, className }: any) => <div className={className}>{children}</div>,
  CardHeader: ({ children, className }: any) => <div className={className}>{children}</div>,
  CardTitle: ({ children, className }: any) => <h2 className={className}>{children}</h2>
}))

jest.mock('@/components/ui/button', () => ({
  Button: ({ children, onClick, className }: any) => (
    <button onClick={onClick} className={className}>{children}</button>
  )
}))

jest.mock('@/components/ui/input', () => ({
  Input: ({ onChange, value, type, className, ...props }: any) => (
    <input 
      onChange={onChange} 
      value={value} 
      type={type} 
      className={className}
      {...props}
    />
  )
}))

jest.mock('@/components/ui/label', () => ({
  Label: ({ children, className, htmlFor }: any) => (
    <label className={className} htmlFor={htmlFor}>{children}</label>
  )
}))

jest.mock('@/components/ui/select', () => ({
  Select: ({ children, value, onValueChange }: any) => (
    <div data-testid="select" data-value={value} onClick={() => onValueChange && onValueChange('test')}>
      {children}
    </div>
  ),
  SelectContent: ({ children }: any) => <div>{children}</div>,
  SelectItem: ({ children, value }: any) => <div data-value={value}>{children}</div>,
  SelectTrigger: ({ children }: any) => <div role="combobox">{children}</div>,
  SelectValue: ({ placeholder }: any) => <span>{placeholder}</span>
}))

jest.mock('@/components/ui/checkbox', () => ({
  Checkbox: ({ checked, onCheckedChange, id }: any) => (
    <input 
      type="checkbox" 
      checked={checked} 
      onChange={(e) => onCheckedChange && onCheckedChange(e.target.checked)}
      id={id}
    />
  )
}))

jest.mock('@/components/ui/separator', () => ({
  Separator: ({ className }: any) => <hr className={className} />
}))

jest.mock('@/components/ui/tabs', () => ({
  Tabs: ({ children, value, onValueChange }: any) => (
    <div data-testid="tabs" data-value={value} onClick={() => onValueChange && onValueChange('test')}>
      {children}
    </div>
  ),
  TabsContent: ({ children }: any) => <div>{children}</div>,
  TabsList: ({ children }: any) => <div>{children}</div>,
  TabsTrigger: ({ children, value }: any) => <button data-value={value}>{children}</button>
}))

// Import after mocking
import { ChartConfigPanel } from '../ChartConfigPanel'

describe('ChartConfigPanel', () => {
  const mockOnConfigChange = jest.fn()
  const mockOnSyncConfigChange = jest.fn()

  const defaultProps = {
    config: DEFAULT_CHART_CONFIG,
    syncConfig: DEFAULT_SYNC_CONFIG,
    onConfigChange: mockOnConfigChange,
    onSyncConfigChange: mockOnSyncConfigChange
  }

  beforeEach(() => {
    jest.clearAllMocks()
  })

  describe('Rendering', () => {
    it('renders all configuration sections', () => {
      render(<ChartConfigPanel {...defaultProps} />)

      expect(screen.getByText('Chart Configuration')).toBeInTheDocument()
      expect(screen.getByText('Chart Type')).toBeInTheDocument()
      expect(screen.getByText('Colors')).toBeInTheDocument()
      expect(screen.getByText('Style')).toBeInTheDocument()
      expect(screen.getByText('Data Processing')).toBeInTheDocument()
      expect(screen.getByText('Chart Synchronization')).toBeInTheDocument()
    })

    it('displays current configuration values', () => {
      const customConfig: ChartConfiguration = {
        ...DEFAULT_CHART_CONFIG,
        type: 'area',
        style: {
          ...DEFAULT_CHART_CONFIG.style,
          lineWidth: 5
        }
      }

      render(
        <ChartConfigPanel
          {...defaultProps}
          config={customConfig}
        />
      )

      // Check if area chart is selected
      expect(screen.getByDisplayValue('area')).toBeInTheDocument()
      
      // Check if line width is displayed
      expect(screen.getByDisplayValue('5')).toBeInTheDocument()
    })
  })

  describe('Chart Type Configuration', () => {
    it('changes chart type', async () => {
      render(<ChartConfigPanel {...defaultProps} />)

      const chartTypeSelect = screen.getByRole('combobox')
      fireEvent.click(chartTypeSelect)

      const areaOption = screen.getByText('Area Chart')
      fireEvent.click(areaOption)

      await waitFor(() => {
        expect(mockOnConfigChange).toHaveBeenCalledWith(
          expect.objectContaining({
            type: 'area'
          })
        )
      })
    })
  })

  describe('Color Configuration', () => {
    it('updates primary color', async () => {
      render(<ChartConfigPanel {...defaultProps} />)

      const primaryColorInput = screen.getByLabelText('Primary')
      fireEvent.change(primaryColorInput, { target: { value: '#ff0000' } })

      await waitFor(() => {
        expect(mockOnConfigChange).toHaveBeenCalledWith(
          expect.objectContaining({
            colors: expect.objectContaining({
              primary: '#ff0000'
            })
          })
        )
      })
    })

    it('updates secondary color', async () => {
      render(<ChartConfigPanel {...defaultProps} />)

      const secondaryColorInput = screen.getByLabelText('Secondary')
      fireEvent.change(secondaryColorInput, { target: { value: '#00ff00' } })

      await waitFor(() => {
        expect(mockOnConfigChange).toHaveBeenCalledWith(
          expect.objectContaining({
            colors: expect.objectContaining({
              secondary: '#00ff00'
            })
          })
        )
      })
    })
  })

  describe('Style Configuration', () => {
    it('updates line width', async () => {
      render(<ChartConfigPanel {...defaultProps} />)

      const lineWidthInput = screen.getByLabelText('Line Width')
      fireEvent.change(lineWidthInput, { target: { value: '5' } })

      await waitFor(() => {
        expect(mockOnConfigChange).toHaveBeenCalledWith(
          expect.objectContaining({
            style: expect.objectContaining({
              lineWidth: 5
            })
          })
        )
      })
    })

    it('updates point radius', async () => {
      render(<ChartConfigPanel {...defaultProps} />)

      const pointRadiusInput = screen.getByLabelText('Point Radius')
      fireEvent.change(pointRadiusInput, { target: { value: '8' } })

      await waitFor(() => {
        expect(mockOnConfigChange).toHaveBeenCalledWith(
          expect.objectContaining({
            style: expect.objectContaining({
              pointRadius: 8
            })
          })
        )
      })
    })

    it('updates opacity values', async () => {
      render(<ChartConfigPanel {...defaultProps} />)

      const fillOpacityInput = screen.getByLabelText('Fill Opacity')
      fireEvent.change(fillOpacityInput, { target: { value: '0.5' } })

      await waitFor(() => {
        expect(mockOnConfigChange).toHaveBeenCalledWith(
          expect.objectContaining({
            style: expect.objectContaining({
              fillOpacity: 0.5
            })
          })
        )
      })
    })
  })

  describe('Data Processing Configuration', () => {
    it('enables aggregation', async () => {
      render(<ChartConfigPanel {...defaultProps} />)

      const aggregationCheckbox = screen.getByLabelText('Enable Aggregation')
      fireEvent.click(aggregationCheckbox)

      await waitFor(() => {
        expect(mockOnConfigChange).toHaveBeenCalledWith(
          expect.objectContaining({
            aggregation: expect.objectContaining({
              enabled: true
            })
          })
        )
      })
    })

    it('shows aggregation options when enabled', async () => {
      const configWithAggregation: ChartConfiguration = {
        ...DEFAULT_CHART_CONFIG,
        aggregation: {
          enabled: true,
          method: 'average',
          interval: 60000
        }
      }

      render(
        <ChartConfigPanel
          {...defaultProps}
          config={configWithAggregation}
        />
      )

      expect(screen.getByLabelText('Method')).toBeInTheDocument()
      expect(screen.getByLabelText('Interval (ms)')).toBeInTheDocument()
    })

    it('updates aggregation method', async () => {
      const configWithAggregation: ChartConfiguration = {
        ...DEFAULT_CHART_CONFIG,
        aggregation: {
          enabled: true,
          method: 'average',
          interval: 60000
        }
      }

      render(
        <ChartConfigPanel
          {...defaultProps}
          config={configWithAggregation}
        />
      )

      const methodSelect = screen.getByDisplayValue('average')
      fireEvent.click(methodSelect)

      const sumOption = screen.getByText('Sum')
      fireEvent.click(sumOption)

      await waitFor(() => {
        expect(mockOnConfigChange).toHaveBeenCalledWith(
          expect.objectContaining({
            aggregation: expect.objectContaining({
              method: 'sum'
            })
          })
        )
      })
    })

    it('enables downsampling', async () => {
      render(<ChartConfigPanel {...defaultProps} />)

      const downsamplingCheckbox = screen.getByLabelText('Enable Downsampling')
      fireEvent.click(downsamplingCheckbox)

      await waitFor(() => {
        expect(mockOnConfigChange).toHaveBeenCalledWith(
          expect.objectContaining({
            downsampling: expect.objectContaining({
              enabled: true
            })
          })
        )
      })
    })

    it('updates downsampling algorithm', async () => {
      const configWithDownsampling: ChartConfiguration = {
        ...DEFAULT_CHART_CONFIG,
        downsampling: {
          enabled: true,
          maxPoints: 1000,
          algorithm: 'lttb'
        }
      }

      render(
        <ChartConfigPanel
          {...defaultProps}
          config={configWithDownsampling}
        />
      )

      const algorithmSelect = screen.getByDisplayValue('LTTB (Recommended)')
      fireEvent.click(algorithmSelect)

      const averageOption = screen.getByText('Average')
      fireEvent.click(averageOption)

      await waitFor(() => {
        expect(mockOnConfigChange).toHaveBeenCalledWith(
          expect.objectContaining({
            downsampling: expect.objectContaining({
              algorithm: 'average'
            })
          })
        )
      })
    })
  })

  describe('Synchronization Configuration', () => {
    it('enables synchronization', async () => {
      render(<ChartConfigPanel {...defaultProps} />)

      const syncCheckbox = screen.getByLabelText('Enable Synchronization')
      fireEvent.click(syncCheckbox)

      await waitFor(() => {
        expect(mockOnSyncConfigChange).toHaveBeenCalledWith(
          expect.objectContaining({
            enabled: true
          })
        )
      })
    })

    it('shows sync options when enabled', async () => {
      const syncConfigEnabled: ChartSyncConfiguration = {
        ...DEFAULT_SYNC_CONFIG,
        enabled: true
      }

      render(
        <ChartConfigPanel
          {...defaultProps}
          syncConfig={syncConfigEnabled}
        />
      )

      expect(screen.getByLabelText('Group ID')).toBeInTheDocument()
      expect(screen.getByLabelText('Sync Zoom')).toBeInTheDocument()
      expect(screen.getByLabelText('Sync Pan')).toBeInTheDocument()
      expect(screen.getByLabelText('Sync Crosshair')).toBeInTheDocument()
      expect(screen.getByLabelText('Sync Selection')).toBeInTheDocument()
    })

    it('updates group ID', async () => {
      const syncConfigEnabled: ChartSyncConfiguration = {
        ...DEFAULT_SYNC_CONFIG,
        enabled: true
      }

      render(
        <ChartConfigPanel
          {...defaultProps}
          syncConfig={syncConfigEnabled}
        />
      )

      const groupIdInput = screen.getByLabelText('Group ID')
      fireEvent.change(groupIdInput, { target: { value: 'test-group' } })

      await waitFor(() => {
        expect(mockOnSyncConfigChange).toHaveBeenCalledWith(
          expect.objectContaining({
            groupId: 'test-group'
          })
        )
      })
    })

    it('toggles sync options', async () => {
      const syncConfigEnabled: ChartSyncConfiguration = {
        ...DEFAULT_SYNC_CONFIG,
        enabled: true,
        syncZoom: true
      }

      render(
        <ChartConfigPanel
          {...defaultProps}
          syncConfig={syncConfigEnabled}
        />
      )

      const syncZoomCheckbox = screen.getByLabelText('Sync Zoom')
      fireEvent.click(syncZoomCheckbox)

      await waitFor(() => {
        expect(mockOnSyncConfigChange).toHaveBeenCalledWith(
          expect.objectContaining({
            syncZoom: false
          })
        )
      })
    })
  })

  describe('Reset Functionality', () => {
    it('resets to default configuration', async () => {
      const customConfig: ChartConfiguration = {
        ...DEFAULT_CHART_CONFIG,
        type: 'area',
        colors: {
          primary: '#ff0000',
          secondary: '#00ff00',
          fill: '#ff000040',
          stroke: '#ff0000'
        }
      }

      const customSyncConfig: ChartSyncConfiguration = {
        ...DEFAULT_SYNC_CONFIG,
        enabled: true,
        groupId: 'custom-group'
      }

      render(
        <ChartConfigPanel
          config={customConfig}
          syncConfig={customSyncConfig}
          onConfigChange={mockOnConfigChange}
          onSyncConfigChange={mockOnSyncConfigChange}
        />
      )

      const resetButton = screen.getByText('Reset to Defaults')
      fireEvent.click(resetButton)

      await waitFor(() => {
        expect(mockOnConfigChange).toHaveBeenCalledWith(DEFAULT_CHART_CONFIG)
        expect(mockOnSyncConfigChange).toHaveBeenCalledWith(DEFAULT_SYNC_CONFIG)
      })
    })
  })

  describe('Validation', () => {
    it('handles invalid numeric inputs', async () => {
      render(<ChartConfigPanel {...defaultProps} />)

      const lineWidthInput = screen.getByLabelText('Line Width')
      fireEvent.change(lineWidthInput, { target: { value: '-5' } })

      // Should still call the callback (validation can be handled by parent)
      await waitFor(() => {
        expect(mockOnConfigChange).toHaveBeenCalledWith(
          expect.objectContaining({
            style: expect.objectContaining({
              lineWidth: -5
            })
          })
        )
      })
    })

    it('handles empty string inputs', async () => {
      const syncConfigEnabled: ChartSyncConfiguration = {
        ...DEFAULT_SYNC_CONFIG,
        enabled: true
      }

      render(
        <ChartConfigPanel
          {...defaultProps}
          syncConfig={syncConfigEnabled}
        />
      )

      const groupIdInput = screen.getByLabelText('Group ID')
      fireEvent.change(groupIdInput, { target: { value: '' } })

      await waitFor(() => {
        expect(mockOnSyncConfigChange).toHaveBeenCalledWith(
          expect.objectContaining({
            groupId: ''
          })
        )
      })
    })
  })

  describe('Accessibility', () => {
    it('provides proper labels for all inputs', () => {
      render(<ChartConfigPanel {...defaultProps} />)

      // Check that all form controls have labels
      const inputs = screen.getAllByRole('textbox')
      const selects = screen.getAllByRole('combobox')
      const checkboxes = screen.getAllByRole('checkbox')

      inputs.forEach(input => {
        expect(input).toHaveAccessibleName()
      })

      selects.forEach(select => {
        expect(select).toHaveAccessibleName()
      })

      checkboxes.forEach(checkbox => {
        expect(checkbox).toHaveAccessibleName()
      })
    })

    it('supports keyboard navigation', () => {
      render(<ChartConfigPanel {...defaultProps} />)

      const firstInput = screen.getAllByRole('combobox')[0]
      firstInput.focus()
      expect(firstInput).toHaveFocus()

      // Tab navigation should work
      fireEvent.keyDown(firstInput, { key: 'Tab' })
      // Next focusable element should receive focus
    })
  })
})