import React from 'react';
import { RotateCcw, Plus, Clock, Image as ImageIcon, AlertCircle } from 'lucide-react';
import { ProjectMetadata } from '../utils/projectStorage';

interface RestoreSessionModalProps {
  isOpen: boolean;
  meta: ProjectMetadata;
  onRestore: () => void;
  onDiscard: () => void;
}

export const RestoreSessionModal: React.FC<RestoreSessionModalProps> = ({
  isOpen,
  meta,
  onRestore,
  onDiscard,
}) => {
  if (!isOpen) return null;

  const formatTime = (ts: number) => {
    try {
      const date = new Date(ts);
      return date.toLocaleTimeString('vi-VN', {
        hour: '2-digit',
        minute: '2-digit',
        day: '2-digit',
        month: '2-digit',
      });
    } catch {
      return 'Vừa xong';
    }
  };

  const photoCount = meta.photosMeta?.length || 0;

  return (
    <div
      id="restore-session-backdrop"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-fadeIn"
    >
      <div
        id="restore-session-modal"
        className="w-full max-w-md bg-neutral-900 border border-neutral-800 rounded-2xl shadow-2xl overflow-hidden p-6 space-y-5 transform transition-all animate-scaleUp"
      >
        <div className="flex items-start gap-3.5">
          <div className="p-3 bg-amber-500/10 border border-amber-500/20 text-amber-400 rounded-xl">
            <AlertCircle className="w-6 h-6" />
          </div>
          <div>
            <h3 className="text-lg font-bold text-neutral-100">Khôi phục dự án chưa hoàn thành?</h3>
            <p className="text-xs text-neutral-400 mt-1 leading-relaxed">
              Hệ thống phát hiện một phiên làm việc gần nhất đã được tự động lưu ngầm. Bạn có muốn tiếp tục hay bắt đầu mới?
            </p>
          </div>
        </div>

        <div className="bg-neutral-950/80 border border-neutral-800/80 rounded-xl p-3.5 space-y-2 text-xs">
          <div className="flex items-center justify-between text-neutral-300">
            <span className="flex items-center gap-1.5 text-neutral-400">
              <ImageIcon className="w-3.5 h-3.5 text-blue-400" /> Số lượng ảnh:
            </span>
            <span className="font-semibold text-neutral-100">{photoCount} bức ảnh</span>
          </div>

          <div className="flex items-center justify-between text-neutral-300">
            <span className="flex items-center gap-1.5 text-neutral-400">
              <Clock className="w-3.5 h-3.5 text-amber-400" /> Tự động lưu lúc:
            </span>
            <span className="font-semibold text-neutral-100">{formatTime(meta.lastUpdated)}</span>
          </div>

          <div className="flex items-center justify-between text-neutral-300">
            <span className="text-neutral-400">Khổ giấy in:</span>
            <span className="font-semibold text-neutral-100 uppercase">
              A4 {meta.settings?.paperOrientation === 'landscape' ? 'Ngang' : 'Dọc'}
            </span>
          </div>
        </div>

        <div className="flex items-center justify-end gap-2.5 pt-1">
          <button
            id="btn-discard-session"
            onClick={onDiscard}
            className="flex-1 py-2.5 px-4 rounded-xl text-xs font-medium text-neutral-400 hover:text-neutral-200 bg-neutral-800/80 hover:bg-neutral-800 border border-neutral-700/60 transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
          >
            <Plus className="w-4 h-4" /> Bắt đầu mới
          </button>
          <button
            id="btn-restore-session"
            onClick={onRestore}
            className="flex-1 py-2.5 px-4 rounded-xl text-xs font-semibold text-white bg-blue-600 hover:bg-blue-500 shadow-md shadow-blue-600/25 transition-all flex items-center justify-center gap-1.5 cursor-pointer"
          >
            <RotateCcw className="w-4 h-4" /> Khôi phục dự án
          </button>
        </div>
      </div>
    </div>
  );
};
