import React, { ErrorInfo, ReactNode } from 'react';
import ErrorPage from './ErrorPage';

interface Props {
  children: ReactNode;
  onGoHome: () => void;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

class ErrorBoundary extends React.Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Uncaught error:', error, errorInfo);
  }

  private handleGoHome = () => {
    this.setState({ hasError: false, error: null });
    this.props.onGoHome();
  };

  private handleRetry = () => {
    this.setState({ hasError: false, error: null });
  };

  public render() {
    if (this.state.hasError) {
      return (
        <ErrorPage 
          code={500}
          title="System Failure"
          message={this.state.error?.message || "An unexpected error occurred in the neural network."}
          onGoHome={this.handleGoHome}
          onRetry={this.handleRetry}
        />
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;