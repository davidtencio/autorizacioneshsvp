import { useState, useEffect } from 'react';
import { db } from '../firebase/firestore';
import {
    collection,
    onSnapshot,
    getDocs,
    addDoc,
    updateDoc,
    deleteDoc,
    doc,
    query,
    orderBy,
    limit,
    startAfter,
    type DocumentData,
    type QueryDocumentSnapshot,
} from 'firebase/firestore';
import type { Medication } from '../types';

interface UseMedicationsOptions {
    enabled?: boolean;
}

const DEV_LOGS = import.meta.env.DEV;
const PAGE_SIZE = 30;

const mapMedication = (snapshotDoc: QueryDocumentSnapshot<DocumentData>): Medication => {
    const data = snapshotDoc.data();
    let patients = [];

    if (Array.isArray(data.patients)) {
        patients = data.patients;
    } else if (data.patients && DEV_LOGS) {
        console.warn(`Medication ${snapshotDoc.id} (${data.name}) has invalid 'patients' format (expected Array):`, data.patients);
    }

    return {
        ...data,
        id: snapshotDoc.id,
        patients,
    } as unknown as Medication;
};

export const useMedications = ({ enabled = true }: UseMedicationsOptions = {}) => {
    const [medications, setMedications] = useState<Medication[]>([]);
    const [loading, setLoading] = useState(enabled);
    const [error, setError] = useState<string | null>(null);
    const [limitCount, setLimitCount] = useState(PAGE_SIZE);
    const [lastDoc, setLastDoc] = useState<QueryDocumentSnapshot<DocumentData> | null>(null);
    const [hasMore, setHasMore] = useState(true);

    useEffect(() => {
        if (!enabled) {
            return;
        }

        const q = query(
            collection(db, 'medications'),
            orderBy('name'),
            limit(PAGE_SIZE)
        );

        const unsubscribe = onSnapshot(
            q,
            (snapshot) => {
                const firstPage = snapshot.docs.map(mapMedication);

                setMedications((prev) => {
                    const firstPageIds = new Set(firstPage.map((m) => String(m.id)));
                    const tail = prev.filter((m) => !firstPageIds.has(String(m.id)));
                    return [...firstPage, ...tail];
                });

                setLastDoc(snapshot.docs.length > 0 ? snapshot.docs[snapshot.docs.length - 1] : null);
                setHasMore(snapshot.docs.length === PAGE_SIZE);
                setLimitCount((prev) => Math.max(prev, snapshot.docs.length));
                setError(null);
                setLoading(false);
            },
            (err) => {
                if (DEV_LOGS) console.error('Error fetching medications:', err);
                setError(`Error: ${err.message} (${err.code})`);
                setLoading(false);
            }
        );

        return () => unsubscribe();
    }, [enabled]);

    const loadMore = async () => {
        if (!lastDoc || !hasMore || loading) return;

        setLoading(true);
        try {
            const nextQuery = query(
                collection(db, 'medications'),
                orderBy('name'),
                startAfter(lastDoc),
                limit(PAGE_SIZE)
            );
            const nextSnapshot = await getDocs(nextQuery);
            const nextMeds = nextSnapshot.docs.map(mapMedication);

            setMedications((prev) => [...prev, ...nextMeds]);
            setLastDoc(nextSnapshot.docs.length > 0 ? nextSnapshot.docs[nextSnapshot.docs.length - 1] : lastDoc);
            setHasMore(nextSnapshot.docs.length === PAGE_SIZE);
            setLimitCount((prev) => prev + nextMeds.length);
            setError(null);
        } catch (err) {
            if (DEV_LOGS) console.error('Error loading more medications:', err);
            const e = err as { message?: string; code?: string };
            setError(`Error: ${e.message ?? 'Error inesperado'} (${e.code ?? 'unknown'})`);
        } finally {
            setLoading(false);
        }
    };

    const addMedication = async (med: Omit<Medication, 'id'>) => {
        try {
            await addDoc(collection(db, 'medications'), med);
        } catch (err) {
            if (DEV_LOGS) console.error('Error adding medication:', err);
            throw err;
        }
    };

    const updateMedication = async (id: string | number, updates: Partial<Medication>) => {
        try {
            const medRef = doc(db, 'medications', String(id));
            await updateDoc(medRef, updates);
        } catch (err) {
            if (DEV_LOGS) console.error('Error updating medication:', err);
            throw err;
        }
    };

    const deleteMedication = async (id: string | number) => {
        try {
            await deleteDoc(doc(db, 'medications', String(id)));
        } catch (err) {
            if (DEV_LOGS) console.error('Error deleting medication:', err);
            throw err;
        }
    };

    return {
        medications,
        loading: enabled ? loading : false,
        error: enabled ? error : null,
        addMedication,
        updateMedication,
        deleteMedication,
        loadMore,
        limitCount,
        hasMore,
    };
};
