import React, { Component, ErrorInfo, ReactNode } from 'react';
import { AlertTriangle, RefreshCw, RotateCcw } from 'lucide-react';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
    errorInfo: null,
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error, errorInfo: null };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('*** Uncaught error in React ErrorBoundary ***:', error, errorInfo);
    this.setState({ error, errorInfo });
  }

  private handleReset = () => {
    this.setState({ hasError: false, error: null, errorInfo: null });
  };

  private handleReload = () => {
    window.location.reload();
  };

  public render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <div className="fixed inset-0 z-[99999] flex items-center justify-center bg-slate-900/90 backdrop-blur-md p-6">
          <div className="max-w-lg w-full bg-white rounded-3xl p-8 shadow-2xl border border-slate-200 text-center flex flex-col items-center">
            <div className="w-16 h-16 rounded-2xl bg-amber-100 flex items-center justify-center mb-5 text-amber-600 ring-8 ring-amber-50">
              <AlertTriangle className="w-9 h-9" />
            </div>

            <h2 className="text-2xl font-black text-slate-800 tracking-tight mb-2">
              Đã xảy ra sự cố hiển thị
            </h2>
            <p className="text-slate-600 text-sm leading-relaxed mb-6 font-medium">
              Giao diện gặp lỗi ngoài dự kiến trong quá trình xử lý hình ảnh. Bạn có thể thử khôi phục lại phiên làm việc hoặc tải lại trang.
            </p>

            {this.state.error && (
              <div className="w-full mb-6 text-left bg-slate-50 border border-slate-200 rounded-xl p-3 max-h-36 overflow-auto font-mono text-xs text-rose-700">
                <p className="font-bold">{this.state.error.name}: {this.state.error.message}</p>
                {this.state.errorInfo?.componentStack && (
                  <pre className="text-[10px] text-slate-500 mt-1 whitespace-pre-wrap">
                    {this.state.errorInfo.componentStack.slice(0, 400)}
                  </pre>
                )}
              </div>
            )}

            <div className="flex flex-col sm:flex-row items-center gap-3 w-full">
              <button
                type="button"
                onClick={this.handleReset}
                className="w-full sm:flex-1 flex items-center justify-center gap-2 py-3 px-4 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-sm transition cursor-pointer"
              >
                <RotateCcw className="w-4 h-4" />
                <span>Thử tiếp tục</span>
              </button>
              <button
                type="button"
                onClick={this.handleReload}
                className="w-full sm:flex-1 flex items-center justify-center gap-2 py-3 px-4 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-bold text-sm shadow-md shadow-rose-600/20 transition cursor-pointer"
              >
                <RefreshCw className="w-4 h-4" />
                <span>Tải lại trang</span>
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
