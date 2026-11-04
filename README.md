# ArtAuction AI — Frontend

Cliente web de **ArtAuction AI**: subastas de arte y antigüedades en tiempo real, reporte visual de autenticidad y galerías sociales.

Este directorio es un repositorio Git independiente. No importa código de `artauction-backend` ni de `artauction-database` por ruta relativa. La integración es solo por contratos versionados:

- HTTP: cliente TypeScript alineado con el OpenAPI v1 que publica el backend.
- Tiempo real: catálogo de eventos WebSocket versionado (Socket.IO).

## Responsabilidad

| Tema | Decisión |
|---|---|
| Framework | Next.js 15, App Router, TypeScript estricto |
| Estilos | Tailwind CSS con tokens propios (papel, tinta y óxido) y un sistema de componentes en `src/components/ui`; iconos de `lucide-react` |
| Formularios | Ningún texto empieza por espacio, y correo, contraseña y URL no admiten espacios. Los errores aparecen al salir del campo o al enviar |
| Pagos | Cobro simulado. La tarjeta se formatea según su marca (Visa, Mastercard, American Express, Diners) y solo se rechaza si está vencida |
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
src/app/(private)    perfil, publicar y editar obras, mis obras (publicadas y adquiridas), sala 3D, feed y avisos
src/app/admin        cola de revisión manual: hallazgos y evidencias, rango de precio, devolución con motivo y re-auditoría
src/app/api          cookie de refresh y revalidateTag
src/components/ui    sistema de diseño: botones, campos, avisos, diálogos, toasts y encabezados
src/components/auctions  cartelera de salas en vivo y próximas (subastas rotativas)
src/components       piezas de interfaz compartidas
src/workers          imagen, subasta y catálogo
src/lib/api          cliente HTTP de la API v1
src/lib/forms        saneamiento de campos y validadores de cuenta
src/lib/payments     marcas de tarjeta, máscaras y vencimiento
src/lib/ws           tipos del catálogo de eventos
src/hooks            filtro, imagen, canal de subasta y validación de formularios
tests                pruebas de unidad y smoke e2e
```

## Consistencia de la interfaz

- **Componentes.** Toda página usa `src/components/ui`: `PageHeader`, `Panel`, `Button` y `ButtonLink` (primaria, acento para dinero, secundaria, fantasma y peligro), campos con validación en línea, `Notice` para errores en línea, toasts para confirmar acciones, `ConfirmDialog` para lo destructivo, y `LoadingState` y `EmptyState` con un siguiente paso.
- **Sesión.** Las páginas privadas van dentro de `RequireSession`: el mismo estado de carga, la misma invitación a entrar y la vuelta a la página tras el login (`/entrar?next=`, solo rutas internas). Las secciones que dependen del rol (publicar, revisión) lo explican en vez de fallar. `/api/session/refresh` responde 204 a un visitante anónimo.
- **Navegación.** La cabecera marca la sección activa y tiene menú móvil. El menú de cuenta y `/perfil` comparten la lista de secciones (`ACCOUNT_SECTIONS`).
- **Textos.** Avisos, actividad, estados y veredictos se muestran en palabras (`describe-events.ts`, `StatusPill`), y las fechas en un solo formato (`lib/format.ts`).
- **Saldo en el encabezado.** Con sesión, una pastilla junto al perfil muestra las artacoins disponibles y lleva al bolsillo; el título dice además lo retenido en pujas. Se refresca al iniciar sesión, al volver a la pestaña, cada minuto y justo después de pujar, comprar o recargar (`lib/session/wallet-balance.ts`).
- **Sala de subasta.** Muestra la obra, la oferta mínima siguiente, ofertas rápidas, el saldo con enlace a recargar, la cuenta regresiva de apertura o cierre, el historial con postores anónimos ("Tú", "Postor 1"…) y la confirmación antes de retirarse. Las reglas viven en `lib/auction/room.ts`.
- **Compra inmediata.** Bajo el formulario de puja, **Comprar ahora por X** abre una confirmación con el precio, el saldo (más lo ya retenido en la sala) y el aviso de que la subasta termina; sin saldo suficiente ofrece recargar. Cada intento lleva una sola clave de idempotencia. Se ofrece con la sala abierta mientras el precio no llegue al 80 % del precio de compra (`lib/auction/buy-now.ts`, la misma regla del servidor, que la vuelve a comprobar). Al cerrar, la sala dice «Se vendió por compra inmediata» o «¡La compraste!», y el historial marca la compra. La cartelera y la ficha muestran el precio de compra mientras esté vigente.

## Galería 3D

La sala personal (`/mi-galeria`) simula una galería real con React Three Fiber.

- **Sala.** Paredes, suelo, techo y pedestales usan texturas PBR CC0 de Poly Haven (`public/textures`, con créditos en su README), repetidas a su tamaño real. El yeso y el concreto toman de la textura solo el relieve y la rugosidad, y el color de la paleta. Luz ambiental, un entorno de paneles de luz para los reflejos y un foco por obra (hasta 8 murales y 4 objetos).
- **Obras murales.** La imagen real de la obra con su tamaño en centímetros, y un marco según el soporte:
  - moldura dorada para un óleo;
  - marco negro con paspartú y vidrio para obras sobre papel o fotografías;
  - marco flotante para arte digital;
  - nogal para el resto.
  Las piezas diminutas reciben un paspartú ancho. Cada obra lleva su cartela.
- **Objetos 3D.** Una escultura, un jarrón o un objeto se exponen solo con su modelo 3D real. Una foto no basta para mostrar una pieza tridimensional, así que no se reconstruye nada a partir de ella: la sala no usa siluetas, tornos ni vitrinas.
  - Sin modelo, la obra tridimensional no entra en la sala (`canExhibit` en `lib/gallery/layout.ts`; gallery-service tampoco la cuelga) y catalog no la deja ir a auditoría ni hacerse pública.
  - La pieza va al aire y a escala: `GlbObject` escala el modelo sin deformarlo al alto declarado (`fitModel`) y lo apoya centrado. Desde 1,5 m (una estatua de tamaño natural) va sobre un zócalo de 10 cm; entre 0,8 y 1,5 m, sobre un pedestal de 45 cm; las piezas pequeñas, sobre uno de 95 cm que las acerca a la vista. Las piezas más grandes que la sala se reducen en proporción. Si el modelo no carga, queda el pedestal con su cartela.
- **Modelo 3D.** Es obligatorio en obras tridimensionales.
  - El formulario acepta `.glb` y `.gltf` (Blender: Archivo › Exportar › glTF 2.0), `.fbx` y `.obj`, los formatos de Sketchfab o de la Asset Store de Unity. Un `.obj` o un `.gltf` con materiales (`.mtl`), buffers (`.bin`) o texturas aparte se eligen todos a la vez. Un `.blend` no se abre en la web: hay que exportarlo.
  - `lib/gallery/model-import.ts` abre el modelo en el navegador con los cargadores de three (sin dependencias nuevas), resuelve cada archivo acompañante por su nombre, cuenta los triángulos y, si no es GLB, lo exporta a GLB con `GLTFExporter` (texturas hasta 2048 px). Antes de exportar espera a que carguen todas las texturas (FBX y OBJ devuelven la escena antes) y pasa los materiales Phong o Lambert a `MeshStandardMaterial`, con la rugosidad deducida del brillo, porque el exportador los dejaría totalmente mates. Las texturas que el navegador no lee (`.exr`, `.hdr`, `.tif`, `.psd`, `.dds`, como los mapas de normales de los FBX de Poly Haven) se aceptan pero quedan fuera, y el formulario lo avisa; una textura que no carga se quita para que la pieza no se vea negra. Se carga solo al elegir un modelo, fuera del paquete inicial. Las reglas puras (formatos, archivo principal, límites) están en `model-files.ts`.
  - Antes de subir se revisan los mismos límites del servidor: hasta 30 MB y entre 1.000 y 300.000 triángulos. Al guardar, el GLB se sube con una URL firmada y catalog-service lo vuelve a validar y lo mide.
  - Un proyecto propio tridimensional nace privado y se hace público ya con su modelo; el formulario lo cuelga en la sala después de subirlo.
  - En la ficha, el marco abre en **Modelo 3D**, con un visor que gira solo y se orbita con el mouse o el dedo, y el sello «Modelo 3D verificado · N triángulos». La **Foto** queda como segunda vista.
  - Los triángulos son evidencia y límite técnico, no cambian el precio. La auditoría compara las proporciones del modelo con las medidas declaradas.
  - El decodificador Draco se sirve desde `public/draco` (copiado de three.js), sin CDN externo.
- **Imágenes.** WebGL exige CORS. Las imágenes de Garage se piden con `?texture=1` para no reutilizar la copia sin CORS que dejó el catálogo. Las del Met pasan por `/api/artwork-image`, un proxy con lista de hosts permitidos, sin redirecciones y con límite de tamaño.
- **Recorrido.** Se arrastra para mirar. WASD o flechas para caminar (Shift corre), Q/E para girar, o los botones en pantalla. Hay colisión con paredes y pedestales. Un clic en una obra lleva hasta ella y abre su ficha. Con `prefers-reduced-motion`, el salto es instantáneo.
- **Montaje.** En **Editar montaje** se elige una obra para cambiarla de pared, moverla, subirla o escalarla. **Organizar automáticamente** reparte todo según las medidas reales. Ambiente y montaje son un borrador: **Guardar cambios** solo aparece si hay cambios, y avisa antes de cerrar la pestaña.

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

## Ciclo de revisión

Cuando la auditoría deja una obra en revisión manual, un administrador la resuelve en `/admin`:

- **Aprobar y publicar** con un rango de precio. Viene lleno con la sugerencia de la auditoría; si no la hay (decidió una regla o la auditoría no terminó), es obligatorio.
- **Devolver al vendedor** con un motivo de 10 a 500 caracteres. La obra vuelve a borrador, el vendedor recibe un aviso que lleva a editarla, y en `/mis-obras` la ve como **Devuelta** con el motivo. La corrige en `/publicar/[id]`, también la imagen, y la reenvía.
- **Re-auditar con IA**, solo si la decidió la evaluación local (`LOCAL`) o el respaldo (`FALLBACK`), por ejemplo cuando la IA vuelve a tener cuota.

La ficha de la obra dice quién la evaluó: la IA (con el modelo), la evaluación local sin IA, una regla o un administrador. La lógica está en `src/lib/artwork/lot-review.ts`.

## Mis obras

Una sola página, para todos los roles, reúne dos fuentes sin repetir obras:

- **Creadas por mí**, desde catalog-service: los proyectos propios y las obras del catálogo, cada una con su estado. Si un administrador devolvió una obra, se ve el motivo con **Editar** y **Reenviar**.
- **Adquiridas**, desde gallery-service: las ganadas en subasta. Lo que la galería registra como propio no se repite, porque ya está arriba con más detalle.

Acciones según la obra:

| Obra | Acciones |
|---|---|
| Proyecto propio | **Editar** (sin auditoría), **Hacer pública/privada**, **Pasar al catálogo** (solo quien vende, con confirmación: se audita y se oculta mientras tanto) |
| Borrador o devuelta | **Editar** y **Enviar** o **Reenviar** a auditoría |
| Cualquiera que sea tuya | **Colgar en mi sala** o **Quitar de mi sala** |
| Vendida | Solo el registro de la venta: ya es de quien la ganó y no se cuelga |

Los chips filtran por etiqueta y muestran cuántas obras tiene cada una; los que están en cero no aparecen. Creadas: Devueltas, Proyectos propios, Borrador, En auditoría, Revisión manual, Publicada, En subasta (con sala abierta o programada), Vendida y Cerrada sin venta. Adquiridas: Ganadas en subasta. El filtro va en la URL (`/mis-obras?estado=devueltas`), así el botón atrás funciona y se puede enlazar. La clasificación vive en `src/lib/artwork/my-works.ts`.

Reemplaza a «Mi colección» (`/galeria`), que listaba las mismas obras propias sin su estado. `/galeria` redirige a las ganadas.

## Proyectos propios y propiedad

- **Nueva obra** (`/publicar`, para todas las cuentas) pregunta primero para qué es la obra: **Solo para mi galería** (proyecto propio, sin auditoría, no se vende) o **Publicar en el catálogo** (solo quien vende). Un proyecto propio pregunta además quién lo ve: solo su autor o también su galería pública.
- La ficha de un proyecto propio dice **Proyecto propio, sin auditar** y no muestra score, banda de precio ni sala de subasta. La galería pública lo marca igual. Nunca aparece en el catálogo.
- La sala 3D solo cuelga obras propias. Un proyecto propio y una obra ganada se cuelgan solos; lo publicado que aún no se vende se cuelga desde Mis obras. Al venderse, la obra sale de la sala del autor y entra en la del ganador. El antiguo botón «Añadir a mi galería», que colgaba cualquier obra del catálogo, ya no existe.
- **Ficha guardada.** Una obra comprada ya no se publica en el catálogo; su ficha completa es la que guardó la galería del comprador, en `/galerias/<dueña>/obras/<obra>`, con cómo, cuándo y (solo para la dueña) por cuánto se compró. La abren la sala 3D, las ganadas de Mis obras y la galería pública (`src/lib/artwork/sheet-href.ts`).
- Los roles que publican al catálogo están en `src/lib/session/roles.ts` y las reglas de la obra en `src/lib/artwork/lot-review.ts` y `my-works.ts`.

## Rutas

| Ruta | Render |
|---|---|
| `/` y `/como-funciona` | SSG |
| `/catalogo` | ISR 60 s, tag `catalog` |
| `/galerias/[ownerId]` | ISR 60 s, tags `gallery` y `gallery:{ownerId}` |
| `/obras/[id]` | SSR con `Suspense` (ficha y puntaje por separado) |
| `/subasta/[id]` | Esqueleto SSR y sala en cliente |
| `/entrar` y `/registro` | Cliente. El access token queda en `sessionStorage`; el refresh, en cookie `httpOnly` |
| `/perfil`, `/feed`, `/notificaciones` | Cliente, `Cache-Control: private, no-store` |
| `/publicar` | Nueva obra para cualquier cuenta: proyecto propio o, si vende, obra del catálogo. Cliente, `private, no-store` |
| `/mis-obras` | Todas las obras de la persona: las que creó, con su estado, y las que ganó. Filtros por etiqueta en `?estado=` (ver «Mis obras»). Cliente, `private, no-store`. `/galeria` redirige aquí |
| `/publicar/[id]` | Edita una obra en borrador (imagen incluida) y la reenvía a auditoría. Cliente, `private, no-store` |
| `/mi-galeria` | Sala 3D personal: recorrido en primera persona y modo de edición del montaje (ver «Galería 3D») |
| `/mi-galeria/personalizar` | Asistente «Personaliza tu galería» |
| `/admin` | Cliente, sin caché compartida |
| `POST /api/revalidate` | Invalida tags con el header `x-revalidate-secret` |

## Estado

Fase 3: aplicación Next.js con workers, sala en vivo, catálogo ISR y smoke de puja. El despliegue a Cloud Run queda para la fase de infraestructura.
