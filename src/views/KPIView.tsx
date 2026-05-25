import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Header } from '../components/ui/Header';
import { KPIStats } from '../components/KPIStats';
import type { Medication } from '../types';

interface KPIViewProps {
    medications: Medication[];
}

export const KPIView: React.FC<KPIViewProps> = ({ medications }) => {
    const navigate = useNavigate();

    return (
        <div className="min-h-screen bg-slate-50 relative pb-20">
            <Header
                title="Estadísticas"
                subtitle="Indicadores Clave"
                onBack={() => navigate('/')}
            />

            <div className="px-5 pt-6 pb-2">
                <KPIStats medications={medications} />
            </div>

            <div className="fixed bottom-6 w-full max-w-md px-5 flex justify-center pointer-events-none">
                {/* Floating button area if needed, otherwise clean */}
            </div>
        </div>
    );
};

export default KPIView;

