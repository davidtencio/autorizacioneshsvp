import React, { useState } from 'react';
import { Modal } from './ui/Modal';
import { AlertTriangle } from 'lucide-react';

interface SuspendTreatmentModalProps {
    isOpen: boolean;
    onClose: () => void;
    onConfirm: (reason: string, notes?: string) => void;
}

const REASONS = [
    'Muerte',
    'Progresión',
    'Efecto Adverso',
    'Otro'
];

export const SuspendTreatmentModal: React.FC<SuspendTreatmentModalProps> = ({
    isOpen,
    onClose,
    onConfirm
}) => {
    const [selectedReason, setSelectedReason] = useState<string>('');
    const [notes, setNotes] = useState('');

    const handleClose = () => {
        setSelectedReason('');
        setNotes('');
        onClose();
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!selectedReason) return;

        if (selectedReason === 'Otro' && !notes.trim()) {
            return; // Force notes for 'Otro'
        }

        onConfirm(selectedReason, notes);
        setSelectedReason('');
        setNotes('');
        onClose();
    };

    return (
        <Modal
            isOpen={isOpen}
            onClose={onClose}
            title="Suspender Tratamiento"
        >
            <form onSubmit={handleSubmit} className="p-4 space-y-6">
                <div className="bg-amber-50 border border-amber-200 rounded p-3 flex items-start gap-3">
                    <AlertTriangle className="text-amber-600 shrink-0 mt-0.5" size={18} />
                    <p className="text-sm text-amber-800">
                        Esta acción suspenderá el tratamiento del paciente. Esta acción se registrará en el historial.
                    </p>
                </div>

                <div className="space-y-3">
                    <h4 className="font-bold text-slate-800 text-sm">Motivo de Suspensión</h4>
                    <div className="space-y-2">
                        {REASONS.map((reason) => (
                            <label
                                key={reason}
                                className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-all ${selectedReason === reason
                                        ? 'bg-red-50 border-red-200 ring-1 ring-red-200'
                                        : 'bg-white border-slate-200 hover:border-slate-300'
                                    }`}
                            >
                                <input
                                    type="radio"
                                    name="reason"
                                    value={reason}
                                    checked={selectedReason === reason}
                                    onChange={(e) => setSelectedReason(e.target.value)}
                                    className="w-4 h-4 text-red-600 focus:ring-red-500 border-gray-300"
                                />
                                <span className={`text-sm ${selectedReason === reason ? 'text-red-900 font-bold' : 'text-slate-700'}`}>
                                    {reason}
                                </span>
                            </label>
                        ))}
                    </div>
                </div>

                {selectedReason === 'Otro' && (
                    <div className="space-y-2 animate-in fade-in slide-in-from-top-2 duration-200">
                        <label className="block text-sm font-bold text-slate-700">
                            Especifique el motivo <span className="text-red-500">*</span>
                        </label>
                        <textarea
                            value={notes}
                            onChange={(e) => setNotes(e.target.value)}
                            placeholder="Describa el motivo de la Suspensión..."
                            className="w-full p-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500 outline-none min-h-[80px] text-sm"
                            required
                        />
                    </div>
                )}

                <div className="flex gap-3 pt-4">
            <button
                type="button"
                onClick={handleClose}
                className="flex-1 py-3 px-4 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-lg transition-colors"
            >
                        Cancelar
                    </button>
                    <button
                        type="submit"
                        disabled={!selectedReason || (selectedReason === 'Otro' && !notes.trim())}
                        className="flex-1 py-3 px-4 bg-red-700 hover:bg-red-800 disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold rounded-lg transition-colors shadow-sm"
                    >
                        Confirmar Suspensión
                    </button>
                </div>
            </form>
        </Modal>
    );
};

