import { fireEvent, render, screen } from '@testing-library/react';
import { useState } from 'react';
import { describe, expect, it } from 'vitest';
import { PasswordField, TextAreaField, TextField } from '@/components/ui/text-field';
import { defaultSanitizeMode, sanitizeInput, transformWithCaret } from '@/lib/forms/sanitize';

describe('saneamiento de campos', () => {
  it('quita los espacios iniciales en texto libre pero respeta los internos', () => {
    expect(sanitizeInput('   Leo Vásquez ', 'text')).toBe('Leo Vásquez ');
    expect(sanitizeInput('\t\nObra', 'text')).toBe('Obra');
  });

  it('no admite ningún espacio en modo compacto', () => {
    expect(sanitizeInput(' leo @artauction .local ', 'compact')).toBe('leo@artauction.local');
  });

  it('elige el modo según el tipo de input', () => {
    expect(defaultSanitizeMode('email')).toBe('compact');
    expect(defaultSanitizeMode('password')).toBe('compact');
    expect(defaultSanitizeMode('url')).toBe('compact');
    expect(defaultSanitizeMode('text')).toBe('text');
    expect(defaultSanitizeMode(undefined)).toBe('text');
  });

  it('mantiene el cursor en su sitio al quitar un espacio intermedio', () => {
    // "ab| cd" con el cursor despues del espacio tecleado en la posicion 3.
    expect(transformWithCaret('ab cd', 3, (value) => sanitizeInput(value, 'compact'))).toEqual({ value: 'abcd', caret: 2 });
  });
});

function Controlled({ type, initial = '' }: { type?: string; initial?: string }) {
  const [value, setValue] = useState(initial);
  return <TextField id="campo" label="Campo" type={type} value={value} onValueChange={setValue} />;
}

describe('TextField', () => {
  it('no deja empezar un nombre por espacio', () => {
    render(<Controlled />);
    const input = screen.getByLabelText<HTMLInputElement>('Campo');
    fireEvent.change(input, { target: { value: '  Nora' } });
    expect(input.value).toBe('Nora');
  });

  it('no deja espacios en el correo', () => {
    render(<Controlled type="email" />);
    const input = screen.getByLabelText<HTMLInputElement>('Campo');
    fireEvent.change(input, { target: { value: ' nora @artauction.local' } });
    expect(input.value).toBe('nora@artauction.local');
  });

  it('enlaza el error con el campo para lectores de pantalla', () => {
    render(<TextField id="x" label="Correo" value="" onValueChange={() => undefined} error="Escribe tu correo." />);
    const input = screen.getByLabelText('Correo');
    expect(input).toHaveAttribute('aria-invalid', 'true');
    expect(input).toHaveAccessibleDescription('Escribe tu correo.');
  });
});

describe('TextAreaField', () => {
  it('no deja empezar la descripción por espacio', () => {
    function Area() {
      const [value, setValue] = useState('');
      return <TextAreaField id="d" label="Descripción" value={value} onValueChange={setValue} />;
    }
    render(<Area />);
    const area = screen.getByLabelText<HTMLTextAreaElement>('Descripción');
    fireEvent.change(area, { target: { value: '\n Óleo sobre lienzo' } });
    expect(area.value).toBe('Óleo sobre lienzo');
  });
});

describe('PasswordField', () => {
  function Password() {
    const [value, setValue] = useState('');
    return <PasswordField id="password" label="Contraseña" value={value} onValueChange={setValue} />;
  }

  it('oculta la contraseña y permite mostrarla y volver a ocultarla', () => {
    render(<Password />);
    const input = screen.getByLabelText('Contraseña');
    expect(input).toHaveAttribute('type', 'password');

    fireEvent.click(screen.getByRole('button', { name: 'Mostrar contraseña' }));
    expect(input).toHaveAttribute('type', 'text');
    expect(screen.getByRole('button', { name: 'Ocultar contraseña' })).toHaveAttribute('aria-pressed', 'true');

    fireEvent.click(screen.getByRole('button', { name: 'Ocultar contraseña' }));
    expect(input).toHaveAttribute('type', 'password');
  });

  it('sigue sin admitir espacios cuando está visible', () => {
    render(<Password />);
    fireEvent.click(screen.getByRole('button', { name: 'Mostrar contraseña' }));
    const input = screen.getByLabelText<HTMLInputElement>('Contraseña');
    fireEvent.change(input, { target: { value: ' Dev Password!234' } });
    expect(input.value).toBe('DevPassword!234');
  });
});
