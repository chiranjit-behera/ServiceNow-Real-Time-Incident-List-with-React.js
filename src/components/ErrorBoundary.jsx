import React from 'react';

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      hasError: false,
      error: null
    };
  }

  static getDerivedStateFromError(error) {
    return {
      hasError: true,
      error
    };
  }

  componentDidCatch(error, errorInfo) {
    console.error('React error boundary caught an exception:', error, errorInfo);
  }

  handleReload = () => {
    window.location.reload();
  };

  handleTryAgain = () => {
    this.setState({ hasError: false, error: null });
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="error-boundary-shell" role="alert">
          <div className="error-boundary-card">
            <div className="error-boundary-icon">⚠️</div>
            <h1>Something went wrong</h1>
            <p>
              The dashboard hit an unexpected problem, but your session is still safe.
              You can try again or reload the page.
            </p>

            <div className="error-boundary-actions">
              <button type="button" className="btn btn-primary" onClick={this.handleReload}>
                Reload App
              </button>
              <button type="button" className="btn btn-default" onClick={this.handleTryAgain}>
                Try Again
              </button>
            </div>

            {this.state.error?.message && (
              <details className="error-boundary-details">
                <summary>Technical details</summary>
                <pre>{this.state.error.message}</pre>
              </details>
            )}
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
