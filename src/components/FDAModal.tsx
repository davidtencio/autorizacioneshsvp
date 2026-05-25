
import { useState } from 'react';
import {
    X, AlertTriangle, FileText, Activity, ShieldAlert,
    Languages, Ban, Users, Thermometer, AlertOctagon,
    ChevronDown, ChevronUp, Pill, ArrowRightLeft
} from 'lucide-react';
import { useUI } from '../context/UIContext';

interface AccordionProps {
    title: string;
    icon: React.ElementType;
    content?: string[];
    colorClass: string;
    onTranslate: (text: string) => void;
    defaultOpen?: boolean;
}

const AccordionSection = ({ title, icon: Icon, content, colorClass, onTranslate, defaultOpen = false }: AccordionProps) => {
    const [isOpen, setIsOpen] = useState(defaultOpen);

    if (!content || content.length === 0) return null;

    return (
        <div className="border border-slate-200 rounded-lg overflow-hidden bg-white shadow-sm transition-all duration-200">
            <button
                onClick={() => setIsOpen(!isOpen)}
                className={`w-full flex items-center justify-between p-4 ${isOpen ? 'bg-slate-50' : 'bg-white hover:bg-slate-50'} transition-colors`}
            >
                <div className="flex items-center gap-3">
                    <div className={`p-2 rounded-lg bg-opacity-10 ${colorClass.replace('text-', 'bg-')}`}>
                        <Icon size={20} className={colorClass} />
                    </div>
                    <h5 className="font-bold text-slate-800 text-sm uppercase tracking-wide text-left">
                        {title}
                    </h5>
                </div>
                {isOpen ? <ChevronUp size={20} className="text-slate-400" /> : <ChevronDown size={20} className="text-slate-400" />}
            </button>

            {isOpen && (
                <div className="p-4 border-t border-slate-100 bg-white">
                    <div className="flex justify-end mb-3">
                        <button
                            onClick={(e) => {
                                e.stopPropagation();
                                onTranslate(content[0]);
                            }}
                            className="flex items-center gap-1.5 text-[10px] font-bold bg-indigo-50 text-indigo-600 px-3 py-1.5 rounded-full hover:bg-indigo-100 transition-colors uppercase tracking-wider"
                            title="Traducir esta seccion en Google Translate"
                        >
                            <Languages size={14} /> Traducir Seccion
                        </button>
                    </div>
                    <p className="text-sm text-slate-600 leading-relaxed whitespace-pre-line">
                        {content[0]}
                    </p>
                </div>
            )}
        </div>
    );
};

