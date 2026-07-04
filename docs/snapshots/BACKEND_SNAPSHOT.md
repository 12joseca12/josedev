# Backend Project Snapshot

Generated from `/srv/josecoded-data/backend`. Excludes `node_modules`, `.git`, `dist` and this snapshot file. Sensitive values in `.env` are redacted.

## Estado Actual - 2026-06-01

### Backend runtime

- El backend es un worker interno Fastify que sigue escuchando en `PORT=4000` / `HOST=0.0.0.0` cuando se arranca con `pnpm start` (`node dist/server.js`).
- En esta máquina no hay actualmente una unidad systemd instalada llamada `josecoded-worker.service`; el archivo en `infra/systemd/josecoded-worker.service.example` sigue siendo una plantilla de instalación.
- Tras cambios TypeScript/runtime, se debe ejecutar `pnpm typecheck` y `pnpm build`. Para aplicar el build en el proceso real, reiniciar el proceso manual `pnpm start` o instalar/usar la unidad systemd.
- El backend dispara un warm-up real del emulador al arrancar: llama a `startEmulatorSession()` en background, registra `Emulator warm-up completed` o `Emulator warm-up failed`, y no bloquea `app.listen`.

### Emulador Android

- El contenedor esperado sigue siendo `android-emulator`.
- `infra/android-emulator/docker-compose.yml` ya no usa directamente `budtmo/docker-android:emulator_14.0`; construye una imagen local `josecoded/android-emulator:14.0` desde `infra/android-emulator/Dockerfile`.
- Esa imagen local parchea el bug upstream que ejecutaba `sudo sed -i '1d' /etc/passwd` tras tocar `/dev/kvm`; ese bug borraba la entrada `root`, rompía `sudo`, hacía caer el servicio `device`, y dejaba ADB sin emulador.
- Estado verificado tras el parche: `adb devices` muestra `emulator-5554 device` y `adb shell getprop sys.boot_completed` devuelve `1`.
- noVNC en `6080` queda como fallback operacional/diagnóstico, no como visor principal para el frontend.

### Visor limpio Android

- El backend expone un visor limpio de pantalla Android basado en ADB, sin escritorio Linux/noVNC:
  - `GET /emulator/screen/viewer`
  - `GET /emulator/screen.png`
  - `POST /emulator/screen/tap`
  - `POST /emulator/screen/swipe`
  - `POST /emulator/screen/text`
- También expone alias UX bajo `/demo/android`:
  - `GET /demo/android/status`
  - `GET /demo/android/screen/viewer`
  - `GET /demo/android/screen.png`
  - `POST /demo/android/screen/tap`
  - `POST /demo/android/screen/swipe`
  - `POST /demo/android/screen/text`
- `GET /demo/android/status` está verificado y debe devolver `screenViewerUrl: "/demo/android/screen/viewer"`, no `/emulator/screen/viewer` ni `127.0.0.1`.
- `viewerUrl` sigue apuntando al noVNC legacy (`EMULATOR_VIEWER_URL`) para fallback. El frontend debe usar `screenViewerUrl` para el visor limpio.
- Las rutas del visor siguen protegidas por el mismo `BACKEND_INTERNAL_TOKEN`; tráfico de navegador público debe pasar por el gateway/bridge apropiado, no adjuntar el token directo desde frontend.

## Integración con el gateway público (`josecoded-api`)

Este worker (**Fastify en el servidor**) sigue usando **rutas en la raíz** (`/ai/chat`, `/system/status`, etc.). **No hay que mover ni duplicar esas rutas bajo `/api/v1`** en el backend: el versionado público **`/api/v1/*`** vive solo en el worker de Cloudflare (`josecoded-api`), que después llama aquí por **path igual** al que registra cada módulo.

- **Autenticación hacia este worker**: el gateway envía **`Authorization: Bearer <token>`** donde el secreto debe coincidir con **`BACKEND_INTERNAL_TOKEN`** definido en el `.env` de este proyecto (en el repo del gateway suele llamarse **`WORKER_INTERNAL_TOKEN`** u otra variable equivalente; debe ser **el mismo valor** que `BACKEND_INTERNAL_TOKEN`).
- **Rutas que el gateway suele llamar ya** (contrato estable server-to-server): `GET /system/status`, `POST /ai/chat`, `POST /emulator/session/start`. Para la demo Android existen alias UX en este worker/gateway como `GET /demo/android/status`, `POST /demo/android/start` y el visor limpio `GET /demo/android/screen/viewer`; `GET /demo/android/status` debe devolver `screenViewerUrl: "/demo/android/screen/viewer"`.
- **`/health`**: sigue **pública** y mínima; el health público versionado **`GET /api/v1/health`** es del gateway, **no sustituye** a `/health` del worker cuando operador o systemd hagan `curl` directo al puerto local.
- **Trazabilidad**: si conviene correlacionar logs, el gateway puede enviar **`x-request-id`**; este proyecto ya registra/request-id en middleware (ver snapshot de `request-id.middleware.ts`). Opcionalmente, en el futuro se puede propagar **`x-supabase-user-id`** u otro header de auditoría cuando el usuario final esté autenticado en el gateway; **no es obligatorio para que funcionen las rutas actuales**.

**No es necesario retocar nombres de rutas del backend por el tema del versionado** mientras las rutas reales (`/system/*`, `/ai/*`, `/emulator/*`, `/n8n/*`, `/storage/*`, etc.) permanezcan y el gateway construya bien el path al hacer proxy.

## File Index

### ./

- `.env`
- `.env.example`
- `AGENTS.md`
- `package.json`
- `pnpm-lock.yaml`
- `pnpm-workspace.yaml`
- `tsconfig.json`

### infra/android-emulator

- `infra/android-emulator/Dockerfile`
- `infra/android-emulator/docker-compose.yml`
- `infra/android-emulator/README.md`

### infra/systemd

- `infra/systemd/josecoded-worker.service.example`
- `infra/systemd/README.md`

### src

- `src/app.ts`
- `src/server.ts`

### src/config

- `src/config/env.ts`

### src/middlewares

- `src/middlewares/error.middleware.ts`
- `src/middlewares/internal-token.middleware.ts`
- `src/middlewares/not-found.middleware.ts`
- `src/middlewares/request-id.middleware.ts`

### src/modules/ai

- `src/modules/ai/ai.routes.ts`

### src/modules/emulator

- `src/modules/emulator/emulator.routes.ts`

### src/modules/health

- `src/modules/health/health.routes.ts`

### src/modules/n8n

- `src/modules/n8n/n8n.routes.ts`

### src/modules/storage

- `src/modules/storage/storage.routes.ts`

### src/modules/system

- `src/modules/system/system.routes.ts`

### src/schemas

- `src/schemas/ai.schema.ts`
- `src/schemas/n8n.schema.ts`
- `src/schemas/storage.schema.ts`

### src/services

- `src/services/ai.service.ts`
- `src/services/command.service.ts`
- `src/services/docker.service.ts`
- `src/services/emulator.service.ts`
- `src/services/health.service.ts`
- `src/services/knowledge.service.ts`
- `src/services/n8n.service.ts`
- `src/services/ollama.service.ts`
- `src/services/storage.service.ts`
- `src/services/system.service.ts`

### src/types

- `src/types/common.types.ts`

### src/utils

- `src/utils/file.util.ts`

## Files

## ./

### .env

```dotenv
PORT=4000
HOST=0.0.0.0
CORS_ORIGINS=

BACKEND_INTERNAL_TOKEN=<redacted>

EMULATOR_CONTAINER_NAME=android-emulator
EMULATOR_PACKAGE_NAME=com.tres24
EMULATOR_APK_DIR=/srv/josecoded-data/android-apps/tres24
EMULATOR_BOOT_MAX_ATTEMPTS=120
EMULATOR_BOOT_INTERVAL_MS=2000
KNOWLEDGE_DIR=/srv/josecoded-data/knowledge
OLLAMA_URL=http://localhost:11434
OLLAMA_CHAT_MODEL=llama3.2:3b
OLLAMA_BLOG_MODEL=mistral:7b
OLLAMA_KEEP_ALIVE=30m
AI_CHAT_TIMEOUT_MS=30000
AI_BLOG_TIMEOUT_MS=120000
STORAGE_ROOT=/srv/josecoded-data/storage
STORAGE_PUBLIC_DIR=/srv/josecoded-data/storage/public
STORAGE_PRIVATE_DIR=/srv/josecoded-data/storage/private
STORAGE_UPLOADS_DIR=/srv/josecoded-data/storage/uploads
STORAGE_PROCESSED_DIR=/srv/josecoded-data/storage/processed
MAX_UPLOAD_SIZE_MB=50

EMULATOR_VIEWER_URL=http://192.168.1.176:6080/vnc_lite.html?autoconnect=true&resize=scale

N8N_BASE_URL=http://localhost:5678
N8N_TIMEOUT_MS=10000
N8N_WEBHOOK_SECRET=<redacted>
```

### .env.example

```dotenv
PORT=4000
HOST=0.0.0.0

BACKEND_INTERNAL_TOKEN=replace_with_a_64_character_hex_token_from_openssl_rand_hex_32
CORS_ORIGINS=

EMULATOR_CONTAINER_NAME=android-emulator
EMULATOR_PACKAGE_NAME=com.tres24
EMULATOR_APK_DIR=/srv/josecoded-data/android-apps/tres24
EMULATOR_BOOT_MAX_ATTEMPTS=120
EMULATOR_BOOT_INTERVAL_MS=2000
EMULATOR_VIEWER_URL=http://192.168.1.176:6080/vnc_lite.html?autoconnect=true&resize=scale

OLLAMA_URL=http://localhost:11434
OLLAMA_CHAT_MODEL=llama3.2:3b
OLLAMA_BLOG_MODEL=mistral:7b
OLLAMA_KEEP_ALIVE=30m
AI_CHAT_TIMEOUT_MS=30000
AI_BLOG_TIMEOUT_MS=120000
KNOWLEDGE_DIR=/srv/josecoded-data/knowledge

STORAGE_ROOT=/srv/josecoded-data/storage
STORAGE_PUBLIC_DIR=/srv/josecoded-data/storage/public
STORAGE_PRIVATE_DIR=/srv/josecoded-data/storage/private
STORAGE_UPLOADS_DIR=/srv/josecoded-data/storage/uploads
STORAGE_PROCESSED_DIR=/srv/josecoded-data/storage/processed
MAX_UPLOAD_SIZE_MB=50

N8N_BASE_URL=http://localhost:5678
N8N_WEBHOOK_SECRET=change_this_later
N8N_TIMEOUT_MS=10000
```

### AGENTS.md

