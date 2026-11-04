import { fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const createLot = vi.fn();

vi.mock('next/navigation', () => ({ useRouter: () => ({ push: vi.fn() }) }));
vi.mock('@/hooks/use-image-processor', () => ({ useImageProcessor: () => vi.fn() }));
vi.mock('@/lib/session/browser-session', () => ({ browserSession: { accessToken: () => Promise.resolve('token') } }));
vi.mock('@/lib/api/client', () => ({
  ApiError: class extends Error {},
  artApi: {
    categories: () => Promise.resolve([{ slug: 'escultura', name: 'Escultura' }]),
    createLot,
  },
}));

const { LotForm } = await import('@/app/(private)/publicar/lot-form');

function fill(label: string, value: string) {
  fireEvent.change(screen.getByLabelText(label), { target: { value } });
}

describe('formulario de publicación', () => {
  beforeEach(() => {
    createLot.mockReset();
  });

  it('una obra tridimensional pide su modelo 3D y no se guarda sin él', async () => {
    render(<LotForm canSell />);
    await screen.findByRole('option', { name: 'Escultura' });
    fill('Título', 'Estatua de pie');
    fill('Descripción', 'Figura de tamaño natural en mármol.');
    fill('Materiales', 'Mármol');
    fill('Formato', 'THREE_D');
    fill('Ancho (cm)', '55');
    fill('Alto (cm)', '170');
    fill('Profundidad (cm)', '30');

    // El panel del modelo aparece solo en obras tridimensionales.
    expect(screen.getByRole('heading', { name: 'Modelo 3D' })).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Enviar a auditoría' }));

    expect(await screen.findByText('Sube el modelo 3D de la obra.')).toBeInTheDocument();
    expect(createLot).not.toHaveBeenCalled();
  });

  it('una obra plana no muestra el panel del modelo ni lo pide', async () => {
    render(<LotForm canSell />);
    await screen.findByRole('option', { name: 'Escultura' });
    expect(screen.queryByRole('heading', { name: 'Modelo 3D' })).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Enviar a auditoría' }));
    expect(await screen.findByText('Elige la imagen de la obra.')).toBeInTheDocument();
    expect(screen.queryByText('Sube el modelo 3D de la obra.')).not.toBeInTheDocument();
  });
});
