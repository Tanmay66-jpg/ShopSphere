import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
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
    <div
      role="status"
      aria-live="polite"
      className="fixed bottom-6 right-6 z-50 max-w-sm w-full bg-[#1B1B1B] text-[#FDFCF9] px-4 py-3.5 rounded-sm shadow-2xl border border-[#3D3A37] transition-all duration-300 animate-slide-up flex items-start gap-3"
    >
      <span
        className={`material-symbols-outlined text-[20px] mt-0.5 flex-shrink-0 ${
          isError ? 'text-red-400' : isWarning ? 'text-amber-400' : 'text-[#86efac]'
        }`}
      >
        {isError ? 'error' : isWarning ? 'warning' : 'check_circle'}
      </span>
      <div className="flex-1 min-w-0">
        <p className="font-sans text-[13px] font-semibold text-[#FDFCF9] leading-tight">
          {toast.title}
        </p>
        <p className="text-[12px] text-[#D9D4CC] mt-0.5 leading-snug break-words">
          {toast.message}
        </p>
        {toast.action && (
          <Link
            to={toast.action.to}
            onClick={() => uiStore.dismissToast()}
            className="inline-flex items-center gap-1 mt-2 text-[12px] font-medium text-white underline underline-offset-4 decoration-1 hover:text-[#D9D4CC] transition-colors"
          >
            <span>{toast.action.label}</span>
            <span aria-hidden="true">&rarr;</span>
          </Link>
        )}
      </div>
      <button
        type="button"
        onClick={() => uiStore.dismissToast()}
        className="p-1 text-[#8A8278] hover:text-[#FDFCF9] transition-colors flex-shrink-0"
        aria-label="Close notification"
      >
        <span className="material-symbols-outlined text-[16px]">close</span>
      </button>
    </div>
  );
}