```md
# josecoded-worker

This project is an internal worker backend for the Omen server.

It controls local services and machine-bound operations:

- Docker Android emulator.
- Ollama local AI.
- n8n workflow triggers.
- Local knowledge and storage folders.

Architecture:

- `src/modules` exposes HTTP routes.
- `src/services` contains domain logic.
- `src/schemas` contains request validation.
- `src/middlewares` contains cross-cutting Fastify hooks.
- `src/config/env.ts` validates runtime configuration.

Rules:

- Use pnpm only. Do not use npm.
- Run `pnpm typecheck` after TypeScript changes.
- Run `pnpm build` when changing runtime code.
- `/health` is public and must stay minimal.
- All other routes are protected by the internal token middleware.
- Do not expose `BACKEND_INTERNAL_TOKEN` or webhook secrets to frontend code.
- Treat this as an internal worker, not as a public browser-facing API.
- Browser traffic must not attach `BACKEND_INTERNAL_TOKEN`. Prefer the Cloudflare gateway `josecoded-api` (`/api/v1/*`) or, when suitable, Next.js/server-only bridges; this worker accepts only trusted callers with `Authorization: Bearer BACKEND_INTERNAL_TOKEN` on protected routes.
```

### package.json

```json
{
  "name": "backend",
  "version": "1.0.0",
  "type": "module",
  "description": "",
  "main": "dist/server.js",
  "engines": {
    "node": ">=22"
  },
  "scripts": {
    "dev": "tsx src/server.ts",
    "start": "node dist/server.js",
    "build": "tsc",
    "typecheck": "tsc --noEmit"
  },
  "keywords": [],
  "author": "",
  "license": "ISC",
  "packageManager": "pnpm@10.33.2",
  "dependencies": {
    "@fastify/cors": "^11.2.0",
    "@fastify/multipart": "^10.0.0",
    "dotenv": "^17.4.2",
    "fastify": "^5.8.5",
    "zod": "^4.3.6"
  },
  "devDependencies": {
    "@types/node": "^22.0.0",
    "tsx": "^4.21.0",
    "typescript": "^6.0.3"
  }
}
```

### pnpm-lock.yaml

```yaml
lockfileVersion: '9.0'

settings:
  autoInstallPeers: true
  excludeLinksFromLockfile: false

importers:

  .:
    dependencies:
      '@fastify/cors':
        specifier: ^11.2.0
        version: 11.2.0
      '@fastify/multipart':
        specifier: ^10.0.0
        version: 10.0.0
      dotenv:
        specifier: ^17.4.2
        version: 17.4.2
      fastify:
        specifier: ^5.8.5
        version: 5.8.5
      zod:
        specifier: ^4.3.6
        version: 4.3.6
    devDependencies:
      '@types/node':
        specifier: ^22.0.0
        version: 22.19.17
      tsx:
        specifier: ^4.21.0
        version: 4.21.0
      typescript:
        specifier: ^6.0.3
        version: 6.0.3

packages:

  '@esbuild/aix-ppc64@0.27.7':
    resolution: {integrity: sha512-EKX3Qwmhz1eMdEJokhALr0YiD0lhQNwDqkPYyPhiSwKrh7/4KRjQc04sZ8db+5DVVnZ1LmbNDI1uAMPEUBnQPg==}
    engines: {node: '>=18'}
    cpu: [ppc64]
    os: [aix]

  '@esbuild/android-arm64@0.27.7':
    resolution: {integrity: sha512-62dPZHpIXzvChfvfLJow3q5dDtiNMkwiRzPylSCfriLvZeq0a1bWChrGx/BbUbPwOrsWKMn8idSllklzBy+dgQ==}
    engines: {node: '>=18'}
    cpu: [arm64]
    os: [android]

  '@esbuild/android-arm@0.27.7':
    resolution: {integrity: sha512-jbPXvB4Yj2yBV7HUfE2KHe4GJX51QplCN1pGbYjvsyCZbQmies29EoJbkEc+vYuU5o45AfQn37vZlyXy4YJ8RQ==}
    engines: {node: '>=18'}
    cpu: [arm]
    os: [android]

  '@esbuild/android-x64@0.27.7':
    resolution: {integrity: sha512-x5VpMODneVDb70PYV2VQOmIUUiBtY3D3mPBG8NxVk5CogneYhkR7MmM3yR/uMdITLrC1ml/NV1rj4bMJuy9MCg==}
    engines: {node: '>=18'}
    cpu: [x64]
    os: [android]

  '@esbuild/darwin-arm64@0.27.7':
    resolution: {integrity: sha512-5lckdqeuBPlKUwvoCXIgI2D9/ABmPq3Rdp7IfL70393YgaASt7tbju3Ac+ePVi3KDH6N2RqePfHnXkaDtY9fkw==}
    engines: {node: '>=18'}
    cpu: [arm64]
    os: [darwin]

  '@esbuild/darwin-x64@0.27.7':
    resolution: {integrity: sha512-rYnXrKcXuT7Z+WL5K980jVFdvVKhCHhUwid+dDYQpH+qu+TefcomiMAJpIiC2EM3Rjtq0sO3StMV/+3w3MyyqQ==}
    engines: {node: '>=18'}
    cpu: [x64]
    os: [darwin]

  '@esbuild/freebsd-arm64@0.27.7':
    resolution: {integrity: sha512-B48PqeCsEgOtzME2GbNM2roU29AMTuOIN91dsMO30t+Ydis3z/3Ngoj5hhnsOSSwNzS+6JppqWsuhTp6E82l2w==}
    engines: {node: '>=18'}
    cpu: [arm64]
    os: [freebsd]

  '@esbuild/freebsd-x64@0.27.7':
    resolution: {integrity: sha512-jOBDK5XEjA4m5IJK3bpAQF9/Lelu/Z9ZcdhTRLf4cajlB+8VEhFFRjWgfy3M1O4rO2GQ/b2dLwCUGpiF/eATNQ==}
    engines: {node: '>=18'}
    cpu: [x64]
    os: [freebsd]

  '@esbuild/linux-arm64@0.27.7':
    resolution: {integrity: sha512-RZPHBoxXuNnPQO9rvjh5jdkRmVizktkT7TCDkDmQ0W2SwHInKCAV95GRuvdSvA7w4VMwfCjUiPwDi0ZO6Nfe9A==}
    engines: {node: '>=18'}
    cpu: [arm64]
    os: [linux]

  '@esbuild/linux-arm@0.27.7':
    resolution: {integrity: sha512-RkT/YXYBTSULo3+af8Ib0ykH8u2MBh57o7q/DAs3lTJlyVQkgQvlrPTnjIzzRPQyavxtPtfg0EopvDyIt0j1rA==}
    engines: {node: '>=18'}
    cpu: [arm]
    os: [linux]

  '@esbuild/linux-ia32@0.27.7':
    resolution: {integrity: sha512-GA48aKNkyQDbd3KtkplYWT102C5sn/EZTY4XROkxONgruHPU72l+gW+FfF8tf2cFjeHaRbWpOYa/uRBz/Xq1Pg==}
    engines: {node: '>=18'}
    cpu: [ia32]
    os: [linux]

  '@esbuild/linux-loong64@0.27.7':
    resolution: {integrity: sha512-a4POruNM2oWsD4WKvBSEKGIiWQF8fZOAsycHOt6JBpZ+JN2n2JH9WAv56SOyu9X5IqAjqSIPTaJkqN8F7XOQ5Q==}
    engines: {node: '>=18'}
    cpu: [loong64]
    os: [linux]

  '@esbuild/linux-mips64el@0.27.7':
    resolution: {integrity: sha512-KabT5I6StirGfIz0FMgl1I+R1H73Gp0ofL9A3nG3i/cYFJzKHhouBV5VWK1CSgKvVaG4q1RNpCTR2LuTVB3fIw==}
    engines: {node: '>=18'}
    cpu: [mips64el]
    os: [linux]

  '@esbuild/linux-ppc64@0.27.7':
    resolution: {integrity: sha512-gRsL4x6wsGHGRqhtI+ifpN/vpOFTQtnbsupUF5R5YTAg+y/lKelYR1hXbnBdzDjGbMYjVJLJTd2OFmMewAgwlQ==}
    engines: {node: '>=18'}
    cpu: [ppc64]
    os: [linux]

  '@esbuild/linux-riscv64@0.27.7':
    resolution: {integrity: sha512-hL25LbxO1QOngGzu2U5xeXtxXcW+/GvMN3ejANqXkxZ/opySAZMrc+9LY/WyjAan41unrR3YrmtTsUpwT66InQ==}
    engines: {node: '>=18'}
    cpu: [riscv64]
    os: [linux]

  '@esbuild/linux-s390x@0.27.7':
    resolution: {integrity: sha512-2k8go8Ycu1Kb46vEelhu1vqEP+UeRVj2zY1pSuPdgvbd5ykAw82Lrro28vXUrRmzEsUV0NzCf54yARIK8r0fdw==}
    engines: {node: '>=18'}
    cpu: [s390x]
    os: [linux]

  '@esbuild/linux-x64@0.27.7':
    resolution: {integrity: sha512-hzznmADPt+OmsYzw1EE33ccA+HPdIqiCRq7cQeL1Jlq2gb1+OyWBkMCrYGBJ+sxVzve2ZJEVeePbLM2iEIZSxA==}
    engines: {node: '>=18'}
    cpu: [x64]
    os: [linux]

  '@esbuild/netbsd-arm64@0.27.7':
    resolution: {integrity: sha512-b6pqtrQdigZBwZxAn1UpazEisvwaIDvdbMbmrly7cDTMFnw/+3lVxxCTGOrkPVnsYIosJJXAsILG9XcQS+Yu6w==}
    engines: {node: '>=18'}
    cpu: [arm64]
    os: [netbsd]

  '@esbuild/netbsd-x64@0.27.7':
    resolution: {integrity: sha512-OfatkLojr6U+WN5EDYuoQhtM+1xco+/6FSzJJnuWiUw5eVcicbyK3dq5EeV/QHT1uy6GoDhGbFpprUiHUYggrw==}
    engines: {node: '>=18'}
    cpu: [x64]
    os: [netbsd]

  '@esbuild/openbsd-arm64@0.27.7':
    resolution: {integrity: sha512-AFuojMQTxAz75Fo8idVcqoQWEHIXFRbOc1TrVcFSgCZtQfSdc1RXgB3tjOn/krRHENUB4j00bfGjyl2mJrU37A==}
    engines: {node: '>=18'}
    cpu: [arm64]
    os: [openbsd]

  '@esbuild/openbsd-x64@0.27.7':
    resolution: {integrity: sha512-+A1NJmfM8WNDv5CLVQYJ5PshuRm/4cI6WMZRg1by1GwPIQPCTs1GLEUHwiiQGT5zDdyLiRM/l1G0Pv54gvtKIg==}
    engines: {node: '>=18'}
    cpu: [x64]
    os: [openbsd]

  '@esbuild/openharmony-arm64@0.27.7':
    resolution: {integrity: sha512-+KrvYb/C8zA9CU/g0sR6w2RBw7IGc5J2BPnc3dYc5VJxHCSF1yNMxTV5LQ7GuKteQXZtspjFbiuW5/dOj7H4Yw==}
    engines: {node: '>=18'}
    cpu: [arm64]
    os: [openharmony]

  '@esbuild/sunos-x64@0.27.7':
    resolution: {integrity: sha512-ikktIhFBzQNt/QDyOL580ti9+5mL/YZeUPKU2ivGtGjdTYoqz6jObj6nOMfhASpS4GU4Q/Clh1QtxWAvcYKamA==}
    engines: {node: '>=18'}
    cpu: [x64]
    os: [sunos]

  '@esbuild/win32-arm64@0.27.7':
    resolution: {integrity: sha512-7yRhbHvPqSpRUV7Q20VuDwbjW5kIMwTHpptuUzV+AA46kiPze5Z7qgt6CLCK3pWFrHeNfDd1VKgyP4O+ng17CA==}
    engines: {node: '>=18'}
    cpu: [arm64]
    os: [win32]

  '@esbuild/win32-ia32@0.27.7':
    resolution: {integrity: sha512-SmwKXe6VHIyZYbBLJrhOoCJRB/Z1tckzmgTLfFYOfpMAx63BJEaL9ExI8x7v0oAO3Zh6D/Oi1gVxEYr5oUCFhw==}
    engines: {node: '>=18'}
    cpu: [ia32]
    os: [win32]

  '@esbuild/win32-x64@0.27.7':
    resolution: {integrity: sha512-56hiAJPhwQ1R4i+21FVF7V8kSD5zZTdHcVuRFMW0hn753vVfQN8xlx4uOPT4xoGH0Z/oVATuR82AiqSTDIpaHg==}
    engines: {node: '>=18'}
    cpu: [x64]
    os: [win32]

  '@fastify/ajv-compiler@4.0.5':
    resolution: {integrity: sha512-KoWKW+MhvfTRWL4qrhUwAAZoaChluo0m0vbiJlGMt2GXvL4LVPQEjt8kSpHI3IBq5Rez8fg+XeH3cneztq+C7A==}

  '@fastify/busboy@3.2.0':
    resolution: {integrity: sha512-m9FVDXU3GT2ITSe0UaMA5rU3QkfC/UXtCU8y0gSN/GugTqtVldOBWIB5V6V3sbmenVZUIpU6f+mPEO2+m5iTaA==}

  '@fastify/cors@11.2.0':
    resolution: {integrity: sha512-LbLHBuSAdGdSFZYTLVA3+Ch2t+sA6nq3Ejc6XLAKiQ6ViS2qFnvicpj0htsx03FyYeLs04HfRNBsz/a8SvbcUw==}

  '@fastify/deepmerge@3.2.1':
    resolution: {integrity: sha512-N5Oqvltoa2r9z1tbx4xjky0oRR60v+T47Ic4J1ukoVQcptLOrIdRnCSdTGmOmajZuHVKlTnfcmrjyqsGEW1ztA==}

  '@fastify/error@4.2.0':
    resolution: {integrity: sha512-RSo3sVDXfHskiBZKBPRgnQTtIqpi/7zhJOEmAxCiBcM7d0uwdGdxLlsCaLzGs8v8NnxIRlfG0N51p5yFaOentQ==}

  '@fastify/fast-json-stringify-compiler@5.0.3':
    resolution: {integrity: sha512-uik7yYHkLr6fxd8hJSZ8c+xF4WafPK+XzneQDPU+D10r5X19GW8lJcom2YijX2+qtFF1ENJlHXKFM9ouXNJYgQ==}

  '@fastify/forwarded@3.0.1':
    resolution: {integrity: sha512-JqDochHFqXs3C3Ml3gOY58zM7OqO9ENqPo0UqAjAjH8L01fRZqwX9iLeX34//kiJubF7r2ZQHtBRU36vONbLlw==}

  '@fastify/merge-json-schemas@0.2.1':
    resolution: {integrity: sha512-OA3KGBCy6KtIvLf8DINC5880o5iBlDX4SxzLQS8HorJAbqluzLRn80UXU0bxZn7UOFhFgpRJDasfwn9nG4FG4A==}

  '@fastify/multipart@10.0.0':
    resolution: {integrity: sha512-pUx3Z1QStY7E7kwvDTIvB6P+rF5lzP+iqPgZyJyG3yBJVPvQaZxzDHYbQD89rbY0ciXrMOyGi8ezHDVexLvJDA==}

  '@fastify/proxy-addr@5.1.0':
    resolution: {integrity: sha512-INS+6gh91cLUjB+PVHfu1UqcB76Sqtpyp7bnL+FYojhjygvOPA9ctiD/JDKsyD9Xgu4hUhCSJBPig/w7duNajw==}

  '@pinojs/redact@0.4.0':
    resolution: {integrity: sha512-k2ENnmBugE/rzQfEcdWHcCY+/FM3VLzH9cYEsbdsoqrvzAKRhUZeRNhAZvB8OitQJ1TBed3yqWtdjzS6wJKBwg==}

  '@types/node@22.19.17':
    resolution: {integrity: sha512-wGdMcf+vPYM6jikpS/qhg6WiqSV/OhG+jeeHT/KlVqxYfD40iYJf9/AE1uQxVWFvU7MipKRkRv8NSHiCGgPr8Q==}

  abstract-logging@2.0.1:
    resolution: {integrity: sha512-2BjRTZxTPvheOvGbBslFSYOUkr+SjPtOnrLP33f+VIWLzezQpZcqVg7ja3L4dBXmzzgwT+a029jRx5PCi3JuiA==}

  ajv-formats@3.0.1:
    resolution: {integrity: sha512-8iUql50EUR+uUcdRQ3HDqa6EVyo3docL8g5WJ3FNcWmu62IbkGUue/pEyLBW8VGKKucTPgqeks4fIU1DA4yowQ==}
    peerDependencies:
      ajv: ^8.0.0
    peerDependenciesMeta:
      ajv:
        optional: true

  ajv@8.20.0:
    resolution: {integrity: sha512-Thbli+OlOj+iMPYFBVBfJ3OmCAnaSyNn4M1vz9T6Gka5Jt9ba/HIR56joy65tY6kx/FCF5VXNB819Y7/GUrBGA==}

  atomic-sleep@1.0.0:
    resolution: {integrity: sha512-kNOjDqAh7px0XWNI+4QbzoiR/nTkHAWNud2uvnJquD1/x5a7EQZMJT0AczqK0Qn67oY/TTQ1LbUKajZpp3I9tQ==}
    engines: {node: '>=8.0.0'}

  avvio@9.2.0:
    resolution: {integrity: sha512-2t/sy01ArdHHE0vRH5Hsay+RtCZt3dLPji7W7/MMOCEgze5b7SNDC4j5H6FnVgPkI1MTNFGzHdHrVXDDl7QSSQ==}

  cookie@1.1.1:
    resolution: {integrity: sha512-ei8Aos7ja0weRpFzJnEA9UHJ/7XQmqglbRwnf2ATjcB9Wq874VKH9kfjjirM6UhU2/E5fFYadylyhFldcqSidQ==}
    engines: {node: '>=18'}

  dequal@2.0.3:
    resolution: {integrity: sha512-0je+qPKHEMohvfRTCEo3CrPG6cAzAYgmzKyxRiYSSDkS6eGJdyVJm7WaYA5ECaAD9wLB2T4EEeymA5aFVcYXCA==}
    engines: {node: '>=6'}

  dotenv@17.4.2:
    resolution: {integrity: sha512-nI4U3TottKAcAD9LLud4Cb7b2QztQMUEfHbvhTH09bqXTxnSie8WnjPALV/WMCrJZ6UV/qHJ6L03OqO3LcdYZw==}
    engines: {node: '>=12'}

  esbuild@0.27.7:
    resolution: {integrity: sha512-IxpibTjyVnmrIQo5aqNpCgoACA/dTKLTlhMHihVHhdkxKyPO1uBBthumT0rdHmcsk9uMonIWS0m4FljWzILh3w==}
    engines: {node: '>=18'}
    hasBin: true

  fast-decode-uri-component@1.0.1:
    resolution: {integrity: sha512-WKgKWg5eUxvRZGwW8FvfbaH7AXSh2cL+3j5fMGzUMCxWBJ3dV3a7Wz8y2f/uQ0e3B6WmodD3oS54jTQ9HVTIIg==}

  fast-deep-equal@3.1.3:
    resolution: {integrity: sha512-f3qQ9oQy9j2AhBe/H9VC91wLmKBCCU/gDOnKNAYG5hswO7BLKj09Hc5HYNz9cGI++xlpDCIgDaitVs03ATR84Q==}

  fast-json-stringify@6.3.0:
    resolution: {integrity: sha512-oRCntNDY/329HJPlmdNLIdogNtt6Vyjb1WuT01Soss3slIdyUp8kAcDU3saQTOquEK8KFVfwIIF7FebxUAu+yA==}

  fast-querystring@1.1.2:
    resolution: {integrity: sha512-g6KuKWmFXc0fID8WWH0jit4g0AGBoJhCkJMb1RmbsSEUNvQ+ZC8D6CUZ+GtF8nMzSPXnhiePyyqqipzNNEnHjg==}

  fast-uri@3.1.0:
    resolution: {integrity: sha512-iPeeDKJSWf4IEOasVVrknXpaBV0IApz/gp7S2bb7Z4Lljbl2MGJRqInZiUrQwV16cpzw/D3S5j5Julj/gT52AA==}

  fastify-plugin@5.1.0:
    resolution: {integrity: sha512-FAIDA8eovSt5qcDgcBvDuX/v0Cjz0ohGhENZ/wpc3y+oZCY2afZ9Baqql3g/lC+OHRnciQol4ww7tuthOb9idw==}

  fastify@5.8.5:
    resolution: {integrity: sha512-Yqptv59pQzPgQUSIm87hMqHJmdkb1+GPxdE6vW6FRyVE9G86mt7rOghitiU4JHRaTyDUk9pfeKmDeu70lAwM4Q==}

  fastq@1.20.1:
    resolution: {integrity: sha512-GGToxJ/w1x32s/D2EKND7kTil4n8OVk/9mycTc4VDza13lOvpUZTGX3mFSCtV9ksdGBVzvsyAVLM6mHFThxXxw==}

  find-my-way@9.5.0:
    resolution: {integrity: sha512-VW2RfnmscZO5KgBY5XVyKREMW5nMZcxDy+buTOsL+zIPnBlbKm+00sgzoQzq1EVh4aALZLfKdwv6atBGcjvjrQ==}
    engines: {node: '>=20'}

  fsevents@2.3.3:
    resolution: {integrity: sha512-5xoDfX+fL7faATnagmWPpbFtwh/R77WmMMqqHGS65C3vvB0YHrgF+B1YmZ3441tMj5n63k0212XNoJwzlhffQw==}
    engines: {node: ^8.16.0 || ^10.6.0 || >=11.0.0}
    os: [darwin]

  get-tsconfig@4.14.0:
    resolution: {integrity: sha512-yTb+8DXzDREzgvYmh6s9vHsSVCHeC0G3PI5bEXNBHtmshPnO+S5O7qgLEOn0I5QvMy6kpZN8K1NKGyilLb93wA==}

  ipaddr.js@2.3.0:
    resolution: {integrity: sha512-Zv/pA+ciVFbCSBBjGfaKUya/CcGmUHzTydLMaTwrUUEM2DIEO3iZvueGxmacvmN50fGpGVKeTXpb2LcYQxeVdg==}
    engines: {node: '>= 10'}

  json-schema-ref-resolver@3.0.0:
    resolution: {integrity: sha512-hOrZIVL5jyYFjzk7+y7n5JDzGlU8rfWDuYyHwGa2WA8/pcmMHezp2xsVwxrebD/Q9t8Nc5DboieySDpCp4WG4A==}

  json-schema-traverse@1.0.0:
    resolution: {integrity: sha512-NM8/P9n3XjXhIZn1lLhkFaACTOURQXjWhV4BA/RnOv8xvgqtqpAX9IO4mRQxSx1Rlo4tqzeqb0sOlruaOy3dug==}

  light-my-request@6.6.0:
    resolution: {integrity: sha512-CHYbu8RtboSIoVsHZ6Ye4cj4Aw/yg2oAFimlF7mNvfDV192LR7nDiKtSIfCuLT7KokPSTn/9kfVLm5OGN0A28A==}

  on-exit-leak-free@2.1.2:
    resolution: {integrity: sha512-0eJJY6hXLGf1udHwfNftBqH+g73EU4B504nZeKpz1sYRKafAghwxEJunB2O7rDZkL4PGfsMVnTXZ2EjibbqcsA==}
    engines: {node: '>=14.0.0'}

  pino-abstract-transport@3.0.0:
    resolution: {integrity: sha512-wlfUczU+n7Hy/Ha5j9a/gZNy7We5+cXp8YL+X+PG8S0KXxw7n/JXA3c46Y0zQznIJ83URJiwy7Lh56WLokNuxg==}

  pino-std-serializers@7.1.0:
    resolution: {integrity: sha512-BndPH67/JxGExRgiX1dX0w1FvZck5Wa4aal9198SrRhZjH3GxKQUKIBnYJTdj2HDN3UQAS06HlfcSbQj2OHmaw==}

  pino@10.3.1:
    resolution: {integrity: sha512-r34yH/GlQpKZbU1BvFFqOjhISRo1MNx1tWYsYvmj6KIRHSPMT2+yHOEb1SG6NMvRoHRF0a07kCOox/9yakl1vg==}
    hasBin: true

  process-warning@4.0.1:
    resolution: {integrity: sha512-3c2LzQ3rY9d0hc1emcsHhfT9Jwz0cChib/QN89oME2R451w5fy3f0afAhERFZAwrbDU43wk12d0ORBpDVME50Q==}

  process-warning@5.0.0:
    resolution: {integrity: sha512-a39t9ApHNx2L4+HBnQKqxxHNs1r7KF+Intd8Q/g1bUh6q0WIp9voPXJ/x0j+ZL45KF1pJd9+q2jLIRMfvEshkA==}

  quick-format-unescaped@4.0.4:
    resolution: {integrity: sha512-tYC1Q1hgyRuHgloV/YXs2w15unPVh8qfu/qCTfhTYamaw7fyhumKa2yGpdSo87vY32rIclj+4fWYQXUMs9EHvg==}

  real-require@0.2.0:
    resolution: {integrity: sha512-57frrGM/OCTLqLOAh0mhVA9VBMHd+9U7Zb2THMGdBUoZVOtGbJzjxsYGDJ3A9AYYCP4hn6y1TVbaOfzWtm5GFg==}
    engines: {node: '>= 12.13.0'}

  require-from-string@2.0.2:
    resolution: {integrity: sha512-Xf0nWe6RseziFMu+Ap9biiUbmplq6S9/p+7w7YXP/JBHhrUDDUhwa+vANyubuqfZWTveU//DYVGsDG7RKL/vEw==}
    engines: {node: '>=0.10.0'}

  resolve-pkg-maps@1.0.0:
    resolution: {integrity: sha512-seS2Tj26TBVOC2NIc2rOe2y2ZO7efxITtLZcGSOnHHNOQ7CkiUBfw0Iw2ck6xkIhPwLhKNLS8BO+hEpngQlqzw==}

  ret@0.5.0:
    resolution: {integrity: sha512-I1XxrZSQ+oErkRR4jYbAyEEu2I0avBvvMM5JN+6EBprOGRCs63ENqZ3vjavq8fBw2+62G5LF5XelKwuJpcvcxw==}
    engines: {node: '>=10'}

  reusify@1.1.0:
    resolution: {integrity: sha512-g6QUff04oZpHs0eG5p83rFLhHeV00ug/Yf9nZM6fLeUrPguBTkTQOdpAWWspMh55TZfVQDPaN3NQJfbVRAxdIw==}
    engines: {iojs: '>=1.0.0', node: '>=0.10.0'}

  rfdc@1.4.1:
    resolution: {integrity: sha512-q1b3N5QkRUWUl7iyylaaj3kOpIT0N2i9MqIEQXP73GVsN9cw3fdx8X63cEmWhJGi2PPCF23Ijp7ktmd39rawIA==}

  safe-regex2@5.1.1:
    resolution: {integrity: sha512-mOSBvHGDZMuIEZMdOz/aCEYDCv0E7nfcNsIhUF+/P+xC7Hyf3FkvymqgPbg9D1EdSGu+uKbJgy09K/RKKc7kJA==}
    hasBin: true

  safe-stable-stringify@2.5.0:
    resolution: {integrity: sha512-b3rppTKm9T+PsVCBEOUR46GWI7fdOs00VKZ1+9c1EWDaDMvjQc6tUwuFyIprgGgTcWoVHSKrU8H31ZHA2e0RHA==}
    engines: {node: '>=10'}

  secure-json-parse@4.1.0:
    resolution: {integrity: sha512-l4KnYfEyqYJxDwlNVyRfO2E4NTHfMKAWdUuA8J0yve2Dz/E/PdBepY03RvyJpssIpRFwJoCD55wA+mEDs6ByWA==}

  semver@7.7.4:
    resolution: {integrity: sha512-vFKC2IEtQnVhpT78h1Yp8wzwrf8CM+MzKMHGJZfBtzhZNycRFnXsHk6E5TxIkkMsgNS7mdX3AGB7x2QM2di4lA==}
    engines: {node: '>=10'}
    hasBin: true

  set-cookie-parser@2.7.2:
    resolution: {integrity: sha512-oeM1lpU/UvhTxw+g3cIfxXHyJRc/uidd3yK1P242gzHds0udQBYzs3y8j4gCCW+ZJ7ad0yctld8RYO+bdurlvw==}

  sonic-boom@4.2.1:
    resolution: {integrity: sha512-w6AxtubXa2wTXAUsZMMWERrsIRAdrK0Sc+FUytWvYAhBJLyuI4llrMIC1DtlNSdI99EI86KZum2MMq3EAZlF9Q==}

  split2@4.2.0:
    resolution: {integrity: sha512-UcjcJOWknrNkF6PLX83qcHM6KHgVKNkV62Y8a5uYDVv9ydGQVwAHMKqHdJje1VTWpljG0WYpCDhrCdAOYH4TWg==}
    engines: {node: '>= 10.x'}

  thread-stream@4.0.0:
    resolution: {integrity: sha512-4iMVL6HAINXWf1ZKZjIPcz5wYaOdPhtO8ATvZ+Xqp3BTdaqtAwQkNmKORqcIo5YkQqGXq5cwfswDwMqqQNrpJA==}
    engines: {node: '>=20'}

  toad-cache@3.7.0:
    resolution: {integrity: sha512-/m8M+2BJUpoJdgAHoG+baCwBT+tf2VraSfkBgl0Y00qIWt41DJ8R5B8nsEw0I58YwF5IZH6z24/2TobDKnqSWw==}
    engines: {node: '>=12'}

  tsx@4.21.0:
    resolution: {integrity: sha512-5C1sg4USs1lfG0GFb2RLXsdpXqBSEhAaA/0kPL01wxzpMqLILNxIxIOKiILz+cdg/pLnOUxFYOR5yhHU666wbw==}
    engines: {node: '>=18.0.0'}
    hasBin: true

  typescript@6.0.3:
    resolution: {integrity: sha512-y2TvuxSZPDyQakkFRPZHKFm+KKVqIisdg9/CZwm9ftvKXLP8NRWj38/ODjNbr43SsoXqNuAisEf1GdCxqWcdBw==}
    engines: {node: '>=14.17'}
    hasBin: true

  undici-types@6.21.0:
    resolution: {integrity: sha512-iwDZqg0QAGrg9Rav5H4n0M64c3mkR59cJ6wQp+7C4nI0gsmExaedaYLNO44eT4AtBBwjbTiGPMlt2Md0T9H9JQ==}

  zod@4.3.6:
    resolution: {integrity: sha512-rftlrkhHZOcjDwkGlnUtZZkvaPHCsDATp4pGpuOOMDaTdDDXF91wuVDJoWoPsKX/3YPQ5fHuF3STjcYyKr+Qhg==}

snapshots:

  '@esbuild/aix-ppc64@0.27.7':
    optional: true

  '@esbuild/android-arm64@0.27.7':
    optional: true

  '@esbuild/android-arm@0.27.7':
    optional: true

  '@esbuild/android-x64@0.27.7':
    optional: true

  '@esbuild/darwin-arm64@0.27.7':
    optional: true

  '@esbuild/darwin-x64@0.27.7':
    optional: true

  '@esbuild/freebsd-arm64@0.27.7':
    optional: true

  '@esbuild/freebsd-x64@0.27.7':
    optional: true

  '@esbuild/linux-arm64@0.27.7':
    optional: true

  '@esbuild/linux-arm@0.27.7':
    optional: true

  '@esbuild/linux-ia32@0.27.7':
    optional: true

  '@esbuild/linux-loong64@0.27.7':
    optional: true

  '@esbuild/linux-mips64el@0.27.7':
    optional: true

  '@esbuild/linux-ppc64@0.27.7':
    optional: true

  '@esbuild/linux-riscv64@0.27.7':
    optional: true

  '@esbuild/linux-s390x@0.27.7':
    optional: true

  '@esbuild/linux-x64@0.27.7':
    optional: true

  '@esbuild/netbsd-arm64@0.27.7':
    optional: true

  '@esbuild/netbsd-x64@0.27.7':
    optional: true

  '@esbuild/openbsd-arm64@0.27.7':
    optional: true

  '@esbuild/openbsd-x64@0.27.7':
    optional: true

  '@esbuild/openharmony-arm64@0.27.7':
    optional: true

  '@esbuild/sunos-x64@0.27.7':
    optional: true

  '@esbuild/win32-arm64@0.27.7':
    optional: true

  '@esbuild/win32-ia32@0.27.7':
    optional: true

  '@esbuild/win32-x64@0.27.7':
    optional: true

  '@fastify/ajv-compiler@4.0.5':
    dependencies:
      ajv: 8.20.0
      ajv-formats: 3.0.1(ajv@8.20.0)
      fast-uri: 3.1.0

  '@fastify/busboy@3.2.0': {}

  '@fastify/cors@11.2.0':
    dependencies:
      fastify-plugin: 5.1.0
      toad-cache: 3.7.0

  '@fastify/deepmerge@3.2.1': {}

  '@fastify/error@4.2.0': {}

  '@fastify/fast-json-stringify-compiler@5.0.3':
    dependencies:
      fast-json-stringify: 6.3.0

  '@fastify/forwarded@3.0.1': {}

  '@fastify/merge-json-schemas@0.2.1':
    dependencies:
      dequal: 2.0.3

  '@fastify/multipart@10.0.0':
    dependencies:
      '@fastify/busboy': 3.2.0
      '@fastify/deepmerge': 3.2.1
      '@fastify/error': 4.2.0
      fastify-plugin: 5.1.0
      secure-json-parse: 4.1.0

  '@fastify/proxy-addr@5.1.0':
    dependencies:
      '@fastify/forwarded': 3.0.1
      ipaddr.js: 2.3.0

  '@pinojs/redact@0.4.0': {}

  '@types/node@22.19.17':
    dependencies:
      undici-types: 6.21.0

  abstract-logging@2.0.1: {}

  ajv-formats@3.0.1(ajv@8.20.0):
    optionalDependencies:
      ajv: 8.20.0

  ajv@8.20.0:
    dependencies:
      fast-deep-equal: 3.1.3
      fast-uri: 3.1.0
      json-schema-traverse: 1.0.0
      require-from-string: 2.0.2

  atomic-sleep@1.0.0: {}

  avvio@9.2.0:
    dependencies:
      '@fastify/error': 4.2.0
      fastq: 1.20.1

  cookie@1.1.1: {}

  dequal@2.0.3: {}

  dotenv@17.4.2: {}

  esbuild@0.27.7:
    optionalDependencies:
      '@esbuild/aix-ppc64': 0.27.7
      '@esbuild/android-arm': 0.27.7
      '@esbuild/android-arm64': 0.27.7
      '@esbuild/android-x64': 0.27.7
      '@esbuild/darwin-arm64': 0.27.7
      '@esbuild/darwin-x64': 0.27.7
      '@esbuild/freebsd-arm64': 0.27.7
      '@esbuild/freebsd-x64': 0.27.7
      '@esbuild/linux-arm': 0.27.7
      '@esbuild/linux-arm64': 0.27.7
      '@esbuild/linux-ia32': 0.27.7
      '@esbuild/linux-loong64': 0.27.7
      '@esbuild/linux-mips64el': 0.27.7
      '@esbuild/linux-ppc64': 0.27.7
      '@esbuild/linux-riscv64': 0.27.7
      '@esbuild/linux-s390x': 0.27.7
      '@esbuild/linux-x64': 0.27.7
      '@esbuild/netbsd-arm64': 0.27.7
      '@esbuild/netbsd-x64': 0.27.7
      '@esbuild/openbsd-arm64': 0.27.7
      '@esbuild/openbsd-x64': 0.27.7
      '@esbuild/openharmony-arm64': 0.27.7
      '@esbuild/sunos-x64': 0.27.7
      '@esbuild/win32-arm64': 0.27.7
      '@esbuild/win32-ia32': 0.27.7
      '@esbuild/win32-x64': 0.27.7

  fast-decode-uri-component@1.0.1: {}

  fast-deep-equal@3.1.3: {}

  fast-json-stringify@6.3.0:
    dependencies:
      '@fastify/merge-json-schemas': 0.2.1
      ajv: 8.20.0
      ajv-formats: 3.0.1(ajv@8.20.0)
      fast-uri: 3.1.0
      json-schema-ref-resolver: 3.0.0
      rfdc: 1.4.1

  fast-querystring@1.1.2:
    dependencies:
      fast-decode-uri-component: 1.0.1

  fast-uri@3.1.0: {}

  fastify-plugin@5.1.0: {}

  fastify@5.8.5:
    dependencies:
      '@fastify/ajv-compiler': 4.0.5
      '@fastify/error': 4.2.0
      '@fastify/fast-json-stringify-compiler': 5.0.3
      '@fastify/proxy-addr': 5.1.0
      abstract-logging: 2.0.1
      avvio: 9.2.0
      fast-json-stringify: 6.3.0
      find-my-way: 9.5.0
      light-my-request: 6.6.0
      pino: 10.3.1
      process-warning: 5.0.0
      rfdc: 1.4.1
      secure-json-parse: 4.1.0
      semver: 7.7.4
      toad-cache: 3.7.0

  fastq@1.20.1:
    dependencies:
      reusify: 1.1.0

  find-my-way@9.5.0:
    dependencies:
      fast-deep-equal: 3.1.3
      fast-querystring: 1.1.2
      safe-regex2: 5.1.1

  fsevents@2.3.3:
    optional: true

  get-tsconfig@4.14.0:
    dependencies:
      resolve-pkg-maps: 1.0.0

  ipaddr.js@2.3.0: {}

  json-schema-ref-resolver@3.0.0:
    dependencies:
      dequal: 2.0.3

  json-schema-traverse@1.0.0: {}

  light-my-request@6.6.0:
    dependencies:
      cookie: 1.1.1
      process-warning: 4.0.1
      set-cookie-parser: 2.7.2

  on-exit-leak-free@2.1.2: {}

  pino-abstract-transport@3.0.0:
    dependencies:
      split2: 4.2.0

  pino-std-serializers@7.1.0: {}

  pino@10.3.1:
    dependencies:
      '@pinojs/redact': 0.4.0
      atomic-sleep: 1.0.0
      on-exit-leak-free: 2.1.2
      pino-abstract-transport: 3.0.0
      pino-std-serializers: 7.1.0
      process-warning: 5.0.0
      quick-format-unescaped: 4.0.4
      real-require: 0.2.0
      safe-stable-stringify: 2.5.0
      sonic-boom: 4.2.1
      thread-stream: 4.0.0

  process-warning@4.0.1: {}

  process-warning@5.0.0: {}

  quick-format-unescaped@4.0.4: {}

  real-require@0.2.0: {}

  require-from-string@2.0.2: {}

  resolve-pkg-maps@1.0.0: {}

  ret@0.5.0: {}

  reusify@1.1.0: {}

  rfdc@1.4.1: {}

  safe-regex2@5.1.1:
    dependencies:
      ret: 0.5.0

  safe-stable-stringify@2.5.0: {}

  secure-json-parse@4.1.0: {}

  semver@7.7.4: {}

  set-cookie-parser@2.7.2: {}

  sonic-boom@4.2.1:
    dependencies:
      atomic-sleep: 1.0.0

  split2@4.2.0: {}

  thread-stream@4.0.0:
    dependencies:
      real-require: 0.2.0

  toad-cache@3.7.0: {}

  tsx@4.21.0:
    dependencies:
      esbuild: 0.27.7
      get-tsconfig: 4.14.0
    optionalDependencies:
      fsevents: 2.3.3

  typescript@6.0.3: {}

  undici-types@6.21.0: {}

  zod@4.3.6: {}
```

### pnpm-workspace.yaml

```yaml
allowBuilds:
  esbuild: false
```

### tsconfig.json

```json
{
  "compilerOptions": {
    "rootDir": "./src",
    "outDir": "./dist",
    "module": "NodeNext",
    "moduleResolution": "NodeNext",
    "target": "ES2023",
    "lib": ["ES2023"],
    "types": ["node"],
    "sourceMap": true,
    "declaration": true,
    "declarationMap": true,
    "noUncheckedIndexedAccess": true,
    "exactOptionalPropertyTypes": true,
    "noImplicitReturns": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true,
    "strict": true,
    "verbatimModuleSyntax": true,
    "isolatedModules": true,
    "noUncheckedSideEffectImports": true,
    "moduleDetection": "force",
    "skipLibCheck": true
  },
  "include": ["src/**/*.ts"],
  "exclude": ["dist", "node_modules"]
}
```

## infra/android-emulator

### infra/android-emulator/Dockerfile

```dockerfile
FROM budtmo/docker-android:emulator_14.0

