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
    type QueryDocumentSnapshot,
} from 'firebase/firestore';
import type { Medication } from '../types';

interface UseMedicationsOptions {
    enabled?: boolean;
}

const DEV_LOGS = import.meta.env.DEV;
const PAGE_SIZE = 30;

const mapMedication = (snapshotDoc: QueryDocumentSnapshot<unknown>): Medication => {
    const data = snapshotDoc.data() as Record<string, unknown>;
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
    const [lastDoc, setLastDoc] = useState<QueryDocumentSnapshot<unknown> | null>(null);
    const [hasMore, setHasMore] = useState(true);

    useEffect(() => {
        if (!enabled) {
            return;
        }

        const baseCollection = collection(db, 'medications');
        const orderedQuery = query(baseCollection, orderBy('name'), limit(PAGE_SIZE));
        const fallbackQuery = query(baseCollection, limit(PAGE_SIZE));

        const subscribe = (q: ReturnType<typeof query>) => onSnapshot(
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

        let unsubscribe = subscribe(orderedQuery);

        // Always hydrate first page using plain HTTP read to avoid blank UI
        // when realtime channels are blocked by network policy/proxy.
        void getDocs(orderedQuery)
            .then(async (snap) => {
                const effective = snap.empty ? await getDocs(fallbackQuery) : snap;
                const firstPage = effective.docs.map(mapMedication);
                setMedications(firstPage);
                setLastDoc(effective.docs.length > 0 ? effective.docs[effective.docs.length - 1] : null);
                setHasMore(effective.docs.length === PAGE_SIZE);
                setLimitCount(Math.max(PAGE_SIZE, effective.docs.length));
                setLoading(false);
            })
            .catch(async () => {
                const effective = await getDocs(fallbackQuery);
                const firstPage = effective.docs.map(mapMedication);
                setMedications(firstPage);
                setLastDoc(effective.docs.length > 0 ? effective.docs[effective.docs.length - 1] : null);
                setHasMore(effective.docs.length === PAGE_SIZE);
                setLimitCount(Math.max(PAGE_SIZE, effective.docs.length));
                setLoading(false);
            });

        // Fallback for legacy docs where `name` may be missing/inconsistent.
        void getDocs(orderedQuery).then((snap) => {
            if (snap.empty) {
                unsubscribe();
                unsubscribe = subscribe(fallbackQuery);
            }
        }).catch(() => {
            unsubscribe();
            unsubscribe = subscribe(fallbackQuery);
        });

        return () => unsubscribe();
    }, [enabled]);

    const loadMore = async () => {
        if (!lastDoc || !hasMore || loading) return;

        setLoading(true);
        try {
            const baseCollection = collection(db, 'medications');
            const nextQuery = query(baseCollection, orderBy('name'), startAfter(lastDoc), limit(PAGE_SIZE));
            const nextSnapshot = await getDocs(nextQuery);
            const effectiveSnapshot = nextSnapshot.empty
                ? await getDocs(query(baseCollection, startAfter(lastDoc), limit(PAGE_SIZE)))
                : nextSnapshot;
            const nextMeds = effectiveSnapshot.docs.map(mapMedication);

            setMedications((prev) => [...prev, ...nextMeds]);
            setLastDoc(effectiveSnapshot.docs.length > 0 ? effectiveSnapshot.docs[effectiveSnapshot.docs.length - 1] : lastDoc);
            setHasMore(effectiveSnapshot.docs.length === PAGE_SIZE);
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
