import { Component, type ErrorInfo, type ReactNode } from "react";

interface AppErrorBoundaryProps {
  children: ReactNode;
}

interface AppErrorBoundaryState {
  error?: Error;
}

class AppErrorBoundary extends Component<AppErrorBoundaryProps, AppErrorBoundaryState> {
  state: AppErrorBoundaryState = {};

  static getDerivedStateFromError(error: Error): AppErrorBoundaryState {
    return { error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("App crashed", error, errorInfo);
  }

  render() {
    if (this.state.error) {
      return (
        <div className="min-h-screen bg-background px-[24px] py-[48px]">
          <div className="mx-auto max-w-lg rounded-3xl bg-card p-[24px] shadow-card">
            <h1 className="text-xl font-semibold text-foreground">Something went wrong</h1>
            <p className="mt-[10px] text-sm text-muted-foreground">
              The app hit a runtime error instead of loading the next screen.
            </p>
            <pre className="mt-[16px] overflow-auto rounded-2xl bg-secondary/40 p-[16px] text-xs text-foreground whitespace-pre-wrap">
              {this.state.error.message}
            </pre>
            <button
              onClick={() => window.location.reload()}
              className="mt-[16px] inline-flex rounded-full bg-accent px-[16px] py-[10px] text-sm font-semibold text-accent-foreground"
            >
              Reload app
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default AppErrorBoundary;
