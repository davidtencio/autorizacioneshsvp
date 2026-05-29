import React, { useMemo, useState } from 'react';
import { Users, AlertTriangle, Activity, Stethoscope, Truck } from 'lucide-react';
import type { Medication, Patient } from '../types';
import { isAuthorizationExpired } from '../utils/statusUtils';
import { ExpiringPatientsModal } from './ExpiringPatientsModal';
import { PendingTransfersModal } from './PendingTransfersModal';

interface KPIStatsProps {
    medications: Medication[];
}

export const KPIStats: React.FC<KPIStatsProps> = ({ medications }) => {
    const [isExpiringModalOpen, setIsExpiringModalOpen] = useState(false);
    const [isPendingTransfersModalOpen, setIsPendingTransfersModalOpen] = useState(false);

    const stats = useMemo(() => {
        let totalPatients = 0;
        let activePatients = 0;
        let suspendedPatients = 0;

        const expiringList: Array<{
            patient: Patient;
            medicationName: string;
            isExpired: boolean;
        }> = [];

        const diagnosisCounts: Record<string, number> = {};
        const pendingTransfersMap = new Map<string, {
            medicationId: string;
            medicationName: string;
            totalPending: number;
            patients: Array<{
                patientId: number;
                patientName: string;
                pendingBalance: number;
            }>;
        }>();

        const now = new Date();
        const currentYear = now.getFullYear();
        const currentMonth = now.getMonth() + 1; // 1-12

        medications.forEach(med => {
            (med.patients ?? []).forEach(patient => {
                totalPatients++;

                // Status Counts
                if (patient.status === 'Suspended') {
                    suspendedPatients++;
                } else {
                    activePatients++;

                    const pendingBalance = parseFloat(patient.transferControl?.pendingBalance || '0');
                    const hasPendingTransfer =
                        patient.applicationPlace === 'HOSP. M\u00C9XICO'
                        && !!patient.transferControl
                        && !isNaN(pendingBalance)
                        && pendingBalance > 0;

                    if (hasPendingTransfer) {
                        const existing = pendingTransfersMap.get(med.id) || {
                            medicationId: med.id,
                            medicationName: med.name,
                            totalPending: 0,
                            patients: []
                        };

                        existing.totalPending += pendingBalance;
                        existing.patients.push({
                            patientId: patient.id,
                            patientName: patient.name,
                            pendingBalance
                        });

                        pendingTransfersMap.set(med.id, existing);
                    }

                    // Expiring Soon Logic
                    if (patient.endMonth && patient.endMonth.length === 7) {
                        const [mStr, yStr] = patient.endMonth.split('/');
                        const m = parseInt(mStr, 10);
                        const y = parseInt(yStr, 10);

                        if (!isNaN(m) && !isNaN(y)) {
                            const isExpired = isAuthorizationExpired(patient.endMonth);
                            const dateValue = y * 12 + m;
                            const currentValue = currentYear * 12 + currentMonth;

                            // Include if expires this month, next month, OR is already expired (and active)
                            if (dateValue === currentValue || dateValue === currentValue + 1 || isExpired) {
                                expiringList.push({
                                    patient,
                                    medicationName: med.name,
                                    isExpired
                                });
                            }
                        }
                    }
                }

                // Diagnosis Logic
                if (patient.diagnosis) {
                    const diag = patient.diagnosis.trim().toUpperCase();
                    if (diag) {
                        diagnosisCounts[diag] = (diagnosisCounts[diag] || 0) + 1;
                    }
                }
            });
        });

        // Get Top 3 Diagnoses
        const topDiagnoses = Object.entries(diagnosisCounts)
            .sort(([, a], [, b]) => b - a)
            .slice(0, 3);

        const pendingTransfers = Array.from(pendingTransfersMap.values())
            .sort((a, b) => b.totalPending - a.totalPending || a.medicationName.localeCompare(b.medicationName, 'es'));

        return {
            totalPatients,
            activePatients,
            suspendedPatients,
            expiringList,
            topDiagnoses,
            pendingTransfers
        };
    }, [medications]);

    if (stats.totalPatients === 0) return null;

    return (
        <>
            <div className="grid grid-cols-2 gap-3 mb-6">
                {/* Active Patients */}
                <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex items-center justify-between relative overflow-hidden group hover:border-emerald-300 transition-colors">
                    <div className="absolute right-0 top-0 h-full w-1 bg-emerald-500"></div>
                    <div>
                        <p className="text-slate-500 text-xs font-bold uppercase tracking-wider mb-1">Pacientes Activos</p>
                        <div className="flex items-baseline gap-2">
                            <h3 className="text-2xl font-bold text-slate-800">{stats.activePatients}</h3>
                            <span className="text-xs text-emerald-600 font-medium bg-emerald-50 px-1.5 py-0.5 rounded">
                                {Math.round((stats.activePatients / stats.totalPatients) * 100)}%
                            </span>
                        </div>
                    </div>
                    <div className="bg-emerald-50 p-2.5 rounded-lg text-emerald-600 group-hover:scale-110 transition-transform">
                        <Users size={20} />
                    </div>
                </div>

                {/* Suspended Patients */}
                <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex items-center justify-between relative overflow-hidden group hover:border-red-300 transition-colors">
                    <div className="absolute right-0 top-0 h-full w-1 bg-red-400"></div>
                    <div>
                        <p className="text-slate-500 text-xs font-bold uppercase tracking-wider mb-1">Suspendidos</p>
                        <div className="flex items-baseline gap-2">
                            <h3 className="text-2xl font-bold text-slate-800">{stats.suspendedPatients}</h3>
                            <span className="text-xs text-red-600 font-medium bg-red-50 px-1.5 py-0.5 rounded">
                                {Math.round((stats.suspendedPatients / stats.totalPatients) * 100)}%
                            </span>
                        </div>
                    </div>
                    <div className="bg-red-50 p-2.5 rounded-lg text-red-500 group-hover:scale-110 transition-transform">
                        <Activity size={20} />
                    </div>
                </div>

                {/* Expiring Soon */}
                <div
                    onClick={() => stats.expiringList.length > 0 && setIsExpiringModalOpen(true)}
                    className={`bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex items-center justify-between relative overflow-hidden group hover:border-amber-300 transition-colors ${stats.expiringList.length > 0 ? 'cursor-pointer hover:shadow-md' : ''}`}
                >
                    <div className="absolute right-0 top-0 h-full w-1 bg-amber-400"></div>
                    <div>
                        <p className="text-slate-500 text-xs font-bold uppercase tracking-wider mb-1">Vencen Pronto</p>
                        <div className="flex items-baseline gap-2">
                            <h3 className="text-2xl font-bold text-slate-800">{stats.expiringList.length}</h3>
                            {stats.expiringList.length > 0 && (
                                <span className="text-[10px] text-amber-700 font-bold bg-amber-50 px-2 py-0.5 rounded-full border border-amber-100">
                                    Ver Lista
                                </span>
                            )}
                        </div>
                    </div>
                    <div className="bg-amber-50 p-2.5 rounded-lg text-amber-500 group-hover:scale-110 transition-transform move-y-1">
                        <AlertTriangle size={20} />
                    </div>
                </div>

                {/* Top Diagnosis */}
                <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex flex-col justify-center relative overflow-hidden group hover:border-blue-300 transition-colors">
                    <div className="absolute right-0 top-0 h-full w-1 bg-blue-400"></div>
                    <div className="flex justify-between items-start mb-2">
                        <p className="text-slate-500 text-xs font-bold uppercase tracking-wider">{'Top Diagn\u00F3sticos'}</p>
                        <Stethoscope size={16} className="text-blue-400" />
                    </div>
                    <div className="space-y-1">
                        {stats.topDiagnoses.length > 0 ? (
                            stats.topDiagnoses.map(([diag, count], idx) => (
                                <div key={idx} className="flex justify-between items-center text-xs">
                                    <span className="text-slate-700 truncate max-w-[120px]" title={diag}>{diag}</span>
                                    <span className="font-bold text-slate-900 bg-slate-100 px-1.5 rounded">{count}</span>
                                </div>
                            ))
                        ) : (
                            <span className="text-xs text-slate-400 italic">Sin datos</span>
                        )}
                    </div>
                </div>

                {/* Pending Transfers to Hosp. Mexico */}
                <div
                    onClick={() => stats.pendingTransfers.length > 0 && setIsPendingTransfersModalOpen(true)}
                    className={`bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex items-center justify-between relative overflow-hidden group hover:border-cyan-300 transition-colors ${stats.pendingTransfers.length > 0 ? 'cursor-pointer hover:shadow-md' : ''}`}
                >
                    <div className="absolute right-0 top-0 h-full w-1 bg-cyan-400"></div>
                    <div>
                        <p className="text-slate-500 text-xs font-bold uppercase tracking-wider mb-1">{'Saldos Hosp. M\u00E9xico'}</p>
                        <div className="flex items-baseline gap-2 flex-wrap">
                            <h3 className="text-2xl font-bold text-slate-800">{stats.pendingTransfers.length}</h3>
                            <span className="text-xs text-cyan-700 font-medium bg-cyan-50 px-1.5 py-0.5 rounded">
                                Con pendiente
                            </span>
                            {stats.pendingTransfers.length > 0 && (
                                <span className="text-[10px] text-cyan-700 font-bold bg-cyan-50 px-2 py-0.5 rounded-full border border-cyan-100">
                                    Ver Lista
                                </span>
                            )}
                        </div>
                    </div>
                    <div className="bg-cyan-50 p-2.5 rounded-lg text-cyan-600 group-hover:scale-110 transition-transform">
                        <Truck size={20} />
                    </div>
                </div>
            </div>

            <ExpiringPatientsModal
                isOpen={isExpiringModalOpen}
                onClose={() => setIsExpiringModalOpen(false)}
                patients={stats.expiringList}
            />

            <PendingTransfersModal
                isOpen={isPendingTransfersModalOpen}
                onClose={() => setIsPendingTransfersModalOpen(false)}
                items={stats.pendingTransfers}
            />
        </>
    );
};