export const FDAModal = () => {
    const { isFDAModalOpen, closeFDAModal, fdaData, fdaLoading, fdaError } = useUI();

    const openTranslation = (text: string) => {
        const url = `https://translate.google.com/?sl=en&tl=es&text=${encodeURIComponent(text)}&op=translate`;
        window.open(url, '_blank', 'noopener,noreferrer');
    };

    if (!isFDAModalOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
            <div className="bg-slate-50 rounded-xl shadow-2xl w-full max-w-3xl max-h-[90vh] flex flex-col overflow-hidden border border-slate-200">
                {/* Header */}
                <div className="p-4 border-b border-slate-200 flex justify-between items-center bg-white shadow-sm z-10">
                    <div className="flex items-center gap-3 text-slate-800">
                        <div className="bg-blue-50 p-2 rounded-lg">
                            <ShieldAlert className="text-blue-700" size={24} />
                        </div>
                        <div>
                            <h3 className="font-bold text-lg leading-tight">Monografia FDA</h3>
                            <p className="text-[10px] text-slate-500 font-medium uppercase tracking-wider">Informacion Oficial de Seguridad</p>
                        </div>
                    </div>
                    <button
                        onClick={closeFDAModal}
                        className="p-2 hover:bg-slate-100 rounded-full transition-colors text-slate-400 hover:text-slate-600"
                    >
                        <X size={24} />
                    </button>
                </div>

                {/* Content */}
                <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4 bg-slate-50/50">
                    {fdaLoading ? (
                        <div className="flex flex-col items-center justify-center py-20 text-slate-400 space-y-4">
                            <Activity className="animate-spin text-blue-600" size={40} />
                            <p className="text-sm font-medium animate-pulse">Obteniendo datos de openFDA...</p>
                        </div>
                    ) : fdaError ? (
                        <div className="flex flex-col items-center justify-center py-12 text-center px-6">
                            <div className="bg-amber-100 text-amber-600 p-6 rounded-full mb-4 shadow-sm">
                                <AlertTriangle size={48} />
                            </div>
                            <h4 className="text-lg font-bold text-slate-700 mb-2">No se encontro informacion</h4>
                            <p className="text-slate-500 max-w-md">{fdaError}</p>
                            <button
                                onClick={closeFDAModal}
                                className="mt-6 px-6 py-2 bg-slate-200 text-slate-700 font-bold rounded-lg hover:bg-slate-300 transition-colors"
                            >
                                Cerrar
                            </button>
                        </div>
                    ) : fdaData ? (
                        <div className="space-y-4">
                            {/* Product Info Card */}
                            <div className="bg-white p-5 rounded-xl border border-blue-100 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                                <div>
                                    <h4 className="font-bold text-blue-900 text-xl capitalize mb-1">
                                        {fdaData.openfda?.brand_name?.[0] || fdaData.openfda?.generic_name?.[0] || 'Informacion del Producto'}
                                    </h4>
                                    <div className="flex flex-wrap gap-2 text-xs font-medium uppercase tracking-wide text-blue-600/80">
                                        {fdaData.openfda?.manufacturer_name?.[0] && (
                                            <span className="bg-blue-50 px-2 py-1 rounded-md border border-blue-100">
                                                {fdaData.openfda.manufacturer_name[0]}
                                            </span>
                                        )}
                                        {fdaData.openfda?.product_type?.[0] && (
                                            <span className="bg-slate-100 text-slate-600 px-2 py-1 rounded-md border border-slate-200">
                                                {fdaData.openfda.product_type[0]}
                                            </span>
                                        )}
                                    </div>
                                </div>
                                <div className="hidden sm:block">
                                    <Pill className="text-blue-200" size={48} />
                                </div>
                            </div>

                            {/* BOXED WARNING - Always Visible if present */}
                            {fdaData.boxed_warning && (
                                <div className="bg-red-50 rounded-xl border border-red-200 p-5 shadow-sm relative overflow-hidden group">
                                    <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
                                        <AlertTriangle size={100} className="text-red-600" />
                                    </div>
                                    <div className="relative z-10">
                                        <div className="flex items-center gap-2 mb-3">
                                            <AlertOctagon className="text-red-600" size={24} />
                                            <h5 className="font-bold text-red-700 text-base uppercase tracking-wide">Advertencia Recuadro Negro</h5>
                                        </div>
                                        <div className="bg-white/60 p-4 rounded-lg border border-red-100 backdrop-blur-sm">
                                            <p className="text-sm text-red-900 leading-relaxed font-medium whitespace-pre-line">
                                                {fdaData.boxed_warning[0]}
                                            </p>
                                        </div>
                                        <div className="mt-3 flex justify-end">
                                            <button
                                                onClick={() => openTranslation(fdaData.boxed_warning?.[0] || '')}
                                                className="flex items-center gap-1.5 text-xs font-bold text-red-700 hover:text-red-900 hover:bg-red-100 px-3 py-1.5 rounded-lg transition-colors"
                                            >
                                                <Languages size={14} /> Traducir Advertencia
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            )}

                            {/* Accordion Sections */}
                            <div className="space-y-3">
                                <AccordionSection
                                    title="Indicaciones y Uso"
                                    icon={FileText}
                                    content={fdaData.indications_and_usage}
                                    colorClass="text-emerald-600"
                                    onTranslate={openTranslation}
                                    defaultOpen={true}
                                />

                                <AccordionSection
                                    title="Dosis y Administracion"
                                    icon={Activity}
                                    content={fdaData.dosage_and_administration}
                                    colorClass="text-blue-600"
                                    onTranslate={openTranslation}
                                />

                                <AccordionSection
                                    title="Contraindicaciones"
                                    icon={Ban}
                                    content={fdaData.contraindications}
                                    colorClass="text-red-500"
                                    onTranslate={openTranslation}
                                />

                                <AccordionSection
                                    title="Advertencias y Precauciones"
                                    icon={AlertTriangle}
                                    content={fdaData.warnings}
                                    colorClass="text-amber-500"
                                    onTranslate={openTranslation}
                                />

                                <AccordionSection
                                    title="Reacciones Adversas"
                                    icon={AlertOctagon}
                                    content={fdaData.adverse_reactions}
                                    colorClass="text-orange-500"
                                    onTranslate={openTranslation}
                                />

                                <AccordionSection
                                    title="Interacciones Farmacologicas"
                                    icon={ArrowRightLeft}
                                    content={fdaData.drug_interactions}
                                    colorClass="text-indigo-500"
                                    onTranslate={openTranslation}
                                />

                                <AccordionSection
                                    title="Uso en Poblaciones Especificas"
                                    icon={Users}
                                    content={fdaData.use_in_specific_populations}
                                    colorClass="text-teal-600"
                                    onTranslate={openTranslation}
                                />

                                <AccordionSection
                                    title="Sobredosis"
                                    icon={ShieldAlert}
                                    content={fdaData.overdosage}
                                    colorClass="text-rose-600"
                                    onTranslate={openTranslation}
                                />

                                <AccordionSection
                                    title="Almacenamiento y Manipulacion"
                                    icon={Thermometer}
                                    content={fdaData.storage_and_handling}
                                    colorClass="text-sky-600"
                                    onTranslate={openTranslation}
                                />
                            </div>
                        </div>
                    ) : null}
                </div>

                {/* Footer */}
                <div className="p-3 border-t border-slate-200 bg-white text-center">
                    <p className="text-[10px] text-slate-400 font-medium">
                        Fuente: openFDA (api.fda.gov) - Esta informacion no sustituye el consejo medico profesional.
                    </p>
                </div>
            </div>
        </div>
    );
};

