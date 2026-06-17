import { useUI } from '../context/UIContext';
import { useCanEdit } from '../hooks/useCanEdit';
import React, { useState } from 'react';
import { Pencil, Trash2, Users, Plus, Truck, Ban, Pill, Clock, Activity, Stethoscope, Calendar, FileText } from 'lucide-react';
import { Header } from '../components/ui/Header';
import { SuspendTreatmentModal } from '../components/SuspendTreatmentModal';
import type { Medication, Patient } from '../types';
import { isAuthorizationExpired } from '../utils/statusUtils';
import { isHospitalMexico } from '../utils/constants';
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
                                const accentBar = isSuspended ? 'bg-red-400' : isExpired ? 'bg-amber-400' : 'bg-emerald-500';
                                const cardBorder = isSuspended ? 'border-red-100' : isExpired ? 'border-amber-100' : 'border-slate-200';
                                const avatarStyle = isSuspended ? 'bg-red-100 text-red-700 border-red-200' : isExpired ? 'bg-amber-100 text-amber-700 border-amber-200' : 'bg-emerald-50 text-emerald-700 border-emerald-100';
                                return <div className={`mb-3 bg-white border rounded-xl pl-5 pr-4 py-4 hover:shadow-md transition-all group relative overflow-hidden ${cardBorder}`}><div className={`absolute left-0 top-0 bottom-0 w-1.5 ${accentBar}`} /><div className="flex justify-between items-start mb-3"><div className="flex items-center gap-3 min-w-0"><div className={`h-11 w-11 shrink-0 rounded-xl flex items-center justify-center font-bold text-lg border shadow-sm ${avatarStyle}`}>{patient.name.charAt(0)}</div><div className="min-w-0"><h4 className={`font-bold text-base leading-tight truncate ${isSuspended ? 'text-slate-500 line-through decoration-slate-400' : 'text-emerald-950'}`}>{patient.name}</h4><p className="text-xs text-slate-400 font-mono tracking-wide mt-0.5">{patient.identificationNumber || 'S/N'}</p></div></div>{isEditable && <div className="flex gap-0.5 shrink-0">{!isSuspended && <button onClick={() => setSuspendingPatient(patient)} className="text-slate-300 hover:text-red-600 p-1.5 transition-colors rounded-md hover:bg-slate-50" title="Suspender Tratamiento"><Ban size={16} /></button>}<button onClick={() => onEditPatient(patient)} className="text-slate-300 hover:text-emerald-600 p-1.5 transition-colors rounded-md hover:bg-emerald-50" title="Editar"><Pencil size={16} /></button><button onClick={() => onDeletePatient(patient.id)} className="text-slate-300 hover:text-red-600 p-1.5 transition-colors rounded-md hover:bg-red-50" title="Eliminar"><Trash2 size={16} /></button></div>}</div><div className="flex items-center gap-2 flex-wrap mb-1"><button onClick={() => onViewDetails(patient)} className="inline-flex items-center gap-1.5 bg-emerald-50 text-emerald-700 text-xs font-bold px-2.5 py-1 rounded-md border border-emerald-100 hover:bg-emerald-100 transition-colors"><FileText size={12} />{patient.authorizationCode || 'Ver Detalles'}</button><span className="inline-flex items-center gap-1 text-xs font-mono text-slate-500"><Calendar size={12} className="text-slate-400" />{formatDate(patient.endMonth)}</span>{isSuspended && <span className="inline-flex items-center bg-red-100 text-red-700 text-[10px] font-bold px-2 py-0.5 rounded-full border border-red-200 uppercase tracking-wide">Suspendido</span>}{isExpired && <span className="inline-flex items-center bg-amber-100 text-amber-700 text-[10px] font-bold px-2 py-0.5 rounded-full border border-amber-200 uppercase tracking-wide">Vencido</span>}</div>{(patient.dose || patient.frequency || patient.route || patient.prescriber) && <div className="flex flex-wrap gap-1.5 mt-3 pt-3 border-t border-slate-100">{patient.dose && <span className="inline-flex items-center gap-1.5 bg-slate-50 text-[11px] px-2.5 py-1 rounded-lg border border-slate-100"><Pill size={12} className="text-emerald-600" /><span className="text-slate-400">Dosis</span><span className="font-semibold text-slate-700">{patient.dose}</span></span>}{patient.frequency && <span className="inline-flex items-center gap-1.5 bg-slate-50 text-[11px] px-2.5 py-1 rounded-lg border border-slate-100"><Clock size={12} className="text-emerald-600" /><span className="text-slate-400">Frecuencia</span><span className="font-semibold text-slate-700">{patient.frequency}</span></span>}{patient.route && <span className="inline-flex items-center gap-1.5 bg-slate-50 text-[11px] px-2.5 py-1 rounded-lg border border-slate-100"><Activity size={12} className="text-emerald-600" /><span className="text-slate-400">Vía</span><span className="font-semibold text-slate-700">{patient.route}</span></span>}{patient.prescriber && <span className="inline-flex items-center gap-1.5 bg-slate-50 text-[11px] px-2.5 py-1 rounded-lg border border-slate-100"><Stethoscope size={12} className="text-emerald-600" /><span className="font-semibold text-slate-700">{patient.prescriber}</span></span>}</div>}{isExpired && isEditable && <button onClick={() => { setIsRenewing(true); onEditPatient(patient); }} className="mt-3 w-full bg-amber-50 border border-amber-200 text-amber-800 text-[11px] font-bold py-2 rounded-lg hover:bg-amber-100 transition-colors">Renovar Autorización</button>}{!isSuspended && !isExpired && isHospitalMexico(patient.applicationPlace) && patient.transferControl && <div className="mt-3 inline-flex items-center gap-1 text-[10px] font-medium text-slate-500 bg-slate-50 px-2 py-1 rounded-md border border-slate-100"><Truck size={12} />Control de Saldos</div>}</div>;
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
