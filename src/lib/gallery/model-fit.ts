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
