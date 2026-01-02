import { Component, ErrorInfo, ReactNode } from 'react';
import { Button } from '@fluentui/react-components';
import { ArrowSync20Regular } from '@fluentui/react-icons';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('ErrorBoundary caught an error:', error, errorInfo);
  }

  private handleReset = () => {
    this.setState({ hasError: false, error: null });
  };

  public render() {
    if (this.state.hasError) {
      return (
        <div className="app-container" style={{ padding: '20px' }}>
          <div className="error-message">
            <h3 style={{ marginBottom: '8px' }}>Something went wrong</h3>
            <p style={{ marginBottom: '12px', fontSize: '13px' }}>
              {this.state.error?.message || 'An unexpected error occurred'}
            </p>
            <Button
              appearance="primary"
              icon={<ArrowSync20Regular />}
              onClick={this.handleReset}
            >
              Try Again
            </Button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
