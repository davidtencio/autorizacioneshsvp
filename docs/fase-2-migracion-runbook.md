# Fase 2 — Migración a subcolección única de pacientes

Esta fase consolida los pacientes en la subcolección
`medications/{id}/patients/{patientId}` y reemplaza el array embebido
`medications/{id}.patients[]` por un `patientsSummary = { count, lastUpdated }`.

La sesión de código entregó **2.a + 2.b**: scripts listos, tipo extendido,
mutaciones que mantienen `patientsSummary`, dashboard que ya lo consume,
reglas híbridas. **No se ha tocado un solo documento todavía**.

Lo que sigue en este runbook es **ejecutivo**: vos lo corrés contra
producción cuando quieras, en este orden, sin saltar pasos.

---

## 0. Pre-requisitos

- Service account JSON disponible (mismo que se usa para listar usuarios Auth).
- `firebase-tools` autenticado al proyecto correcto.
- Ventana de ~1h fuera de pico (idealmente noche/madrugada).

```powershell
$env:GOOGLE_APPLICATION_CREDENTIALS = "C:\ruta\service-account.json"
$env:FIREBASE_PROJECT_ID = "hsvp-autorizaciones-7819d"
```

---

## 1. Backup completo (no opcional)

```powershell
gcloud config set project hsvp-autorizaciones-7819d
gcloud firestore export gs://hsvp-autorizaciones-7819d-backups/pre-fase2-$(Get-Date -Format "yyyyMMdd-HHmm")
```

Si no existe el bucket de backups, créalo primero con `gsutil mb`. No avances
sin este export — es lo único que permite rollback completo.

---

## 2. Deploy de reglas híbridas

Las reglas ya están en [firestore.rules](../firestore.rules) (esta sesión las
ajustó). Aceptan documentos con `patients`, con `patientsSummary`, o ambos.
Esto desbloquea que el script pueda escribir `patientsSummary` y eliminar
`patients` sin que las reglas rechacen el batch.

```powershell
firebase deploy --only firestore:rules
```

Verificar en consola que el deploy aparece OK.

---

## 3. Verificar el estado actual (read-only)

```powershell
node scripts/migrations/consolidate-patients-admin.mjs --phase=verify
```

Reporta por medicamento:
- pacientes solo en array → deben copiarse antes de summarizar.
- pacientes solo en subcolección → ya están migrados (aceptable).
- pacientes en ambos → ideal.

Si todos los `arr_only` son 0, podés saltar al paso 5.

---

## 4. Consolidar (copia array → subcolección)

Dry-run primero:

```powershell
node scripts/migrations/consolidate-patients-admin.mjs --phase=consolidate
```

Si el reporte se ve bien:

```powershell
node scripts/migrations/consolidate-patients-admin.mjs --phase=consolidate --apply
```

Idempotente: re-correrlo no daña nada (usa `set ... merge`).

Re-correr **verify** para confirmar `arr_only=0` en todos lados.

---

## 5. Reemplazar array por summary

Dry-run primero:

```powershell
node scripts/migrations/consolidate-patients-admin.mjs --phase=summarize
```

El script **rehúsa procesar** medicamentos que aún tengan pacientes solo en el
array (te obliga a haber pasado por consolidate). Cuando dry-run reporta
`skipped: 0`:

```powershell
node scripts/migrations/consolidate-patients-admin.mjs --phase=summarize --apply
```

Cada medicamento se actualiza dentro de una transacción que:
- borra el campo `patients` (`FieldValue.delete()`),
- escribe `patientsSummary = { count, lastUpdated }`,
- escribe `patientsSummaryMigratedAt` (auditoría).

---

## 6. Verificación post-migración

- En la app: abrir el dashboard. Los contadores deben mostrarse iguales (los
  toma de `patientsSummary.count` cuando existe).
- Abrir un par de medicamentos: la lista de pacientes se hidrata desde la
  subcolección — debe verse igual que antes.
- Crear/editar/suspender un paciente: la mutación debe mantener
  `patientsSummary` actualizado (esta sesión lo dejó cableado).

---

## 7. Fase 2.d — Cierre del modo híbrido ✅ APLICADO

**Estado**: cableado en código. Falta solo el `firebase deploy --only firestore:rules`.

Cambios ya aplicados al repo:

- [firestore.rules](../firestore.rules): `isMedicationDocument` ahora
  **requiere** `patientsSummary` y **prohíbe** `patients`. La función
  `validPatientsList` fue eliminada.
- [src/FirestoreWorkspace.tsx](../src/FirestoreWorkspace.tsx): las 3
  mutaciones (add/delete/suspend) ya no incluyen `patients` en el
  `batch.update`. Solo escriben `patientsSummary`. Backfill eliminado.
- [src/services/patientStore.ts](../src/services/patientStore.ts): función
  `backfillMedicationPatients` removida.
- [src/hooks/useMedicationActions.ts](../src/hooks/useMedicationActions.ts):
  `addMedication` ya no incluye `patients: []`. Inicializa
  `patientsSummary: { count: 0, lastUpdated }`.
- [src/types/index.ts](../src/types/index.ts): `Medication.patients`
  pasa a ser opcional (`patients?: Patient[]`). Se hidrata en cliente
  desde la subcolección.
- Tests de reglas actualizados: ya cubren rechazo de docs con `patients[]`
  y aceptación de docs con `patientsSummary` solo.

### Pasos finales para activar 2.d en producción

```powershell
firebase deploy --only firestore:rules
```

Smoke test inmediato post-deploy en https://hsvp-autorizaciones-7819d.web.app:
1. Dashboard carga los 48 medicamentos con contadores correctos.
2. Abrir BLOQUEADOR SOLAR → 12 pacientes.
3. Crear un paciente de prueba → el contador sube.
4. Editar y eliminar ese paciente → el contador baja.
5. Crear un medicamento nuevo → aparece con `0 Pacientes`.

Si algo falla post-deploy: rollback con

```powershell
git checkout HEAD~1 -- firestore.rules
firebase deploy --only firestore:rules
```

(reactiva el modo híbrido del paso 2 sin tocar datos).

---

## Rollback

- **Antes del paso 5**: nada se ha modificado de forma destructiva. El paso 4
  solo añade docs a la subcolección, no toca el array. Para revertir basta con
  re-deployar las reglas anteriores y opcionalmente borrar la subcolección.
- **Después del paso 5**: restaurar el export del paso 1:

```powershell
gcloud firestore import gs://hsvp-autorizaciones-7819d-backups/pre-fase2-YYYYMMDD-HHMM
```

Ojo: el import sobreescribe documentos existentes. Programar ventana de
mantenimiento si se ejecuta.
