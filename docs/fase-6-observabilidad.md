# Fase 6 — Observabilidad

Esta fase deja la app con un esqueleto sólido para diagnosticar problemas en
producción sin tener que instrumentar a mano cada vez.

## Componentes

### Logger enriquecido — [src/utils/logger.ts](../src/utils/logger.ts)

- `sessionTraceId`: 8 chars únicos por carga de página. Permite correlacionar
  todos los logs de una misma sesión, tanto en consola del navegador como en
  la colección `ops_logs` de Firestore.
- `setLoggerUid(uid)`: el `AuthContext` lo llama al login/logout para que
  todos los logs subsecuentes lleven el uid del usuario.
- Cap por sesión: 50 logs remotos máximos (`ops_logs`), evita bombear la
  colección si algo rompe en loop.
- Niveles: `info` (solo a consola en dev), `warn` (consola siempre),
  `error` (consola + `ops_logs` en prod).

### Listeners globales — [src/monitoring/globalErrorHandlers.ts](../src/monitoring/globalErrorHandlers.ts)

Instalados en [src/main.tsx](../src/main.tsx) antes del render. Capturan:

- `window.error`: excepciones JS no manejadas (sintaxis, runtime, etc.).
- `unhandledrejection`: Promesas que rechazan sin `.catch`.

Ambos pasan por `logger.error`, así que aparecen en `ops_logs` con el
traceId y uid de la sesión.

### Helper `tracedCommit` — [src/services/tracedCommit.ts](../src/services/tracedCommit.ts)

Reemplaza `await batch.commit()` en las mutaciones de Firestore. Loguea:

- Éxito: `firestore_commit_ok` con `op`, `durationMs` y contexto del caller.
- Error: `firestore_commit_failed` con código Firestore (`permission-denied`,
  `unavailable`, etc.), mensaje, duración y contexto. Re-lanza para que el
  caller pueda hacer rollback / mostrar toast.

Usado en las 3 mutaciones de pacientes de
[FirestoreWorkspace.tsx](../src/FirestoreWorkspace.tsx) — `upsertPatient`,
`deletePatient`, `suspendPatient`.

### Web vitals — [src/monitoring/webVitals.ts](../src/monitoring/webVitals.ts)

Antes solo iba a `console.info`. Ahora pasa por `logger.info`. En dev se ve
en la consola; en prod los `info` no se persisten (sería caro). Si en algún
momento se quiere histórico de performance, basta con flippear el flag en
`logger.ts` para que `info` también escriba a `ops_logs`.

### Migración de `console.*` al logger

Reemplazadas las ~22 llamadas directas (`console.error/warn/log`) por
`logger.{error|warn|info}` en:

- `FirestoreWorkspace.tsx` (handleConfirmDelete).
- `useMedicationActions.ts` (save medication).
- `LoginView.tsx` (login failure → `warn` con código Firebase).
- `usePrescriberActions.ts` (save prescriber con `permission-denied`).
- `usePrescribers.ts` (4 ops: fetch, add, update, delete).
- `useMedications.ts` (8 ops: validación, listen, fallback ordenado,
  hidratación, loadMore, add, update, delete).
- `AuthContext.tsx` (logout).

Las únicas `console.*` que quedan están en `logger.ts` mismo — son la
salida real del logger, no se tocan.

## Cómo investigar un problema en producción

1. Abrir Firebase Console → Firestore → colección `ops_logs`.
2. Filtrar por `meta.uid` (el usuario que reportó) o `meta.traceId` (si lo
   tenés del front).
3. Ordenar por `ts` descendente. Los errores recientes aparecen primero.
4. Para errores de mutación buscar `firestore_commit_failed`. El campo
   `code` te dice si fue permisos, indisponibilidad, etc., y `durationMs`
   ayuda a separar timeouts de rechazos inmediatos.
5. Si la app crashea en render, el `RootErrorBoundary` emite
   `react_error_boundary` con el `componentStack`.

## Lo que NO está en esta fase

- **Panel `/debug` en la app**: leer `ops_logs` desde el cliente. Requiere
  abrir la regla `read` para admins y armar UI. Queda como fase opcional
  posterior (6.b).
- **Métricas agregadas**: contar errores por tipo / por hora, etc. Si crece
  el volumen, conviene mover los logs a BigQuery via export de Firestore
  (~5 min) y consultar desde ahí.
- **Histórico de web vitals**: hoy `info` no va remoto.
