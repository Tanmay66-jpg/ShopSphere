import { useState, useEffect } from 'react';
import { uiStore, type ToastMessage } from '../../services/uiStore';

export function Toast() {
  const [toast, setToast] = useState<ToastMessage | null>(null);

  useEffect(() => {
    const unsub = uiStore.subscribeToast(setToast);
    return () => {
      unsub();
    };
  }, []);

  if (!toast) return null;

  const isError = toast.type === 'error';
  const isWarning = toast.type === 'warning';

  return (
    <div className="fixed bottom-6 right-6 z-50 max-w-sm w-full bg-[#1a1c1d] text-white px-4 py-3 rounded-2xl shadow-2xl border border-[#2f3132] transition-all duration-300 animate-slide-up flex items-start gap-3">
      <span
        className={`material-symbols-outlined text-[22px] mt-0.5 ${
          isError ? 'text-red-400' : isWarning ? 'text-amber-400' : 'text-emerald-400'
        }`}
      >
        {isError ? 'error' : isWarning ? 'warning' : 'check_circle'}
      </span>
      <div className="flex-1">
        <p className="font-headline text-[14px] font-semibold text-white leading-tight">
          {toast.title}
        </p>
        <p className="text-[12px] text-[#94a3b8] mt-0.5 leading-snug">
          {toast.message}
        </p>
      </div>
      <button
        type="button"
        onClick={() => uiStore.dismissToast()}
        className="p-1 text-[#94a3b8] hover:text-white transition-colors"
        aria-label="Close notification"
      >
        <span className="material-symbols-outlined text-[18px]">close</span>
      </button>
    </div>
  );
}
