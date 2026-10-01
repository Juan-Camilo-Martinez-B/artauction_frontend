'use client';

import { useRef } from 'react';

export interface ProcessedImage {
  blob: Blob;
  hash: string;
  width: number;
  height: number;
}

export function useImageProcessor(): (file: File) => Promise<ProcessedImage> {
  const workerRef = useRef<Worker | null>(null);

  return (file) =>
    new Promise((resolve, reject) => {
      const worker = workerRef.current ?? new Worker(new URL('../workers/image.worker.ts', import.meta.url));
      workerRef.current = worker;
      const requestId = Date.now();
      const onMessage = (event: MessageEvent<{ requestId: number; type: string; buffer?: ArrayBuffer; hash?: string; width?: number; height?: number; message?: string }>) => {
        if (event.data.requestId !== requestId) {
          return;
        }
        worker.removeEventListener('message', onMessage);
        if (event.data.type === 'error' || !event.data.buffer || !event.data.hash) {
          reject(new Error(event.data.message ?? 'No se pudo procesar la imagen'));
          return;
        }
        resolve({
          blob: new Blob([event.data.buffer], { type: 'image/jpeg' }),
          hash: event.data.hash,
          width: event.data.width ?? 0,
          height: event.data.height ?? 0,
        });
      };
      worker.addEventListener('message', onMessage);
      void file.arrayBuffer().then((buffer) => {
        worker.postMessage({ version: 1, type: 'process', requestId, buffer }, [buffer]);
      });
    });
}
