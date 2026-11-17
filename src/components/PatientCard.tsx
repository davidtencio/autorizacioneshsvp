import React from 'react';
import { Pencil, Trash2, Truck, Ban, Pill, Clock, Activity, Stethoscope, Calendar, FileText } from 'lucide-react';
import type { Patient } from '../types';
import { isAuthorizationExpired } from '../utils/statusUtils';
import { isHospitalMexico } from '../utils/constants';
import { getPendingTransferBalance } from '../utils/transferUtils';

interface PatientCardProps {
    patient: Patient;
    isEditable: boolean;
    onSuspend: (patient: Patient) => void;
    onEdit: (patient: Patient) => void;
    onDelete: (id: number) => void;
    onViewDetails: (patient: Patient) => void;
    onRenew: (patient: Patient) => void;
}

const formatDate = (dateStr: string) => {
    if (!dateStr) return '-';
    if (dateStr.length === 6) return `${dateStr.slice(0, 2)}/${dateStr.slice(2)}`;
    return dateStr;
};

const InfoChip = ({ icon, label, value }: { icon: React.ReactNode; label?: string; value: string }) => (
    <span className="inline-flex items-center gap-1.5 bg-slate-50 text-[11px] px-2.5 py-1 rounded-lg border border-slate-100">
        {icon}
        {label && <span className="text-slate-400">{label}</span>}
        <span className="font-semibold text-slate-700">{value}</span>
    </span>
);

const chipIcon = (Icon: typeof Pill) => <Icon size={12} className="text-emerald-600" />;

