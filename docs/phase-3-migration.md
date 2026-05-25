# Fase 3 - Migracion de Pacientes a Subcoleccion

## Objetivo
Migrar `medications[].patients` hacia `medications/{medId}/patients/{patientId}` sin perder datos ni interrumpir la app.

## Estado actual
- La app ya hace escritura dual (modelo legado + subcoleccion).
- La lectura prioriza subcoleccion con fallback al arreglo legado.

## Script de backfill masivo
- Comando:
  - `npm run migrate:patients:backfill`
- Script:
  - `scripts/migrations/backfill-patients-subcollection-admin.mjs`

## Credenciales requeridas
- Opcion recomendada:
  - Definir `GOOGLE_APPLICATION_CREDENTIALS` apuntando al JSON de cuenta de servicio.
- Opcion alternativa:
  - ADC (`applicationDefault`) si el entorno ya tiene autenticacion de Google Cloud configurada.

## Propiedades de seguridad
- Idempotente: usa `set(..., { merge: true })`, por lo que puede re-ejecutarse.
- No elimina datos del arreglo legado.
- No cambia reglas destructivas ni borra documentos.

## Checklist operativo recomendado
1. Ejecutar `npm run quality:baseline`.
2. Ejecutar `npm run migrate:patients:backfill`.
3. Validar en Firestore que existen subdocumentos en `medications/{medId}/patients`.
4. Monitorear app en uso real.
5. Solo despues, planear retiro controlado del arreglo legado.
