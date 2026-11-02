import { describe, expect, it } from 'vitest';
import { fitFrameToSize, frameStyle } from '@/lib/gallery/frames';
import { parseProxiedImageUrl, textureSource } from '@/lib/gallery/image-source';
import { kelvinToHex, shade, tintColor, wallMaterial } from '@/lib/gallery/materials';
import { analyzeSilhouette, isLatheCandidate, latheProfile, objectMask, type PixelImage } from '@/workers/silhouette-logic';

describe('proxy de imágenes', () => {
  it('solo acepta https del host permitido, sin credenciales ni puertos', () => {
    expect(parseProxiedImageUrl('https://images.metmuseum.org/CRDImages/a.jpg')?.hostname).toBe('images.metmuseum.org');
    expect(parseProxiedImageUrl('http://images.metmuseum.org/a.jpg')).toBeNull();
    expect(parseProxiedImageUrl('https://evil.example.com/a.jpg')).toBeNull();
    expect(parseProxiedImageUrl('https://images.metmuseum.org:8443/a.jpg')).toBeNull();
    expect(parseProxiedImageUrl('https://user:pass@images.metmuseum.org/a.jpg')).toBeNull();
    expect(parseProxiedImageUrl('no es una url')).toBeNull();
    expect(parseProxiedImageUrl(null)).toBeNull();
  });

  it('manda al proxy las del Met y separa en caché las de Garage', () => {
    expect(textureSource('https://images.metmuseum.org/a.jpg')).toBe('/api/artwork-image?src=https%3A%2F%2Fimages.metmuseum.org%2Fa.jpg');
    expect(textureSource('http://media.localhost:3902/lots/1/0-abc')).toBe('http://media.localhost:3902/lots/1/0-abc?texture=1');
    expect(textureSource(null)).toBeNull();
  });
});

describe('enmarcado', () => {
  const lot = (materials: string, slug = 'otras') => ({ materials, categories: [{ isPrimary: true, category: { id: 'c', name: 'C', slug } }] });

  it('elige el marco según el soporte', () => {
    expect(frameStyle(lot('Óleo sobre lienzo')).kind).toBe('gilded');
    expect(frameStyle(lot('Albumen photograph')).kind).toBe('paper');
    expect(frameStyle(lot('Acuarela sobre papel')).glass).toBe(true);
    expect(frameStyle(lot('Impresión', 'arte-digital')).kind).toBe('float');
    expect(frameStyle(lot('Técnica mixta')).kind).toBe('wood');
  });

  it('da paspartú ancho a las obras diminutas', () => {
    const style = frameStyle(lot('Albumen photograph'));
    const fitted = fitFrameToSize(style, { width: 0.037, height: 0.064 });
    expect(0.064 + 2 * fitted.mat).toBeCloseTo(0.34);
    expect(fitFrameToSize(style, { width: 0.6, height: 0.8 })).toBe(style);
  });
});

describe('materiales', () => {
  it('tiñe, oscurece y convierte la temperatura de color', () => {
    expect(tintColor('#000000', 0)).toBe('#ffffff');
    expect(tintColor('#336699', 1)).toBe('#336699');
    expect(shade('#ffffff', 0.5)).toBe('#808080');
    // 6500 K es casi blanco; 2700 K, calido (menos azul).
    const channels = (hex: string) => [1, 3, 5].map((start) => Number.parseInt(hex.slice(start, start + 2), 16));
    expect(channels(kelvinToHex(6500)).every((channel) => channel >= 0xf0)).toBe(true);
    expect(channels(kelvinToHex(2700))[2]).toBeLessThan(channels(kelvinToHex(6000))[2] ?? 0);
  });

  it('pinta el yeso: usa su relieve pero no su foto', () => {
    expect(wallMaterial('plaster').colorMap).toBe(false);
    expect(wallMaterial('desconocido')).toBe(wallMaterial('plaster'));
  });
});

/** Valor presente o falla la prueba (el lint no admite el operador !). */
function must<T>(value: T | null | undefined): T {
  if (value === null || value === undefined) {
    throw new Error('Se esperaba un valor');
  }
  return value;
}

/** Imagen sintetica: fondo blanco y la forma que dibuja `inside`. */
function synthetic(width: number, height: number, inside: (x: number, y: number) => boolean): PixelImage {
  const data = new Uint8ClampedArray(width * height * 4);
  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      const offset = (y * width + x) * 4;
      const value = inside(x, y) ? 60 : 245;
      data[offset] = value;
      data[offset + 1] = value - 10;
      data[offset + 2] = value - 20;
      data[offset + 3] = 255;
    }
  }
  return { width, height, data };
}

function analyze(image: PixelImage) {
  return analyzeSilhouette(objectMask(image), image.width, image.height);
}

describe('silueta de objetos', () => {
  // Jarron: cuerpo ancho abajo y cuello estrecho, simetrico respecto de x = 32.
  const vase = synthetic(64, 80, (x, y) => {
    if (y < 10 || y > 70) return false;
    const radius = y < 30 ? 6 : 6 + Math.sin(((y - 30) / 40) * Math.PI) * 14;
    return Math.abs(x + 0.5 - 32) <= radius;
  });

  it('reconoce un jarrón simétrico como sólido de revolución', () => {
    const analysis = analyze(vase);
    expect(analysis).not.toBeNull();
    expect(must(analysis).asymmetry).toBeLessThan(0.05);
    expect(isLatheCandidate(must(analysis))).toBe(true);
  });

  it('el perfil va de la base a la boca, normalizado y cerrado hacia el eje', () => {
    const profile = latheProfile(must(analyze(vase)), 24);
    expect(profile[0]).toEqual([0, 0]);
    expect(profile[profile.length - 1]).toEqual([0, 1]);
    expect(Math.max(...profile.map(([radius]) => radius))).toBeCloseTo(1);
    expect(profile.every(([, height]) => height >= 0 && height <= 1)).toBe(true);
  });

  it('una pieza asimétrica va a vitrina', () => {
    const boot = synthetic(64, 80, (x, y) => (y > 10 && y < 70 && x > 10 && x < 26) || (y > 55 && y < 70 && x > 10 && x < 56));
    expect(isLatheCandidate(must(analyze(boot)))).toBe(false);
  });

  it('una foto recortada (el objeto toca el borde) va a vitrina', () => {
    const cropped = synthetic(64, 80, (x, y) => y > 30 && Math.abs(x - 32) < 12);
    expect(must(analyze(cropped)).touchesEdge).toBe(true);
    expect(isLatheCandidate(must(analyze(cropped)))).toBe(false);
  });

  it('rellena los huecos interiores del objeto', () => {
    const ring = synthetic(40, 40, (x, y) => {
      const distance = Math.hypot(x - 20, y - 20);
      return distance < 14 && distance > 6;
    });
    const mask = objectMask(ring);
    expect(mask[20 * 40 + 20]).toBe(1);
  });
});
