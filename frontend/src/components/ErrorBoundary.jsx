import { Component } from 'react'

export default class ErrorBoundary extends Component {
  state = { hasError: false, error: null }

  static getDerivedStateFromError(error) {
    return { hasError: true, error }
  }

  componentDidCatch(error, info) {
    console.error('Error boundary caught:', error, info)
  }

  render() {
    if (this.state.hasError) {
      return (
        <div style={{ padding: 40, textAlign: 'center' }}>
          <h1>Something went wrong</h1>
          <p style={{ color: '#666', marginTop: 8 }}>
            {this.state.error?.message || 'An unexpected error occurred'}
          </p>
          <button
            onClick={() => window.location.href = '/'}
            style={{ marginTop: 20, padding: '8px 16px' }}
          >
            Go to Home
          </button>
        </div>
      )
    }

    return this.props.children
  }
}
