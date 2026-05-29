
import React, { useState } from 'react';
import { Users, ShieldPlus, Plus } from 'lucide-react';
import { CorporateInput } from './ui/CorporateInput';
import type { Prescriber } from '../types';

interface NewPrescriberFormProps {
    onSubmit: (data: Partial<Prescriber>) => void;
    initialData?: Partial<Prescriber> | null | undefined;
}

export const NewPrescriberForm: React.FC<NewPrescriberFormProps> = ({
    onSubmit, initialData
}) => {
    const [name, setName] = useState(initialData?.name || '');
    const [specialty, setSpecialty] = useState(initialData?.specialty || '');

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        onSubmit({
            name,
            specialty
        });
    };

    return (
        <form onSubmit={handleSubmit} className="p-5 space-y-4">
            <CorporateInput
                label="Nombre y Apellidos"
                value={name}
                onChange={(e) => setName(e.target.value.toUpperCase())}
                placeholder="DR. JUAN PEREZ"
                icon={Users}
                required
            />
            <CorporateInput
                label="Especialidad"
                value={specialty}
                onChange={(e) => setSpecialty(e.target.value.toUpperCase())}
                placeholder="ONCOLOGÍA"
                icon={ShieldPlus}
                required
            />
            <div className="pt-4">
                <button
                    type="submit"
                    className="w-full bg-emerald-800 hover:bg-emerald-700 text-white p-3 rounded-lg font-bold shadow-lg shadow-emerald-900/10 transition-all active:scale-95 flex justify-center gap-2"
                >
                    <Plus size={20} />
                    Guardar Prescriptor
                </button>
            </div>
        </form>
    );
};
