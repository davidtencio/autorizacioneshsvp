# Informe de Auditoría — HSVP Autorizaciones

**Fecha:** 2026-05-29
**Rama:** `main` (último commit `323a98a`)
**Alcance:** Arquitectura, seguridad, calidad de código, integridad de datos, rendimiento y verificaciones automáticas.

---

## 1. Resumen ejecutivo

Aplicación React 19 + TypeScript + Vite + Firebase (Firestore + Auth) para gestión de
autorizaciones de tratamientos farmacológicos del Hospital San Vicente de Paúl. La base
de código está **en muy buen estado general**: arquitectura por capas clara, reglas de
seguridad de Firestore estrictas y bien probadas, mutaciones atómicas con rollback
optimista, logging estructurado y un presupuesto de bundle controlado.

**Estado de las verificaciones automáticas (todas en verde):**

| Verificación | Resultado |
|---|---|
| `npm run lint` (ESLint) | ✅ exit 0 |
| `tsc -b` (typecheck) | ✅ exit 0 |
| `npm run test` (Vitest) | ✅ 72/72 tests, 14 archivos |
| `npm run build` | ✅ build OK |
| `npm run bundle:check` | ✅ 808.23 KB / 850 KB |

No se detectaron vulnerabilidades de seguridad ni defectos bloqueantes. Los hallazgos
se concentran en **integridad de datos / UX de validación** y **exactitud de los KPIs**.

---

## 2. Arquitectura

- **Entrada / routing:** `App.tsx` separa rutas públicas (`/login`) y protegidas con
  `lazy`/`Suspense`. `ProtectedAppShell` → `FirestoreWorkspace` carga diferida.
- **Estado global:** `AuthContext` (sesión Firebase) + `UIContext` (modales, búsqueda,
  estado de edición). Datos de dominio en hooks (`useMedications`, `usePrescribers`,
  `usePatientsByMedication`, `usePatientMutations`).
- **Capa de datos:** `services/patientStore.ts` y `tracedCommit.ts` encapsulan el acceso
  a Firestore; las mutaciones de paciente escriben el documento + `patientsSummary` en un
  **batch atómico** con actualización optimista y rollback ante fallo.
- **Modelo:** `medications/{id}` con subcolección `patients/{patientId}`. El array
  `patients[]` legacy fue migrado fuera del doc de medicamento (Fase 2.d) y se hidrata
  cliente desde la subcolección.

Valoración: **diseño sólido y coherente**. La separación de responsabilidades es clara y
los nombres son descriptivos.

---

## 3. Seguridad

### Fortalezas
- **`firestore.rules` estricto y bien diseñado:**
  - Whitelist de roles: solo `users/{uid}` con `role ∈ {admin, editor}` puede escribir;
    se eliminó el fallback legacy por email.
  - Validación de esquema por documento (campos obligatorios, tipos, longitudes máximas,
    enums de `issuer` y `category`).
  - `users/{uid}` solo legible por su dueño y **no escribible** desde cliente (lo siembra
    un script con service account).
  - Regla *catch-all* `deny by default` para colecciones no listadas.
  - `ops_logs` con esquema validado (nivel, tamaño de mensaje, campos permitidos).
- **Cobertura de pruebas de reglas** (`firestore.rules.test.ts`): cubre lectura
  autenticada, escritura válida de editor/admin, denegación de viewer, usuario sin doc,
  enum inválido, escritura a `users`, y validaciones de `ops_logs` y `medications`.
- **Auth:** sesión gestionada por Firebase; errores de login mapeados a mensajes claros;
  `auth/too-many-requests` contemplado.
- **Secretos:** la config de Firebase hardcodeada en `firebase/app.ts` son claves web
  **públicas por diseño** (documentado en `.env.example`); la protección real está en las
  reglas + Auth. `.gitignore` excluye correctamente `.env*` (salvo `.env.example`).

