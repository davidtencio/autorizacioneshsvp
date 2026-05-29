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
import { logger } from '../utils/logger';

interface UsePrescribersOptions {
    enabled?: boolean;
}

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
                const data = doc.data() as Record<string, unknown>;
                prescs.push({
                    id: doc.id,
                    name: typeof data.name === 'string' ? data.name : '',
                    specialty: typeof data.specialty === 'string' ? data.specialty : '',
                });
            });
            setPrescribers(prescs);
            setError(null);
            setLoading(false);
        }, (error) => {
            logger.error('prescribers_fetch_failed', { code: error.code, message: error.message });
            setError(`Error: ${error.message} (${error.code})`);
            setLoading(false);
        });

        return () => unsubscribe();
    }, [enabled]);

    const addPrescriber = async (prescriber: Omit<Prescriber, 'id'>) => {
        try {
            await addDoc(collection(db, 'prescribers'), prescriber);
        } catch (err) {
            logger.error('prescriber_add_failed', { error: String(err) });
            throw err;
        }
    };

    const updatePrescriber = async (id: number | string, data: Partial<Prescriber>) => {
        try {
            const docRef = doc(db, 'prescribers', String(id));
            await updateDoc(docRef, data);
        } catch (err) {
            logger.error('prescriber_update_failed', { id: String(id), error: String(err) });
            throw err;
        }
    };

    const deletePrescriber = async (id: number | string) => {
        try {
            const docRef = doc(db, 'prescribers', String(id));
            await deleteDoc(docRef);
        } catch (err) {
            logger.error('prescriber_delete_failed', { id: String(id), error: String(err) });
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

