"use client";

import { Component, ReactNode } from "react";

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export default class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error("ErrorBoundary caught:", error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        this.props.fallback || (
          <div className="h-full flex items-center justify-center p-4">
            <div className="text-center text-red-500">
              <div className="text-2xl mb-2">Error</div>
              <div className="text-sm text-gray-600 max-w-md">
                {this.state.error?.message || "Something went wrong"}
              </div>
              <button
                onClick={() => this.setState({ hasError: false, error: null })}
                className="mt-3 px-4 py-2 bg-blue-500 text-white rounded text-sm"
              >
                Try Again
              </button>
            </div>
          </div>
        )
      );
    }

    return this.props.children;
  }
}