### Observaciones
- **(BAJO) Posible PHI en logs remotos.** `logger` escribe errores en `ops_logs` en
  producción. Actualmente el `meta` solo incluye IDs (`medId`, `patientId`) y mensajes
  de error genéricos, no nombres de pacientes ni diagnósticos — correcto. **Recomendación:**
  mantener una convención explícita de "nunca registrar PHI en `meta`" y, si se desea,
  añadir un filtro defensivo, dado que es una app de datos clínicos.

---

## 4. Integridad de datos y lógica de negocio

### Hallazgos principales

**(ALTO) La validación del formulario no refleja las reglas del servidor.**
`NewPatientForm.tsx` solo marca `name` e `identificationNumber` como `required`. Sin
embargo, `firestore.rules` (`isPatientDocument`) exige que **todos** estos campos sean
cadenas no vacías: `diagnosis`, `authorizationCode`, `issuer`, `startMonth`, `endMonth`,
`dose`, `frequency`, `route`, `totalCycles`, `totalMonths`, `applicationPlace`,
`prescriber`, `specialty`.

- *Impacto:* si el usuario guarda con cualquiera de esos campos vacío (p. ej. sin
  seleccionar `issuer` o `applicationPlace`), la UI aplica la actualización optimista, el
  batch es **rechazado por las reglas**, se hace rollback y solo aparece un toast genérico
  *"Error al guardar paciente"*. Experiencia confusa y propensa a frustración.
- *Recomendación:* añadir validación cliente que cubra exactamente los campos obligatorios
  de las reglas (o relajar las reglas si algunos campos deben ser opcionales). Idealmente
  derivar ambos de una única fuente de verdad.

**(MEDIO) Los KPIs se calculan sobre datos filtrados/parciales.**
En `FirestoreWorkspace.tsx`, `KPIView` recibe `filteredMedications` (resultado de la
búsqueda). Si hay una consulta de búsqueda activa al navegar a `/kpi`, las estadísticas
reflejan solo el subconjunto filtrado. Además, los medicamentos se paginan
(`PAGE_SIZE = 30` + *cargar más*) y las subcolecciones de pacientes se hidratan de forma
perezosa, por lo que los KPIs son **inherentemente parciales** hasta cargar todas las
páginas y subcolecciones.
- *Recomendación:* alimentar `KPIView` con el conjunto completo (sin filtro de búsqueda) y
  considerar agregaciones del lado servidor o un *aggregation query* para totales fiables.

**(MEDIO) Formato de fecha inconsistente puede ocultar vencimientos.**
`isAuthorizationExpired` y `KPIStats` exigen `endMonth` con longitud exactamente 7
(`"MM/YYYY"`). `DetailsView.formatDate` además contempla un formato legacy de 6 dígitos
(`"MMYYYY"`). Cualquier dato legacy de 6 dígitos **no se marcará como vencido** ni
aparecerá en "Vencen Pronto". Las pruebas de reglas usan datos de 6 dígitos
(`startMonth: '012026'`), lo que sugiere que pueden coexistir ambos formatos.
- *Recomendación:* normalizar `startMonth`/`endMonth` a un único formato (migración +
  validación) y/o hacer que la lógica de vencimiento tolere ambos.

**(BAJO) IDs de paciente basados en `Date.now()`.**
`upsertPatient` asigna `id: Date.now()`. Para un único usuario el riesgo de colisión es
mínimo, pero es frágil ante uso concurrente. Funciona con la regla `data.id is int`.
- *Recomendación:* considerar `crypto.randomUUID()` o el ID del documento de Firestore
  como identidad, dejando `id` solo como dato histórico si aplica.

**(BAJO) Deriva potencial de `patientsSummary.count`.**
El conteo se recalcula cliente (`buildPatientsSummary`) a partir del array local de
pacientes. Si la hidratación de la subcolección falló parcialmente, el `count` escrito
podría quedar desactualizado, y el Dashboard lo muestra como fuente de verdad.
- *Recomendación:* recalcular desde una lectura fresca de la subcolección antes de
  persistir el resumen, o usar un *count aggregation*.

---

## 5. Calidad de código