USER root

RUN python3 - <<'PYFIX'
from pathlib import Path

path = Path("/home/androidusr/docker-android/cli/src/device/emulator.py")
text = path.read_text()
old = """cmds = (f"sudo chown 1300:1301 {kvm_path}",
                    "sudo sed -i '1d' /etc/passwd")"""
new = """cmds = (f"sudo chown 1300:1301 {kvm_path}",)"""

if old not in text:
    raise SystemExit("docker-android KVM permission block was not found")

path.write_text(text.replace(old, new))
PYFIX

USER androidusr
```

### infra/android-emulator/docker-compose.yml

```yaml
services:
  android-emulator:
    build:
      context: .
    image: josecoded/android-emulator:14.0
    container_name: android-emulator
    restart: unless-stopped
    privileged: true
    devices:
      - /dev/kvm:/dev/kvm
    group_add:
      - "994"
    ports:
      - "6080:6080"
      # Uncomment only if ADB must be reachable from the host/network.
      # Keep these closed unless there is a clear operational need.
      # - "5554:5554"
      # - "5555:5555"
    environment:
      EMULATOR_DEVICE: "Samsung Galaxy S10"
      WEB_VNC: "true"
      APPIUM: "false"
```

### infra/android-emulator/README.md

````md
# Android emulator container

This compose file documents the Android emulator expected by `josecoded-worker`.

The worker expects:

- Container name: `android-emulator`
- noVNC port: `6080`
- KVM device: `/dev/kvm`
- KVM group id in `group_add`
- APK folder on the host: `/srv/josecoded-data/android-apps/tres24`

Before recreating the container, validate the compose file:

```bash
docker compose -f infra/android-emulator/docker-compose.yml config
```

Check the KVM group id on the host:

```bash
ls -l /dev/kvm
```

The group shown for `/dev/kvm` must match `group_add` in
`docker-compose.yml`. This Omen currently uses:

```yaml
group_add:
  - "994"
