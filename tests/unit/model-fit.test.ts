import { describe, expect, it } from 'vitest';
import { canExhibit } from '@/lib/gallery/layout';
import { fitModel } from '@/lib/gallery/model-fit';
import { checkTriangles, companionKey, formatOf, isGlbHeader, pickModelFile } from '@/lib/gallery/model-files';

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

  it('una estatua de tamano natural ocupa su alto real', () => {
    // Modelo exportado en centimetros: 170 unidades de alto.
    const fit = fitModel({ min: [-25, 0, -20], max: [25, 170, 20] }, 1.7);
    expect(fit.scale * 170).toBeCloseTo(1.7);
  });
});

describe('archivos del modelo 3D', () => {
  const file = (name: string, size = 2048) => ({ name, size });

  it('reconoce los formatos que acepta, sin distinguir mayusculas', () => {
    expect(formatOf('Venus.GLB')).toBe('glb');
    expect(formatOf('venus.fbx')).toBe('fbx');
    expect(formatOf('venus.blend')).toBeNull();
  });

  it('elige el archivo principal entre sus acompanantes', () => {
    expect(pickModelFile([file('venus.mtl'), file('venus.obj'), file('marmol.jpg')])).toEqual({ main: 1, format: 'obj' });
    expect(pickModelFile([file('escena.gltf'), file('escena.bin'), file('base.png')])).toEqual({ main: 0, format: 'gltf' });
  });

  it('rechaza un .blend, dos modelos, archivos ajenos y mas de 30 MB', () => {
    expect(pickModelFile([file('venus.blend')])).toMatch(/\.blend/);
    expect(pickModelFile([file('a.glb'), file('b.fbx')])).toMatch(/un solo modelo/);
    expect(pickModelFile([file('venus.obj'), file('notas.pdf')])).toMatch(/notas\.pdf/);
    expect(pickModelFile([file('venus.fbx', 20 * 1024 * 1024), file('marmol.png', 11 * 1024 * 1024)])).toMatch(/30 MB/);
  });

  it('revisa la firma de un GLB y los limites de triangulos', () => {
    expect(isGlbHeader(new TextEncoder().encode('glTF'))).toBe(true);
    expect(isGlbHeader(new TextEncoder().encode('PK\u0003\u0004'))).toBe(false);
    expect(checkTriangles(999)).toMatch(/mínimo/);
    expect(checkTriangles(300_001)).toMatch(/máximo/);
    expect(checkTriangles(12_000)).toBeNull();
  });

  it('resuelve las referencias del modelo por nombre de archivo', () => {
    expect(companionKey('textures\\Marmol%20Blanco.JPG')).toBe('marmol blanco.jpg');
    expect(companionKey('blob:http://localhost:3000/escena.bin')).toBe('escena.bin');
    expect(companionKey('./venus.mtl?x=1')).toBe('venus.mtl');
  });
});

describe('exhibicion en la sala', () => {
  it('un objeto solo se expone con su modelo; una pintura, siempre', () => {
    const model = { url: 'https://media/lots/x/model-a.glb', bytes: 1, triangleCount: 1000, vertexCount: 1, size: { x: 1, y: 1, z: 1 } };
    expect(canExhibit({ representationKind: 'THREE_D', model: null })).toBe(false);
    expect(canExhibit({ representationKind: 'THREE_D', model })).toBe(true);
    expect(canExhibit({ representationKind: 'TWO_D', model: null })).toBe(true);
  });
});
