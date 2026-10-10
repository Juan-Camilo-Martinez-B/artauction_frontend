import { describe, expect, it } from 'vitest';
import { PersonName } from '../../src/lib/account/person-name';

describe('nombre de la cuenta', () => {
  it('toma la inicial del nombre y del apellido', () => {
    expect(new PersonName('Leo Postor').initials()).toBe('LP');
  });

  it('usa un signo cuando el nombre está vacío', () => {
    expect(new PersonName('   ').initials()).toBe('?');
  });
});
