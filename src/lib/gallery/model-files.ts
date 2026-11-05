/**
 * Reglas puras de los archivos de un modelo 3D: que formatos se aceptan, cual
 * es el archivo principal y que limites revisa el navegador antes de subir.
 * La conversion a GLB (que necesita three y el DOM) vive en model-import.ts.
 */

/** Formatos que acepta el formulario. Todos se suben como GLB. */
export type ModelFormat = 'glb' | 'gltf' | 'fbx' | 'obj';

/** Lo que el catalogo admite; el navegador lo revisa antes para avisar pronto. */
export const MODEL_LIMITS = { maxBytes: 30 * 1024 * 1024, minTriangles: 1_000, maxTriangles: 300_000 } as const;

/** Extensiones de los archivos que acompanan al principal: materiales, buffers y texturas. */
const COMPANION = /\.(mtl|bin|png|jpe?g|webp|ktx2|tga|bmp|exr|hdr|tiff?|psd|dds)$/i;
/**
 * Texturas que el navegador no decodifica (alto rango o formatos de edicion).
 * Se aceptan para no rechazar el modelo entero, pero se convierte sin ellas.
 */
const UNREADABLE_TEXTURE = /\.(exr|hdr|tiff?|psd|dds)$/i;
const MAIN = /\.(glb|gltf|fbx|obj)$/i;

/** Valor del atributo accept del campo de archivo. */
export const MODEL_ACCEPT = '.glb,.gltf,.fbx,.obj,.mtl,.bin,.png,.jpg,.jpeg,.webp,.ktx2,.tga,.bmp,.exr,.hdr,.tif,.tiff,.psd,.dds';

/** Si el navegador no puede leer esta textura (ver UNREADABLE_TEXTURE). */
export function isUnreadableTexture(name: string): boolean {
  return UNREADABLE_TEXTURE.test(companionKey(name));
}

/** Por que no sirve un modelo; useModelImport lo pone en palabras del idioma activo. */
export type ModelProblem =
  | { kind: 'noMain' | 'manyMains' | 'tooLarge' | 'choose' | 'badGlb' | 'convertFailed' | 'convertedTooLarge' }
  | { kind: 'stray'; name: string }
  | { kind: 'tooFewTriangles' | 'tooManyTriangles'; triangles: number }
  | { kind: 'openFailed'; format: ModelFormat };

export interface ModelSelection {
  /** Indice del archivo principal en la lista elegida. */
  main: number;
  format: ModelFormat;
}

export function formatOf(name: string): ModelFormat | null {
  const match = MAIN.exec(name);
  return match ? (match[1]?.toLowerCase() as ModelFormat) : null;
}

/**
 * Elige el archivo principal de lo que selecciono el vendedor: uno y solo uno
 * de .glb, .gltf, .fbx u .obj, mas sus archivos acompanantes. Devuelve la
 * seleccion o el problema.
 */
export function pickModelFile(files: ReadonlyArray<{ name: string; size: number }>): ModelSelection | ModelProblem {
  const mains = files.flatMap((file, index) => {
    const format = formatOf(file.name);
    return format ? [{ index, format }] : [];
  });
  if (mains.length === 0) {
    return { kind: 'noMain' };
  }
  if (mains.length > 1) {
    return { kind: 'manyMains' };
  }
  const stray = files.find((file) => !MAIN.test(file.name) && !COMPANION.test(file.name));
  if (stray) {
    return { kind: 'stray', name: stray.name };
  }
  const total = files.reduce((sum, file) => sum + file.size, 0);
  if (total > MODEL_LIMITS.maxBytes) {
    return { kind: 'tooLarge' };
  }
  const [main] = mains;
  return main ? { main: main.index, format: main.format } : { kind: 'choose' };
}

/** Firma de un GLB: los cuatro primeros bytes dicen `glTF`. */
export function isGlbHeader(header: Uint8Array): boolean {
  return String.fromCharCode(...header.slice(0, 4)) === 'glTF';
}

/** Revisa los triangulos del modelo ya cargado. Devuelve el problema o null. */
export function checkTriangles(triangles: number): ModelProblem | null {
  if (triangles < MODEL_LIMITS.minTriangles) {
    return { kind: 'tooFewTriangles', triangles };
  }
  if (triangles > MODEL_LIMITS.maxTriangles) {
    return { kind: 'tooManyTriangles', triangles };
  }
  return null;
}

/** Nombre del archivo tal como lo pide el modelo: sin carpeta ni parametros, sin distinguir mayusculas. */
export function companionKey(reference: string): string {
  const raw = reference.split(/[?#]/)[0] ?? '';
  let clean = raw;
  try {
    clean = decodeURIComponent(raw);
  } catch {
    // Un nombre mal codificado se compara tal cual.
  }
  return (clean.split(/[\\/]/).pop() ?? clean).toLowerCase();
}
