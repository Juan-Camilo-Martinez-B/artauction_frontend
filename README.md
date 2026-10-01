# ArtAuction AI — Frontend

Cliente web de **ArtAuction AI**: subastas de arte y antigüedades en tiempo real, reporte visual de autenticidad y galerías sociales.

Este directorio es un repositorio Git independiente. No importa código de `artauction-backend` ni de `artauction-database` por ruta relativa. La integración es solo por contratos versionados:

- HTTP: cliente TypeScript alineado con el OpenAPI v1 que publica el backend.
- Tiempo real: catálogo de eventos WebSocket versionado (Socket.IO).

## Responsabilidad

| Tema | Decisión |
|---|---|
| Framework | Next.js 15, App Router, TypeScript estricto |
| Estilos | Tailwind CSS |
| Pruebas | Vitest + Testing Library, smoke con Playwright |
| Imágenes | `image-worker` (Dedicated Worker + OffscreenCanvas): redimensiona, comprime y calcula el hash perceptual antes de subir |
| Subasta en vivo | `auction-socket-worker` (SharedWorker, respaldo Dedicated): una conexión WebSocket compartida entre pestañas y el desfase de reloj con el servidor |
| Listados | `catalog-worker`: filtrado, orden y búsqueda local |
| Cuenta regresiva | `requestAnimationFrame` en el hilo de UI, usando el desfase que entrega el worker. El reloj de verdad es el del servidor |

Nada que tarde más de unos 50 ms corre en el hilo principal. Los mensajes de los workers son tipados y versionados, y los buffers grandes viajan como `Transferable`. Los workers no tocan el DOM.

## Renderizado

| Superficie | Modo |
|---|---|
| Landing e informativas | SSG |
| Catálogo y galerías públicas | ISR 60 s, invalidación con `revalidateTag` |
| Detalle de obra y reporte de autenticidad | SSR con streaming y `Suspense` |
| Sala de subasta | Esqueleto SSR + hidratación en cliente |
| Galería privada, panel y perfil propio | Sin caché (`Cache-Control: private, no-store`) |
| Administración | CSR |

## Estructura

```
src/app/(public)     landing, catálogo, obra, sala y galería pública
src/app/(auth)       registro e inicio de sesión
src/app/(private)    perfil, publicar, galería, feed y avisos
src/app/admin        panel de revisión manual
src/app/api          cookie de refresh y revalidateTag
src/components       piezas de interfaz compartidas
src/workers          imagen, subasta y catálogo
src/lib/api          cliente HTTP de la API v1
src/lib/ws           tipos del catálogo de eventos
src/hooks            filtro, imagen y canal de subasta
tests                pruebas de unidad y smoke e2e
```

## Convenciones

- Commits en [Conventional Commits](https://www.conventionalcommits.org/): `feat`, `fix`, `chore`, `docs`, `test`, `refactor`, `ci`, `build`.
- La rama `main` recibe historial ya revisado. El trabajo nuevo sale de `feat/...` y se integra con `merge --no-ff` en los hitos grandes.
- TypeScript estricto, ESLint (`eslint.config.mjs`) y Prettier (`.prettierrc.json`).
- `commitlint.config.cjs` fija el formato de los mensajes. El hook de Husky se instala junto con el toolchain de la aplicación.
- Los secretos no se versionan. La plantilla es `.env.example`.
- Una obra privada no se pide ni se pinta para un tercero: la autorización vive en el backend y el cliente no rellena ese hueco con datos de caché compartida.

## Variables de entorno

Copia `.env.example` a `.env.local`. `NEXT_PUBLIC_*` llega al navegador; el resto solo existe en el servidor de Next.js.

## Imagen

El `Dockerfile` es multi-stage y publica el output `standalone` en el puerto `8080` (Cloud Run). La imagen se puede construir cuando existan `package.json` y el build de Next.js.

## Rutas

| Ruta | Render |
|---|---|
| `/` y `/como-funciona` | SSG |
| `/catalogo` | ISR 60 s, tag `catalog` |
| `/galerias/[ownerId]` | ISR 60 s, tags `gallery` y `gallery:{ownerId}` |
| `/obras/[id]` | SSR con `Suspense` (ficha y puntaje por separado) |
| `/subasta/[id]` | Esqueleto SSR y sala en cliente |
| `/entrar` y `/registro` | Cliente. El access token queda en `sessionStorage`; el refresh, en cookie `httpOnly` |
| `/perfil`, `/galeria`, `/publicar`, `/feed`, `/notificaciones` | Cliente, `Cache-Control: private, no-store` |
| `/admin` | Cliente, sin caché compartida |
| `POST /api/revalidate` | Invalida tags con el header `x-revalidate-secret` |

## Estado

Fase 3: aplicación Next.js con workers, sala en vivo, catálogo ISR y smoke de puja. El despliegue a Cloud Run queda para la fase de infraestructura.
