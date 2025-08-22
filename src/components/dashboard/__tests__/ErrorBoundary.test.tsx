import React from 'react'
import { render, screen, fireEvent } from '@testing-library/react'
import '@testing-library/jest-dom'
import { 
  ErrorBoundary, 
  DefaultErrorFallback, 
  ChartErrorFallback, 
  DataGridErrorFallback,
  withErrorBoundary 
} from '../ErrorBoundary'

// Mock component that throws an error
const ThrowError = ({ shouldThrow = false }: { shouldThrow?: boolean }) => {
  if (shouldThrow) {
    throw new Error('Test error message')
  }
  return <div>No error</div>
}

describe('ErrorBoundary', () => {
  // Suppress console.error for these tests
  const originalError = console.error
  beforeAll(() => {
    console.error = jest.fn()
  })
  afterAll(() => {
    console.error = originalError
  })

  it('renders children when there is no error', () => {
    render(
      <ErrorBoundary>
        <ThrowError shouldThrow={false} />
      </ErrorBoundary>
    )
    
    expect(screen.getByText('No error')).toBeInTheDocument()
  })

  it('renders default error fallback when error occurs', () => {
    render(
      <ErrorBoundary>
        <ThrowError shouldThrow={true} />
      </ErrorBoundary>
    )
    
    expect(screen.getByText('Something went wrong')).toBeInTheDocument()
    expect(screen.getByText('Test error message')).toBeInTheDocument()
  })

  it('renders custom fallback when provided', () => {
    const CustomFallback = ({ error, resetError }: any) => (
      <div>
        <span>Custom error: {error.message}</span>
        <button onClick={resetError}>Custom Reset</button>
      </div>
    )
    
    render(
      <ErrorBoundary fallback={CustomFallback}>
        <ThrowError shouldThrow={true} />
      </ErrorBoundary>
    )
    
    expect(screen.getByText('Custom error: Test error message')).toBeInTheDocument()
    expect(screen.getByText('Custom Reset')).toBeInTheDocument()
  })

  it('calls onError callback when error occurs', () => {
    const onError = jest.fn()
    
    render(
      <ErrorBoundary onError={onError}>
        <ThrowError shouldThrow={true} />
      </ErrorBoundary>
    )
    
    expect(onError).toHaveBeenCalledWith(
      expect.any(Error),
      expect.any(Object)
    )
  })

  it('shows try again button when error occurs', () => {
    render(
      <ErrorBoundary>
        <ThrowError shouldThrow={true} />
      </ErrorBoundary>
    )
    
    expect(screen.getByText('Something went wrong')).toBeInTheDocument()
    expect(screen.getByText('Try Again')).toBeInTheDocument()
    expect(screen.getByText('Reload Page')).toBeInTheDocument()
  })
})

describe('DefaultErrorFallback', () => {
  const mockError = new Error('Test error message')
  const mockResetError = jest.fn()

  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('displays error message', () => {
    render(
      <DefaultErrorFallback error={mockError} resetError={mockResetError} />
    )
    
    expect(screen.getByText('Something went wrong')).toBeInTheDocument()
    expect(screen.getByText('Test error message')).toBeInTheDocument()
  })

  it('calls resetError when Try Again button is clicked', () => {
    render(
      <DefaultErrorFallback error={mockError} resetError={mockResetError} />
    )
    
    const tryAgainButton = screen.getByText('Try Again')
    fireEvent.click(tryAgainButton)
    
    expect(mockResetError).toHaveBeenCalledTimes(1)
  })

  it('shows technical details in development mode', () => {
    const originalEnv = process.env.NODE_ENV
    process.env.NODE_ENV = 'development'
    
    render(
      <DefaultErrorFallback error={mockError} resetError={mockResetError} />
    )
    
    expect(screen.getByText('Technical Details')).toBeInTheDocument()
    
    process.env.NODE_ENV = originalEnv
  })
})

describe('ChartErrorFallback', () => {
  const mockError = new Error('Chart rendering failed')
  const mockResetError = jest.fn()

  it('displays chart-specific error message', () => {
    render(
      <ChartErrorFallback error={mockError} resetError={mockResetError} />
    )
    
    expect(screen.getByText('Chart Error')).toBeInTheDocument()
    expect(screen.getByText('Failed to render chart: Chart rendering failed')).toBeInTheDocument()
  })

  it('calls resetError when Retry button is clicked', () => {
    render(
      <ChartErrorFallback error={mockError} resetError={mockResetError} />
    )
    
    const retryButton = screen.getByText('Retry')
    fireEvent.click(retryButton)
    
    expect(mockResetError).toHaveBeenCalledTimes(1)
  })
})

describe('DataGridErrorFallback', () => {
  const mockError = new Error('Data loading failed')
  const mockResetError = jest.fn()

  it('displays data grid-specific error message', () => {
    render(
      <DataGridErrorFallback error={mockError} resetError={mockResetError} />
    )
    
    expect(screen.getByText('Data Grid Error')).toBeInTheDocument()
    expect(screen.getByText('Failed to load data grid: Data loading failed')).toBeInTheDocument()
  })

  it('calls resetError when Retry button is clicked', () => {
    render(
      <DataGridErrorFallback error={mockError} resetError={mockResetError} />
    )
    
    const retryButton = screen.getByText('Retry')
    fireEvent.click(retryButton)
    
    expect(mockResetError).toHaveBeenCalledTimes(1)
  })
})

describe('withErrorBoundary', () => {
  const TestComponent = ({ shouldThrow = false }: { shouldThrow?: boolean }) => {
    if (shouldThrow) {
      throw new Error('HOC test error')
    }
    return <div>HOC test component</div>
  }

  // Suppress console.error for these tests
  const originalError = console.error
  beforeAll(() => {
    console.error = jest.fn()
  })
  afterAll(() => {
    console.error = originalError
  })

  it('wraps component with error boundary', () => {
    const WrappedComponent = withErrorBoundary(TestComponent)
    
    render(<WrappedComponent shouldThrow={false} />)
    
    expect(screen.getByText('HOC test component')).toBeInTheDocument()
  })

  it('catches errors in wrapped component', () => {
    const WrappedComponent = withErrorBoundary(TestComponent)
    
    render(<WrappedComponent shouldThrow={true} />)
    
    expect(screen.getByText('Something went wrong')).toBeInTheDocument()
  })

  it('uses custom fallback when provided', () => {
    const CustomFallback = ({ error }: any) => (
      <div>Custom HOC fallback: {error.message}</div>
    )
    
    const WrappedComponent = withErrorBoundary(TestComponent, CustomFallback)
    
    render(<WrappedComponent shouldThrow={true} />)
    
    expect(screen.getByText('Custom HOC fallback: HOC test error')).toBeInTheDocument()
  })
})