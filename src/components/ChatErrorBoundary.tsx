/**
 * ChatErrorBoundary.tsx
 * Error boundary untuk komponen chat — mencegah white screen saat ada error render.
 * Menampilkan fallback UI dan opsi untuk retry.
 */

import { Component, type ErrorInfo, type ReactNode } from 'react';

interface Props {
  children: ReactNode;
  /** Pesan fallback yang ditampilkan */
  fallbackMessage?: string;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ChatErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('[ChatErrorBoundary] Error:', error, info.componentStack);
  }

  handleRetry = () => {
    this.setState({ hasError: false, error: null });
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex flex-col items-center justify-center p-8 gap-4 text-center">
          <div className="w-14 h-14 rounded-full bg-[var(--admin-error,#ef4444)]/15 flex items-center justify-center">
            <svg className="w-7 h-7 text-[var(--admin-error,#ef4444)]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4.5c-.77-.833-2.694-.833-3.464 0L3.34 16.5c-.77.833.192 2.5 1.732 2.5z" />
            </svg>
          </div>
          <div className="space-y-1">
            <p className="text-sm font-medium text-[var(--admin-text,white)]">
              {this.props.fallbackMessage || 'Terjadi kesalahan pada komponen chat'}
            </p>
            <p className="text-xs text-[var(--admin-text-muted,#888)]">
              {this.state.error?.message || 'Unknown error'}
            </p>
          </div>
          <button
            onClick={this.handleRetry}
            className="px-4 py-2 text-sm bg-[var(--admin-accent,#ec4899)] text-white rounded-lg hover:brightness-110 transition-all active:scale-95 touch-manipulation"
          >
            Coba Lagi
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}
