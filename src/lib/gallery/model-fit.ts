/** Caja que envuelve un modelo, en sus propias unidades. */
export interface ModelBounds {
  min: [number, number, number];
  max: [number, number, number];
}

export interface ModelFit {
  /** Escala uniforme: el modelo nunca se deforma. */
  scale: number;
  /** Traslado (ya escalado) que centra el modelo en X y Z y lo apoya en y = 0. */
  offset: [number, number, number];
}

/**
 * Ajusta un modelo a la altura que debe ocupar: escala uniforme para que su
 * alto sea `targetHeight` y traslado para que quede centrado sobre el pedestal
 * con la base apoyada. Si ademas se da `maxWidth`, se encoge lo necesario para
 * que tampoco lo supere a lo ancho ni a lo hondo.
 */
export function fitModel(bounds: ModelBounds, targetHeight: number, maxWidth?: number): ModelFit {
  const [minX, minY, minZ] = bounds.min;
  const [maxX, maxY, maxZ] = bounds.max;
  const height = maxY - minY;
  const footprint = Math.max(maxX - minX, maxZ - minZ);
  if (!(height > 0) || !(targetHeight > 0)) {
    return { scale: 1, offset: [-(minX + maxX) / 2, -minY, -(minZ + maxZ) / 2] };
  }
  let scale = targetHeight / height;
  if (maxWidth !== undefined && maxWidth > 0 && footprint * scale > maxWidth) {
    scale = maxWidth / footprint;
  }
  return {
    scale,
    offset: [(-(minX + maxX) / 2) * scale, -minY * scale, (-(minZ + maxZ) / 2) * scale],
  };
}

/** Ruta local del decodificador Draco (copiado de three.js en public/draco). */
export const DRACO_DECODER_PATH = '/draco/';

/** Limites del modelo que el navegador revisa antes de subirlo; el catalogo vuelve a validarlo. */
export const MODEL_UPLOAD_LIMITS = { maxBytes: 30 * 1024 * 1024 } as const;

/**
 * Revision rapida de un archivo .glb antes de subirlo: extension, tamano y la
 * firma `glTF` de la cabecera. Devuelve el mensaje de error o null si pasa.
 */
export function checkGlbFile(name: string, size: number, header: Uint8Array): string | null {
  if (!/\.glb$/i.test(name)) {
    return 'El modelo debe ser un archivo .glb (en Blender: Archivo > Exportar > glTF 2.0, formato binario).';
  }
  if (size > MODEL_UPLOAD_LIMITS.maxBytes) {
    return 'El modelo supera los 30 MB. Reducelo con el modificador Decimate de Blender o exporta con compresion Draco.';
  }
  const magic = String.fromCharCode(...header.slice(0, 4));
  if (magic !== 'glTF') {
    return 'El archivo no es un GLB valido: le falta la cabecera glTF.';
  }
  return null;
}
