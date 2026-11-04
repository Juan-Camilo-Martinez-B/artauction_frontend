// Silueta de un objeto fotografiado sobre fondo uniforme (como las fotos de
// coleccion de museo). Funciones puras sobre pixeles RGBA: las usa
// silhouette.worker.ts y se prueban sin navegador.

export interface PixelImage {
  width: number;
  height: number;
  /** RGBA, 4 bytes por pixel. */
  data: Uint8ClampedArray;
}

export interface Bounds {
  left: number;
  top: number;
  right: number;
  bottom: number;
}

/** Ancho ocupado por el objeto en una fila de pixeles. */
export interface RowSpan {
  y: number;
  left: number;
  right: number;
}

export interface SilhouetteAnalysis {
  mask: Uint8Array;
  bounds: Bounds;
  /** Fraccion de la imagen que ocupa el objeto. */
  coverage: number;
  /** El objeto toca el borde de la foto: probablemente esta recortado. */
  touchesEdge: boolean;
  axis: number;
  rows: RowSpan[];
  /** 0 = simetria perfecta respecto del eje vertical. */
  asymmetry: number;
}

/** Umbrales para decidir si un objeto se puede tornear (solido de revolucion). */
export const LATHE_MAX_ASYMMETRY = 0.14;
const MIN_COVERAGE = 0.04;
const MAX_COVERAGE = 0.92;
/**
 * Una pieza suelta se conserva si mide al menos esta fraccion de la mayor: asi
 * entran las asas, la base o un brazo separados por fondo, y caen las motas.
 */
const MIN_PIECE_OF_LARGEST = 0.02;
/** Ni la mayor pieza se descarta por chica: por debajo de esto es ruido de la foto. */
const MIN_PIECE_OF_IMAGE = 0.0005;

function colorAt(image: PixelImage, index: number): [number, number, number] {
  const offset = index * 4;
  return [image.data[offset] ?? 0, image.data[offset + 1] ?? 0, image.data[offset + 2] ?? 0];
}

function median(values: number[]): number {
  const sorted = [...values].sort((a, b) => a - b);
  return sorted[Math.floor(sorted.length / 2)] ?? 0;
}

/** Color de fondo: mediana del borde de la foto, y su dispersion. */
export function borderBackground(image: PixelImage): { color: [number, number, number]; spread: number } {
  const { width, height } = image;
  const samples: Array<[number, number, number]> = [];
  for (let x = 0; x < width; x += 1) {
    samples.push(colorAt(image, x), colorAt(image, (height - 1) * width + x));
  }
  for (let y = 1; y < height - 1; y += 1) {
    samples.push(colorAt(image, y * width), colorAt(image, y * width + width - 1));
  }
  const color: [number, number, number] = [
    median(samples.map((sample) => sample[0])),
    median(samples.map((sample) => sample[1])),
    median(samples.map((sample) => sample[2])),
  ];
  const distances = samples.map((sample) => distance(sample, color));
  return { color, spread: median(distances) };
}

function distance(a: readonly number[], b: readonly number[]): number {
  return Math.hypot((a[0] ?? 0) - (b[0] ?? 0), (a[1] ?? 0) - (b[1] ?? 0), (a[2] ?? 0) - (b[2] ?? 0));
}

/**
 * Mascara del objeto (1 = objeto). El fondo crece desde el borde de la foto
 * mientras el color se parezca al del fondo y cambie poco de un pixel al
 * siguiente: un marmol claro sobre fondo claro se parece al fondo, pero en su
 * contorno hay un salto que detiene el crecimiento. Luego se conservan todas
 * las piezas que no son motas y se rellenan sus huecos (sombras interiores de
 * un jarron, por ejemplo).
 */
