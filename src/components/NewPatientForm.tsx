
import React, { useState } from 'react';
import { FileText, Users, ShieldPlus, ChevronLeft } from 'lucide-react';
import { CorporateInput } from './ui/CorporateInput';
import { Modal } from './ui/Modal';
import { TransferControlContent } from './TransferControlModalContent';
import type { Patient, Prescriber } from '../types';
import { formatDateMMYYYY } from '../utils/formatters';

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

    const handleChange = (field: keyof Omit<Patient, 'id'>, value: string) => {
        const upperValue = value.toUpperCase();
        setFormData(prev => ({ ...prev, [field]: upperValue }));

        if (field === 'applicationPlace' && upperValue === 'HOSP. MÉXICO') {
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
    };

    const handleDateChange = (field: keyof Omit<Patient, 'id'>, value: string) => {
        const formattedValue = formatDateMMYYYY(value);
        setFormData(prev => ({ ...prev, [field]: formattedValue }));
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        onSubmit(formData);
    };

    return (
        <div className="p-6 max-h-[80vh] overflow-y-auto custom-scrollbar">
            <form onSubmit={handleSubmit} className="space-y-6">

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
                    />
                    <CorporateInput
                        label="Nombre Completo"
                        value={formData.name}
                        onChange={(e) => handleChange('name', e.target.value)}
                        placeholder="Nombre y Apellidos"
                        icon={Users}
                        required
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
                    />

                    <div className="grid grid-cols-2 gap-4">
                        <CorporateInput
                            label="Clave Autorización"
                            value={formData.authorizationCode}
                            onChange={(e) => handleChange('authorizationCode', e.target.value)}
                            placeholder="Código"
                            icon={ShieldPlus}
                        />

                        <div className="space-y-1.5">
                            <label className="text-xs font-bold text-emerald-900 uppercase tracking-wide flex items-center gap-1.5 opacity-80">
                                Emisor
                            </label>
                            <div className="relative">
                                <select
                                    className="w-full bg-white text-slate-900 p-3 rounded-lg border border-slate-300 focus:border-emerald-700 focus:ring-1 focus:ring-emerald-700 outline-none appearance-none font-medium"
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
                        />
                        <CorporateInput
                            label="Mes Finalización"
                            value={formData.endMonth}
                            onChange={(e) => handleDateChange('endMonth', e.target.value)}
                            placeholder="MM/AAAA"
                            maxLength={7}
                        />
                    </div>

                    <div className="grid grid-cols-3 gap-3">
                        <CorporateInput
                            label="Dosis"
                            value={formData.dose}
                            onChange={(e) => handleChange('dose', e.target.value)}
                            placeholder="Cant."
                        />
                        <CorporateInput
                            label="Frecuencia"
                            value={formData.frequency}
                            onChange={(e) => handleChange('frequency', e.target.value)}
                            placeholder="Ej: 8h"
                        />
                        <CorporateInput
                            label="Vía Adm."
                            value={formData.route}
                            onChange={(e) => handleChange('route', e.target.value)}
                            placeholder="Oral/IV"
                        />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <CorporateInput
                            label="Total Ciclos"
                            value={formData.totalCycles}
                            onChange={(e) => handleChange('totalCycles', e.target.value)}
                            placeholder="#"
                        />
                        <CorporateInput
                            label="Total Meses"
                            value={formData.totalMonths}
                            onChange={(e) => handleChange('totalMonths', e.target.value)}
                            placeholder="#"
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
                                className="w-full bg-white text-slate-900 p-3 rounded-lg border border-slate-300 focus:border-emerald-700 focus:ring-1 focus:ring-emerald-700 outline-none appearance-none font-medium"
                                value={formData.applicationPlace}
                                onChange={(e) => handleChange('applicationPlace', e.target.value)}
                            >
                                <option value="">Seleccionar...</option>
                                <option value="HOSP. HEREDIA">Hosp. Heredia</option>
                                <option value="HOSP. MÉXICO">Hosp. México</option>
                                <option value="OTRO">Otro</option>
                            </select>
                            <ChevronLeft size={16} className="absolute right-4 top-1/2 -translate-y-1/2 -rotate-90 text-slate-400 pointer-events-none" />
                        </div>
                        {formData.applicationPlace === 'HOSP. MÉXICO' && (
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
                                    className="w-full bg-white text-slate-900 p-3 rounded-lg border border-slate-300 focus:border-emerald-700 focus:ring-1 focus:ring-emerald-700 outline-none appearance-none font-medium"
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
