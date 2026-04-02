'use client'

import React from 'react'

interface ErrorBoundaryState {
    hasError: boolean
    error?: Error
}

interface ErrorBoundaryProps {
    children: React.ReactNode
    fallback?: React.ComponentType<{ error?: Error; resetError: () => void }>
}

class ErrorBoundary extends React.Component<ErrorBoundaryProps, ErrorBoundaryState> {
    constructor(props: ErrorBoundaryProps) {
        super(props)
        this.state = { hasError: false }
    }

    static getDerivedStateFromError(error: Error): ErrorBoundaryState {
        return { hasError: true, error }
    }

    componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
        console.error('ErrorBoundary caught an error:', error, errorInfo)
    }

    resetError = () => {
        this.setState({ hasError: false, error: undefined })
    }

    render() {
        if (this.state.hasError) {
            const Fallback = this.props.fallback || DefaultErrorFallback
            return <Fallback error={this.state.error} resetError={this.resetError} />
        }

        return this.props.children
    }
}

function DefaultErrorFallback({ error, resetError }: { error?: Error; resetError: () => void }) {
    return (
        <div className="flex flex-col items-center justify-center min-h-[400px] p-8 border border-red-500/40 bg-red-500/10 rounded-lg">
            <h2 className="text-red-400 text-lg font-bold mb-4">Something went wrong</h2>
            <p className="text-[#C4C4C4] text-sm mb-4 text-center">
                {error?.message || 'An unexpected error occurred.'}
            </p>
            <button
                onClick={resetError}
                className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700 transition-colors"
            >
                Try Again
            </button>
        </div>
    )
}

export default ErrorBoundary