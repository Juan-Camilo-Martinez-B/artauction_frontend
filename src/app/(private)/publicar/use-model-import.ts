'use client';

import { useEffect, useState } from 'react';
import type { ImportedModel } from '@/lib/gallery/model-import';

/**
 * Modelo 3D que elige la persona: lo abre en el navegador (glb, gltf, fbx u
 * obj con sus archivos), lo revisa con los limites del catalogo y lo deja en
 * GLB para subirlo al guardar. La vista previa usa una URL temporal que se
 * libera cuando cambia o se desmonta el formulario.
 */
export function useModelImport() {
  const [model, setModel] = useState<ImportedModel | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => () => {
    if (preview) {
      URL.revokeObjectURL(preview);
    }
  }, [preview]);

  /** Abre los archivos elegidos. Devuelve si quedo un modelo valido. */
  async function choose(files: File[]): Promise<boolean> {
    setError(null);
    setBusy(true);
    try {
      // Se carga solo al elegir un modelo: three y sus cargadores no van en el paquete inicial.
      const { importModel, ModelImportError } = await import('@/lib/gallery/model-import');
      try {
        const imported = await importModel(files);
        setModel(imported);
        setPreview(URL.createObjectURL(imported.file));
        return true;
      } catch (caught) {
        setError(caught instanceof ModelImportError ? caught.message : 'No se pudo abrir el modelo 3D.');
        return false;
      }
    } finally {
      setBusy(false);
    }
  }

  return { model, preview, busy, error, choose };
}
