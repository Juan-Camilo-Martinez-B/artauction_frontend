import { act, renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { Lot } from '@/lib/api/types';
import type { Draft } from '@/lib/forms/lot-draft';
import type { ImportedModel } from '@/lib/gallery/model-import';

// Cada llamada a la API se anota en orden: el guardado es una secuencia.
const calls: string[] = [];
const push = vi.fn<(path: string) => void>();
let created: Lot;
let failImageUpload = false;

class ApiError extends Error {}

vi.mock('next/navigation', () => ({ useRouter: () => ({ push }) }));
vi.mock('@/lib/session/browser-session', () => ({ browserSession: { accessToken: () => Promise.resolve('token') } }));
vi.mock('@/lib/api/client', () => ({
  ApiError,
  artApi: {
    createLot: (_token: string, input: { visibility?: string }) => {
      calls.push(`createLot:${input.visibility ?? '-'}`);
      return Promise.resolve(created);
    },
    updateLot: () => {
      calls.push('updateLot');
      return Promise.resolve(created);
    },
    signUpload: () => {
      calls.push('signUpload');
      return Promise.resolve({ uploadUrl: 'https://s3/imagen', objectKey: 'lots/x/imagen.jpg' });
    },
    registerImage: () => {
      calls.push('registerImage');
      return Promise.resolve({});
    },
    signModelUpload: () => {
      calls.push('signModelUpload');
      return Promise.resolve({ uploadUrl: 'https://s3/modelo', objectKey: 'lots/x/model-a.glb' });
    },
    registerModel: () => {
      calls.push('registerModel');
      return Promise.resolve({});
    },
    removeModel: () => {
      calls.push('removeModel');
      return Promise.resolve(undefined);
    },
    setLotVisibility: (_token: string, _id: string, visibility: string) => {
      calls.push(`setLotVisibility:${visibility}`);
      return Promise.resolve(created);
    },
    addToGallery: () => {
      calls.push('addToGallery');
      return Promise.resolve({});
    },
    submitLot: () => {
      calls.push('submitLot');
      return Promise.resolve({});
    },
  },
}));

const { useLotSubmission } = await import('@/app/(private)/publicar/use-lot-submission');

function lot(overrides: Partial<Lot> = {}): Lot {
  return {
    id: 'lot-1',
    sellerId: 'seller',
    title: 'Estatua',
    description: 'Figura de pie en mármol.',
    artistName: null,
    creationYear: null,
    visibility: 'PRIVATE',
    materials: 'Mármol',
    status: 'BORRADOR',
    authenticityScore: null,
    suggestedPriceMin: null,
    suggestedPriceMax: null,
    currency: 'ATC',
    ...overrides,
  };
}

const DRAFT: Draft = {
  title: 'Estatua',
  description: 'Figura de pie en mármol.',
  materials: 'Mármol',
  artistName: '',
  year: '',
  categorySlug: 'escultura',
  representation: 'THREE_D',
  widthCm: '55',
  heightCm: '170',
  depthCm: '30',
  provenance: '',
};
const IMAGE = { blob: new Blob(['jpg']), hash: 'abcd' };
const MODEL: ImportedModel = { file: new File(['glb'], 'estatua.glb'), triangles: 3904, source: 'obj', skipped: [] };

describe('guardado de la ficha', () => {
  beforeEach(() => {
    calls.length = 0;
    push.mockReset();
    failImageUpload = false;
    created = lot();
    vi.stubGlobal('fetch', vi.fn((url: string) => {
      calls.push(`PUT:${url.endsWith('imagen') ? 'imagen' : 'modelo'}`);
      return Promise.resolve({ ok: !(failImageUpload && url.endsWith('imagen')) });
    }));
  });

  it('una obra del catalogo se crea, sube su imagen y su modelo y va a auditoria', async () => {
    const { result } = renderHook(() => useLotSubmission());
    await act(() =>
      result.current.submit({ lot: null, draft: DRAFT, draftChanged: true, destination: 'CATALOG', visibility: 'PRIVATE', image: IMAGE, model: MODEL, dropModel: false, intent: 'submit' }),
    );
    expect(calls).toEqual(['createLot:-', 'signUpload', 'PUT:imagen', 'registerImage', 'signModelUpload', 'PUT:modelo', 'registerModel', 'submitLot']);
    expect(push).toHaveBeenCalledWith('/obras/lot-1');
  });

  it('un proyecto propio 3D publico nace privado, se hace publico con su modelo y se cuelga en la sala', async () => {
    created = lot({ status: 'PERSONAL', visibility: 'PRIVATE' });
    const { result } = renderHook(() => useLotSubmission());
    await act(() =>
      result.current.submit({ lot: null, draft: DRAFT, draftChanged: true, destination: 'PERSONAL', visibility: 'PUBLIC', image: IMAGE, model: MODEL, dropModel: false, intent: 'submit' }),
    );
    expect(calls).toEqual([
      'createLot:PUBLIC',
      'signUpload',
      'PUT:imagen',
      'registerImage',
      'signModelUpload',
      'PUT:modelo',
      'registerModel',
      'setLotVisibility:PUBLIC',
      'addToGallery',
    ]);
    expect(calls).not.toContain('submitLot');
    expect(push).toHaveBeenCalledWith('/mis-obras?estado=proyectos');
  });

  it('si falla una subida, el reintento reutiliza la obra ya creada en vez de duplicarla', async () => {
    failImageUpload = true;
    const { result } = renderHook(() => useLotSubmission());
    const request = { lot: null, draft: DRAFT, draftChanged: true, destination: 'CATALOG' as const, visibility: 'PRIVATE' as const, image: IMAGE, model: MODEL, dropModel: false, intent: 'submit' as const };
    await act(() => result.current.submit(request));
    expect(result.current.error).toBe('No se pudo guardar la imagen.');
    expect(result.current.stage).toBe('idle');

    failImageUpload = false;
    calls.length = 0;
    await act(() => result.current.submit(request));
    expect(calls[0]).toBe('updateLot');
    expect(calls).not.toContain('createLot:-');
    expect(calls).toContain('submitLot');
  });

  it('una obra que pasa a plana pierde su modelo y no sube otro', async () => {
    const editing = lot({ representationKind: 'THREE_D' });
    const { result } = renderHook(() => useLotSubmission());
    await act(() =>
      result.current.submit({
        lot: editing,
        draft: { ...DRAFT, representation: 'TWO_D' },
        draftChanged: true,
        destination: 'CATALOG',
        visibility: 'PRIVATE',
        image: null,
        model: MODEL,
        dropModel: true,
        intent: 'save',
      }),
    );
    expect(calls).toEqual(['updateLot', 'removeModel']);
    expect(push).toHaveBeenCalledWith('/mis-obras');
  });
});