```

If Linux is reinstalled or the service moves to another machine, this number
may change. Update `group_add` before recreating the container.

This compose file builds a small local image on top of
`budtmo/docker-android:emulator_14.0`. The upstream emulator startup script
removes the first line from `/etc/passwd` after changing `/dev/kvm`
permissions; after a container restart that leaves `sudo` unable to resolve
`root`, and the emulator exits before ADB sees a device. The local image keeps
the KVM `chown` but removes that passwd mutation.

Start or recreate it with:

```bash
docker compose -f infra/android-emulator/docker-compose.yml up -d
```

After boot, check ADB:

```bash
docker exec -it android-emulator adb devices
```

The worker also exposes a clean Android-only viewer that captures the device
screen through ADB instead of showing the Linux desktop through noVNC:

```text
/emulator/screen/viewer
/emulator/screen.png
/emulator/screen/tap
/emulator/screen/swipe
/emulator/screen/text
```

These routes are protected by the same internal token middleware as the rest of
the emulator API. Keep noVNC on port `6080` as an operational fallback.

The backend installs APKs from `EMULATOR_APK_DIR` with `adb install-multiple` when
`POST /emulator/session/start` detects that `EMULATOR_PACKAGE_NAME` is missing.
````

## infra/systemd

### infra/systemd/josecoded-worker.service.example

```
[Unit]
Description=Josecoded Worker Backend
After=network.target docker.service
Requires=docker.service

