import { describe, expect, it } from 'vitest';
import { checkGlbFile, fitModel } from '@/lib/gallery/model-fit';

const GLB_MAGIC = new TextEncoder().encode('glTF');

describe('fitModel', () => {
  it('escala sin deformar a la altura pedida y apoya la base en el suelo, centrada', () => {
    // Un jarron de 0,32 x 0,5 x 0,32 m desplazado del origen.
    const fit = fitModel({ min: [1, 2, -0.16], max: [1.32, 2.5, 0.16] }, 1);
    expect(fit.scale).toBeCloseTo(2);
    expect(fit.offset[0]).toBeCloseTo(-2.32);
    expect(fit.offset[1]).toBeCloseTo(-4);
    expect(fit.offset[2]).toBeCloseTo(0);
  });

  it('encoge una pieza ancha para que quepa en el pedestal', () => {
    const fit = fitModel({ min: [-1, 0, -0.2], max: [1, 0.5, 0.2] }, 1, 1);
    // Por altura seria x2 (4 m de ancho); el ancho maximo la deja en x0,5.
    expect(fit.scale).toBeCloseTo(0.5);
  });

  it('un modelo plano o sin altura pedida no se escala', () => {
    expect(fitModel({ min: [0, 0, 0], max: [1, 0, 1] }, 1).scale).toBe(1);
    expect(fitModel({ min: [0, 0, 0], max: [1, 1, 1] }, 0).scale).toBe(1);
  });
});

describe('checkGlbFile', () => {
  it('acepta un .glb con la firma glTF', () => {
    expect(checkGlbFile('jarron.GLB', 2048, GLB_MAGIC)).toBeNull();
  });

  it('rechaza otra extension, mas de 30 MB o una cabecera distinta', () => {
    expect(checkGlbFile('jarron.gltf', 2048, GLB_MAGIC)).toMatch(/\.glb/);
    expect(checkGlbFile('jarron.glb', 31 * 1024 * 1024, GLB_MAGIC)).toMatch(/30 MB/);
    expect(checkGlbFile('jarron.glb', 2048, new TextEncoder().encode('PK\u0003\u0004'))).toMatch(/cabecera/);
  });
});
