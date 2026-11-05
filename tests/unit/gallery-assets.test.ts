import { describe, expect, it } from 'vitest';
import { frameStyle } from '@/lib/gallery/frames';
import { parseProxiedImageUrl, textureSource } from '@/lib/gallery/image-source';
import { kelvinToHex, shade, tintColor, wallMaterial } from '@/lib/gallery/materials';

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
