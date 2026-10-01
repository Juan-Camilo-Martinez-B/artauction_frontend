export function dHashFromGray(pixels: Uint8Array, width: number): string {
  const height = Math.floor(pixels.length / width);
  let bits = '';
  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width - 1; x += 1) {
      const left = pixels[y * width + x] ?? 0;
      const right = pixels[y * width + x + 1] ?? 0;
      bits += left < right ? '1' : '0';
    }
  }
  if (!bits) {
    return '0'.repeat(16);
  }
  return BigInt(`0b${bits}`).toString(16).padStart(16, '0');
}
