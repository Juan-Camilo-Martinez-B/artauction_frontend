import { fireEvent, screen } from '@testing-library/react';
import { renderWithIntl } from '../intl';
import { describe, expect, it, vi } from 'vitest';
import { hasErrors, validateLogin, validateRegistration } from '@/lib/forms/validators';

const replace = vi.fn();
const push = vi.fn();
vi.mock('next/navigation', () => ({ useRouter: () => ({ replace, push }) }));

const login = vi.fn();
vi.mock('@/lib/api/client', () => ({
  ApiError: class ApiError extends Error {},
  artApi: { login: (...args: unknown[]) => login(...args) as unknown },
}));
vi.mock('@/lib/session/browser-session', () => ({
  browserSession: {
    restore: () => Promise.resolve(),
    current: () => ({ status: 'anonymous', profile: null }),
    establish: () => Promise.resolve(),
  },
}));

const { default: LoginPage } = await import('@/app/(auth)/entrar/page');

describe('validadores de cuenta', () => {
  it('acepta un registro completo', () => {
    expect(hasErrors(validateRegistration({ displayName: 'Nora', email: 'nora@artauction.local', password: 'DevPassword!234' }))).toBe(false);
  });

  it('explica cada campo inválido del registro', () => {
    const errors = validateRegistration({ displayName: 'N', email: 'nora@', password: 'corta' });
    expect(errors).toEqual({ displayName: 'nameLength', email: 'emailInvalid', password: 'passwordShort' });
  });

  it('al entrar no aplica la política de longitud, solo exige contraseña', () => {
    expect(validateLogin({ email: 'leo@artauction.local', password: 'corta' }).password).toBeUndefined();
    expect(validateLogin({ email: 'leo@artauction.local', password: '' }).password).toBe('passwordRequired');
  });
});

describe('página de entrar', () => {
  it('no llama al servidor con el formulario vacío y muestra los errores', () => {
    renderWithIntl(<LoginPage />);
    fireEvent.click(screen.getByRole('button', { name: 'Entrar' }));
    expect(login).not.toHaveBeenCalled();
    expect(screen.getByText('Escribe tu correo.')).toBeInTheDocument();
    expect(screen.getByText('Escribe tu contraseña.')).toBeInTheDocument();
  });

  it('en ingles muestra la pagina y sus errores en ingles', () => {
    renderWithIntl(<LoginPage />, { locale: 'en' });
    fireEvent.click(screen.getByRole('button', { name: 'Sign in' }));
    expect(screen.getByText('Enter your email.')).toBeInTheDocument();
    expect(screen.getByText('Enter your password.')).toBeInTheDocument();
  });

  it('ofrece mostrar la contraseña', () => {
    renderWithIntl(<LoginPage />);
    const password = screen.getByLabelText('Contraseña');
    fireEvent.click(screen.getByRole('button', { name: 'Mostrar contraseña' }));
    expect(password).toHaveAttribute('type', 'text');
  });
});
