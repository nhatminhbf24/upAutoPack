import React, { useState } from 'react';
import { KeyRound, Lock, ArrowRight, ShieldCheck, AlertCircle } from 'lucide-react';

interface ActivationModalProps {
  onUnlock: () => void;
}

const SECRET_CODE = '0798408406';

export const ActivationModal: React.FC<ActivationModalProps> = ({ onUnlock }) => {
  const [code, setCode] = useState('');
  const [error, setError] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const cleanCode = code.trim();

    if (!cleanCode) {
      setError(true);
      setErrorMessage('Vui lòng nhập mã kích hoạt.');
      return;
    }

    if (cleanCode === SECRET_CODE) {
      try {
        localStorage.setItem('daudau_unlocked', 'true');
      } catch (err) {
        console.warn('Cannot write to localStorage', err);
      }
      onUnlock();
    } else {
      setError(true);
      setErrorMessage('Mã kích hoạt không chính xác. Vui lòng kiểm tra lại!');
    }
  };

  return (
    <div
      id="activation-modal-backdrop"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-fadeIn"
    >
      <div
        id="activation-modal-box"
        className="w-full max-w-md bg-white border border-slate-200 rounded-3xl shadow-2xl overflow-hidden p-8 space-y-6 transform transition-all animate-scaleUp"
      >
        {/* Header Icon */}
        <div className="text-center space-y-3">
          <div className="inline-flex p-4 bg-gradient-to-tr from-pink-500 to-rose-400 text-white rounded-2xl shadow-lg shadow-pink-500/25">
            <KeyRound className="w-8 h-8" />
          </div>
          <div>
            <h2 className="text-xl font-black text-slate-900 tracking-tight">
              Kích Hoạt Dâu Dâu AutoPack
            </h2>
            <p className="text-xs text-slate-500 mt-1 font-medium leading-relaxed">
              Cánh cổng bước vào không gian sáng tạo độc quyền cùng Dâu Dâu
            </p>
          </div>
        </div>

        {/* Input Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
              Mã kích hoạt bảo mật
            </label>
            <div className="relative flex items-center">
              <input
                type="password"
                id="input-activation-code"
                value={code}
                onChange={(e) => {
                  setCode(e.target.value);
                  if (error) setError(false);
                }}
                placeholder="Nhập mã 10 số bí mật..."
                autoFocus
                className={`w-full bg-slate-50 border ${
                  error
                    ? 'border-rose-400 focus:ring-rose-200 text-rose-700'
                    : 'border-slate-300 focus:ring-pink-300 text-slate-800'
                } rounded-xl px-4 py-3 text-sm font-semibold tracking-wider outline-none focus:ring-4 transition`}
              />
              <div className="absolute right-3 text-slate-400">
                <Lock className="w-4 h-4" />
              </div>
            </div>
            {error && (
              <div className="flex items-center gap-1.5 text-xs text-rose-600 font-semibold animate-fadeIn pt-1">
                <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                <span>{errorMessage}</span>
              </div>
            )}
          </div>

          <button
            type="submit"
            id="btn-submit-activation"
            className="w-full py-3.5 px-4 rounded-xl text-sm font-bold text-white bg-gradient-to-r from-pink-600 to-rose-600 hover:from-pink-700 hover:to-rose-700 shadow-lg shadow-pink-600/30 transition-all flex items-center justify-center gap-2 cursor-pointer active:scale-98"
          >
            <span>Mở khóa & Bắt đầu sử dụng</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </form>

        {/* Security Footer Note */}
        <div className="flex items-center justify-center gap-1.5 text-[11px] text-slate-400 font-medium pt-2 border-t border-slate-100">
          <ShieldCheck className="w-3.5 h-3.5 text-emerald-500" />
          <span>Mã sẽ được lưu tự động trên trình duyệt này</span>
        </div>
      </div>
    </div>
  );
};
