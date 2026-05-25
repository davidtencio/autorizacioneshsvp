
import React from 'react';
import { Modal } from './ui/Modal';
import { Calendar, FileText } from 'lucide-react';
import type { Patient } from '../types';

interface ExpiringPatientsModalProps {
    isOpen: boolean;
    onClose: () => void;
    patients: Array<{
        patient: Patient;
        medicationName: string;
        isExpired: boolean;
    }>;
}

export const ExpiringPatientsModal: React.FC<ExpiringPatientsModalProps> = ({
    isOpen,
    onClose,
    patients
}) => {
    return (
        <Modal
            isOpen={isOpen}
            onClose={onClose}
            title="Vencimientos Próximos"
        >
            <div className="space-y-3 max-h-[60vh] overflow-y-auto pr-2">
                {patients.length === 0 ? (
                    <div className="text-center py-8 text-slate-500">
                        <p>No hay autorizaciones próximas a vencer.</p>
                    </div>
                ) : (
                    patients.map((item, idx) => (
                        <div
                            key={`${item.patient.id}-${idx}`}
                            className={`p-3 rounded-lg border flex justify-between items-start ${item.isExpired
                                ? 'bg-red-50 border-red-100'
                                : 'bg-amber-50 border-amber-100'
                                }`}
                        >
                            <div>
                                <h4 className={`font-bold text-sm ${item.isExpired ? 'text-red-900' : 'text-amber-900'}`}>
                                    {item.patient.name}
                                </h4>
                                <p className="text-xs text-slate-600 font-medium mt-0.5">
                                    {item.medicationName}
                                </p>
                                <div className="flex items-center gap-2 mt-2">
                                    <span className="flex items-center gap-1 text-[10px] bg-white px-2 py-0.5 rounded border border-slate-200 text-slate-500 font-mono">
                                        <FileText size={10} />
                                        {item.patient.authorizationCode}
                                    </span>
                                </div>
                            </div>

                            <div className="text-right">
                                <div className={`flex items-center gap-1 text-xs font-bold mb-1 ${item.isExpired ? 'text-red-700' : 'text-amber-700'
                                    }`}>
                                    <Calendar size={12} />
                                    {item.patient.endMonth}
                                </div>
                                <span className={`text-[10px] px-1.5 py-0.5 rounded border ${item.isExpired
                                    ? 'bg-red-100 text-red-800 border-red-200'
                                    : 'bg-amber-100 text-amber-800 border-amber-200'
                                    }`}>
                                    {item.isExpired ? 'Vencida' : 'Vence Pronto'}
                                </span>
                            </div>
                        </div>
                    ))
                )}
            </div>

            <div className="mt-4 pt-4 border-t border-slate-100 text-center">
                <p className="text-xs text-slate-400">
                    Se muestran autorizaciones que vencen este mes o el próximo.
                </p>
            </div>
        </Modal>
    );
};