[Service]
Type=simple
User=jose
WorkingDirectory=/srv/josecoded-data/backend
Environment=NODE_ENV=production
EnvironmentFile=/srv/josecoded-data/backend/.env
ExecStart=/usr/bin/node dist/server.js
Restart=always
RestartSec=5

[Install]
WantedBy=multi-user.target
```

### infra/systemd/README.md

````md
# systemd service

This service runs the compiled `josecoded-worker` on boot.

Build the backend before starting or restarting the service:

```bash
cd /srv/josecoded-data/backend
pnpm build
```

Confirm the real Node path before installing the service:

```bash
which node
```

If the output is not `/usr/bin/node`, update `ExecStart` in the service file.

Install the service:

```bash
sudo cp infra/systemd/josecoded-worker.service.example /etc/systemd/system/josecoded-worker.service
sudo systemctl daemon-reload
sudo systemctl enable josecoded-worker
sudo systemctl start josecoded-worker
```

The service loads environment variables explicitly from:

```ini
EnvironmentFile=/srv/josecoded-data/backend/.env
```

Diagnostics:

```bash
sudo systemctl status josecoded-worker
journalctl -u josecoded-worker -f
curl http://localhost:4000/health
```

Protected endpoint check:

```bash
TOKEN=$(grep '^BACKEND_INTERNAL_TOKEN=' /srv/josecoded-data/backend/.env | cut -d '=' -f2-)

curl http://localhost:4000/system/status \
  -H "Authorization: Bearer $TOKEN"
```

If `.env`, TypeScript, or runtime code changes, rebuild and restart:

```bash
cd /srv/josecoded-data/backend
pnpm build
sudo systemctl restart josecoded-worker
```
````

## src

### src/app.ts

```ts
import Fastify from 'fastify';
import cors from '@fastify/cors';
import multipart from '@fastify/multipart';
import { env } from './config/env.js';
import { aiRoutes } from './modules/ai/ai.routes.js';
import { emulatorRoutes } from './modules/emulator/emulator.routes.js';
import { healthRoutes } from './modules/health/health.routes.js';
import { n8nRoutes } from './modules/n8n/n8n.routes.js';
import { storageRoutes } from './modules/storage/storage.routes.js';
import { systemRoutes } from './modules/system/system.routes.js';
import { errorHandler } from './middlewares/error.middleware.js';
import { internalTokenMiddleware } from './middlewares/internal-token.middleware.js';
import { requestIdMiddleware } from './middlewares/request-id.middleware.js';
import { notFoundHandler } from './middlewares/not-found.middleware.js';

export async function buildApp() {
  const app = Fastify({
    logger: true,
  });

  await app.register(cors, {
    origin: env.corsOrigins.length > 0 ? env.corsOrigins : false,
  });

  await app.register(multipart, {
    limits: {
      fileSize: env.maxUploadSizeMb * 1024 * 1024,
    },
  });

  app.addHook('onRequest', requestIdMiddleware);
  app.setErrorHandler(errorHandler);
  app.setNotFoundHandler(notFoundHandler);

  await app.register(healthRoutes);

  await app.register(async (protectedApp) => {
    protectedApp.addHook('preHandler', internalTokenMiddleware);
    await protectedApp.register(systemRoutes);
    await protectedApp.register(emulatorRoutes);
    await protectedApp.register(aiRoutes);
    await protectedApp.register(n8nRoutes);
    await protectedApp.register(storageRoutes);
  });

  return app;
}
```

### src/server.ts

```ts
import { buildApp } from './app.js';
import { env } from './config/env.js';

async function start() {
  const app = await buildApp();

  try {
    await app.listen({
      host: env.host,
      port: env.port,
    });

    app.log.info(`josecoded-backend running on http://${env.host}:${env.port}`);
  } catch (error) {
    app.log.error(error);
    process.exit(1);
  }
}

start();
```

## src/config

### src/config/env.ts

```ts
import dotenv from 'dotenv';
import { z } from 'zod';

dotenv.config();

const envSchema = z.object({
  PORT: z.coerce.number().int().positive().default(4000),
  HOST: z.string().min(1).default('0.0.0.0'),
  BACKEND_INTERNAL_TOKEN: z
    .string()
    .min(16, 'BACKEND_INTERNAL_TOKEN must be at least 16 characters')
    .refine((value) => value !== 'change_this_later', {
      message: 'BACKEND_INTERNAL_TOKEN must not use the default placeholder',
    }),
  CORS_ORIGINS: z.string().default(''),
  EMULATOR_CONTAINER_NAME: z.string().min(1).default('android-emulator'),
  EMULATOR_PACKAGE_NAME: z.string().min(1).default('com.tres24'),
  EMULATOR_APK_DIR: z.string().min(1).default('/srv/josecoded-data/android-apps/tres24'),
  EMULATOR_BOOT_MAX_ATTEMPTS: z.coerce.number().int().positive().default(120),
  EMULATOR_BOOT_INTERVAL_MS: z.coerce.number().int().positive().default(2_000),
  EMULATOR_VIEWER_URL: z
    .url()
    .default('http://192.168.1.176:6080/vnc_lite.html?autoconnect=true&resize=scale'),
  OLLAMA_URL: z.url().default('http://localhost:11434'),
  OLLAMA_CHAT_MODEL: z.string().min(1).default('llama3.2:3b'),
  OLLAMA_BLOG_MODEL: z.string().min(1).default('mistral:7b'),
  OLLAMA_KEEP_ALIVE: z.string().min(1).default('30m'),
  AI_CHAT_TIMEOUT_MS: z.coerce.number().int().positive().default(30_000),
  AI_BLOG_TIMEOUT_MS: z.coerce.number().int().positive().default(120_000),
  KNOWLEDGE_DIR: z.string().min(1).default('/srv/josecoded-data/knowledge'),
  STORAGE_ROOT: z.string().min(1).default('/srv/josecoded-data/storage'),
  STORAGE_PUBLIC_DIR: z.string().min(1).default('/srv/josecoded-data/storage/public'),
  STORAGE_PRIVATE_DIR: z.string().min(1).default('/srv/josecoded-data/storage/private'),
  STORAGE_UPLOADS_DIR: z.string().min(1).default('/srv/josecoded-data/storage/uploads'),
  STORAGE_PROCESSED_DIR: z.string().min(1).default('/srv/josecoded-data/storage/processed'),
  MAX_UPLOAD_SIZE_MB: z.coerce.number().int().positive().default(50),
  N8N_BASE_URL: z.url().default('http://localhost:5678'),
  N8N_WEBHOOK_SECRET: z.string().default(''),
  N8N_TIMEOUT_MS: z.coerce.number().int().positive().default(10_000),
});

const parsedEnv = envSchema.parse(process.env);

export const env = {
  port: parsedEnv.PORT,
  host: parsedEnv.HOST,
  backendInternalToken: parsedEnv.BACKEND_INTERNAL_TOKEN,
  corsOrigins: parsedEnv.CORS_ORIGINS.split(',')
    .map((origin) => origin.trim())
    .filter(Boolean),
  emulatorContainerName: parsedEnv.EMULATOR_CONTAINER_NAME,
  emulatorPackageName: parsedEnv.EMULATOR_PACKAGE_NAME,
  emulatorApkDir: parsedEnv.EMULATOR_APK_DIR,
  emulatorBootMaxAttempts: parsedEnv.EMULATOR_BOOT_MAX_ATTEMPTS,
  emulatorBootIntervalMs: parsedEnv.EMULATOR_BOOT_INTERVAL_MS,
  emulatorViewerUrl: parsedEnv.EMULATOR_VIEWER_URL,
  ollamaUrl: parsedEnv.OLLAMA_URL,
  ollamaChatModel: parsedEnv.OLLAMA_CHAT_MODEL,
  ollamaBlogModel: parsedEnv.OLLAMA_BLOG_MODEL,
  ollamaKeepAlive: parsedEnv.OLLAMA_KEEP_ALIVE,
  aiChatTimeoutMs: parsedEnv.AI_CHAT_TIMEOUT_MS,
  aiBlogTimeoutMs: parsedEnv.AI_BLOG_TIMEOUT_MS,
  knowledgeDir: parsedEnv.KNOWLEDGE_DIR,
  storageRoot: parsedEnv.STORAGE_ROOT,
  storagePublicDir: parsedEnv.STORAGE_PUBLIC_DIR,
  storagePrivateDir: parsedEnv.STORAGE_PRIVATE_DIR,
  storageUploadsDir: parsedEnv.STORAGE_UPLOADS_DIR,
  storageProcessedDir: parsedEnv.STORAGE_PROCESSED_DIR,
  maxUploadSizeMb: parsedEnv.MAX_UPLOAD_SIZE_MB,
  n8nBaseUrl: parsedEnv.N8N_BASE_URL,
  n8nWebhookSecret: parsedEnv.N8N_WEBHOOK_SECRET,
  n8nTimeoutMs: parsedEnv.N8N_TIMEOUT_MS,
};
```

## src/middlewares

### src/middlewares/error.middleware.ts

```ts
import type { FastifyError, FastifyReply, FastifyRequest } from 'fastify';
import { ZodError } from 'zod';

type CodedError = Error & {
  code?: string;
  statusCode?: number;
};

export function errorHandler(
  error: FastifyError | ZodError,
  request: FastifyRequest,
  reply: FastifyReply
) {
  request.log.error(error);

  if (error instanceof ZodError) {
    return reply.code(400).send({
      ok: false,
      error: 'Invalid request',
      code: 'INVALID_REQUEST',
      issues: error.issues,
      requestId: request.id,
    });
  }

  const statusCode = 'statusCode' in error && error.statusCode ? error.statusCode : 500;
  const codedError = error as CodedError;

  return reply.code(statusCode).send({
    ok: false,
    error: statusCode >= 500 ? 'Internal server error' : error.message,
    code: codedError.code ?? (statusCode >= 500 ? 'INTERNAL_ERROR' : 'INVALID_REQUEST'),
    requestId: request.id,
  });
}
```

### src/middlewares/internal-token.middleware.ts

```ts
import { timingSafeEqual } from 'node:crypto';
import type { FastifyReply, FastifyRequest } from 'fastify';
import { env } from '../config/env.js';

const bearerPrefix = 'Bearer ';

function tokensMatch(receivedToken: string | undefined, expectedToken: string) {
  if (!receivedToken || receivedToken.length !== expectedToken.length) {
    return false;
  }

  return timingSafeEqual(Buffer.from(receivedToken), Buffer.from(expectedToken));
}

export async function internalTokenMiddleware(request: FastifyRequest, reply: FastifyReply) {
  const headerToken = request.headers['x-internal-token'];
  const authorization = request.headers.authorization;
  const bearerToken = authorization?.trim().startsWith(bearerPrefix)
    ? authorization.trim().slice(bearerPrefix.length)
    : undefined;

  const tokenFromHeader = Array.isArray(headerToken) ? headerToken[0] : headerToken;
  const token = tokenFromHeader?.trim() ?? bearerToken?.trim();

  if (!tokensMatch(token, env.backendInternalToken)) {
    return reply.code(401).send({
      ok: false,
      error: 'Unauthorized',
      code: 'UNAUTHORIZED',
      requestId: request.id,
    });
  }
}
```

### src/middlewares/not-found.middleware.ts

```ts
import type { FastifyReply, FastifyRequest } from 'fastify';

export async function notFoundHandler(request: FastifyRequest, reply: FastifyReply) {
  return reply.code(404).send({
    ok: false,
    error: 'Route not found',
    method: request.method,
    path: request.url,
    requestId: request.id,
  });
}
```

### src/middlewares/request-id.middleware.ts

```ts
import { randomUUID } from 'node:crypto';
import type { FastifyReply, FastifyRequest } from 'fastify';