export function objectMask(image: PixelImage): Uint8Array {
  const { width, height } = image;
  const total = width * height;
  const background = borderBackground(image);
  const tolerance = Math.max(26, background.spread * 3 + 12);
  // Salto maximo entre vecinos del fondo: el degradado de una foto de estudio
  // es suave; el contorno de la pieza, no.
  const step = Math.max(10, background.spread * 2 + 6);
  const isBackground = new Uint8Array(total);
  const queue = new Int32Array(total);
  let head = 0;
  let tail = 0;
  const visit = (index: number, from: number) => {
    if (isBackground[index] === 1) {
      return;
    }
    const color = colorAt(image, index);
    if (distance(color, background.color) > tolerance) {
      return;
    }
    if (from >= 0 && distance(color, colorAt(image, from)) > step) {
      return;
    }
    isBackground[index] = 1;
    queue[tail] = index;
    tail += 1;
  };
  for (let x = 0; x < width; x += 1) {
    visit(x, -1);
    visit((height - 1) * width + x, -1);
  }
  for (let y = 0; y < height; y += 1) {
    visit(y * width, -1);
    visit(y * width + width - 1, -1);
  }
  while (head < tail) {
    const index = queue[head] as number;
    head += 1;
    const x = index % width;
    if (x > 0) visit(index - 1, index);
    if (x < width - 1) visit(index + 1, index);
    if (index >= width) visit(index - width, index);
    if (index < total - width) visit(index + width, index);
  }
  const mask = new Uint8Array(total);
  for (let index = 0; index < total; index += 1) {
    mask[index] = isBackground[index] === 1 ? 0 : 1;
  }
  return fillHoles(significantComponents(mask, width, height), width, height);
}

/**
 * Conserva cada region del objeto que no sea una mota. Antes solo quedaba la
 * mayor, y una pieza separada por fondo (un asa, la base, un brazo alzado)
 * desaparecia: la obra se veia cortada.
 */
function significantComponents(mask: Uint8Array, width: number, height: number): Uint8Array {
  const total = width * height;
  const labels = new Int32Array(total);
  const queue = new Int32Array(total);
  const sizes: number[] = [0];
  let label = 0;
  for (let start = 0; start < total; start += 1) {
    if (mask[start] !== 1 || labels[start] !== 0) {
      continue;
    }
    label += 1;
    let head = 0;
    let tail = 0;
    queue[tail] = start;
    tail += 1;
    labels[start] = label;
    while (head < tail) {
      const index = queue[head] as number;
      head += 1;
      const x = index % width;
      const neighbours = [x > 0 ? index - 1 : -1, x < width - 1 ? index + 1 : -1, index - width, index + width];
      for (const next of neighbours) {
        if (next >= 0 && next < total && mask[next] === 1 && labels[next] === 0) {
          labels[next] = label;
          queue[tail] = next;
          tail += 1;
        }
      }
    }
    sizes.push(tail);
  }
  const largest = Math.max(0, ...sizes);
  const minimum = Math.max(largest * MIN_PIECE_OF_LARGEST, total * MIN_PIECE_OF_IMAGE);
  const result = new Uint8Array(total);
  for (let index = 0; index < total; index += 1) {
    const piece = labels[index] as number;
    result[index] = piece !== 0 && (sizes[piece] ?? 0) >= minimum ? 1 : 0;
  }
  return result;
}

/** Huecos = vacio no conectado con el borde: pasan a ser objeto. */
function fillHoles(mask: Uint8Array, width: number, height: number): Uint8Array {
  const total = width * height;
  const outside = new Uint8Array(total);
  const queue = new Int32Array(total);
  let head = 0;
  let tail = 0;
  const visit = (index: number) => {
    if (mask[index] === 0 && outside[index] === 0) {
      outside[index] = 1;
      queue[tail] = index;
      tail += 1;
    }
  };
  for (let x = 0; x < width; x += 1) {
    visit(x);
    visit((height - 1) * width + x);
  }
  for (let y = 0; y < height; y += 1) {
    visit(y * width);
    visit(y * width + width - 1);
  }
  while (head < tail) {
    const index = queue[head] as number;
    head += 1;
    const x = index % width;
    if (x > 0) visit(index - 1);
    if (x < width - 1) visit(index + 1);
    if (index >= width) visit(index - width);
    if (index < total - width) visit(index + width);
  }
  const result = new Uint8Array(total);
  for (let index = 0; index < total; index += 1) {
    result[index] = outside[index] === 1 ? 0 : 1;
  }
  return result;
}