export const PatientCard: React.FC<PatientCardProps> = ({ patient, isEditable, onSuspend, onEdit, onDelete, onViewDetails, onRenew }) => {
    const isSuspended = patient.status === 'Suspended';
    const isExpired = !isSuspended && isAuthorizationExpired(patient.endMonth);
    const accentBar = isSuspended ? 'bg-red-400' : isExpired ? 'bg-amber-400' : 'bg-emerald-500';
    const cardBorder = isSuspended ? 'border-red-100' : isExpired ? 'border-amber-100' : 'border-slate-200';
    const avatarStyle = isSuspended
        ? 'bg-red-100 text-red-700 border-red-200'
        : isExpired
            ? 'bg-amber-100 text-amber-700 border-amber-200'
            : 'bg-emerald-50 text-emerald-700 border-emerald-100';
    const isMexico = isHospitalMexico(patient.applicationPlace);
    const pendingTransfer = isMexico ? getPendingTransferBalance(patient.transferControl) : null;
    const hasTreatmentInfo = Boolean(patient.dose || patient.frequency || patient.route || patient.prescriber);

    return (
        <div className={`mb-3 bg-white border rounded-xl pl-5 pr-4 py-4 hover:shadow-md transition-all group relative overflow-hidden ${cardBorder}`}>
            <div className={`absolute left-0 top-0 bottom-0 w-1.5 ${accentBar}`} />

            {/* Encabezado: avatar, nombre, cédula y acciones */}
            <div className="flex justify-between items-start mb-3">
                <div className="flex items-center gap-3 min-w-0">
                    <div className={`h-11 w-11 shrink-0 rounded-xl flex items-center justify-center font-bold text-lg border shadow-sm ${avatarStyle}`}>
                        {patient.name.charAt(0)}
                    </div>
                    <div className="min-w-0">
                        <h4 className={`font-bold text-base leading-tight truncate ${isSuspended ? 'text-slate-500 line-through decoration-slate-400' : 'text-emerald-950'}`}>
                            {patient.name}
                        </h4>
                        <p className="text-xs text-slate-400 font-mono tracking-wide mt-0.5">{patient.identificationNumber || 'S/N'}</p>
                    </div>
                </div>
                {isEditable && (
                    <div className="flex gap-0.5 shrink-0">
                        {!isSuspended && (
                            <button onClick={() => onSuspend(patient)} className="text-slate-300 hover:text-red-600 p-1.5 transition-colors rounded-md hover:bg-slate-50" title="Suspender Tratamiento">
                                <Ban size={16} />
                            </button>
                        )}
                        <button onClick={() => onEdit(patient)} className="text-slate-300 hover:text-emerald-600 p-1.5 transition-colors rounded-md hover:bg-emerald-50" title="Editar">
                            <Pencil size={16} />
                        </button>
                        <button onClick={() => onDelete(patient.id)} className="text-slate-300 hover:text-red-600 p-1.5 transition-colors rounded-md hover:bg-red-50" title="Eliminar">
                            <Trash2 size={16} />
                        </button>
                    </div>
                )}
            </div>

            {/* Autorización, vencimiento y badges de estado */}
            <div className="flex items-center gap-2 flex-wrap mb-1">
                <button onClick={() => onViewDetails(patient)} className="inline-flex items-center gap-1.5 bg-emerald-50 text-emerald-700 text-xs font-bold px-2.5 py-1 rounded-md border border-emerald-100 hover:bg-emerald-100 transition-colors">
                    <FileText size={12} />
                    {patient.authorizationCode || 'Ver Detalles'}
                </button>
                <span className="inline-flex items-center gap-1 text-xs font-mono text-slate-500">
                    <Calendar size={12} className="text-slate-400" />
                    {formatDate(patient.endMonth)}
                </span>
                {isMexico && (
                    <span className="inline-flex items-center gap-1 bg-indigo-100 text-indigo-700 text-[10px] font-bold px-2 py-0.5 rounded-full border border-indigo-200 uppercase tracking-wide">
                        <Truck size={11} />
                        Hosp. México
                    </span>
                )}
                {isSuspended && (
                    <span className="inline-flex items-center bg-red-100 text-red-700 text-[10px] font-bold px-2 py-0.5 rounded-full border border-red-200 uppercase tracking-wide">Suspendido</span>
                )}
                {isExpired && (
                    <span className="inline-flex items-center bg-amber-100 text-amber-700 text-[10px] font-bold px-2 py-0.5 rounded-full border border-amber-200 uppercase tracking-wide">Vencido</span>
                )}
            </div>

            {/* Datos del tratamiento */}
            {hasTreatmentInfo && (
                <div className="flex flex-wrap gap-1.5 mt-3 pt-3 border-t border-slate-100">
                    {patient.dose && <InfoChip icon={chipIcon(Pill)} label="Dosis" value={patient.dose} />}
                    {patient.frequency && <InfoChip icon={chipIcon(Clock)} label="Frecuencia" value={patient.frequency} />}
                    {patient.route && <InfoChip icon={chipIcon(Activity)} label="Vía" value={patient.route} />}
                    {patient.prescriber && <InfoChip icon={chipIcon(Stethoscope)} value={patient.prescriber} />}
                </div>
            )}

            {isExpired && isEditable && (
                <button onClick={() => onRenew(patient)} className="mt-3 w-full bg-amber-50 border border-amber-200 text-amber-800 text-[11px] font-bold py-2 rounded-lg hover:bg-amber-100 transition-colors">
                    Renovar Autorización
                </button>
            )}

            {/* Saldo pendiente de trasladar a Hosp. México */}
            {isMexico && (
                <div className="mt-3 flex items-center justify-between gap-2 bg-indigo-50 border border-indigo-100 rounded-lg px-3 py-2">
                    <span className="inline-flex items-center gap-1.5 text-[11px] font-bold text-indigo-700 uppercase tracking-wide">
                        <Truck size={13} />
                        Saldo pend. de trasladar
                    </span>
                    {pendingTransfer === null ? (
                        <span className="text-[11px] font-semibold text-indigo-400 italic normal-case">Sin registro</span>
                    ) : (
                        <span className={`font-bold text-base tabular-nums ${pendingTransfer < 0 ? 'text-red-600' : pendingTransfer === 0 ? 'text-slate-400' : 'text-indigo-700'}`}>
                            {pendingTransfer}
                            <span className="text-[10px] font-semibold text-indigo-400 ml-1">uds</span>
                        </span>
                    )}
                </div>
            )}
        </div>
    );
};
