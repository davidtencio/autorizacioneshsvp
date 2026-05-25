import { useState, useEffect } from 'react';
import { db } from '../firebase/firestore';
import {
    collection,
    onSnapshot,
    addDoc,
    updateDoc,
    deleteDoc,
    doc,
    query,
    orderBy
} from 'firebase/firestore';
import type { Prescriber } from '../types';

interface UsePrescribersOptions {
    enabled?: boolean;
}

const DEV_LOGS = import.meta.env.DEV;

export const usePrescribers = ({ enabled = true }: UsePrescribersOptions = {}) => {
    const [prescribers, setPrescribers] = useState<Prescriber[]>([]);
    const [loading, setLoading] = useState(enabled);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        if (!enabled) {
            return;
        }

        const q = query(collection(db, 'prescribers'), orderBy('name'));
        const unsubscribe = onSnapshot(q, (snapshot) => {
            const prescs: Prescriber[] = [];
            snapshot.forEach((doc) => {
                prescs.push({ ...doc.data(), id: doc.id } as unknown as Prescriber);
            });
            setPrescribers(prescs);
            setError(null);
            setLoading(false);
        }, (error) => {
            if (DEV_LOGS) console.error("Error fetching prescribers:", error);
            setError(`Error: ${error.message} (${error.code})`);
            setLoading(false);
        });

        return () => unsubscribe();
    }, [enabled]);

    const addPrescriber = async (prescriber: Omit<Prescriber, 'id'>) => {
        try {
            await addDoc(collection(db, 'prescribers'), prescriber);
        } catch (err) {
            if (DEV_LOGS) console.error("Error adding prescriber:", err);
            throw err;
        }
    };

    const updatePrescriber = async (id: number | string, data: Partial<Prescriber>) => {
        try {
            const docRef = doc(db, 'prescribers', String(id));
            await updateDoc(docRef, data);
        } catch (err) {
            if (DEV_LOGS) console.error("Error updating prescriber:", err);
            throw err;
        }
    };

    const deletePrescriber = async (id: number | string) => {
        try {
            const docRef = doc(db, 'prescribers', String(id));
            await deleteDoc(docRef);
        } catch (err) {
            if (DEV_LOGS) console.error("Error deleting prescriber:", err);
            throw err;
        }
    };

    return {
        prescribers,
        loading: enabled ? loading : false,
        error: enabled ? error : null,
        addPrescriber,
        updatePrescriber,
        deletePrescriber
    };
};

