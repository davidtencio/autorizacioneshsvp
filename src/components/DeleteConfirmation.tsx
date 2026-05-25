
import React from 'react';
import { AlertTriangle } from 'lucide-react';

interface DeleteConfirmationProps {
    onConfirm: () => void;
    onCancel: () => void;
    targetName: string;
    isPatient: boolean;
}

export const DeleteConfirmation: React.FC<DeleteConfirmationProps> = ({
    onConfirm, onCancel, targetName, isPatient
}) => (
    <div className="p-6 text-center">
        <div className="bg-red-50 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
            <AlertTriangle className="text-red-600" size={32} />
        </div>
        <h3 className="text-lg font-bold text-slate-800 mb-2">¿Estás seguro?</h3>
        <p className="text-slate-500 mb-6 font-medium">
            Vas a eliminar a <span className="text-slate-800 font-bold">"{targetName}"</span>. {isPatient ? "Este paciente será removido de la lista." : "Esta acción no se puede deshacer."}
        </p>
        <div className="flex gap-3">
            <button
                onClick={onCancel}
                className="flex-1 py-3 px-4 rounded-lg border border-slate-300 text-slate-700 font-bold hover:bg-slate-50 transition-colors"
            >
                Cancelar
            </button>
            <button
                onClick={onConfirm}
                className="flex-1 py-3 px-4 rounded-lg bg-red-600 text-white font-bold hover:bg-red-700 transition-colors shadow-lg shadow-red-900/20"
            >
                Eliminar
            </button>
        </div>
    </div>
);
