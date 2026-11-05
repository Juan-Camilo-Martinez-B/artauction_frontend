'use client';

import { useTranslations } from 'next-intl';
import { useEffect, useState } from 'react';
import { useFormat } from '@/hooks/use-format';
import { MODEL_LIMITS, type ModelProblem } from '@/lib/gallery/model-files';
import type { ImportedModel } from '@/lib/gallery/model-import';

/**
 * Modelo 3D que elige la persona: lo abre en el navegador (glb, gltf, fbx u
 * obj con sus archivos), lo revisa con los limites del catalogo y lo deja en
 * GLB para subirlo al guardar. La vista previa usa una URL temporal que se
 * libera cuando cambia o se desmonta el formulario.
 */
export function useModelImport() {
  const t = useTranslations('Publish.modelErrors');
  const format = useFormat();
  const [model, setModel] = useState<ImportedModel | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [problem, setProblem] = useState<ModelProblem | 'unknown' | null>(null);

  useEffect(() => () => {
    if (preview) {
      URL.revokeObjectURL(preview);
    }
  }, [preview]);

  /** Abre los archivos elegidos. Devuelve si quedo un modelo valido. */
  async function choose(files: File[]): Promise<boolean> {
    setProblem(null);
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
        setProblem(caught instanceof ModelImportError ? caught.problem : 'unknown');
        return false;
      }
    } finally {
      setBusy(false);
    }
  }

  function problemText(current: ModelProblem | 'unknown'): string {
    if (current === 'unknown') {
      return t('unknown');
    }
    switch (current.kind) {
      case 'stray':
        return t('stray', { name: current.name });
      case 'tooFewTriangles':
        return t('tooFewTriangles', { triangles: format.integer(current.triangles), min: format.integer(MODEL_LIMITS.minTriangles) });
      case 'tooManyTriangles':
        return t('tooManyTriangles', { triangles: format.integer(current.triangles), max: format.integer(MODEL_LIMITS.maxTriangles) });
      case 'openFailed':
        return t('openFailed', { format: current.format });
      default:
        return t(current.kind);
    }
  }

  return { model, preview, busy, error: problem ? problemText(problem) : null, choose };
}
