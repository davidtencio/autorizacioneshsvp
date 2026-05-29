
import React from 'react';
import type { LucideIcon } from 'lucide-react';

interface CorporateInputProps {
    label: string;
    value: string;
    onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
    placeholder?: string;
    icon?: LucideIcon;
    required?: boolean;
    maxLength?: number;
    error?: boolean;
}

export const CorporateInput: React.FC<CorporateInputProps> = ({
    label, value, onChange, placeholder, icon: Icon, required = false, maxLength, error = false
}) => (
    <div className="space-y-1.5">
        <label className="text-xs font-bold text-emerald-900 uppercase tracking-wide flex items-center gap-1.5 opacity-80">
            {Icon && <Icon size={14} className="text-emerald-700" />}
            {label}
        </label>
        <input
            type="text"
            placeholder={placeholder}
            aria-invalid={error || undefined}
            className={`w-full bg-white text-slate-900 p-3 rounded-lg border outline-none placeholder:text-slate-400 transition-all shadow-sm font-medium ${
                error
                    ? 'border-red-400 focus:border-red-500 focus:ring-1 focus:ring-red-500'
                    : 'border-slate-300 focus:border-emerald-700 focus:ring-1 focus:ring-emerald-700'
            }`}
            value={value}
            onChange={onChange}
            required={required}
            maxLength={maxLength}
        />
    </div>
);
