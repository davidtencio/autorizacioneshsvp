# Fase 5 - Runbook Operativo

## Objetivo
Mantener continuidad del servicio con rollback rapido y verificaciones estandar despues de cada cambio.

## Pre-requisitos
- Acceso al proyecto Firebase `hsvp-autorizaciones-7819d`.
- `firebase-tools` autenticado o `FIREBASE_TOKEN` en CI.
- Build local valida (`npm run build`).

## Checklist previo a deploy
1. `npm run lint`
2. `npm run test`
3. `npm run build`
4. `npm run bundle:check`
5. Confirmar que no hay migraciones destructivas pendientes.

## Deploy estandar
1. CI automatico en push a `main` (`.github/workflows/deploy.yml`).
2. Si es manual/local:
   - `firebase deploy --only firestore:rules,hosting --project hsvp-autorizaciones-7819d`
3. Smoke check:
   - `npm run smoke`

## Manejo de incidente
1. Identificar alcance:
   - UI caida, reglas bloqueando escritura, errores FDA, rendimiento.
2. Mitigacion inmediata:
   - Re-deploy del ultimo commit estable desde `main`.
   - Si es reglas Firestore, restaurar ruleset previo desde Firebase Console.
3. Verificacion:
   - Login funcional.
   - Dashboard carga medicamentos.
   - Alta/edicion de paciente (usuario con permisos).
   - `npm run smoke`.

## Rollback
1. Obtener commit estable anterior en GitHub.
2. `git checkout <commit-estable>` en entorno de release.
3. `npm ci && npm run build`.
4. `firebase deploy --only firestore:rules,hosting --project hsvp-autorizaciones-7819d`.
5. Documentar causa raiz y accion correctiva en issue.

## Telemetria minima
- Errores criticos de frontend se registran en `ops_logs` (best-effort).
- Revisar `ops_logs` en Firestore para picos de errores FDA/red.
- No guardar datos clinicos ni PII sensible en logs.
