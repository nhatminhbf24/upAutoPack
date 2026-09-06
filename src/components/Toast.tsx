import React from 'react';
import { CheckCircle2, AlertCircle, Info, X } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

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
  // Giới hạn hiển thị tối đa 5 thông báo mới nhất
  const visibleToasts = toasts.slice(-5);

  if (visibleToasts.length === 0) return null;

  return (
    <div
      id="toast-container"
      className="no-print fixed bottom-5 right-5 z-50 flex flex-col-reverse gap-2 pointer-events-auto max-w-sm w-auto"
    >
      <AnimatePresence mode="popLayout">
        {visibleToasts.map((toast) => (
          <motion.div
            key={toast.id}
            id={`toast-${toast.id}`}
            layout
            initial={{ opacity: 0, y: 15, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9, x: 20, transition: { duration: 0.15 } }}
            transition={{ duration: 0.2 }}
            className={`flex items-center gap-2.5 px-3.5 py-2.5 rounded-xl shadow-lg text-xs font-medium text-white border border-white/10 ${
              toast.type === 'error'
                ? 'bg-rose-600/95 shadow-rose-950/30'
                : toast.type === 'info'
                ? 'bg-blue-600/95 shadow-blue-950/30'
                : 'bg-slate-900/95 backdrop-blur-md shadow-black/40'
            }`}
          >
            {toast.type === 'success' && <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />}
            {toast.type === 'error' && <AlertCircle className="w-4 h-4 text-rose-300 shrink-0" />}
            {toast.type === 'info' && <Info className="w-4 h-4 text-sky-300 shrink-0" />}
            <span className="flex-1 leading-snug break-words line-clamp-2">{toast.text}</span>
            <button
              onClick={() => onDismiss(toast.id)}
              className="p-1 hover:bg-white/20 rounded-md transition text-white/70 hover:text-white shrink-0 ml-1"
              title="Đóng"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
};
