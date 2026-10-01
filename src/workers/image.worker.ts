/// <reference lib="webworker" />
import { dHashFromGray } from './image-hash';

interface ImageRequest {
  version: 1;
  type: 'process';
  requestId: number;
  buffer: ArrayBuffer;
}

interface ImageResult {
  version: 1;
  type: 'processed';
  requestId: number;
  buffer: ArrayBuffer;
  hash: string;
  width: number;
  height: number;
}

const scope = self as unknown as DedicatedWorkerGlobalScope;
const MAX_EDGE = 1600;

scope.onmessage = (event: MessageEvent<unknown>) => {
  const message = readRequest(event.data);
  if (!message) {
    return;
  }
  void processImage(message)
    .then((result) => {
      scope.postMessage(result, [result.buffer]);
    })
    .catch((error: unknown) => {
      const text = error instanceof Error ? error.message : 'No se pudo procesar la imagen';
      scope.postMessage({ version: 1, type: 'error', requestId: message.requestId, message: text });
    });
};

async function processImage(message: ImageRequest): Promise<ImageResult> {
  const bitmap = await createImageBitmap(new Blob([message.buffer]));
  const scale = Math.min(1, MAX_EDGE / Math.max(bitmap.width, bitmap.height));
  const width = Math.max(1, Math.round(bitmap.width * scale));
  const height = Math.max(1, Math.round(bitmap.height * scale));
  const canvas = new OffscreenCanvas(width, height);
  const context = canvas.getContext('2d');
  if (!context) {
    throw new Error('OffscreenCanvas no está disponible');
  }
  context.drawImage(bitmap, 0, 0, width, height);
  const blob = await canvas.convertToBlob({ type: 'image/jpeg', quality: 0.82 });
  const hash = hashBitmap(bitmap);
  bitmap.close();
  const buffer = await blob.arrayBuffer();
  return { version: 1, type: 'processed', requestId: message.requestId, buffer, hash, width, height };
}

function hashBitmap(bitmap: ImageBitmap): string {
  const canvas = new OffscreenCanvas(9, 8);
  const context = canvas.getContext('2d', { willReadFrequently: true });
  if (!context) {
    return '0'.repeat(16);
  }
  context.drawImage(bitmap, 0, 0, 9, 8);
  const pixels = context.getImageData(0, 0, 9, 8).data;
  const gray = new Uint8Array(9 * 8);
  for (let index = 0; index < gray.length; index += 1) {
    const offset = index * 4;
    const red = pixels[offset] ?? 0;
    const green = pixels[offset + 1] ?? 0;
    const blue = pixels[offset + 2] ?? 0;
    gray[index] = Math.round(red * 0.3 + green * 0.59 + blue * 0.11);
  }
  return dHashFromGray(gray, 9);
}

function readRequest(value: unknown): ImageRequest | null {
  if (typeof value !== 'object' || value === null) {
    return null;
  }
  if (!('version' in value) || value.version !== 1 || !('type' in value) || value.type !== 'process') {
    return null;
  }
  if (!('requestId' in value) || typeof value.requestId !== 'number' || !('buffer' in value)) {
    return null;
  }
  if (!(value.buffer instanceof ArrayBuffer)) {
    return null;
  }
  return { version: 1, type: 'process', requestId: value.requestId, buffer: value.buffer };
}
