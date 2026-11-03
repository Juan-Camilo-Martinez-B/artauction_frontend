/// <reference lib="webworker" />
import { analyzeSilhouette, isLatheCandidate, latheProfile, objectMask } from './silhouette-logic';

// Analiza la foto de un objeto fuera del hilo principal: mascara del fondo,
// silueta, simetria y un recorte con transparencia para usar como textura.

interface AnalyzeRequest {
  version: 1;
  type: 'analyze';
  requestId: number;
  url: string;
}

export interface SilhouetteResult {
  version: 1;
  type: 'analyzed';
  requestId: number;
  kind: 'lathe' | 'cutout';
  /** Perfil normalizado [radio, altura] si se puede tornear. */
  profile: Array<[number, number]> | null;
  /** Ancho / alto del objeto dentro de la foto. */
  aspect: number;
  asymmetry: number;
  /** Recorte del objeto con fondo transparente, ya invertido para texture.flipY = false. */
  bitmap: ImageBitmap;
}

const scope = self as unknown as DedicatedWorkerGlobalScope;
const ANALYSIS_EDGE = 256;
const TEXTURE_EDGE = 1024;

scope.onmessage = (event: MessageEvent<unknown>) => {
  const request = readRequest(event.data);
  if (!request) {
    return;
  }
  void analyze(request)
    .then((result) => {
      scope.postMessage(result, [result.bitmap]);
    })
    .catch((error: unknown) => {
      const message = error instanceof Error ? error.message : 'No se pudo analizar la imagen';
      scope.postMessage({ version: 1, type: 'error', requestId: request.requestId, message });
    });
};

function context2d(canvas: OffscreenCanvas): OffscreenCanvasRenderingContext2D {
  const context = canvas.getContext('2d', { willReadFrequently: true });
  if (!context) {
    throw new Error('OffscreenCanvas no está disponible');
  }
  return context;
}

async function analyze(request: AnalyzeRequest): Promise<SilhouetteResult> {
  const response = await fetch(request.url);
  if (!response.ok) {
    throw new Error(`La imagen respondió ${String(response.status)}`);
  }
  const source = await createImageBitmap(await response.blob());

  // 1. Analisis a baja resolucion: rapido y suficiente para la silueta.
  const scale = Math.min(1, ANALYSIS_EDGE / Math.max(source.width, source.height));
  const width = Math.max(8, Math.round(source.width * scale));
  const height = Math.max(8, Math.round(source.height * scale));
  const small = new OffscreenCanvas(width, height);
  const smallContext = context2d(small);
  smallContext.drawImage(source, 0, 0, width, height);
  const pixels = smallContext.getImageData(0, 0, width, height);
  const mask = objectMask({ width, height, data: pixels.data });
  const analysis = analyzeSilhouette(mask, width, height);
  if (!analysis) {
    throw new Error('No se encontró el objeto en la foto');
  }
  const { bounds } = analysis;
  const boxWidth = bounds.right - bounds.left + 1;
  const boxHeight = bounds.bottom - bounds.top + 1;

  // 2. Mascara como imagen con alfa, recortada al objeto.
  const maskCanvas = new OffscreenCanvas(boxWidth, boxHeight);
  const maskContext = context2d(maskCanvas);
  const maskPixels = maskContext.createImageData(boxWidth, boxHeight);
  for (let y = 0; y < boxHeight; y += 1) {
    for (let x = 0; x < boxWidth; x += 1) {
      const inside = mask[(bounds.top + y) * width + bounds.left + x] === 1;
      maskPixels.data[(y * boxWidth + x) * 4 + 3] = inside ? 255 : 0;
    }
  }
  maskContext.putImageData(maskPixels, 0, 0);

  // 3. Recorte a buena resolucion: la foto original enmascarada (bordes suavizados al escalar).
  const sourceScale = 1 / scale;
  const cropX = bounds.left * sourceScale;
  const cropY = bounds.top * sourceScale;
  const cropW = boxWidth * sourceScale;
  const cropH = boxHeight * sourceScale;
  const outScale = Math.min(1, TEXTURE_EDGE / Math.max(cropW, cropH));
  const outW = Math.max(1, Math.round(cropW * outScale));
  const outH = Math.max(1, Math.round(cropH * outScale));
  const cutout = new OffscreenCanvas(outW, outH);
  const cutoutContext = context2d(cutout);
  // Invertida en vertical: la textura se usa con flipY = false (ImageBitmap no lo respeta).
  cutoutContext.translate(0, outH);
  cutoutContext.scale(1, -1);
  cutoutContext.drawImage(source, cropX, cropY, cropW, cropH, 0, 0, outW, outH);
  cutoutContext.globalCompositeOperation = 'destination-in';
  cutoutContext.imageSmoothingQuality = 'high';
  cutoutContext.drawImage(maskCanvas, 0, 0, outW, outH);
  source.close();

  const lathe = isLatheCandidate(analysis);
  return {
    version: 1,
    type: 'analyzed',
    requestId: request.requestId,
    kind: lathe ? 'lathe' : 'cutout',
    profile: lathe ? latheProfile(analysis) : null,
    aspect: boxWidth / boxHeight,
    asymmetry: analysis.asymmetry,
    bitmap: cutout.transferToImageBitmap(),
  };
}

function readRequest(data: unknown): AnalyzeRequest | null {
  if (typeof data !== 'object' || data === null) {
    return null;
  }
  const candidate = data as Partial<AnalyzeRequest>;
  if (candidate.version !== 1 || candidate.type !== 'analyze' || typeof candidate.requestId !== 'number' || typeof candidate.url !== 'string') {
    return null;
  }
  return candidate as AnalyzeRequest;
}
