import React, { useState } from 'react';
import type { TransferControl } from '../types';

interface TransferControlContentProps {
    initialData?: TransferControl;
    onSave: (data: TransferControl) => void;
    onCancel: () => void;
}

export const TransferControlContent: React.FC<TransferControlContentProps> = ({ initialData, onSave, onCancel }) => {
    const [totalUnits, setTotalUnits] = useState(initialData?.totalUnits || '');
    const [transfers, setTransfers] = useState<string[]>(initialData?.transfers || ['', '', '', '', '', '']);

    const total = parseFloat(totalUnits) || 0;
    const transferred = transfers.reduce((acc, curr) => acc + (parseFloat(curr) || 0), 0);
    const pendingBalance = (total - transferred).toFixed(0);

    const handleTransferChange = (index: number, value: string) => {
        const newTransfers = [...transfers];
        newTransfers[index] = value;
        setTransfers(newTransfers);
    };

    const handleSave = () => {
        if (!totalUnits) {
            alert("La cantidad total es obligatoria"); // Basic validation
            return;
        }
        onSave({ totalUnits, transfers, pendingBalance });
    };

    return (
        <div className="p-4 space-y-4">
            <h3 className="text-sm font-bold text-center text-slate-700 uppercase mb-4">Control de Traslados</h3>

            <div className="space-y-1">
                <label className="text-xs font-bold text-emerald-800 uppercase">Cantidad Total (Unidades)</label>
                <input
                    type="number"
                    value={totalUnits}
                    onChange={(e) => setTotalUnits(e.target.value)}
                    className="w-full border border-slate-300 rounded p-2 text-center font-bold text-lg focus:ring-2 focus:ring-emerald-500 outline-none bg-white text-slate-900"
                    placeholder="0"
                    autoFocus
                />
            </div>

            <div className="space-y-2">
                <label className="text-xs font-bold text-slate-500 uppercase">Unidades Trasladadas (Registro)</label>
                <div className="grid grid-cols-3 gap-2">
                    {transfers.map((val, idx) => (
                        <input
                            key={idx}
                            type="number"
                            value={val}
                            onChange={(e) => handleTransferChange(idx, e.target.value)}
                            className="border border-slate-200 rounded p-2 text-center text-sm focus:border-emerald-500 outline-none bg-white text-slate-900"
                            placeholder={`#${idx + 1}`}
                        />
                    ))}
                </div>
            </div>

            <div className="bg-slate-100 p-3 rounded-lg flex justify-between items-center border border-slate-200">
                <span className="text-xs font-bold text-slate-600 uppercase">Saldo Pendiente</span>
                <span className={`font-bold text-lg ${parseFloat(pendingBalance) < 0 ? 'text-red-600' : 'text-emerald-700'}`}>
                    {pendingBalance || '0'}
                </span>
            </div>

            <div className="flex gap-3 pt-2">
                <button
                    onClick={onCancel}
                    className="flex-1 py-3 text-slate-500 font-bold text-xs uppercase hover:bg-slate-100 rounded transition-colors"
                >
                    Cancelar
                </button>
                <button
                    onClick={handleSave}
                    className="flex-1 bg-emerald-800 text-white py-3 rounded font-bold text-xs uppercase hover:bg-emerald-700 transition-colors shadow-sm"
                >
                    Guardar
                </button>
            </div>
        </div>
    );
};
