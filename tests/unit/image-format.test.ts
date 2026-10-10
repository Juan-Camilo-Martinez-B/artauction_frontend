import { describe, expect, it } from 'vitest';
import { ImageFormat } from '../../src/lib/artwork/image-format';

describe('formato de la imagen', () => {
  it('reconoce una marina horizontal', () => {
    const format = new ImageFormat(1600, 900);
    expect(format.orientation()).toBe('landscape');
    expect(format.label()).toBe('Formato horizontal');
  });

  it('reconoce un retrato vertical', () => {
    expect(new ImageFormat(800, 1200).orientation()).toBe('portrait');
  });

  it('trata como cuadrada una imagen casi igual de ancha que de alta', () => {
    expect(new ImageFormat(1000, 980).orientation()).toBe('square');
  });
});
