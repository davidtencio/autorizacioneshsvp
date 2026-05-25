import React from 'react';
import { Modal } from './ui/Modal';
import { Truck, User, Package } from 'lucide-react';

interface PendingTransferItem {
    medicationId: string;
    medicationName: string;
    totalPending: number;
    patients: Array<{
        patientId: number;
        patientName: string;
        pendingBalance: number;
    }>;
}

interface PendingTransfersModalProps {
    isOpen: boolean;
    onClose: () => void;
    items: PendingTransferItem[];
}

export const PendingTransfersModal: React.FC<PendingTransfersModalProps> = ({
    isOpen,
    onClose,
    items
}) => {
    return (
        <Modal
            isOpen={isOpen}
            onClose={onClose}
            title="Saldos Pendientes H. México"
        >
            <div className="space-y-3 max-h-[60vh] overflow-y-auto pr-2">
                {items.length === 0 ? (
                    <div className="text-center py-8 text-slate-500">
                        <p>No hay saldos pendientes por enviar a Hosp. México.</p>
                    </div>
                ) : (
                    items.map((item) => (
                        <div
                            key={item.medicationId}
                            className="p-3 rounded-lg border border-cyan-100 bg-cyan-50/50"
                        >
                            <div className="flex justify-between items-start gap-3">
                                <div>
                                    <h4 className="font-bold text-sm text-cyan-900">{item.medicationName}</h4>
                                    <p className="text-[11px] text-slate-600 mt-0.5">
                                        {item.patients.length} paciente{item.patients.length === 1 ? '' : 's'} con saldo pendiente
                                    </p>
                                </div>
                                <div className="text-right">
                                    <div className="flex items-center justify-end gap-1 text-cyan-700 font-bold text-sm">
                                        <Truck size={13} />
                                        {item.totalPending}
                                    </div>
                                    <span className="text-[10px] text-cyan-700/80 uppercase font-bold tracking-wide">
                                        Unid. pendientes
                                    </span>
                                </div>
                            </div>

                            <div className="mt-3 space-y-2">
                                {item.patients.map((patient) => (
                                    <div
                                        key={`${item.medicationId}-${patient.patientId}`}
                                        className="bg-white border border-slate-200 rounded p-2 flex justify-between items-center"
                                    >
                                        <div className="flex items-center gap-2 min-w-0">
                                            <User size={12} className="text-slate-400 shrink-0" />
                                            <span className="text-xs font-medium text-slate-700 truncate">
                                                {patient.patientName}
                                            </span>
                                        </div>
                                        <span className="flex items-center gap-1 text-[11px] font-bold text-slate-800 bg-slate-50 border border-slate-200 px-2 py-0.5 rounded shrink-0">
                                            <Package size={11} />
                                            {patient.pendingBalance}
                                        </span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    ))
                )}
            </div>

            <div className="mt-4 pt-4 border-t border-slate-100 text-center">
                <p className="text-xs text-slate-400">
                    Incluye pacientes con control de traslado en Hosp. México y saldo pendiente mayor a cero.
                </p>
            </div>
        </Modal>
    );
};
