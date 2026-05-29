
import React, { useState } from 'react';
import { FileText, Users, ShieldPlus, ChevronLeft, AlertTriangle } from 'lucide-react';
import { CorporateInput } from './ui/CorporateInput';
import { Modal } from './ui/Modal';
import { TransferControlContent } from './TransferControlModalContent';
import type { Patient, Prescriber } from '../types';
import { formatDateMMYYYY } from '../utils/formatters';
import { HOSP_MEXICO } from '../utils/constants';
import { validatePatientForm, REQUIRED_PATIENT_FIELDS } from '../utils/patientOperations';

const FIELD_LABELS: Record<string, string> = Object.fromEntries(
    REQUIRED_PATIENT_FIELDS.map(({ field, label }) => [field, label])
);

interface NewPatientFormProps {
    onSubmit: (data: Omit<Patient, 'id'>) => void;
    initialData?: Omit<Patient, 'id'> | null;
    isEditing: boolean;
    prescribers: Prescriber[];
    isRenewing?: boolean;
}

const DEFAULT_FORM_DATA: Omit<Patient, 'id'> = {
    name: '',
    identificationNumber: '',
    diagnosis: '',
    authorizationCode: '',
    issuer: '',
    startMonth: '',
    endMonth: '',
    dose: '',
    frequency: '',
    route: '',
    totalCycles: '',
    totalMonths: '',
    applicationPlace: '',
    prescriber: '',
    specialty: ''
};

