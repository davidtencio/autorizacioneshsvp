# HSVP Autorizaciones

Aplicación web para la gestión de autorizaciones de tratamientos farmacológicos de la
Farmacia del Hospital San Vicente de Paúl (Heredia, Costa Rica). Permite administrar
medicamentos, pacientes asignados, prescriptores, control de traslados a Hospital México
y consultar indicadores clave (KPIs) e información oficial de la FDA.

## Stack

- **React 19** + **TypeScript** + **Vite 7**
- **Firebase**: Authentication (email/password) y Cloud Firestore
- **Tailwind CSS** para estilos
- **react-virtuoso** para virtualización de listas
- **Vitest** + Testing Library para pruebas

## Requisitos

- Node.js 20+ (CI usa Node 22)
- Acceso al proyecto Firebase `hsvp-autorizaciones-7819d` (o uno propio vía variables de entorno)

## Puesta en marcha

```bash
npm install
npm run dev        # servidor de desarrollo (Vite)
```

### Variables de entorno

La configuración de Firebase tiene valores por defecto en `src/firebase/app.ts`. Para
apuntar a otro proyecto, copie `.env.example` a `.env.development` / `.env.production` y
rellene los valores `VITE_FB_*`. Las claves web de Firebase **no son secretas**: el acceso
se restringe mediante las reglas de Firestore y Authentication.

## Scripts

| Script | Descripción |
|---|---|
| `npm run dev` | Servidor de desarrollo |
| `npm run build` | Typecheck (`tsc -b`) + build de producción |
| `npm run preview` | Previsualiza el build |
| `npm run lint` | ESLint |
| `npm run test` | Pruebas unitarias (Vitest) |
| `npm run test:rules` | Pruebas de reglas de Firestore (emulador) |
| `npm run bundle:check` | Verifica el presupuesto del bundle |
| `npm run smoke` | Smoke check contra el sitio desplegado |
| `npm run quality:baseline` | lint + test + build + bundle + smoke (usado por CI) |

## Arquitectura

- **`src/App.tsx`** — routing (rutas públicas/protegidas) con carga diferida.
- **`src/context/`** — `AuthContext` (sesión) y `UIContext` (modales, búsqueda, estado de edición).
- **`src/hooks/`** — hooks de dominio (`useMedications`, `usePrescribers`,
  `usePatientsByMedication`, `usePatientMutations`, `useRole`, `useCanEdit`).
- **`src/services/`** — acceso a Firestore (`patientStore`, `tracedCommit`) y `fdaService`.
- **`src/views/`** — `LoginView`, `DashboardView`, `DetailsView`, `KPIView`.
- **`firestore.rules`** — reglas de seguridad (whitelist de roles + validación de esquema).

### Modelo de datos

```
medications/{medicationId}
  └── patients/{patientId}          (subcolección)
prescribers/{prescriberId}
users/{uid}                         (rol: admin | editor | viewer)
ops_logs/{logId}                    (logs de errores en producción)
```

El conteo de pacientes por medicamento se mantiene en `medications/{id}.patientsSummary`
y se actualiza atómicamente junto con cada mutación de paciente.

### Roles y permisos

Solo usuarios con un documento `users/{uid}` y `role ∈ {admin, editor}` pueden escribir.
Los roles se siembran con un service account:

```bash
node scripts/auth/seed-user-roles.mjs --roles path/to/roles.json --apply
```

## CI/CD

- **`.github/workflows/ci.yml`** — ejecuta `quality:baseline` en push a `main`/`master` y en cada PR.
- **`.github/workflows/deploy.yml`** — despliega reglas de Firestore y Hosting tras pasar los chequeos de calidad.

## Migraciones

Los scripts de migración de datos viven en `scripts/migrations/`. Ejecutar siempre primero
en modo *dry-run* cuando el script lo permita.