### Fortalezas
- TypeScript estricto (incl. `exactOptionalPropertyTypes` según historial de commits),
  sin errores de tipo ni de lint.
- Buena cobertura de pruebas unitarias en utilidades, hooks y servicios (72 tests).
- Logging estructurado con `traceId` por sesión, *cap* de logs remotos, sanitización de
  tamaño de payload, y manejadores globales de errores (`globalErrorHandlers`).
- `fdaService` con timeout, reintentos con backoff y clasificación de errores
  reintenables vs. no reintenables (incluye comentario del bug previamente corregido).
- `RootErrorBoundary` a nivel raíz.

### Observaciones menores
- **(BAJO) README sin actualizar:** sigue siendo la plantilla por defecto de Vite. No
  documenta el proyecto, su despliegue ni los scripts de migración/seed.
- **(CORRECCIÓN) CI sí existe:** una revisión posterior confirmó que
  `.github/workflows/ci.yml` ejecuta `quality:baseline` en push a `main`/`master` y en cada
  PR, y `deploy.yml` corre los chequeos antes de desplegar. El hallazgo inicial de "sin CI"
  fue erróneo. No se requiere acción.
- **(BAJO) Accesibilidad:** tarjetas de medicamento y de KPI usan `onClick` sobre `<div>`
  sin `role="button"`, `tabIndex` ni manejo de teclado; los `<select>` dependen de la
  opción placeholder. Mejorable para navegación por teclado/lectores de pantalla.
- **(INFO) `useMedications` con doble vía de carga** (onSnapshot de la primera página +
  `getDocs` de hidratación, con *fallback* sin `orderBy`). Es funcional pero complejo; las
  páginas posteriores a la primera (`loadMore`) **no** reciben actualizaciones en tiempo
  real. Comportamiento aceptable, conviene documentarlo.

---

## 6. Rendimiento

- **Bundle:** 808 KB total (gzip ~280 KB), dentro de presupuesto. Chunking manual correcto
  (firebase, react-vendor, virtuoso, icons, vendor). El chunk `firebase` (455 KB / 138 KB
  gzip) domina — esperable para el SDK Web.
- **Virtualización:** `react-virtuoso` en listados de pacientes y grid de medicamentos
  (>120). Buen manejo de listas grandes.
- **Búsqueda:** `useDebouncedValue` (200 ms) + `useDeferredValue` para filtrado fluido.
- Carga diferida (`lazy`) de vistas y del servicio FDA.

Valoración: **rendimiento bien atendido** para el tamaño esperado del dataset.

---

## 7. Recomendaciones priorizadas

| Prio | Hallazgo | Acción sugerida |
|---|---|---|
| **Alta** | Validación de formulario no cubre campos obligatorios de las reglas | Validar en cliente los mismos campos que exige `isPatientDocument`; mensajes específicos por campo |
| **Media** | KPIs sobre datos filtrados/parciales | Pasar dataset completo a `KPIView`; evaluar agregaciones server-side |
| **Media** | Formatos de fecha mixtos ocultan vencimientos | Normalizar `MM/YYYY` (migración) y/o tolerar ambos en la lógica de expiración |
| Baja | IDs de paciente con `Date.now()` | Migrar a UUID / ID de documento |
| Baja | Deriva de `patientsSummary.count` | Recalcular desde lectura fresca o usar count aggregation |
| Baja | README plantilla | Documentar proyecto (CI ya ejecuta `quality:baseline` en PRs) |
| Baja | Accesibilidad de elementos clicables | `role`/`tabIndex`/handlers de teclado |
| Baja | Convención anti-PHI en logs | Documentar y, opcionalmente, filtro defensivo en `logger` |

---

## 8. Conclusión

La aplicación es **mantenible, segura y está bien probada**. Las reglas de Firestore son
particularmente robustas y constituyen la principal línea de defensa. El trabajo más
rentable a corto plazo es **alinear la validación del formulario con las reglas del
servidor** (elimina errores opacos para el usuario) y **garantizar la exactitud de los
KPIs**. El resto son mejoras incrementales de robustez, documentación y accesibilidad.
