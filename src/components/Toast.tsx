import React from 'react';
import { CheckCircle2, AlertCircle, Info, X } from 'lucide-react';

export interface ToastMessage {
  id: string;
  type: 'success' | 'error' | 'info';
  text: string;
}

interface ToastProps {
  toasts: ToastMessage[];
  onDismiss: (id: string) => void;
}

export const ToastContainer: React.FC<ToastProps> = ({ toasts, onDismiss }) => {
  if (toasts.length === 0) return null;

  return (
    <div id="toast-container" className="no-print fixed bottom-5 right-5 z-50 flex flex-col-reverse gap-2.5 pointer-events-auto">
      {toasts.map((toast) => (
        <div
          key={toast.id}
          id={`toast-${toast.id}`}
          className={`flex items-center gap-2.5 px-4 py-3 rounded-2xl shadow-xl text-xs font-semibold transition-all duration-300 text-white min-w-[280px] max-w-md border border-white/10 animate-fadeIn ${
            toast.type === 'error'
              ? 'bg-rose-600 shadow-rose-600/30'
              : toast.type === 'info'
              ? 'bg-blue-600 shadow-blue-600/30'
              : 'bg-slate-900/95 backdrop-blur-md shadow-slate-900/40'
          }`}
        >
          {toast.type === 'success' && <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />}
          {toast.type === 'error' && <AlertCircle className="w-4 h-4 text-rose-300 shrink-0" />}
          {toast.type === 'info' && <Info className="w-4 h-4 text-sky-300 shrink-0" />}
          <span className="flex-1 leading-snug">{toast.text}</span>
          <button
            onClick={() => onDismiss(toast.id)}
            className="p-1 hover:bg-white/20 rounded-md transition text-white/80 hover:text-white"
            title="Đóng"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      ))}
    </div>
  );
};
