# Fase 1 — Modelo de roles: guía de deploy

Esta fase introduce un modelo de roles basado en la colección `users/{uid}` con
fallback temporal a la lógica legacy (lista de emails read-only). El objetivo es
poder desplegar las reglas nuevas sin lockout, seedear a los editores y luego
remover el fallback en un segundo deploy.

## Modelo

- `users/{uid}` con `{ email, role, updatedAt }` donde `role ∈ {admin, editor, viewer}`.
- Reglas (ver [firestore.rules](../firestore.rules), función `canWrite`):
  - Si existe `users/{uid}` → escribe solo si `role ∈ {admin, editor}`.
  - Si NO existe `users/{uid}` → fallback legacy (signed-in + no anónimo + no en `READ_ONLY_USERS`).
- `users/{uid}` solo es legible por su propio dueño. El seed se hace con
  service account (bypassa las reglas), no desde el cliente.

## Cliente

- Hook nuevo [`src/hooks/useRole.ts`](../src/hooks/useRole.ts) — escucha `users/{uid}`.
- Hook nuevo [`src/hooks/useCanEdit.ts`](../src/hooks/useCanEdit.ts) — fuente única para UI.
- [`src/utils/permissions.ts`](../src/utils/permissions.ts) expone `canEdit` (legacy) y
  `canEditWithRole` (híbrido). Vistas migradas a `useCanEdit`.

## Pasos de deploy seguro

### 1. Inventario de usuarios actuales

```powershell
$env:GOOGLE_APPLICATION_CREDENTIALS = "C:\ruta\service-account.json"
node scripts/auth/list-auth-users.mjs > tmp_auth_users.tsv
```

Revisar `tmp_auth_users.tsv` (queda fuera de git por `.gitignore`). Decidir
quién es `admin`, `editor` o `viewer`. Usuarios que no aparezcan en el seed
quedarán **bloqueados** una vez removido el fallback (paso 5).

### 2. Preparar archivo de roles

Crear `tmp_roles.json` (también ignorado por git):

```json
{
  "byEmail": {
    "davidtencio@gmail.com": "admin",
    "fhsvp2208@gmail.com": "viewer",
    "otro.editor@hsvp.com": "editor"
  }
}
```

### 3. Dry-run del seed

```powershell
node scripts/auth/seed-user-roles.mjs --roles tmp_roles.json
```

Confirma que cada email resuelve a un `uid` válido. No escribe nada.

### 4. Deploy de reglas (con fallback activo)

```powershell
firebase deploy --only firestore:rules
```

En este punto el sistema está en modo híbrido: usuarios sin doc en `users/`
siguen funcionando como antes (fallback legacy).

### 5. Aplicar el seed

```powershell
node scripts/auth/seed-user-roles.mjs --roles tmp_roles.json --apply
```

Verificar manualmente en Firebase Console que se crearon los docs en `users/`.
Probar login con al menos un editor y un viewer.

### 6. Remover el fallback (segundo deploy — opcional, ya como **whitelist estricta**)

Cuando el seed esté validado, editar [firestore.rules](../firestore.rules):

```diff
 function canWrite() {
-  return isSignedIn() && !isAnonymous() && (
-    (hasUserDoc() && userRole() in ['admin', 'editor'])
-    || (!hasUserDoc() && !isReadOnlyUser())
-  );
+  return isSignedIn() && !isAnonymous()
+    && hasUserDoc()
+    && userRole() in ['admin', 'editor'];
 }
```

Y eliminar `isReadOnlyUser()` + la lista `READ_ONLY_USERS` en
[src/utils/permissions.ts](../src/utils/permissions.ts) si ya no se usa.

Re-deploy:

```powershell
firebase deploy --only firestore:rules
```

A partir de ese momento, **solo usuarios con doc en `users/` con rol válido
pueden escribir**. Usuarios sin doc pierden permiso de escritura (los de
solo-lectura siguen pudiendo leer).

## Rollback

- Las reglas son idempotentes y reversibles: `firebase deploy --only firestore:rules`
  con la versión anterior restaura el comportamiento.
- Los docs en `users/` no afectan otras colecciones; pueden quedar o borrarse
  manualmente.

## Tests

- Unit: [`src/utils/permissions.test.ts`](../src/utils/permissions.test.ts) cubre `canEdit` y `canEditWithRole`.
- Reglas: [`firestore-rules-tests/firestore.rules.test.ts`](../firestore-rules-tests/firestore.rules.test.ts) cubre:
  - Fallback legacy (read-only blocked, editor allowed).
  - `users/{uid}.role=editor` permite escritura.
  - `users/{uid}.role=viewer` bloquea escritura.
  - Lectura de `users/{uid}` solo para el propio dueño.
  - Escritura cliente a `users/{uid}` siempre bloqueada.

Correr con: `npm run test:rules` (requiere `firebase emulators`).
