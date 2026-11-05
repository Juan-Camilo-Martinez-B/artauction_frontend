export type ImageOrientation = 'portrait' | 'landscape' | 'square';

export class ImageFormat {
  constructor(
    readonly width: number,
    readonly height: number,
  ) {}

  ratio(): number {
    if (this.height <= 0) {
      return 1;
    }
    return this.width / this.height;
  }

  orientation(): ImageOrientation {
    const ratio = this.ratio();
    if (ratio >= 1.15) {
      return 'landscape';
    }
    if (ratio <= 0.87) {
      return 'portrait';
    }
    return 'square';
  }

}
