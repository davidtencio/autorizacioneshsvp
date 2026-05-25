
import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { canEdit } from '../utils/permissions';
import { Users, Filter, List, Search, Plus, FileText, Syringe, Package, ShoppingBag, BarChart3 } from 'lucide-react';
import { Header } from '../components/ui/Header';
import { Skeleton } from '../components/ui/Skeleton';
import type { Medication } from '../types';
import { VirtuosoGrid } from 'react-virtuoso';

interface DashboardViewProps {
    medications: Medication[];
    loading?: boolean;
    onMedClick: (med: Medication) => void;
    onNewMed: () => void;
    onAddPrescriber: () => void;
    searchQuery: string;
    setSearchQuery: (q: string) => void;
    onLoadMore: () => void;
    limitCount: number;
    hasMore: boolean;
    onLogout: () => void;
    onViewFDA: (drugName: string) => void;
    error?: string | null;
}

export const DashboardView: React.FC<DashboardViewProps> = ({
    medications, loading = false, onMedClick, onNewMed, onAddPrescriber, searchQuery, setSearchQuery, onLoadMore, limitCount, hasMore, onLogout, onViewFDA, error
}) => {
    const { user } = useAuth();
    const isEditable = canEdit(user);
    const navigate = useNavigate();

    return (
        <div className="pb-24 bg-slate-50 min-h-screen flex flex-col">
            <Header
                title="Farmacia Hospital Heredia"
                subtitle="Gestión de Tratamientos"
                actions={
                    <div className="flex gap-2">
                        <button
                            onClick={() => navigate('/kpi')}
                            className="bg-emerald-800 hover:bg-emerald-700 p-2 rounded-lg transition-colors border border-emerald-700 text-white flex items-center gap-2"
                            title="Estadísticas"
                        >
                            <BarChart3 size={20} />
                            <span className="text-xs font-bold uppercase hidden sm:inline">Estadísticas</span>
                        </button>
                        {isEditable && (
                            <button
                                onClick={onAddPrescriber}
                                className="bg-emerald-800 hover:bg-emerald-700 p-2 rounded-lg transition-colors border border-emerald-700 text-white flex items-center gap-2"
                                title="Directorio Médicos"
                            >
                                <Users size={20} />
                                <span className="text-xs font-bold uppercase hidden sm:inline">Directorio</span>
                            </button>
                        )}
                        <button
                            onClick={onLogout}
                            className="bg-slate-200 hover:bg-slate-300 p-2 rounded-lg transition-colors border border-slate-300 text-slate-700 flex items-center gap-2"
                            title="Cerrar Sesión"
                        >
                            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"></path><polyline points="16 17 21 12 16 7"></polyline><line x1="21" y1="12" x2="9" y2="12"></line></svg>
                        </button>
                    </div>
                }
            />

            <div className="px-5 pt-6 pb-2">
                <div className="flex justify-between items-center mb-4">
                    <h2 className="text-slate-700 font-bold text-sm uppercase tracking-wide">Base de Datos</h2>
                    <div className="flex gap-2">
                        <button className="p-1.5 bg-white border border-slate-200 rounded text-slate-500 hover:text-emerald-700 hover:border-emerald-200 transition-colors"><Filter size={16} /></button>
                        <button className="p-1.5 bg-white border border-slate-200 rounded text-slate-500 hover:text-emerald-700 hover:border-emerald-200 transition-colors"><List size={16} /></button>
                    </div>
                </div>

                {/* Search Bar Professional */}
                <div className="relative mb-6">
                    <input
                        type="text"
                        placeholder="Buscar medicamento, paciente o código..."
                        className="w-full bg-white h-12 rounded-lg pl-10 pr-4 border border-slate-300 focus:border-emerald-700 focus:ring-1 focus:ring-emerald-700 outline-none text-sm shadow-sm"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                    />
                    <Search className="absolute left-3 top-3.5 text-slate-400" size={18} />
                </div>
            </div>

            {/* Content Area - Virtualized List needs explicit height or flex-grow container */}
            <div className="flex-1 px-5 h-[calc(100vh-250px)]">
                {error && (
                    <div className="bg-red-50 border border-red-200 text-red-700 p-4 rounded-lg mb-4 text-sm font-bold flex items-center justify-center">
                        <p>{error}</p>
                    </div>
                )}

                {loading && medications.length === 0 ? (
                    // Initial Skeletons (when list is empty and loading)
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {Array.from({ length: 6 }).map((_, i) => (
                            <div key={i} className="bg-white p-4 rounded-lg shadow-sm border border-slate-200">
                                <div className="flex justify-between items-start mb-2">
                                    <div className="space-y-2 w-2/3">
                                        <Skeleton className="h-5 w-3/4" />
                                        <Skeleton className="h-4 w-1/2" />
                                    </div>
                                    <Skeleton className="h-6 w-20 rounded" />
                                </div>
                                <div className="mt-4 pt-3 border-t border-slate-100 flex gap-4">
                                    <Skeleton className="h-3 w-16" />
                                    <Skeleton className="h-3 w-16" />
                                </div>
                            </div>
                        ))}
                    </div>
                ) : (
                    <VirtuosoGrid
                        style={{ height: '100%' }}
                        totalCount={medications.length}
                        overscan={300}
                        listClassName="grid grid-cols-1 md:grid-cols-2 gap-4 pb-24"
                        itemContent={(index) => {
                            const med = medications[index];
                            return (
                                <div key={med.id} className="h-full">
                                    <div
                                        onClick={() => onMedClick(med)}
                                        className="bg-white p-0 rounded-lg shadow-sm border border-slate-200 hover:border-emerald-400 hover:shadow-md transition-all cursor-pointer overflow-hidden group h-full flex flex-col"
                                    >
                                        <div className="flex flex-1">
                                            <div className={`w-1.5 ${(med.patients?.length || 0) > 0 ? 'bg-emerald-700' : 'bg-slate-200'}`} />

                                            <div className="p-4 flex-1 flex flex-col">
                                                <div className="flex justify-between items-start mb-2">
                                                    <div>
                                                        <h3 className="font-bold text-emerald-950 text-lg leading-none group-hover:text-emerald-800 transition-colors">{med.name}</h3>
                                                        <span className="text-slate-500 text-sm font-medium">{med.strength}</span>
                                                    </div>
                                                    <div className={`px-2 py-1 rounded text-xs font-bold border ${(med.patients?.length || 0) > 0 ? 'bg-emerald-50 text-emerald-800 border-emerald-100' : 'bg-slate-50 text-slate-400 border-slate-100'}`}>
                                                        {med.patients?.length || 0} Pacientes
                                                    </div>
                                                </div>

                                                <div className="flex justify-between items-center mt-auto pt-3 border-t border-slate-100">
                                                    <div className="flex items-center gap-4 text-xs text-slate-500">
                                                        <span className="flex items-center gap-1 font-mono text-emerald-700/80 font-medium">
                                                            <FileText size={12} /> {med.code}
                                                        </span>
                                                        <span className="flex items-center gap-1">
                                                            <Syringe size={12} /> {med.route}
                                                        </span>
                                                        {med.category && (
                                                            <span className={`flex items-center gap-1 font-medium ${med.category === 'Almacenable' ? 'text-blue-600' : 'text-amber-600'}`}>
                                                                {med.category === 'Almacenable' ? <Package size={12} /> : <ShoppingBag size={12} />}
                                                                {med.category}
                                                            </span>
                                                        )}
                                                    </div>
                                                    <button
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            onViewFDA(med.name);
                                                        }}
                                                        className="text-[10px] font-bold bg-blue-50 text-blue-600 px-2 py-1 rounded border border-blue-100 hover:bg-blue-100 transition-colors uppercase tracking-wider shrink-0 ml-2"
                                                    >
                                                        FDA
                                                    </button>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            );
                        }}
                    />
                )}

                {!loading && hasMore && (
                    <div className="flex justify-center py-4">
                        <button
                            onClick={onLoadMore}
                            className="bg-white border border-slate-300 text-slate-700 hover:border-emerald-300 hover:text-emerald-700 px-4 py-2 rounded-lg text-sm font-semibold transition-colors"
                        >
                            Cargar m&aacute;s (actual: {limitCount})
                        </button>
                    </div>
                )}
            </div>

            {isEditable && (
                <button
                    onClick={onNewMed}
                    className="fixed bottom-6 right-6 bg-emerald-800 hover:bg-emerald-700 text-white h-14 w-14 rounded-lg shadow-xl shadow-emerald-900/20 flex items-center justify-center transition-all active:scale-95 z-50 border border-emerald-600"
                >
                    <Plus size={28} />
                </button>
            )}
        </div>
    );
};

export default DashboardView;

