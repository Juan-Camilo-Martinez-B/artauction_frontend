'use client';

import { CanvasTexture, SRGBColorSpace } from 'three';
import type { Lot } from '@/lib/api/types';

/** Proporcion de la cartela (ancho / alto), igual en el canvas y en el plano 3D. */
export const LABEL_ASPECT = 1.6;
const WIDTH = 640;
const HEIGHT = WIDTH / LABEL_ASPECT;
const PADDING = 44;

function fontFamily(variable: string, fallback: string): string {
  if (typeof document === 'undefined') {
    return fallback;
  }
  const value = getComputedStyle(document.body).getPropertyValue(variable).trim();
  return value ? `${value}, ${fallback}` : fallback;
}

/** Corta un texto en lineas que quepan en `maxWidth`, con un maximo de lineas. */
function wrap(context: CanvasRenderingContext2D, text: string, maxWidth: number, maxLines: number): string[] {
  const words = text.split(/\s+/).filter(Boolean);
  const lines: string[] = [];
  let line = '';
  for (const word of words) {
    const candidate = line ? `${line} ${word}` : word;
    if (context.measureText(candidate).width <= maxWidth || !line) {
      line = candidate;
    } else {
      lines.push(line);
      line = word;
    }
  }
  if (line) {
    lines.push(line);
  }
  if (lines.length > maxLines) {
    const kept = lines.slice(0, maxLines);
    kept[maxLines - 1] = `${(kept[maxLines - 1] ?? '').replace(/\s+\S*$/, '')}…`;
    return kept;
  }
  return lines;
}

/** Cartela de museo: titulo, autoria y fecha, y materiales. */
export function labelTexture(lot: Pick<Lot, 'title' | 'artistName' | 'creationYear' | 'materials'>): CanvasTexture | null {
  if (typeof document === 'undefined') {
    return null;
  }
  const canvas = document.createElement('canvas');
  canvas.width = WIDTH;
  canvas.height = HEIGHT;
  const context = canvas.getContext('2d');
  if (!context) {
    return null;
  }
  const serif = fontFamily('--font-serif', 'Georgia, serif');
  const sans = fontFamily('--font-sans', 'Helvetica, Arial, sans-serif');
  context.fillStyle = '#fbf8f1';
  context.fillRect(0, 0, WIDTH, HEIGHT);
  context.fillStyle = '#1b1814';
  context.textBaseline = 'top';

  let y = PADDING;
  context.font = `italic 40px ${serif}`;
  for (const line of wrap(context, lot.title, WIDTH - PADDING * 2, 2)) {
    context.fillText(line, PADDING, y);
    y += 48;
  }
  y += 12;
  context.font = `28px ${sans}`;
  const author = lot.artistName ?? 'Artista sin atribuir';
  const byline = lot.creationYear ? `${author}, ${String(lot.creationYear)}` : author;
  for (const line of wrap(context, byline, WIDTH - PADDING * 2, 2)) {
    context.fillText(line, PADDING, y);
    y += 36;
  }
  y += 8;
  context.fillStyle = '#5e584e';
  context.font = `24px ${sans}`;
  for (const line of wrap(context, lot.materials, WIDTH - PADDING * 2, 2)) {
    context.fillText(line, PADDING, y);
    y += 30;
  }

  const texture = new CanvasTexture(canvas);
  texture.colorSpace = SRGBColorSpace;
  texture.anisotropy = 8;
  return texture;
}
