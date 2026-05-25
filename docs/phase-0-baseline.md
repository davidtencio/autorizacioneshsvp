# Fase 0 - Linea Base de Estabilidad, Rendimiento y Escalabilidad

## Objetivos iniciales
- LCP (p75): menor a 2.5s.
- INP (p75): menor a 200ms.
- CLS (p75): menor a 0.1.
- Tiempo de carga inicial JS (objetivo final): menor a 250 KB (sin compresion, validado en build).
- Build/lint/test en verde para cada cambio.

## Instrumentacion implementada
- `web-vitals` en cliente con logging estructurado en consola:
  - `LCP`, `INP`, `CLS`, `FCP`, `TTFB`.
- Script de presupuesto de bundle:
  - `npm run bundle:check`
  - Umbral transitorio actual: 770 KB (ajustado tras separar chunk de virtualización).
  - Objetivo a alcanzar en fase de optimizacion: 250 KB.

## Comandos operativos
- `npm run quality:baseline`:
  - Ejecuta `lint`, `test --run`, `build` y `bundle:check`.

## Siguiente paso recomendado
- En Fase 1, corregir errores de hooks/estado y estandarizar manejo de errores en hooks de datos.