/** Recorre la mascara y mide la silueta: limites, eje vertical, perfil y simetria. */
export function analyzeSilhouette(mask: Uint8Array, width: number, height: number): SilhouetteAnalysis | null {
  const rows: RowSpan[] = [];
  let pixels = 0;
  const bounds: Bounds = { left: width, top: height, right: -1, bottom: -1 };
  for (let y = 0; y < height; y += 1) {
    let left = -1;
    let right = -1;
    for (let x = 0; x < width; x += 1) {
      if (mask[y * width + x] === 1) {
        pixels += 1;
        if (left < 0) left = x;
        right = x;
      }
    }
    if (left >= 0) {
      rows.push({ y, left, right });
      bounds.left = Math.min(bounds.left, left);
      bounds.right = Math.max(bounds.right, right);
      bounds.top = Math.min(bounds.top, y);
      bounds.bottom = Math.max(bounds.bottom, y);
    }
  }
  if (rows.length === 0) {
    return null;
  }
  const coverage = pixels / (width * height);
  const touchesEdge = bounds.left <= 0 || bounds.top <= 0 || bounds.right >= width - 1 || bounds.bottom >= height - 1;
  // El eje es la mediana de los centros de fila: resiste asas o picos de un lado.
  const axis = median(rows.map((row) => (row.left + row.right + 1) / 2));
  let deviation = 0;
  let halfWidths = 0;
  for (const row of rows) {
    const leftHalf = axis - row.left;
    const rightHalf = row.right + 1 - axis;
    deviation += Math.abs(leftHalf - rightHalf);
    halfWidths += (leftHalf + rightHalf) / 2;
  }
  const asymmetry = halfWidths > 0 ? deviation / (2 * halfWidths) : 1;
  return { mask, bounds, coverage, touchesEdge, axis, rows, asymmetry };
}

/**
 * El analisis es fiable si el objeto ocupa una parte razonable de la foto. Si
 * ocupa casi nada, la mascara se comio la pieza; si ocupa casi todo, no hubo
 * fondo que separar. En ambos casos se muestra la foto completa, sin recortar.
 */
export function isReliableSilhouette(analysis: SilhouetteAnalysis): boolean {
  return analysis.coverage >= MIN_COVERAGE && analysis.coverage <= MAX_COVERAGE;
}

/** Se puede tornear si es simetrica, ocupa una parte razonable de la foto y no esta recortada. */
export function isLatheCandidate(analysis: SilhouetteAnalysis): boolean {
  return (
    analysis.asymmetry <= LATHE_MAX_ASYMMETRY &&
    analysis.coverage >= MIN_COVERAGE &&
    analysis.coverage <= MAX_COVERAGE &&
    !analysis.touchesEdge
  );
}

/**
 * Perfil para un solido de revolucion: pares [radio, altura] normalizados a
 * 0..1 (el radio respecto del radio maximo; la altura desde la base). El radio
 * de cada fila es la media de sus dos mitades, suavizado.
 */
export function latheProfile(analysis: SilhouetteAnalysis, samples = 48): Array<[number, number]> {
  const { rows, bounds, axis } = analysis;
  const span = bounds.bottom - bounds.top || 1;
  const radii = new Map<number, number>();
  for (const row of rows) {
    radii.set(row.y, ((axis - row.left) + (row.right + 1 - axis)) / 2);
  }
  const raw: Array<[number, number]> = [];
  for (let sample = 0; sample <= samples; sample += 1) {
    const y = Math.round(bounds.bottom - (sample / samples) * span);
    raw.push([radii.get(y) ?? nearestRadius(radii, y), sample / samples]);
  }
  // Suavizado de 3 puntos para quitar el escalonado de los pixeles.
  const smooth = raw.map(([radius, height], index) => {
    const prev = raw[index - 1]?.[0] ?? radius;
    const next = raw[index + 1]?.[0] ?? radius;
    return [(prev + radius * 2 + next) / 4, height] as [number, number];
  });
  const maxRadius = Math.max(...smooth.map(([radius]) => radius), 1e-6);
  const profile = smooth.map(([radius, height]) => [Math.max(0, radius / maxRadius), height] as [number, number]);
  // La base y la boca se cierran hacia el eje para que el solido no quede hueco.
  const first = profile[0] as [number, number];
  const last = profile[profile.length - 1] as [number, number];
  return [[0, 0], [first[0], 0], ...profile.slice(1, -1), [last[0], 1], [0, 1]];
}

function nearestRadius(radii: Map<number, number>, y: number): number {
  for (let offset = 1; offset < 50; offset += 1) {
    const value = radii.get(y - offset) ?? radii.get(y + offset);
    if (value !== undefined) {
      return value;
    }
  }
  return 0;
}
