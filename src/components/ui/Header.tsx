
import React from 'react';
import { ChevronLeft, ShieldPlus } from 'lucide-react';

interface HeaderProps {
    title: string;
    subtitle?: string;
    onBack?: () => void;
    actions?: React.ReactNode;
}

export const Header: React.FC<HeaderProps> = ({ title, subtitle, onBack, actions }) => (
    <div className="bg-emerald-900 text-white px-6 pt-12 pb-6 shadow-md sticky top-0 z-20">
        <div className="flex items-center gap-4">
            {onBack && (
                <button onClick={onBack} className="bg-emerald-800 hover:bg-emerald-700 p-2 rounded-lg transition-colors border border-emerald-700">
                    <ChevronLeft size={20} />
                </button>
            )}
            <div className="flex-1">
                {subtitle && <p className="text-emerald-300 text-xs font-medium uppercase tracking-wider mb-1 opacity-90">{subtitle}</p>}
                <h1 className="text-xl font-bold tracking-tight">{title}</h1>
            </div>
            {actions ? (
                <div className="flex gap-2">{actions}</div>
            ) : (
                !onBack && <ShieldPlus className="text-emerald-400" size={26} />
            )}
        </div>
    </div>
);
