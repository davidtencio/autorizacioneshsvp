
import React from 'react';
import { useCanEdit } from '../hooks/useCanEdit';
import { User, Plus, Pencil, Trash2 } from 'lucide-react';
import { Skeleton } from './ui/Skeleton';
import type { Prescriber } from '../types';

interface PrescribersListModalProps {
    prescribers: Prescriber[];
    loading?: boolean;
    onAddPrescriber: () => void;
    onEdit: (prescriber: Prescriber) => void;
    onDelete: (prescriber: Prescriber) => void;
}

export const PrescribersListModal: React.FC<PrescribersListModalProps> = ({ prescribers, loading = false, onAddPrescriber, onEdit, onDelete }) => {
    const isEditable = useCanEdit();
    return (
        <div className="flex flex-col h-[60vh] max-h-[500px]">
            {/* List Container */}
            <div className="flex-1 overflow-y-auto p-4 space-y-3">
                {loading ? (
                    Array.from({ length: 5 }).map((_, i) => (
                        <div key={i} className="flex items-center gap-3 p-3 bg-white border border-slate-200 rounded-lg shadow-sm">
                            <Skeleton className="h-9 w-9 rounded-full" />
                            <div className="flex-1 space-y-2">
                                <Skeleton className="h-4 w-3/4" />
                                <Skeleton className="h-3 w-1/2" />
                            </div>
                        </div>
                    ))
                ) : prescribers.length === 0 ? (
                    <div className="text-center text-slate-400 py-8">
                        <User size={48} className="mx-auto mb-2 opacity-50" />
                        <p>No hay prescriptores registrados.</p>
                    </div>
                ) : (
                    prescribers.map((prescriber) => (
                        <div key={prescriber.id} className="flex items-center gap-3 p-3 bg-white border border-slate-200 rounded-lg shadow-sm group hover:border-emerald-200 transition-colors">
                            <div className="bg-emerald-100 p-2 rounded-full text-emerald-700">
                                <User size={20} />
                            </div>
                            <div className="flex-1">
                                <h4 className="font-bold text-slate-800 text-sm">{prescriber.name}</h4>
                                <p className="text-xs text-slate-500 font-medium">{prescriber.specialty}</p>
                            </div>
                            {isEditable && (
                                <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                    <button
                                        onClick={() => onEdit(prescriber)}
                                        className="p-1.5 text-slate-400 hover:text-emerald-700 hover:bg-emerald-50 rounded transition-colors"
                                        title="Editar"
                                    >
                                        <Pencil size={16} />
                                    </button>
                                    <button
                                        onClick={() => onDelete(prescriber)}
                                        className="p-1.5 text-slate-400 hover:text-red-700 hover:bg-red-50 rounded transition-colors"
                                        title="Eliminar"
                                    >
                                        <Trash2 size={16} />
                                    </button>
                                </div>
                            )}
                        </div>
                    ))
                )}
            </div>

            {/* Footer Action */}
            {isEditable && (
                <div className="p-4 bg-slate-50 border-t border-slate-200">
                    <button
                        onClick={onAddPrescriber}
                        className="w-full bg-emerald-800 hover:bg-emerald-700 text-white font-bold py-3 rounded-lg flex items-center justify-center gap-2 transition-colors shadow-sm"
                    >
                        <Plus size={18} />
                        Agregar Nuevo Prescriptor
                    </button>
                </div>
            )}
        </div>
    );
};