export const NewPatientForm: React.FC<NewPatientFormProps> = ({
    onSubmit,
    initialData,
    isEditing,
    prescribers,
    isRenewing = false
}) => {
    const [formData, setFormData] = useState<Omit<Patient, 'id'>>(initialData || DEFAULT_FORM_DATA);
    const [isTransferModalOpen, setIsTransferModalOpen] = useState(false);
    const [errors, setErrors] = useState<Set<keyof Omit<Patient, 'id'>>>(new Set());

    const clearError = (field: keyof Omit<Patient, 'id'>) => {
        setErrors(prev => {
            if (!prev.has(field)) return prev;
            const next = new Set(prev);
            next.delete(field);
            return next;
        });
    };

    const handleChange = (field: keyof Omit<Patient, 'id'>, value: string) => {
        const upperValue = value.toUpperCase();
        setFormData(prev => ({ ...prev, [field]: upperValue }));
        clearError(field);

        if (field === 'applicationPlace' && upperValue === HOSP_MEXICO) {
            setIsTransferModalOpen(true);
        }
    };

    const handlePrescriberChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
        const selectedName = e.target.value;
        const selectedPrescriber = prescribers.find(p => p.name === selectedName);

        if (selectedPrescriber) {
            setFormData(prev => ({
                ...prev,
                prescriber: selectedName,
                specialty: selectedPrescriber.specialty
            }));
        } else {
            setFormData(prev => ({
                ...prev,
                prescriber: selectedName,
                specialty: selectedName === '' ? '' : prev.specialty
            }));
        }
        clearError('prescriber');
        clearError('specialty');
    };

    const handleDateChange = (field: keyof Omit<Patient, 'id'>, value: string) => {
        const formattedValue = formatDateMMYYYY(value);
        setFormData(prev => ({ ...prev, [field]: formattedValue }));
        clearError(field);
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        const missing = validatePatientForm(formData);
        if (missing.length > 0) {
            setErrors(new Set(missing));
            return;
        }
        setErrors(new Set());
        onSubmit(formData);
    };

    return (
        <div className="p-6 max-h-[80vh] overflow-y-auto custom-scrollbar">
            <form onSubmit={handleSubmit} noValidate className="space-y-6">

                {errors.size > 0 && (
                    <div role="alert" className="bg-red-50 border border-red-200 text-red-700 p-3 rounded-lg text-sm flex gap-2">
                        <AlertTriangle size={18} className="flex-shrink-0 mt-0.5" />
                        <div>
                            <p className="font-bold mb-1">Complete los campos obligatorios:</p>
                            <p className="text-xs">
                                {Array.from(errors).map((f) => FIELD_LABELS[f] ?? f).join(', ')}
                            </p>
                        </div>
                    </div>
                )}

                {/* Sección: Identificación del Paciente */}
                <div className="space-y-4">
                    <h4 className="text-xs font-bold text-emerald-800 uppercase tracking-widest border-b border-emerald-100 pb-1 mb-2">Datos Personales</h4>
                    <CorporateInput
                        label="Cédula / Identificación"
                        value={formData.identificationNumber}
                        onChange={(e) => handleChange('identificationNumber', e.target.value)}
                        placeholder="0-0000-0000"
                        icon={FileText}
                        required
                        error={errors.has('identificationNumber')}
                    />
                    <CorporateInput
                        label="Nombre Completo"
                        value={formData.name}
                        onChange={(e) => handleChange('name', e.target.value)}
                        placeholder="Nombre y Apellidos"
                        icon={Users}
                        required
                        error={errors.has('name')}
                    />
                </div>

                {/* Sección: Detalle Clínico y Autorización */}
                <div className="space-y-4">
                    <h4 className="text-xs font-bold text-emerald-800 uppercase tracking-widest border-b border-emerald-100 pb-1 mb-2">Clínico y Autorización</h4>

                    <CorporateInput
                        label="Diagnóstico"
                        value={formData.diagnosis}
                        onChange={(e) => handleChange('diagnosis', e.target.value)}
                        placeholder="Descripción"
                        error={errors.has('diagnosis')}
                    />

                    <div className="grid grid-cols-2 gap-4">
                        <CorporateInput
                            label="Clave Autorización"
                            value={formData.authorizationCode}
                            onChange={(e) => handleChange('authorizationCode', e.target.value)}
                            placeholder="Código"
                            icon={ShieldPlus}
                            error={errors.has('authorizationCode')}
                        />

                        <div className="space-y-1.5">
                            <label className="text-xs font-bold text-emerald-900 uppercase tracking-wide flex items-center gap-1.5 opacity-80">
                                Emisor
                            </label>
                            <div className="relative">
                                <select
                                    aria-invalid={errors.has('issuer') || undefined}
                                    className={`w-full bg-white text-slate-900 p-3 rounded-lg border outline-none appearance-none font-medium ${errors.has('issuer') ? 'border-red-400 focus:border-red-500 focus:ring-1 focus:ring-red-500' : 'border-slate-300 focus:border-emerald-700 focus:ring-1 focus:ring-emerald-700'}`}
                                    value={formData.issuer}
                                    onChange={(e) => handleChange('issuer', e.target.value)}
                                >
                                    <option value="">Seleccionar...</option>
                                    <option value="CCF">CCF</option>
                                    <option value="CLF">CLF</option>
                                    <option value="RA">RA</option>
                                </select>
                                <ChevronLeft size={16} className="absolute right-4 top-1/2 -translate-y-1/2 -rotate-90 text-slate-400 pointer-events-none" />
                            </div>
                        </div>
                    </div>
                </div>

                {/* Sección: Tratamiento */}
                <div className="space-y-4">
                    <h4 className="text-xs font-bold text-emerald-800 uppercase tracking-widest border-b border-emerald-100 pb-1 mb-2">Detalle Tratamiento</h4>

                    <div className="grid grid-cols-2 gap-4">
                        <CorporateInput
                            label="Mes Inicio"
                            value={formData.startMonth}
                            onChange={(e) => handleDateChange('startMonth', e.target.value)}
                            placeholder="MM/AAAA"
                            maxLength={7}
                            error={errors.has('startMonth')}
                        />
                        <CorporateInput
                            label="Mes Finalización"
                            value={formData.endMonth}
                            onChange={(e) => handleDateChange('endMonth', e.target.value)}
                            placeholder="MM/AAAA"
                            maxLength={7}
                            error={errors.has('endMonth')}
                        />
                    </div>

                    <div className="grid grid-cols-3 gap-3">
                        <CorporateInput
                            label="Dosis"
                            value={formData.dose}
                            onChange={(e) => handleChange('dose', e.target.value)}
                            placeholder="Cant."
                            error={errors.has('dose')}
                        />
                        <CorporateInput
                            label="Frecuencia"
                            value={formData.frequency}
                            onChange={(e) => handleChange('frequency', e.target.value)}
                            placeholder="Ej: 8h"
                            error={errors.has('frequency')}
                        />
                        <CorporateInput
                            label="Vía Adm."
                            value={formData.route}
                            onChange={(e) => handleChange('route', e.target.value)}
                            placeholder="Oral/IV"
                            error={errors.has('route')}
                        />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <CorporateInput
                            label="Total Ciclos"
                            value={formData.totalCycles}
                            onChange={(e) => handleChange('totalCycles', e.target.value)}
                            placeholder="#"
                            error={errors.has('totalCycles')}
                        />
                        <CorporateInput
                            label="Total Meses"
                            value={formData.totalMonths}
                            onChange={(e) => handleChange('totalMonths', e.target.value)}
                            placeholder="#"
                            error={errors.has('totalMonths')}
                        />
                    </div>
                </div>

                {/* Sección: Logística y Prescripción */}
                <div className="space-y-4">
                    <h4 className="text-xs font-bold text-emerald-800 uppercase tracking-widest border-b border-emerald-100 pb-1 mb-2">Logística</h4>

                    <div className="space-y-1.5">
                        <label className="text-xs font-bold text-emerald-900 uppercase tracking-wide flex items-center gap-1.5 opacity-80">
                            Lugar de Aplicación
                        </label>
                        <div className="relative">
                            <select
                                aria-invalid={errors.has('applicationPlace') || undefined}
                                className={`w-full bg-white text-slate-900 p-3 rounded-lg border outline-none appearance-none font-medium ${errors.has('applicationPlace') ? 'border-red-400 focus:border-red-500 focus:ring-1 focus:ring-red-500' : 'border-slate-300 focus:border-emerald-700 focus:ring-1 focus:ring-emerald-700'}`}
                                value={formData.applicationPlace}
                                onChange={(e) => handleChange('applicationPlace', e.target.value)}
                            >
                                <option value="">Seleccionar...</option>
                                <option value="HOSP. HEREDIA">Hosp. Heredia</option>
                                <option value={HOSP_MEXICO}>Hosp. México</option>
                                <option value="OTRO">Otro</option>
                            </select>
                            <ChevronLeft size={16} className="absolute right-4 top-1/2 -translate-y-1/2 -rotate-90 text-slate-400 pointer-events-none" />
                        </div>
                        {formData.applicationPlace === HOSP_MEXICO && (
                            <button
                                type="button"
                                onClick={() => setIsTransferModalOpen(true)}
                                className="text-[10px] text-emerald-700 font-bold hover:underline mt-1 flex items-center gap-1"
                            >
                                <span className="bg-emerald-100 px-1 rounded border border-emerald-200">EDITAR CONTROL</span>
                            </button>
                        )}
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-1.5">
                            <label className="text-xs font-bold text-emerald-900 uppercase tracking-wide flex items-center gap-1.5 opacity-80">
                                Prescriptor
                            </label>
                            <div className="relative">
                                <select
                                    aria-invalid={errors.has('prescriber') || undefined}
                                    className={`w-full bg-white text-slate-900 p-3 rounded-lg border outline-none appearance-none font-medium ${errors.has('prescriber') ? 'border-red-400 focus:border-red-500 focus:ring-1 focus:ring-red-500' : 'border-slate-300 focus:border-emerald-700 focus:ring-1 focus:ring-emerald-700'}`}
                                    value={formData.prescriber}
                                    onChange={handlePrescriberChange}
                                >
                                    <option value="">Seleccionar...</option>
                                    {prescribers.map(p => (
                                        <option key={p.id} value={p.name}>{p.name} - {p.specialty}</option>
                                    ))}
                                    <option value="OTRO">OTRO (Especificar en notas)</option>
                                </select>
                                <ChevronLeft size={16} className="absolute right-4 top-1/2 -translate-y-1/2 -rotate-90 text-slate-400 pointer-events-none" />
                            </div>
                        </div>

                        <CorporateInput
                            label="Especialidad"
                            value={formData.specialty}
                            onChange={(e) => handleChange('specialty', e.target.value)}
                            placeholder="Ej: Onco"
                            error={errors.has('specialty')}
                        />
                    </div>
                </div>

                <div className="pt-4">
                    <button
                        type="submit"
                        className={`w-full text-white font-bold py-4 rounded-lg shadow active:scale-[0.99] transition-all ${isRenewing ? 'bg-amber-600 hover:bg-amber-700' : 'bg-emerald-800 hover:bg-emerald-700'}`}
                    >
                        {isRenewing ? "Renovar Tratamiento" : isEditing ? "Actualizar Asignación" : "Confirmar Asignación"}
                    </button>
                </div>
            </form>

            <Modal
                isOpen={isTransferModalOpen}
                onClose={() => {
                    setIsTransferModalOpen(false);
                }}
                title="Control de Traslados"
            >
                <TransferControlContent
                    initialData={formData.transferControl}
                    onSave={(data) => {
                        setFormData(prev => ({ ...prev, transferControl: data }));
                        setIsTransferModalOpen(false);
                    }}
                    onCancel={() => setIsTransferModalOpen(false)}
                />
            </Modal>
        </div >
    );
};
