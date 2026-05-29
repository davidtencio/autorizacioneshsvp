import React, { useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { DetailsView } from '../views/DetailsView';
import type { Medication, Patient } from '../types';

interface DetailsRouteWrapperProps {
    medications: Medication[];
    onGoHome: () => void;
    // Updated signature: App passes a handler that expects (patient, medId)
    onDeletePatient: (patient: Patient, medId: number | string) => void;
    onNewPatient: (medId: number | string) => void;
    onEditMed: (med: Medication) => void;
    onDeleteMed: (med: Medication) => void;
    onEditPatient: (patient: Patient, medId: number | string) => void;
    onSuspendPatient: (patient: Patient, medId: number | string, reason: string, notes?: string) => void;
    onViewDetails: (patient: Patient) => void;
}

export const DetailsRouteWrapper: React.FC<DetailsRouteWrapperProps> = ({
    medications,
    onDeletePatient,
    onEditPatient,
    onSuspendPatient,
    onNewPatient,
    ...props
}) => {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();

    // Find medication by ID (string or number safe comparison)
    const selectedMed = medications.find(m => m.id.toString() === id);

    useEffect(() => {
        if (!selectedMed) {
            // If ID is invalid or med deleted, go back to dashboard
            navigate('/', { replace: true });
        }
    }, [selectedMed, navigate]);

    if (!selectedMed) return null; // Or a loading spinner / error state

    return (
        <DetailsView
            selectedMed={selectedMed}
            onDeletePatient={(patientId) => {
                const patient = (selectedMed.patients ?? []).find(p => p.id === patientId);
                if (patient) {
                    onDeletePatient(patient, selectedMed.id);
                }
            }}
            onEditPatient={(patient) => onEditPatient(patient, selectedMed.id)}
            onSuspendPatient={(patient, reason, notes) => onSuspendPatient(patient, selectedMed.id, reason, notes)}
            onNewPatient={() => onNewPatient(selectedMed.id)}
            {...props}
        />
    );
};