const requestIdHeader = 'x-request-id';

export async function requestIdMiddleware(request: FastifyRequest, reply: FastifyReply) {
  const incomingRequestId = request.headers[requestIdHeader];
  const normalizedRequestId = Array.isArray(incomingRequestId)
    ? incomingRequestId[0]
    : incomingRequestId;
  const requestId = normalizedRequestId ?? randomUUID();

  request.id = requestId;
  reply.header(requestIdHeader, requestId);
}
```

## src/modules/ai

### src/modules/ai/ai.routes.ts

```ts
import type { FastifyInstance } from 'fastify';
import {
  aiChatSchema,
  blogGenerateSchema,
  blogImproveSchema,
  summarizeSchema,
} from '../../schemas/ai.schema.js';
import { chat, generateBlog, getAiStatus, improveBlog, summarize } from '../../services/ai.service.js';

export async function aiRoutes(app: FastifyInstance) {
  app.get('/ai/status', async () => {
    return {
      ok: true,
      data: await getAiStatus(),
    };
  });

  app.post('/ai/chat', async (request, reply) => {
    const parsed = aiChatSchema.safeParse(request.body);

    if (!parsed.success) {
      return reply.code(400).send({
        ok: false,
        error: 'Invalid chat request',
        code: 'INVALID_REQUEST',
        issues: parsed.error.issues,
      });
    }

    return {
      ok: true,
      data: await chat(parsed.data),
    };
  });

  app.post('/ai/blog/generate', async (request, reply) => {
    const parsed = blogGenerateSchema.safeParse(request.body);

    if (!parsed.success) {
      return reply.code(400).send({
        ok: false,
        error: 'Invalid blog generation request',
        code: 'INVALID_REQUEST',
        issues: parsed.error.issues,
      });
    }

    return {
      ok: true,
      data: await generateBlog(parsed.data),
    };
  });

  app.post('/ai/blog/improve', async (request, reply) => {
    const parsed = blogImproveSchema.safeParse(request.body);

    if (!parsed.success) {
      return reply.code(400).send({
        ok: false,
        error: 'Invalid blog improve request',
        code: 'INVALID_REQUEST',
        issues: parsed.error.issues,
      });
    }

    return {
      ok: true,
      data: await improveBlog(parsed.data),
    };
  });

  app.post('/ai/summarize', async (request, reply) => {
    const parsed = summarizeSchema.safeParse(request.body);

    if (!parsed.success) {
      return reply.code(400).send({
        ok: false,
        error: 'Invalid summarize request',
        code: 'INVALID_REQUEST',
        issues: parsed.error.issues,
      });
    }

    return {
      ok: true,
      data: await summarize(parsed.data),
    };
  });
}
```

## src/modules/emulator

### src/modules/emulator/emulator.routes.ts

```ts
import type { FastifyInstance } from 'fastify';
import {
  getAdbDevices,
  getEmulatorDiagnostics,
  getEmulatorStatus,
  installEmulatorApp,
  openEmulatorApp,
  restartEmulator,
  startEmulator,
  startEmulatorSession,
  stopEmulator,
} from '../../services/emulator.service.js';

export async function emulatorRoutes(app: FastifyInstance) {
  app.get('/emulator/status', async () => {
    return {
      ok: true,
      data: await getEmulatorStatus(),
    };
  });

  app.get('/emulator/diagnostics', async () => {
    return {
      ok: true,
      data: await getEmulatorDiagnostics(),
    };
  });

  app.get('/emulator/adb/devices', async () => {
    return {
      ok: true,
      data: {
        output: await getAdbDevices(),
      },
    };
  });

  app.post('/emulator/start', async () => {
    return {
      ok: true,
      data: await startEmulator(),
    };
  });

  app.post('/emulator/stop', async () => {
    return {
      ok: true,
      data: await stopEmulator(),
    };
  });

  app.post('/emulator/restart', async () => {
    return {
      ok: true,
      data: await restartEmulator(),
    };
  });

  app.post('/emulator/open-app', async () => {
    return {
      ok: true,
      data: await openEmulatorApp(),
    };
  });

  app.post('/emulator/install-app', async () => {
    return {
      ok: true,
      data: await installEmulatorApp(),
    };
  });

  app.post('/emulator/session/start', async () => {
    return {
      ok: true,
      data: await startEmulatorSession(),
    };
  });
}
```

## src/modules/health

### src/modules/health/health.routes.ts

```ts
import type { FastifyInstance } from 'fastify';
import { getPublicHealthReport } from '../../services/health.service.js';

export async function healthRoutes(app: FastifyInstance) {
  app.get('/health', async (_request, reply) => {
    const report = await getPublicHealthReport();

    return reply.code(200).send(report);
  });
}
```

## src/modules/n8n

### src/modules/n8n/n8n.routes.ts

```ts
import type { FastifyInstance } from 'fastify';
import { n8nTriggerParamsSchema } from '../../schemas/n8n.schema.js';
import { getN8nStatus, triggerN8nWorkflow } from '../../services/n8n.service.js';

export async function n8nRoutes(app: FastifyInstance) {
  app.get('/n8n/status', async () => {
    return {
      ok: true,
      data: await getN8nStatus(),
    };
  });

  app.post('/n8n/trigger/:workflow', async (request, reply) => {
    const parsedParams = n8nTriggerParamsSchema.safeParse(request.params);

    if (!parsedParams.success) {
      return reply.code(400).send({
        ok: false,
        error: 'Invalid workflow name',
        code: 'INVALID_REQUEST',
        issues: parsedParams.error.issues,
      });
    }

    const result = await triggerN8nWorkflow(parsedParams.data.workflow, request.body);

    return {
      ok: result.ok,
      data: result,
    };
  });
}
```

## src/modules/storage

### src/modules/storage/storage.routes.ts

```ts
import type { FastifyInstance } from 'fastify';
import {
  storageFileParamsSchema,
  storageListQuerySchema,
} from '../../schemas/storage.schema.js';
import {
  deleteFile,
  getFileReadStream,
  isAllowedMimeType,
  listFiles,
  saveUploadedFile,
} from '../../services/storage.service.js';

export async function storageRoutes(app: FastifyInstance) {
  app.get('/storage/list', async (request, reply) => {
    const parsed = storageListQuerySchema.safeParse(request.query);

    if (!parsed.success) {
      return reply.code(400).send({
        ok: false,
        error: 'Invalid storage list query',
        code: 'INVALID_REQUEST',
        issues: parsed.error.issues,
      });
    }

    return {
      ok: true,
      data: await listFiles(parsed.data.area),
    };
  });

  app.post('/storage/upload', async (request, reply) => {
    const file = await request.file();

    if (!file) {
      return reply.code(400).send({
        ok: false,
        error: 'No file uploaded',
        code: 'INVALID_REQUEST',
      });
    }

    if (!isAllowedMimeType(file.mimetype)) {
      request.log.warn({ mimetype: file.mimetype, filename: file.filename }, 'blocked upload mimetype');

      return reply.code(415).send({
        ok: false,
        error: 'Unsupported file type',
        code: 'STORAGE_ERROR',
      });
    }

    request.log.info({ mimetype: file.mimetype, filename: file.filename }, 'storing upload');

    const storedFile = await saveUploadedFile({
      filename: file.filename,
      mimetype: file.mimetype,
      stream: file.file,
    });

    return {
      ok: true,
      data: storedFile,
    };
  });

  app.get('/storage/file/:area/:filename', async (request, reply) => {
    const parsed = storageFileParamsSchema.safeParse(request.params);

    if (!parsed.success) {
      return reply.code(400).send({
        ok: false,
        error: 'Invalid file params',
        code: 'INVALID_REQUEST',
        issues: parsed.error.issues,
      });
    }

    return reply.send(getFileReadStream(parsed.data.area, parsed.data.filename));
  });

  app.delete('/storage/file/:area/:filename', async (request, reply) => {
    const parsed = storageFileParamsSchema.safeParse(request.params);

    if (!parsed.success) {
      return reply.code(400).send({
        ok: false,
        error: 'Invalid file params',
        code: 'INVALID_REQUEST',
        issues: parsed.error.issues,
      });
    }

    return {
      ok: true,
      data: await deleteFile(parsed.data.area, parsed.data.filename),
    };
  });
}
```

## src/modules/system

### src/modules/system/system.routes.ts

```ts
import type { FastifyInstance } from 'fastify';
import { getSystemStatus } from '../../services/system.service.js';

export async function systemRoutes(app: FastifyInstance) {
  app.get('/system/status', async (_request, reply) => {
    const status = await getSystemStatus();

    return reply.code(status.status === 'error' ? 503 : 200).send(status);
  });
}
```

## src/schemas

### src/schemas/ai.schema.ts

```ts
import { z } from 'zod';

export const aiChatSchema = z.object({
  message: z.string().min(1).max(4_000),
  numPredict: z.number().int().min(50).max(1_000).optional(),
});

export const blogGenerateSchema = z.object({
  topic: z.string().min(1).max(500),
  instructions: z.string().max(2_000).optional(),
  numPredict: z.number().int().min(100).max(2_000).optional(),
});

export const blogImproveSchema = z.object({
  content: z.string().min(1).max(12_000),
  instructions: z.string().max(2_000).optional(),
  numPredict: z.number().int().min(100).max(2_000).optional(),
});

export const summarizeSchema = z.object({
  content: z.string().min(1).max(12_000),
  numPredict: z.number().int().min(50).max(1_000).optional(),
});
```

### src/schemas/n8n.schema.ts

```ts
import { z } from 'zod';

export const n8nTriggerParamsSchema = z.object({
  workflow: z.string().min(1).max(100).regex(/^[a-zA-Z0-9_-]+$/),
});
```

### src/schemas/storage.schema.ts

```ts
import { z } from 'zod';

export const storageAreaSchema = z.enum(['public', 'private', 'uploads', 'processed']);

export const storageListQuerySchema = z.object({
  area: storageAreaSchema.default('uploads'),
});

export const storageFileParamsSchema = z.object({
  area: storageAreaSchema,
  filename: z.string().min(1).max(255),
});
```

## src/services

### src/services/ai.service.ts

```ts
import { env } from '../config/env.js';
import { getKnowledgeContext } from './knowledge.service.js';
import { chatWithOllama, checkOllamaStatus } from './ollama.service.js';

export async function getAiStatus() {
  return checkOllamaStatus();
}

export async function chat(input: { message: string; numPredict?: number | undefined }) {
  const knowledge = await getKnowledgeContext();

  console.info(JSON.stringify({ scope: 'ai', action: 'chat', model: env.ollamaChatModel }));

  return chatWithOllama({
    model: env.ollamaChatModel,
    numPredict: input.numPredict ?? 300,
    temperature: 0.6,
    timeoutMs: env.aiChatTimeoutMs,
    messages: [
      {
        role: 'system',
        content: `Eres el asistente de josecoded. Responde de forma clara, breve, profesional y útil. Usa este contexto si es relevante:\n\n${knowledge}`,
      },
      {
        role: 'user',
        content: input.message,
      },
    ],
  });
}

export async function generateBlog(input: {
  topic: string;
  instructions?: string | undefined;
  numPredict?: number | undefined;
}) {
  const knowledge = await getKnowledgeContext();

  console.info(JSON.stringify({ scope: 'ai', action: 'blog-generate', model: env.ollamaBlogModel }));

  return chatWithOllama({
    model: env.ollamaBlogModel,
    numPredict: input.numPredict ?? 800,
    temperature: 0.75,
    timeoutMs: env.aiBlogTimeoutMs,
    messages: [
      {
        role: 'system',
        content: `Eres el redactor técnico de josecoded. Escribe en Markdown con tono profesional, cercano y técnico. No inventes cifras, clientes, precios ni casos reales. Contexto:\n\n${knowledge}`,
      },
      {
        role: 'user',
        content: `Genera un borrador de blog sobre: ${input.topic}\n\nInstrucciones adicionales: ${input.instructions ?? 'Sin instrucciones adicionales.'}`,
      },
    ],
  });
}

export async function improveBlog(input: {
  content: string;
  instructions?: string | undefined;
  numPredict?: number | undefined;
}) {
  const knowledge = await getKnowledgeContext();

  console.info(JSON.stringify({ scope: 'ai', action: 'blog-improve', model: env.ollamaBlogModel }));

  return chatWithOllama({
    model: env.ollamaBlogModel,
    numPredict: input.numPredict ?? 800,
    temperature: 0.7,
    timeoutMs: env.aiBlogTimeoutMs,
    messages: [
      {
        role: 'system',
        content: `Eres el editor técnico de josecoded. Mejora textos manteniendo claridad, naturalidad y criterio técnico. Contexto:\n\n${knowledge}`,
      },
      {
        role: 'user',
        content: `Mejora este contenido:\n\n${input.content}\n\nInstrucciones adicionales: ${input.instructions ?? 'Sin instrucciones adicionales.'}`,
      },
    ],
  });
}

