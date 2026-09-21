import { Component } from 'react';
import type { ErrorInfo, ReactNode } from 'react';
import { AlertCircle, RefreshCw } from 'lucide-react';

interface Props {
    children: ReactNode;
    fallback?: ReactNode;
    onReset?: () => void;
}

interface State {
    hasError: boolean;
    error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
    public state: State = {
        hasError: false,
        error: null
    };

    public static getDerivedStateFromError(error: Error): State {
        return { hasError: true, error };
    }

    public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
        console.error('Uncaught error:', error, errorInfo);
    }

    private handleReset = () => {
        this.setState({ hasError: false, error: null });
        if (this.props.onReset) {
            this.props.onReset();
        } else {
            window.location.reload();
        }
    };

    public render() {
        if (this.state.hasError) {
            if (this.props.fallback) {
                return this.props.fallback;
            }

            return (
                <div className="min-h-[400px] flex items-center justify-center p-6 bg-red-50 rounded-xl border border-red-100">
                    <div className="max-w-md w-full text-center space-y-4">
                        <div className="inline-flex items-center justify-center w-12 h-12 bg-red-100 rounded-full text-red-600">
                            <AlertCircle size={24} />
                        </div>
                        <h2 className="text-xl font-bold text-gray-900">Something went wrong</h2>
                        <p className="text-gray-600 text-sm">
                            An unexpected error occurred in this view. This might be due to a connection issue or data inconsistency.
                        </p>
                        {this.state.error && (
                            <div className="bg-white/50 p-3 rounded text-left text-xs font-mono text-red-800 overflow-auto max-h-32">
                                {this.state.error.message}
                            </div>
                        )}
                        <button
                            onClick={this.handleReset}
                            className="inline-flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors font-medium"
                        >
                            <RefreshCw size={18} />
                            Reload View
                        </button>
                    </div>
                </div>
            );
        }

        return this.props.children;
    }
}