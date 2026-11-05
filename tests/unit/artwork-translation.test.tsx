import { fireEvent, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { ArtworkExhibit } from '@/app/(public)/obras/[id]/artwork-exhibit';
import type { Lot } from '@/lib/api/types';
import { renderWithIntl } from '../intl';

const BASE: Lot = {
  id: 'l1',
  sellerId: 's1',
  title: 'Gothic statue',
  description: 'Figure wrapped in a cloak.',
  artistName: null,
  creationYear: null,
  materials: 'Stone',
  status: 'PUBLICADA',
  visibility: 'PUBLIC',
  authenticityScore: 80,
  suggestedPriceMin: '100',
  suggestedPriceMax: '200',
  currency: 'USD',
};

const TRANSLATED: Lot = {
  ...BASE,
  sourceLocale: 'es',
  translated: true,
  original: { title: 'Estatua gótica', description: 'Figura envuelta en un manto.', materials: 'Piedra', provenance: null },
};

describe('estructura de una obra con modelo 3D', () => {
  const MODEL_LOT: Lot = {
    ...BASE,
    representationKind: 'THREE_D',
    images: [{ url: 'https://media.example/foto.jpg' }] as Lot['images'],
    model: { url: 'https://media.example/modelo.glb', triangleCount: 5000 } as Lot['model'],
  };

  it('mantiene las dos columnas al entrar y al alternar entre el modelo y la foto', () => {
    const { container } = renderWithIntl(<ArtworkExhibit lot={MODEL_LOT} />);
    const layout = () => container.querySelector('article')?.className;
    const initial = layout();
    expect(initial).toContain('lg:grid-cols');

    fireEvent.click(screen.getByRole('button', { name: 'Foto' }));
    const photo = screen.getByRole('img', { name: MODEL_LOT.title });
    // Una foto apaisada tampoco cambia la estructura.
    Object.defineProperty(photo, 'naturalWidth', { value: 1600 });
    Object.defineProperty(photo, 'naturalHeight', { value: 900 });
    fireEvent.load(photo);
    expect(layout()).toBe(initial);

    fireEvent.click(screen.getByRole('button', { name: 'Modelo 3D' }));
    expect(layout()).toBe(initial);
  });
});

describe('ficha traducida automaticamente', () => {
  it('avisa de la traduccion y alterna con el original en el mismo lugar', () => {
    renderWithIntl(<ArtworkExhibit lot={TRANSLATED} />, { locale: 'en' });
    expect(screen.getByRole('heading', { level: 1, name: 'Gothic statue' })).toBeInTheDocument();
    expect(screen.getByText(/Automatically translated/)).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Show original' }));
    expect(screen.getByRole('heading', { level: 1, name: 'Estatua gótica' })).toBeInTheDocument();
    expect(screen.getByText('Figura envuelta en un manto.')).toBeInTheDocument();
    expect(screen.getByText('Piedra')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Show translation' }));
    expect(screen.getByRole('heading', { level: 1, name: 'Gothic statue' })).toBeInTheDocument();
  });

  it('una ficha en su idioma original no muestra el aviso', () => {
    renderWithIntl(<ArtworkExhibit lot={BASE} />, { locale: 'en' });
    expect(screen.queryByText(/Automatically translated/)).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Show original' })).not.toBeInTheDocument();
  });

  it('con la ficha traducida no repite la descripcion de venta en el idioma del autor', () => {
    const auction = { id: 'a1', status: 'ACTIVA', currentPrice: '100', endsAt: '2030-01-01T00:00:00Z', saleDescription: 'Estatua gótica. Texto de venta.' };
    renderWithIntl(<ArtworkExhibit lot={{ ...TRANSLATED, auction }} />, { locale: 'en' });
    expect(screen.queryByText('Estatua gótica. Texto de venta.')).not.toBeInTheDocument();
  });
});