export async function summarize(input: { content: string; numPredict?: number | undefined }) {
  console.info(JSON.stringify({ scope: 'ai', action: 'summarize', model: env.ollamaChatModel }));

  return chatWithOllama({
    model: env.ollamaChatModel,
    numPredict: input.numPredict ?? 300,
    temperature: 0.4,
    timeoutMs: env.aiChatTimeoutMs,
    messages: [
      {
        role: 'system',
        content:
          'Resume el contenido de forma clara, estructurada y útil. No añadas información que no esté en el texto.',
      },
      {
        role: 'user',
        content: input.content,
      },
    ],
  });
}
```

### src/services/command.service.ts

```ts
import { exec } from 'node:child_process';

export type CommandResult = {
  stdout: string;
  stderr: string;
};

export function shellEscape(value: string): string {
  return `'${value.replaceAll("'", "'\\''")}'`;
}

export function runCommand(command: string, timeout = 30_000): Promise<CommandResult> {
  return new Promise((resolve, reject) => {
    exec(command, { timeout }, (error, stdout, stderr) => {
      if (error) {
        reject(new Error(stderr || error.message));
        return;
      }

      resolve({
        stdout: stdout.trim(),
        stderr: stderr.trim(),
      });
    });
  });
}
```

### src/services/docker.service.ts

```ts
import { runCommand, shellEscape } from './command.service.js';

export async function getDockerContainerStatus(containerName: string) {
  try {
    const result = await runCommand(
      `docker inspect -f '{{.Name}}|{{.State.Status}}|{{.State.Running}}' ${shellEscape(
        containerName
      )}`
    );
    const [name, status, running] = result.stdout.split('|');

    return {
      exists: true,
      name: name?.replace('/', '') ?? containerName,
      status: status ?? 'unknown',
      running: running === 'true',
    };
  } catch {
    return {
      exists: false,
      name: containerName,
      status: 'not_found',
      running: false,
    };
  }
}

export async function startDockerContainer(containerName: string) {
  const result = await runCommand(`docker start ${shellEscape(containerName)}`, 60_000);
  return result.stdout;
}

export async function stopDockerContainer(containerName: string) {
  const result = await runCommand(`docker stop ${shellEscape(containerName)}`, 60_000);
  return result.stdout;
}

export async function restartDockerContainer(containerName: string) {
  const result = await runCommand(`docker restart ${shellEscape(containerName)}`, 90_000);
  return result.stdout;
}

export async function copyToDockerContainer(
  containerName: string,
  sourcePath: string,
  targetPath: string
) {
  const result = await runCommand(
    `docker cp ${shellEscape(sourcePath)} ${shellEscape(`${containerName}:${targetPath}`)}`,
    120_000
  );

  return result.stdout;
}

export async function execInDockerContainer(
  containerName: string,
  command: string,
  timeout = 30_000
) {
  const result = await runCommand(`docker exec ${shellEscape(containerName)} ${command}`, timeout);
  return result.stdout;
}
```

### src/services/emulator.service.ts

```ts
import fs from 'node:fs/promises';
import path from 'node:path';
import { env } from '../config/env.js';
import { shellEscape } from './command.service.js';
import {
  copyToDockerContainer,
  execInDockerContainer,
  getDockerContainerStatus,
  restartDockerContainer,
  startDockerContainer,
  stopDockerContainer,
} from './docker.service.js';

let emulatorSessionStarting = false;

type ServiceError = Error & {
  code?: string;
  statusCode?: number;
};

function createServiceError(message: string, code: string, statusCode: number): ServiceError {
  const error = new Error(message) as ServiceError;
  error.code = code;
  error.statusCode = statusCode;
  return error;
}

export function assertDockerContainerName(containerName: string) {
  if (!/^[a-zA-Z0-9_.-]+$/.test(containerName)) {
    throw createServiceError('Invalid Docker container name', 'INVALID_REQUEST', 400);
  }

  return containerName;
}

export function assertAndroidPackageName(packageName: string) {
  if (!/^[a-zA-Z][a-zA-Z0-9_]*(\.[a-zA-Z][a-zA-Z0-9_]*)+$/.test(packageName)) {
    throw createServiceError('Invalid Android package name', 'INVALID_REQUEST', 400);
  }

  return packageName;
}

function getContainerName() {
  return assertDockerContainerName(env.emulatorContainerName);
}

function getPackageName() {
  return assertAndroidPackageName(env.emulatorPackageName);
}

function logEmulator(message: string, context: Record<string, unknown> = {}) {
  console.info(JSON.stringify({ scope: 'emulator', message, ...context }));
}

async function waitForAndroidBoot(containerName: string) {
  logEmulator('waiting for android boot', {
    containerName,
    maxAttempts: env.emulatorBootMaxAttempts,
    intervalMs: env.emulatorBootIntervalMs,
  });

  const maxAttempts = env.emulatorBootMaxAttempts;

  for (let attempt = 0; attempt < maxAttempts; attempt += 1) {
    if (await isAndroidBooted(containerName)) {
      logEmulator('android boot completed', { containerName, attempt: attempt + 1 });
      return true;
    }

    await new Promise((resolve) => setTimeout(resolve, env.emulatorBootIntervalMs));
  }

  return false;
}

export async function getEmulatorStatus() {
  const containerName = getContainerName();

  return {
    container: await getDockerContainerStatus(containerName),
    packageName: getPackageName(),
    viewerUrl: env.emulatorViewerUrl,
  };
}

export async function startEmulator() {
  const containerName = getContainerName();
  logEmulator('starting container', { containerName });

  return {
    action: 'start',
    output: await startDockerContainer(containerName),
  };
}

export async function stopEmulator() {
  const containerName = getContainerName();
  logEmulator('stopping container', { containerName });

  return {
    action: 'stop',
    output: await stopDockerContainer(containerName),
  };
}

export async function restartEmulator() {
  const containerName = getContainerName();
  logEmulator('restarting container', { containerName });

  return {
    action: 'restart',
    output: await restartDockerContainer(containerName),
  };
}

export async function getAdbDevices(containerName = getContainerName()) {
  return execInDockerContainer(containerName, 'adb devices', 15_000);
}

export async function isAndroidBooted(containerName = getContainerName()) {
  try {
    const output = await execInDockerContainer(
      containerName,
      'adb shell getprop sys.boot_completed',
      10_000
    );

    return output.trim() === '1';
  } catch {
    return false;
  }
}

export async function isPackageInstalled(packageName = getPackageName()) {
  const containerName = getContainerName();
  const safePackageName = assertAndroidPackageName(packageName);

  try {
    const output = await execInDockerContainer(
      containerName,
      `adb shell pm path ${safePackageName}`,
      15_000
    );

    return output.includes('package:');
  } catch {
    return false;
  }
}

async function listApkFiles() {
  const entries = await fs.readdir(env.emulatorApkDir, { withFileTypes: true });

  return entries
    .filter((entry) => entry.isFile() && entry.name.toLowerCase().endsWith('.apk'))
    .map((entry) => entry.name)
    .sort((left, right) => {
      if (left === 'base.apk') {
        return -1;
      }

      if (right === 'base.apk') {
        return 1;
      }

      return left.localeCompare(right);
    });
}

export async function installEmulatorApp() {
  const containerName = getContainerName();
  const apkFiles = await listApkFiles();

  if (apkFiles.length === 0) {
    throw createServiceError(
      `No APK files found in ${env.emulatorApkDir}`,
      'INVALID_REQUEST',
      400
    );
  }

  const containerApkDir = '/tmp/josecoded-apks';
  logEmulator('installing android app', {
    containerName,
    apkDir: env.emulatorApkDir,
    apkCount: apkFiles.length,
  });

  await execInDockerContainer(containerName, `rm -rf ${shellEscape(containerApkDir)}`, 15_000);
  await copyToDockerContainer(containerName, env.emulatorApkDir, containerApkDir);

  const installArgs = apkFiles
    .map((apkFile) => shellEscape(path.posix.join(containerApkDir, apkFile)))
    .join(' ');

  const output = await execInDockerContainer(
    containerName,
    `adb install-multiple -r ${installArgs}`,
    120_000
  );

  return {
    action: 'install-app',
    packageName: getPackageName(),
    apkDir: env.emulatorApkDir,
    apkFiles,
    output,
  };
}

export async function openEmulatorApp() {
  const containerName = getContainerName();
  const packageName = getPackageName();
  logEmulator('opening android app', { containerName, packageName });

  return {
    action: 'open-app',
    packageName,
    output: await execInDockerContainer(
      containerName,
      `adb shell monkey -p ${packageName} -c android.intent.category.LAUNCHER 1`
    ),
  };
}

export async function enableEmulatorImmersiveMode() {
  const containerName = getContainerName();

  return {
    action: 'immersive-mode',
    output: await execInDockerContainer(
      containerName,
      'adb shell settings put global policy_control immersive.full=*'
    ),
  };
}

export async function getEmulatorDiagnostics() {
  const containerName = getContainerName();
  const packageName = getPackageName();
  const container = await getDockerContainerStatus(containerName);
  const [adbDevices, bootCompleted, packageInstalled] = await Promise.all([
    getAdbDevices(containerName).catch((error: unknown) =>
      error instanceof Error ? error.message : 'Unable to read adb devices'
    ),
    isAndroidBooted(containerName),
    isPackageInstalled(packageName),
  ]);

  return {
    container,
    adbDevices,
    bootCompleted,
    packageInstalled,
    packageName,
    apkDir: env.emulatorApkDir,
    viewerUrl: env.emulatorViewerUrl,
  };
}

export async function startEmulatorSession() {
  if (emulatorSessionStarting) {
    throw createServiceError(
      'Emulator session is already starting',
      'EMULATOR_SESSION_LOCKED',
      409
    );
  }

  emulatorSessionStarting = true;

  try {
    const containerName = getContainerName();
    const packageName = getPackageName();
    logEmulator('starting session', { containerName, packageName });

    await startDockerContainer(containerName);

    const booted = await waitForAndroidBoot(containerName);

    if (!booted) {
      throw createServiceError(
        'Android emulator did not finish booting in time',
        'EMULATOR_BOOT_TIMEOUT',
        504
      );
    }

    const packageInstalled = await isPackageInstalled(packageName);

    if (!packageInstalled) {
      await installEmulatorApp();
    } else {
      logEmulator('android app already installed', { containerName, packageName });
    }

    await enableEmulatorImmersiveMode();
    await openEmulatorApp();

    logEmulator('session ready', { containerName, packageName, viewerUrl: env.emulatorViewerUrl });

    return {
      status: 'running',
      containerName,
      packageName,
      packageInstalled: true,
      viewerUrl: env.emulatorViewerUrl,
    };
  } finally {
    emulatorSessionStarting = false;
  }
}
```

### src/services/health.service.ts

```ts
import { access } from 'node:fs/promises';
import { constants } from 'node:fs';
import { env } from '../config/env.js';

type HealthStatus = 'ok' | 'degraded' | 'error';

type HealthCheck = {
  name: string;
  status: HealthStatus;
  message: string;
  latencyMs?: number;
};

type HealthReport = {
  ok: boolean;
  status: HealthStatus;
  service: string;
  timestamp: string;
  uptime: number;
  checks: HealthCheck[];
};

const serviceName = 'josecoded-backend';
const timeoutMs = 1_500;

function resolveStatus(checks: HealthCheck[]): HealthStatus {
  if (checks.some((check) => check.status === 'error')) {
    return 'error';
  }

  if (checks.some((check) => check.status === 'degraded')) {
    return 'degraded';
  }

  return 'ok';
}

