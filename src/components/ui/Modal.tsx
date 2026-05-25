
import React from 'react';
import { X } from 'lucide-react';

interface ModalProps {
    isOpen: boolean;
    onClose: () => void;
    title: string;
    children: React.ReactNode;
}

export const Modal: React.FC<ModalProps> = ({ isOpen, onClose, title, children }) => {
    if (!isOpen) return null;
    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
            <div className="bg-slate-50 rounded-xl shadow-2xl w-full max-w-sm overflow-hidden animate-in fade-in zoom-in-95 duration-200">
                <div className="bg-emerald-900 p-4 flex justify-between items-center">
                    <h2 className="text-white font-bold text-lg">{title}</h2>
                    <button onClick={onClose} className="text-emerald-200 hover:text-white transition-colors">
                        <X size={24} />
                    </button>
                </div>
                <div className="p-0">
                    {children}
                </div>
            </div>
        </div>
    );
};
