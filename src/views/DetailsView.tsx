import { useUI } from '../context/UIContext';
import { useCanEdit } from '../hooks/useCanEdit';
import React, { useState } from 'react';
import { Pencil, Trash2, Users, Plus, Truck, Ban } from 'lucide-react';
import { Header } from '../components/ui/Header';
import { SuspendTreatmentModal } from '../components/SuspendTreatmentModal';
import type { Medication, Patient } from '../types';
import { isAuthorizationExpired } from '../utils/statusUtils';
import { Virtuoso } from 'react-virtuoso';

interface DetailsViewProps {
    selectedMed: Medication | null;
    onGoHome: () => void;
    onDeletePatient: (id: number) => void;
    onNewPatient: () => void;
    onEditMed: (med: Medication) => void;
    onDeleteMed: (med: Medication) => void;
    onEditPatient: (patient: Patient) => void;
    onSuspendPatient: (patient: Patient, reason: string, notes?: string) => void;
    onViewDetails: (patient: Patient) => void;
}

const formatDate = (dateStr: string) => {
    if (!dateStr) return '-';
    if (dateStr.length === 6) return `${dateStr.slice(0, 2)}/${dateStr.slice(2)}`;
    return dateStr;
};

export const DetailsView: React.FC<DetailsViewProps> = ({ selectedMed, onGoHome, onDeletePatient, onNewPatient, onEditMed, onDeleteMed, onEditPatient, onSuspendPatient, onViewDetails }) => {
    const { setIsRenewing } = useUI();
    const isEditable = useCanEdit();
    const [suspendingPatient, setSuspendingPatient] = useState<Patient | null>(null);

    const sortedPatients = React.useMemo(() => {
        if (!selectedMed) return [];
        return [...(selectedMed.patients ?? [])].sort((a, b) => a.name.localeCompare(b.name, 'es', { sensitivity: 'base' }));
    }, [selectedMed]);

    if (!selectedMed) return null;

    return (
        <div className="pb-24 bg-slate-50 min-h-screen">
            <Header title={selectedMed.name} subtitle={selectedMed.code} onBack={onGoHome} actions={isEditable && (<><button onClick={() => onEditMed(selectedMed)} className="bg-emerald-800 hover:bg-emerald-700 p-2 rounded-lg transition-colors border border-emerald-700"><Pencil size={20} /></button><button onClick={() => onDeleteMed(selectedMed)} className="bg-red-800 hover:bg-red-700 p-2 rounded-lg transition-colors border border-red-700 text-white"><Trash2 size={20} /></button></>)} />

            <div className="px-5 pt-6">
                <div className="bg-white border border-slate-200 rounded-lg p-4 shadow-sm mb-6 relative overflow-hidden"><div className="absolute top-0 right-0 w-16 h-16 bg-emerald-50 rounded-bl-full -mr-2 -mt-2" /><h3 className="text-xs font-bold text-emerald-800 uppercase tracking-wide mb-3 border-b border-emerald-50 pb-2 relative z-10">Ficha Técnica</h3><div className="grid grid-cols-2 gap-4 relative z-10"><div><p className="text-xs text-slate-500">Potencia</p><p className="font-bold text-slate-800">{selectedMed.strength}</p></div><div><p className="text-xs text-slate-500">Vía Adm.</p><p className="font-bold text-slate-800">{selectedMed.route}</p></div></div></div>

                <div className="flex items-center justify-between mb-4"><h3 className="text-slate-700 font-bold text-sm uppercase tracking-wide">Pacientes Asignados</h3><span className="bg-emerald-100 text-emerald-800 text-xs font-bold px-2 py-1 rounded border border-emerald-200">{(selectedMed.patientsSummary?.count ?? selectedMed.patients?.length ?? 0)}</span></div>

                {sortedPatients.length === 0 ? (
                    <div className="bg-white border-2 border-dashed border-slate-300 rounded-lg p-8 text-center"><Users size={32} className="text-slate-300 mx-auto mb-2" /><p className="text-slate-500 font-medium text-sm">Lista vacía</p><p className="text-slate-400 text-xs">No hay tratamientos activos</p></div>
                ) : (
                    <div className="h-[calc(100vh-290px)]">
                        <Virtuoso
                            style={{ height: '100%' }}
                            data={sortedPatients}
                            initialItemCount={sortedPatients.length}
                            overscan={300}
                            itemContent={(_, patient) => {
                                const isSuspended = patient.status === 'Suspended';
                                const isExpired = !isSuspended && isAuthorizationExpired(patient.endMonth);
                                return <div className="mb-3 bg-white border rounded-lg p-4 hover:shadow-md transition-shadow group block border-slate-200"><div className="flex justify-between items-start mb-3 border-b border-slate-100 pb-3"><div className="flex items-center gap-3"><div className={`h-10 w-10 rounded flex items-center justify-center font-bold border ${isSuspended ? 'bg-red-100 text-red-700 border-red-200' : isExpired ? 'bg-amber-100 text-amber-700 border-amber-200' : 'bg-emerald-50 text-emerald-700 border-emerald-100'}`}>{patient.name.charAt(0)}</div><div><h4 className={`font-bold text-base ${isSuspended ? 'text-slate-600 line-through decoration-slate-400' : 'text-emerald-950'}`}>{patient.name}</h4><p className="text-xs text-slate-500 font-mono tracking-wide">{patient.identificationNumber || 'S/N'}</p></div></div>{isEditable && <div className="flex gap-1">{!isSuspended && <button onClick={() => setSuspendingPatient(patient)} className="text-slate-300 hover:text-red-600 p-1.5 transition-colors rounded-md hover:bg-slate-50" title="Suspender Tratamiento"><Ban size={16} /></button>}<button onClick={() => onEditPatient(patient)} className="text-slate-300 hover:text-emerald-600 p-1.5 transition-colors rounded-md hover:bg-emerald-50" title="Editar"><Pencil size={16} /></button><button onClick={() => onDeletePatient(patient.id)} className="text-slate-300 hover:text-red-600 p-1.5 transition-colors rounded-md hover:bg-red-50" title="Eliminar"><Trash2 size={16} /></button></div>}</div><div className="text-xs"><button onClick={() => onViewDetails(patient)} className="font-bold text-emerald-700 hover:underline">{patient.authorizationCode || 'Ver Detalles'}</button><span className="ml-3 font-mono text-slate-600">{formatDate(patient.endMonth)}</span>{isExpired && <span className="ml-3 text-amber-700">Vencido</span>}</div>{isExpired && isEditable && <button onClick={() => { setIsRenewing(true); onEditPatient(patient); }} className="mt-2 w-full bg-white border border-amber-200 text-amber-800 text-[10px] font-bold py-1.5 rounded hover:bg-amber-100 transition-colors">Renovar Autorización</button>}{!isSuspended && !isExpired && patient.applicationPlace === 'Hosp. México' && patient.transferControl && <div className="mt-2 text-[10px] text-slate-600"><Truck size={12} className="inline mr-1" />Control de Saldos</div>}</div>;
                            }}
                        />
                    </div>
                )}
            </div>

            {isEditable && <button onClick={onNewPatient} className="fixed bottom-6 right-6 bg-emerald-800 hover:bg-emerald-700 text-white px-6 py-4 rounded-lg shadow-lg flex items-center gap-2 font-bold text-sm transition-all active:scale-95 z-50"><Plus size={20} /><span>Añadir Paciente</span></button>}

            <SuspendTreatmentModal isOpen={!!suspendingPatient} onClose={() => setSuspendingPatient(null)} onConfirm={(reason, notes) => { if (suspendingPatient) { onSuspendPatient(suspendingPatient, reason, notes); setSuspendingPatient(null); } }} />
        </div>
    );
};
