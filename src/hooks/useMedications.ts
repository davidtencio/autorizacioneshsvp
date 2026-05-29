import { useState, useEffect, useRef } from 'react';
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
import type { Medication, Patient, PatientsSummary } from '../types';
import { logger } from '../utils/logger';

interface UseMedicationsOptions {
    enabled?: boolean;
}

const PAGE_SIZE = 30;

const asString = (value: unknown, fallback = ''): string =>
    typeof value === 'string' ? value : fallback;

const mapMedication = (snapshotDoc: QueryDocumentSnapshot<unknown>): Medication => {
    const data = snapshotDoc.data() as Record<string, unknown>;
    let patients: Patient[] = [];

    if (Array.isArray(data.patients)) {
        patients = data.patients as Patient[];
    } else if (data.patients) {
        logger.warn('medication_invalid_patients_field', {
            medId: snapshotDoc.id,
            name: data.name,
            typeofPatients: typeof data.patients,
        });
    }

    const med: Medication = {
        id: snapshotDoc.id,
        code: asString(data.code),
        name: asString(data.name),
        strength: asString(data.strength),
        route: asString(data.route),
        type: asString(data.type),
        patients,
    };
    if (data.category === 'Almacenable' || data.category === 'Compra Local' || data.category === 'No Definido') {
        med.category = data.category;
    }
    if (data.patientsSummary && typeof data.patientsSummary === 'object') {
        med.patientsSummary = data.patientsSummary as PatientsSummary;
    }
    return med;
};

export const useMedications = ({ enabled = true }: UseMedicationsOptions = {}) => {
    const [medications, setMedications] = useState<Medication[]>([]);
    const [loading, setLoading] = useState(enabled);
    const [error, setError] = useState<string | null>(null);
    const [limitCount, setLimitCount] = useState(PAGE_SIZE);
    const [lastDoc, setLastDoc] = useState<QueryDocumentSnapshot<unknown> | null>(null);
    const [hasMore, setHasMore] = useState(true);

    const mountedRef = useRef(true);
    useEffect(() => {
        mountedRef.current = true;
        return () => {
            mountedRef.current = false;
        };
    }, []);

    useEffect(() => {
        if (!enabled) {
            return;
        }

        let active = true;
        let receivedSnapshot = false;
        let unsubscribe = () => {};

        const baseCollection = collection(db, 'medications');
        const orderedQuery = query(baseCollection, orderBy('name'), limit(PAGE_SIZE));
        const fallbackQuery = query(baseCollection, limit(PAGE_SIZE));

        const subscribe = (q: ReturnType<typeof query>) => onSnapshot(
            q,
            (snapshot) => {
                if (!active) return;
                receivedSnapshot = true;
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
                if (!active) return;
                logger.error('medications_listen_failed', { code: err.code, message: err.message });
                setError(`Error: ${err.message} (${err.code})`);
                setLoading(false);
            }
        );

        const startSync = async () => {
            let q = orderedQuery;
            try {
                const snap = await getDocs(orderedQuery);
                if (snap.empty) {
                    q = fallbackQuery;
                }
            } catch (err) {
                logger.warn('medications_ordered_query_failed_fallback', { error: String(err) });
                q = fallbackQuery;
            }

            if (!active) return;

            // Start realtime subscription
            unsubscribe = subscribe(q);

            // Hydrate the first page using HTTP request as fallback/speedup
            try {
                const snap = await getDocs(q);
                if (!active) return;
                if (receivedSnapshot) {
                    return;
                }
                const firstPage = snap.docs.map(mapMedication);
                setMedications(firstPage);
                setLastDoc(snap.docs.length > 0 ? snap.docs[snap.docs.length - 1] : null);
                setHasMore(snap.docs.length === PAGE_SIZE);
                setLimitCount(Math.max(PAGE_SIZE, snap.docs.length));
                setLoading(false);
            } catch (err) {
                if (!active) return;
                logger.warn('medications_hydration_failed', { error: String(err) });
            }
        };

        void startSync();

        return () => {
            active = false;
            unsubscribe();
        };
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

            if (!mountedRef.current) return;
            setMedications((prev) => [...prev, ...nextMeds]);
            setLastDoc(effectiveSnapshot.docs.length > 0 ? effectiveSnapshot.docs[effectiveSnapshot.docs.length - 1] : lastDoc);
            setHasMore(effectiveSnapshot.docs.length === PAGE_SIZE);
            setLimitCount((prev) => prev + nextMeds.length);
            setError(null);
        } catch (err) {
            const e = err as { message?: string; code?: string };
            logger.error('medications_load_more_failed', { code: e.code, message: e.message });
            if (!mountedRef.current) return;
            setError(`Error: ${e.message ?? 'Error inesperado'} (${e.code ?? 'unknown'})`);
        } finally {
            if (mountedRef.current) {
                setLoading(false);
            }
        }
    };

    const addMedication = async (med: Omit<Medication, 'id'>) => {
        try {
            await addDoc(collection(db, 'medications'), med);
        } catch (err) {
            logger.error('medication_add_failed', { error: String(err) });
            throw err;
        }
    };

    const updateMedication = async (id: string | number, updates: Partial<Medication>) => {
        try {
            const medRef = doc(db, 'medications', String(id));
            await updateDoc(medRef, updates);
        } catch (err) {
            logger.error('medication_update_failed', { id: String(id), error: String(err) });
            throw err;
        }
    };

    const deleteMedication = async (id: string | number) => {
        try {
            await deleteDoc(doc(db, 'medications', String(id)));
        } catch (err) {
            logger.error('medication_delete_failed', { id: String(id), error: String(err) });
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
