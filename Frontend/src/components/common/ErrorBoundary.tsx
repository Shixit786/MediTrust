import { Component, type ErrorInfo, type ReactNode } from 'react';
import { AlertCircle, RotateCcw, Home } from 'lucide-react';

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
    // Keep error logging clean and captured for debugging
    if (import.meta.env.DEV) {
      console.error('Uncaught error in component tree:', error, errorInfo);
    }
  }

  private handleReload = () => {
    window.location.reload();
  };

  private handleGoHome = () => {
    window.location.href = '/';
  };

  public render() {
    if (this.state.hasError) {
      return (
        <div
          role="alert"
          className="min-h-screen w-full bg-[#F0F0F0] text-[#0A0A0A] flex flex-col justify-between p-6 sm:p-14"
        >
          {/* Top hairline label */}
          <div className="w-full max-w-[1400px] mx-auto flex justify-between items-center border-b border-[#0A0A0A] pb-6">
            <span className="font-mono text-xs font-semibold uppercase tracking-wider text-[#0037FF]">
              SYSTEM EXCEPTION // CRITICAL RECOVERY
            </span>
            <span className="font-mono text-xs text-[#6B6F76] uppercase tracking-wider">
              MEDITRUST AI
            </span>
          </div>

          {/* Central error content */}
          <div className="w-full max-w-[900px] mx-auto py-16 sm:py-24 flex flex-col items-start gap-8">
            <div className="w-12 h-12 rounded-[16px] bg-[#EF4444]/10 border border-[#EF4444]/30 flex items-center justify-center text-[#DC2626]">
              <AlertCircle className="w-6 h-6" strokeWidth={1.75} />
            </div>

            <div>
              <span className="font-mono text-xs sm:text-sm text-[#DC2626] tracking-widest uppercase font-semibold block mb-3">
                APPLICATION STATE FAULT
              </span>
              <h1 className="text-4xl sm:text-6xl md:text-7xl font-light font-['Inter_Tight'] tracking-tight leading-none text-[#0A0A0A]">
                SOMETHING WENT WRONG
              </h1>
            </div>

            <p className="text-base sm:text-lg text-[#6B6F76] font-['Inter_Tight'] font-normal max-w-xl">
              An unexpected runtime anomaly interrupted the verification pipeline. All critical
              stored state and encryption keys remain secured.
            </p>

            {this.state.error?.message && (
              <div className="w-full p-4 rounded-[16px] bg-white border border-[#0A0A0A]/10 font-mono text-xs text-[#6B6F76] overflow-x-auto">
                <span className="text-[#0A0A0A] font-semibold">DIAGNOSTIC: </span>
                {this.state.error.message}
              </div>
            )}

            {/* Actions */}
            <div className="flex flex-wrap items-center gap-4 pt-2">
              <button
                type="button"
                onClick={this.handleReload}
                className="px-6 py-3.5 rounded-[16px] bg-[#0A0A0A] text-white hover:bg-[#202020] transition-colors font-mono text-xs font-semibold tracking-wider flex items-center gap-2 cursor-pointer shadow-sm active:scale-95"
              >
                <RotateCcw className="w-4 h-4" />
                <span>RELOAD</span>
              </button>

              <button
                type="button"
                onClick={this.handleGoHome}
                className="px-6 py-3.5 rounded-[16px] bg-white border border-[#0A0A0A] text-[#0A0A0A] hover:bg-[#F8F8F8] transition-colors font-mono text-xs font-semibold tracking-wider flex items-center gap-2 cursor-pointer active:scale-95"
              >
                <Home className="w-4 h-4" />
                <span>GO HOME</span>
              </button>
            </div>
          </div>

          {/* Bottom hairline footer */}
          <div className="w-full max-w-[1400px] mx-auto pt-6 border-t border-[#0A0A0A] flex flex-col sm:flex-row justify-between items-center gap-3">
            <span className="font-mono text-xs text-[#6B6F76]">
              STATUS 500 · SELF-HEALING PROTOCOL ARMED
            </span>
            <span className="font-mono text-xs text-[#0037FF]">
              EARLY WARNING, NOT PROOF
            </span>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