async function timedCheck(
  name: string,
  run: () => Promise<Omit<HealthCheck, 'name' | 'latencyMs'>>
): Promise<HealthCheck> {
  const startedAt = performance.now();

  try {
    const result = await run();

    return {
      name,
      ...result,
      latencyMs: Math.round(performance.now() - startedAt),
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown health check failure';

    return {
      name,
      status: 'error',
      message,
      latencyMs: Math.round(performance.now() - startedAt),
    };
  }
}

async function checkDirectory(name: string, directory: string, mode = constants.R_OK) {
  return timedCheck(name, async () => {
    await access(directory, mode);

    return {
      status: 'ok',
      message: 'available',
    };
  });
}

async function checkHttpService(name: string, url: string, path: string) {
  return timedCheck(name, async () => {
    let response: Response;

    try {
      response = await fetch(new URL(path, url), {
        signal: AbortSignal.timeout(timeoutMs),
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'not reachable';

      return {
        status: 'degraded',
        message,
      };
    }

    if (!response.ok) {
      return {
        status: 'degraded',
        message: `responded with ${response.status}`,
      };
    }

    return {
      status: 'ok',
      message: 'reachable',
    };
  });
}

function checkConfiguredSecret(name: string, value: string) {
  return timedCheck(name, async () => {
    if (!value) {
      return {
        status: 'degraded',
        message: 'not configured',
      };
    }

    return {
      status: 'ok',
      message: 'configured',
    };
  });
}

export async function getHealthReport(): Promise<HealthReport> {
  const checks = await Promise.all([
    timedCheck('process', async () => ({
      status: 'ok',
      message: `node ${process.version}`,
    })),
    checkConfiguredSecret('internal-token', env.backendInternalToken),
    checkDirectory('knowledge-dir', env.knowledgeDir, constants.R_OK),
    checkDirectory('storage-root', env.storageRoot, constants.R_OK | constants.W_OK),
    checkDirectory('storage-public-dir', env.storagePublicDir, constants.R_OK | constants.W_OK),
    checkDirectory('storage-private-dir', env.storagePrivateDir, constants.R_OK | constants.W_OK),
    checkDirectory('storage-uploads-dir', env.storageUploadsDir, constants.R_OK | constants.W_OK),
    checkDirectory('storage-processed-dir', env.storageProcessedDir, constants.R_OK | constants.W_OK),
    checkHttpService('ollama', env.ollamaUrl, '/api/tags'),
    checkHttpService('n8n', env.n8nBaseUrl, '/healthz'),
    checkConfiguredSecret('n8n-webhook-secret', env.n8nWebhookSecret),
    timedCheck('emulator-config', async () => ({
      status: env.emulatorContainerName && env.emulatorPackageName ? 'ok' : 'degraded',
      message: 'configured',
    })),
  ]);
  const status = resolveStatus(checks);

  return {
    ok: status !== 'error',
    status,
    service: serviceName,
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    checks,
  };
}

export async function getPublicHealthReport() {
  return {
    ok: true,
    status: 'ok' as const,
    service: serviceName,
    timestamp: new Date().toISOString(),
  };
}
```

### src/services/knowledge.service.ts

```ts
import fs from 'node:fs/promises';
import path from 'node:path';
import { env } from '../config/env.js';

const defaultKnowledgeFiles = [
  'about.md',
  'services.md',
  'portfolio.md',
  'faq.md',
  'tone.md',
  'blog-guidelines.md',
];

const cacheTtlMs = 60_000;
const defaultMaxContextLength = 12_000;

let knowledgeCache:
  | {
      key: string;
      expiresAt: number;
      context: string;
    }
  | undefined;

async function readMarkdownFile(filename: string) {
  try {
    const filePath = path.join(env.knowledgeDir, filename);
    return await fs.readFile(filePath, 'utf8');
  } catch {
    return '';
  }
}

export async function getKnowledgeContext(files = defaultKnowledgeFiles, maxLength = defaultMaxContextLength) {
  const cacheKey = `${files.join('|')}:${maxLength}`;

  if (knowledgeCache && knowledgeCache.key === cacheKey && knowledgeCache.expiresAt > Date.now()) {
    return knowledgeCache.context;
  }

  const contents = await Promise.all(
    files.map(async (filename) => {
      const content = await readMarkdownFile(filename);

      if (!content.trim()) {
        return '';
      }

      return `--- ${filename} ---\n${content.trim()}`;
    })
  );

  const context = contents.filter(Boolean).join('\n\n').slice(0, maxLength);

  knowledgeCache = {
    key: cacheKey,
    expiresAt: Date.now() + cacheTtlMs,
    context,
  };

  return context;
}

export async function listKnowledgeFiles() {
  try {
    const entries = await fs.readdir(env.knowledgeDir, { withFileTypes: true });
    return entries
      .filter((entry) => entry.isFile() && entry.name.endsWith('.md'))
      .map((entry) => entry.name);
  } catch {
    return [];
  }
}
```

### src/services/n8n.service.ts

```ts
import { env } from '../config/env.js';

const allowedWorkflows = {
  'blog-generate': '/webhook/blog-generate',
  'lead-created': '/webhook/lead-created',
  'client-message': '/webhook/client-message',
  'file-uploaded': '/webhook/file-uploaded',
} as const;

type ServiceError = Error & {
  code?: string;
  statusCode?: number;
};

function createServiceError(message: string, code: string, statusCode: number): ServiceError {
  const error = new Error(message) as ServiceError;
  error.code = code;
  error.statusCode = statusCode;
  return error;
}

export function getAllowedN8nWorkflows() {
  return Object.keys(allowedWorkflows);
}

export async function getN8nStatus() {
  try {
    const response = await fetch(env.n8nBaseUrl, {
      signal: AbortSignal.timeout(1_500),
    });

    return {
      online: response.ok,
      status: response.status,
      baseUrl: env.n8nBaseUrl,
      allowedWorkflows: getAllowedN8nWorkflows(),
    };
  } catch {
    return {
      online: false,
      status: 0,
      baseUrl: env.n8nBaseUrl,
      allowedWorkflows: getAllowedN8nWorkflows(),
    };
  }
}

export async function triggerN8nWorkflow(workflow: string, payload: unknown) {
  const workflowPath = allowedWorkflows[workflow as keyof typeof allowedWorkflows];

  if (!workflowPath) {
    throw createServiceError('Workflow is not allowed', 'INVALID_REQUEST', 400);
  }

  const startedAt = performance.now();
  console.info(JSON.stringify({ scope: 'n8n', action: 'trigger', workflow }));

  let response: Response;

  try {
    response = await fetch(new URL(workflowPath, env.n8nBaseUrl), {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-josecoded-webhook-secret': env.n8nWebhookSecret,
      },
      signal: AbortSignal.timeout(env.n8nTimeoutMs),
      body: JSON.stringify(payload ?? {}),
    });
  } catch (error) {
    const timedOut = error instanceof Error && error.name === 'TimeoutError';

    throw createServiceError(
      timedOut ? 'n8n workflow timed out' : 'n8n workflow request failed',
      timedOut ? 'N8N_TIMEOUT' : 'INTERNAL_ERROR',
      timedOut ? 504 : 502
    );
  }

  const text = await response.text();

  return {
    ok: response.ok,
    status: response.status,
    workflow,
    durationMs: Math.round(performance.now() - startedAt),
    response: text,
  };
}
```

### src/services/ollama.service.ts

```ts
import { env } from '../config/env.js';

type OllamaRole = 'system' | 'user' | 'assistant';

export type OllamaMessage = {
  role: OllamaRole;
  content: string;
};

type ChatWithOllamaOptions = {
  model: string;
  messages: OllamaMessage[];
  temperature?: number;
  numPredict?: number;
  timeoutMs?: number;
};

type OllamaChatResponse = {
  model?: string;
  message?: {
    role: string;
    content: string;
  };
  done?: boolean;
  total_duration?: number;
  load_duration?: number;
  prompt_eval_count?: number;
  eval_count?: number;
  eval_duration?: number;
};

export async function chatWithOllama(options: ChatWithOllamaOptions) {
  const startedAt = performance.now();
  const timeoutMs = options.timeoutMs ?? env.aiChatTimeoutMs;
  let response: Response;

  try {
    response = await fetch(`${env.ollamaUrl}/api/chat`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      signal: AbortSignal.timeout(timeoutMs),
      body: JSON.stringify({
        model: options.model,
        messages: options.messages,
        stream: false,
        keep_alive: env.ollamaKeepAlive,
        options: {
          temperature: options.temperature ?? 0.6,
          num_predict: options.numPredict ?? 300,
        },
      }),
    });
  } catch (error) {
    const timedOut = error instanceof Error && error.name === 'TimeoutError';
    const serviceError = new Error(
      timedOut ? 'Ollama request timed out' : 'Ollama request failed'
    ) as Error & { code?: string; statusCode?: number };
    serviceError.code = timedOut ? 'OLLAMA_TIMEOUT' : 'INTERNAL_ERROR';
    serviceError.statusCode = timedOut ? 504 : 502;
    throw serviceError;
  }

  if (!response.ok) {
    throw new Error(`Ollama request failed with status ${response.status}`);
  }

  const data = (await response.json()) as OllamaChatResponse;

  return {
    model: data.model ?? options.model,
    content: data.message?.content ?? '',
    done: data.done ?? false,
    metrics: {
      requestDurationMs: Math.round(performance.now() - startedAt),
      totalDuration: data.total_duration,
      loadDuration: data.load_duration,
      promptEvalCount: data.prompt_eval_count,
      evalCount: data.eval_count,
      evalDuration: data.eval_duration,
    },
  };
}

export async function checkOllamaStatus() {
  try {
    const response = await fetch(`${env.ollamaUrl}/api/tags`, {
      signal: AbortSignal.timeout(1_500),
    });

    return {
      online: response.ok,
      status: response.status,
      baseUrl: env.ollamaUrl,
      chatModel: env.ollamaChatModel,
      blogModel: env.ollamaBlogModel,
    };
  } catch {
    return {
      online: false,
      status: 0,
      baseUrl: env.ollamaUrl,
      chatModel: env.ollamaChatModel,
      blogModel: env.ollamaBlogModel,
    };
  }
}
```

### src/services/storage.service.ts

```ts
import fs from 'node:fs/promises';
import { createReadStream, createWriteStream } from 'node:fs';
import path from 'node:path';
import type { Readable } from 'node:stream';
import { pipeline } from 'node:stream/promises';
import { env } from '../config/env.js';
import type { StorageArea } from '../types/common.types.js';
import { assertSafeRelativePath, createSafeFilename } from '../utils/file.util.js';

const allowedMimeTypes = new Set([
  'application/json',
  'application/pdf',
  'application/zip',
  'image/gif',
  'image/jpeg',
  'image/png',
  'image/webp',
  'text/csv',
  'text/markdown',
  'text/plain',
]);

export function isAllowedMimeType(mimetype?: string) {
  if (!mimetype) {
    return false;
  }

  return allowedMimeTypes.has(mimetype);
}

function getAreaRoot(area: StorageArea) {
  switch (area) {
    case 'public':
      return env.storagePublicDir;
    case 'private':
      return env.storagePrivateDir;
    case 'processed':
      return env.storageProcessedDir;
    case 'uploads':
      return env.storageUploadsDir;
  }
}

function resolveSafePath(area: StorageArea, relativePath: string) {
  const root = path.resolve(getAreaRoot(area));
  const safeRelativePath = assertSafeRelativePath(relativePath);
  const absolutePath = path.resolve(root, safeRelativePath);

  if (!absolutePath.startsWith(root)) {
    throw new Error('Invalid file path');
  }

  return absolutePath;
}

export async function ensureStorageFolders() {
  await Promise.all([
    fs.mkdir(env.storagePublicDir, { recursive: true }),
    fs.mkdir(env.storagePrivateDir, { recursive: true }),
    fs.mkdir(env.storageUploadsDir, { recursive: true }),
    fs.mkdir(env.storageProcessedDir, { recursive: true }),
  ]);
}

export async function listFiles(area: StorageArea = 'uploads') {
  await ensureStorageFolders();

  const root = getAreaRoot(area);
  const entries = await fs.readdir(root, { withFileTypes: true });

  return Promise.all(
    entries.map(async (entry) => {
      const filePath = path.join(root, entry.name);
      const stats = await fs.stat(filePath);

      return {
        name: entry.name,
        type: entry.isDirectory() ? 'directory' : 'file',
        sizeBytes: stats.size,
        updatedAt: stats.mtime.toISOString(),
      };
    })
  );
}

export async function saveUploadedFile(input: {
  filename: string;
  mimetype?: string;
  stream: Readable;
}) {
  await ensureStorageFolders();

  const storedName = createSafeFilename(input.filename);
  const absolutePath = path.join(env.storageUploadsDir, storedName);

  await pipeline(input.stream, createWriteStream(absolutePath));

  const stats = await fs.stat(absolutePath);

  console.info(
    JSON.stringify({
      scope: 'storage',
      action: 'upload',
      area: 'uploads',
      storedName,
      mimetype: input.mimetype,
      sizeBytes: stats.size,
    })
  );

  return {
    originalName: input.filename,
    storedName,
    mimetype: input.mimetype,
    area: 'uploads' as const,
    relativePath: storedName,
    sizeBytes: stats.size,
  };
}

export function getFileReadStream(area: StorageArea, relativePath: string) {
  return createReadStream(resolveSafePath(area, relativePath));
}

export async function deleteFile(area: StorageArea, relativePath: string) {
  await fs.unlink(resolveSafePath(area, relativePath));

  return {
    deleted: true,
    area,
    relativePath,
  };
}
```

### src/services/system.service.ts

```ts
import { getEmulatorStatus } from './emulator.service.js';
import { getHealthReport } from './health.service.js';
import { getN8nStatus } from './n8n.service.js';
import { checkOllamaStatus } from './ollama.service.js';

export async function getSystemStatus() {
  const report = await getHealthReport();
  const [ollama, n8n, emulator] = await Promise.all([
    checkOllamaStatus(),
    getN8nStatus(),
    getEmulatorStatus(),
  ]);

  return {
    ...report,
    runtime: {
      uptimeSeconds: Math.round(process.uptime()),
      nodeVersion: process.version,
    },
    services: {
      ollama,
      n8n,
      emulator,
    },
  };
}
```

## src/types

### src/types/common.types.ts

```ts
export type ServiceStatus = 'online' | 'offline' | 'unknown';

export type StorageArea = 'public' | 'private' | 'uploads' | 'processed';

export type ApiFailure = {
  ok: false;
  error: string;
  requestId?: string;
};

export type ApiSuccess<TData> = {
  ok: true;
  data: TData;
};

export type ApiResponse<TData> = ApiSuccess<TData> | ApiFailure;
```

## src/utils

### src/utils/file.util.ts

```ts
import path from 'node:path';
import { randomUUID } from 'node:crypto';

export function createSafeFilename(originalName: string) {
  const extension = path.extname(originalName);
  const baseName = path
    .basename(originalName, extension)
    .replace(/[^a-zA-Z0-9._-]/g, '_')
    .slice(0, 80);

  return `${Date.now()}-${randomUUID()}-${baseName}${extension}`;
}

export function assertSafeRelativePath(relativePath: string) {
  const normalized = path.normalize(relativePath);

  if (normalized.startsWith('..') || path.isAbsolute(normalized) || normalized.includes('\0')) {
    throw new Error('Invalid file path');
  }

  return normalized;
}
```

