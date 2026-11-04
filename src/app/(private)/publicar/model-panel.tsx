'use client';

import { Box } from 'lucide-react';
import dynamic from 'next/dynamic';
import { Panel } from '@/components/ui/layout';
import { MODEL_ACCEPT } from '@/lib/gallery/model-files';

// El visor usa WebGL: se carga solo en el navegador y aparte del formulario.
const ModelViewer = dynamic(() => import('@/components/gallery3d/model-viewer').then((module) => module.ModelViewer), {
  ssr: false,
  loading: () => <div className="grid h-full place-items-center text-sm text-muted">Preparando la vista previa…</div>,
});

/**
 * Modelo 3D de un objeto, obligatorio: la sala y la ficha lo muestran completo
 * y a escala. Acepta .glb, .gltf, .fbx u .obj (con sus materiales y texturas);
 * el navegador lo convierte a GLB antes de subirlo.
 */
export function ModelPanel({
  preview,
  triangles,
  pendingName,
  skipped,
  busy,
  error,
  title,
  onFiles,
}: {
  preview: string | null;
  triangles: number | null;
  pendingName: string | null;
  /** Texturas que no se pudieron incluir en el modelo convertido. */
  skipped: readonly string[];
  busy: boolean;
  error: string | null;
  title: string;
  onFiles: (files: File[]) => void;
}) {
  return (
    <Panel as="section">
      <h2 className="font-serif text-2xl">Modelo 3D</h2>
      <p className="mt-2 text-sm text-muted">
        Obligatorio en esculturas y objetos: la sala 3D los expone con su volumen real y a la altura que declaraste. Sirve un .glb o .gltf
        (Blender: Archivo › Exportar › glTF 2.0), un .fbx o un .obj, como los de Sketchfab o la Asset Store de Unity. Si el .obj o el .gltf
        traen materiales (.mtl), buffers (.bin) o texturas aparte, elígelos todos a la vez. Un .blend no se abre en la web: expórtalo.
        Entre 1.000 y 300.000 triángulos y hasta 30 MB.
      </p>
      {preview ? (
        <div className="mt-4 overflow-hidden rounded-field border border-line bg-paper-deep">
          <ModelViewer url={preview} title={title} className="h-64 w-full" />
        </div>
      ) : null}
      {busy ? <p className="mt-2 text-xs text-muted" role="status">Abriendo y revisando el modelo…</p> : null}
      {!busy && triangles !== null ? (
        <p className="mt-2 text-xs text-moss">
          {pendingName ? `${pendingName} · ` : 'Modelo verificado · '}
          {triangles.toLocaleString('es-CO')} triángulos{pendingName ? ' · se sube al guardar' : ''}
        </p>
      ) : null}
      {!busy && skipped.length > 0 ? (
        <p className="mt-1 text-xs text-muted">
          Sin {skipped.join(', ')}: el navegador no lee ese formato de textura. Si la pieza se ve sin color o sin relieve, expórtala con
          texturas .png o .jpg.
        </p>
      ) : null}
      <div className="mt-4 flex flex-wrap gap-2">
        <label htmlFor="model" className="inline-flex cursor-pointer items-center gap-2 rounded-field border border-line-strong px-3 py-2 text-sm hover:border-ink">
          <Box aria-hidden="true" className="h-4 w-4" />
          {preview ? 'Cambiar modelo' : 'Elegir modelo 3D'}
          <input
            id="model"
            type="file"
            multiple
            accept={MODEL_ACCEPT}
            disabled={busy}
            className="sr-only"
            aria-describedby={error ? 'model-error' : undefined}
            onChange={(event) => {
              const next = Array.from(event.target.files ?? []);
              // Vaciar el campo deja elegir de nuevo los mismos archivos.
              event.target.value = '';
              if (next.length > 0) {
                onFiles(next);
              }
            }}
          />
        </label>
      </div>
      {error ? (
        <p id="model-error" role="alert" className="mt-2 text-sm text-oxide">
          {error}
        </p>
      ) : null}
    </Panel>
  );
}
