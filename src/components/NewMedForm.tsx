
import React, { useState } from 'react';
import { FileText, Pill, Syringe, ChevronLeft } from 'lucide-react';
import { CorporateInput } from './ui/CorporateInput';
import type { Medication } from '../types';
import { formatMedicationCode } from '../utils/formatters';

interface NewMedFormProps {
    onSubmit: (data: Partial<Medication>) => void;
    initialData?: Medication | null | undefined;
    isEditing: boolean;
}

export const NewMedForm: React.FC<NewMedFormProps> = ({
    onSubmit,
    initialData,
    isEditing
}) => {
    const [code, setCode] = useState(initialData?.code || '');
    const [name, setName] = useState(initialData?.name || '');
    const [strength, setStrength] = useState(initialData?.strength || '');
    const [route, setRoute] = useState(initialData?.route || '');
    const [category, setCategory] = useState<'Almacenable' | 'Compra Local'>((initialData?.category && initialData.category !== 'No Definido' ? initialData.category : 'Almacenable') as 'Almacenable' | 'Compra Local');

    const handleCodeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const formatted = formatMedicationCode(e.target.value);
        setCode(formatted);
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        onSubmit({
            code,
            name,
            strength,
            route,
            category
        });
    };

    return (
        <div className="p-6">
            <form onSubmit={handleSubmit} className="space-y-6">
                <CorporateInput
                    label="Código de Referencia"
                    value={code}
                    onChange={handleCodeChange}
                    placeholder="0-00-00-0000"
                    icon={FileText}
                    required
                />

                <CorporateInput
                    label="Nombre del Medicamento"
                    value={name}
                    onChange={(e) => setName(e.target.value.toUpperCase())}
                    placeholder="Nombre oficial"
                    icon={Pill}
                    required
                />

                <div className="grid grid-cols-2 gap-4">
                    <CorporateInput
                        label="Potencia"
                        value={strength}
                        onChange={(e) => setStrength(e.target.value.toUpperCase())}
                        placeholder="Ej: 500mg"
                    />

                    <div className="space-y-1.5">
                        <label className="text-xs font-bold text-emerald-900 uppercase tracking-wide flex items-center gap-1.5 opacity-80">
                            <Syringe size={14} className="text-emerald-700" />
                            Vía Adm.
                        </label>
                        <div className="relative">
                            <select
                                className="w-full bg-white text-slate-900 p-3 rounded-lg border border-slate-300 focus:border-emerald-700 focus:ring-1 focus:ring-emerald-700 outline-none appearance-none font-medium"
                                value={route}
                                onChange={(e) => setRoute(e.target.value.toUpperCase())}
                                required
                            >
                                <option value="">Seleccionar...</option>
                                <option value="ORAL">Oral</option>
                                <option value="INTRAVENOSA">Intravenosa</option>
                                <option value="INTRAMUSCULAR">Intramuscular</option>
                                <option value="SUBCUTÁNEA">Subcutánea</option>
                                <option value="TÓPICA">Tópica</option>
                            </select>
                            <ChevronLeft size={16} className="absolute right-4 top-1/2 -translate-y-1/2 -rotate-90 text-slate-400 pointer-events-none" />
                        </div>
                    </div>

                    <div className="space-y-1.5 col-span-2 mt-4">
                        <label className="text-xs font-bold text-emerald-900 uppercase tracking-wide flex items-center gap-1.5 opacity-80">
                            <Pill size={14} className="text-emerald-700" />
                            Categoría
                        </label>
                        <div className="flex gap-4">
                            <label className="flex items-center gap-2 cursor-pointer border p-3 rounded-lg bg-white hover:bg-slate-50 transition-colors flex-1 shadow-sm">
                                <input
                                    type="radio"
                                    name="category"
                                    value="Almacenable"
                                    checked={category === 'Almacenable'}
                                    onChange={(e) => setCategory(e.target.value as 'Almacenable' | 'Compra Local')}
                                    className="w-4 h-4 text-emerald-700 focus:ring-emerald-700"
                                />
                                <span className="text-sm font-medium text-slate-700">Almacenable</span>
                            </label>
                            <label className="flex items-center gap-2 cursor-pointer border p-3 rounded-lg bg-white hover:bg-slate-50 transition-colors flex-1 shadow-sm">
                                <input
                                    type="radio"
                                    name="category"
                                    value="Compra Local"
                                    checked={category === 'Compra Local'}
                                    onChange={(e) => setCategory(e.target.value as 'Almacenable' | 'Compra Local')}
                                    className="w-4 h-4 text-emerald-700 focus:ring-emerald-700"
                                />
                                <span className="text-sm font-medium text-slate-700">Compra Local</span>
                            </label>
                        </div>
                    </div>
                </div>

                <div className="pt-4">
                    <button
                        type="submit"
                        className="w-full bg-emerald-800 text-white font-bold py-4 rounded-lg shadow hover:bg-emerald-700 active:scale-[0.99] transition-all"
                    >
                        {isEditing ? "Actualizar Medicamento" : "Guardar en Inventario"}
                    </button>
                </div>
            </form>
        </div>
    );
};
