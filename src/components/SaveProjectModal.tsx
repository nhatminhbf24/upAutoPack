import React, { useState, useEffect } from 'react';
import { Save, Folder, X, Image as ImageIcon, Layers, FileCheck } from 'lucide-react';

interface SaveProjectModalProps {
  isOpen: boolean;
  defaultName?: string;
  photoCount: number;
  pageCount: number;
  onSave: (projectName: string) => void;
  onClose: () => void;
}

export const SaveProjectModal: React.FC<SaveProjectModalProps> = ({
  isOpen,
  defaultName = '',
  photoCount,
  pageCount,
  onSave,
  onClose,
}) => {
  const [projectName, setProjectName] = useState(defaultName);

  useEffect(() => {
    if (isOpen) {
      const now = new Date();
      const defaultDateStr = `Du_An_In_${now.getDate()}_${now.getMonth() + 1}_${now.getFullYear()}`;
      setProjectName(defaultName || defaultDateStr);
    }
  }, [isOpen, defaultName]);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const finalName = projectName.trim() || 'Du_An_In_Anh';
    onSave(finalName);
  };

  return (
    <div
      id="save-project-backdrop"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs animate-fadeIn"
      onClick={onClose}
    >
      <div
        id="save-project-modal"
        className="w-full max-w-md bg-white border border-slate-200 rounded-3xl shadow-2xl overflow-hidden p-6 space-y-5 transform transition-all animate-scaleUp text-slate-800"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-slate-100">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-pink-100 text-pink-600 rounded-2xl">
              <Save className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900">Lưu Dự Án .daudau</h3>
              <p className="text-xs text-slate-500">Đóng gói dự án mang đi in hoặc lưu trữ</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 p-1.5 rounded-xl hover:bg-slate-100 transition cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Project Info Summary */}
        <div className="bg-slate-50 border border-slate-200/80 rounded-2xl p-3.5 space-y-2 text-xs">
          <div className="flex items-center justify-between text-slate-600">
            <span className="flex items-center gap-1.5">
              <ImageIcon className="w-3.5 h-3.5 text-pink-500" /> Tổng số ảnh:
            </span>
            <span className="font-bold text-slate-800 bg-white px-2 py-0.5 rounded-lg border border-slate-200">
              {photoCount} bức ảnh
            </span>
          </div>
          <div className="flex items-center justify-between text-slate-600">
            <span className="flex items-center gap-1.5">
              <Layers className="w-3.5 h-3.5 text-indigo-500" /> Số trang A4 dự kiến:
            </span>
            <span className="font-bold text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded-lg border border-indigo-200">
              {pageCount} trang
            </span>
          </div>
          <div className="flex items-center justify-between text-slate-600">
            <span className="flex items-center gap-1.5">
              <FileCheck className="w-3.5 h-3.5 text-emerald-500" /> Định dạng tệp:
            </span>
            <span className="font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-lg border border-emerald-200">
              .daudau (Tương thích chuẩn ZIP)
            </span>
          </div>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
              Tên tệp dự án:
            </label>
            <div className="relative flex items-center">
              <input
                type="text"
                id="input-project-name"
                value={projectName}
                onChange={(e) => setProjectName(e.target.value)}
                placeholder="Ví dụ: Du_An_In_Album_Gia_Dinh..."
                autoFocus
                className="w-full bg-slate-50 border border-slate-300 focus:border-pink-500 focus:ring-4 focus:ring-pink-100 rounded-xl px-3.5 py-2.5 text-xs font-semibold text-slate-800 outline-none transition"
              />
              <div className="absolute right-3 text-slate-400">
                <Folder className="w-4 h-4" />
              </div>
            </div>
            <p className="text-[11px] text-slate-400">
              Tệp sẽ được tải về với đuôi <span className="font-mono font-bold text-pink-600">.daudau</span>
            </p>
          </div>

          <div className="flex items-center gap-2 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-2.5 px-3 rounded-xl text-xs font-bold text-slate-600 bg-slate-100 hover:bg-slate-200 transition cursor-pointer"
            >
              Hủy bỏ
            </button>
            <button
              type="submit"
              id="btn-confirm-save-project"
              className="flex-2 py-2.5 px-4 rounded-xl text-xs font-bold text-white bg-gradient-to-r from-pink-600 to-rose-600 hover:from-pink-700 hover:to-rose-700 shadow-md shadow-pink-600/20 transition flex items-center justify-center gap-1.5 cursor-pointer active:scale-98"
            >
              <Save className="w-4 h-4" />
              <span>Xác nhận & Tải về</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
