
import React from 'react';
import { CheckCircle, AlertCircle } from 'lucide-react';
import type { Toast } from '../../types';

interface ToastContainerProps {
    toasts: Toast[];
}

export const ToastContainer: React.FC<ToastContainerProps> = ({ toasts }) => (
    <div className="fixed top-4 right-4 z-[9999] space-y-2 pointer-events-none">
        {toasts.map(toast => (
            <div
                key={toast.id}
                className={`flex items-center gap-2 px-4 py-3 rounded-lg shadow-xl border animate-in slide-in-from-right-10 fade-in duration-300 pointer-events-auto ${toast.type === 'success' ? 'bg-emerald-50 text-emerald-900 border-emerald-200' : 'bg-red-50 text-red-900 border-red-200'
                    }`}
            >
                {toast.type === 'success' ? <CheckCircle size={18} className="text-emerald-600" /> : <AlertCircle size={18} className="text-red-600" />}
                <span className="text-sm font-bold">{toast.message}</span>
            </div>
        ))}
    </div>
);
