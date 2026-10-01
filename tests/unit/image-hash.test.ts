import { describe, expect, it } from 'vitest';
import { dHashFromGray } from '@/workers/image-hash';

describe('hash de imagen', () => {
  it('resume una grilla de 9 por 8 en 16 hexadecimales', () => {
    const pixels = new Uint8Array(9 * 8);
    for (let index = 0; index < pixels.length; index += 1) {
      pixels[index] = index % 9;
    }
    expect(dHashFromGray(pixels, 9)).toMatch(/^[0-9a-f]{16}$/);
  });
});
