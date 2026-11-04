import { LoadingManager, Mesh, type BufferAttribute, type BufferGeometry, type Object3D } from 'three';
import { DRACOLoader } from 'three/examples/jsm/loaders/DRACOLoader.js';
import { FBXLoader } from 'three/examples/jsm/loaders/FBXLoader.js';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { MTLLoader } from 'three/examples/jsm/loaders/MTLLoader.js';
import { OBJLoader } from 'three/examples/jsm/loaders/OBJLoader.js';
import { GLTFExporter } from 'three/examples/jsm/exporters/GLTFExporter.js';
import { DRACO_DECODER_PATH } from './model-fit';
import { checkTriangles, companionKey, isGlbHeader, MODEL_LIMITS, pickModelFile, type ModelFormat } from './model-files';

export interface ImportedModel {
  /** El modelo en GLB, listo para subir. */
  file: File;
  triangles: number;
  /** Formato que eligio el vendedor (el subido siempre es GLB). */
  source: ModelFormat;
}

/** Error con un mensaje para mostrar tal cual en el formulario. */
export class ModelImportError extends Error {}

/** Triangulos de todas las mallas de una escena, como los cuenta el catalogo. */
export function countTriangles(root: Object3D): number {
  let triangles = 0;
  root.traverse((child) => {
    if (child instanceof Mesh) {
      const geometry = child.geometry as BufferGeometry;
      const index = geometry.getIndex();
      const positions = geometry.getAttribute('position') as BufferAttribute | undefined;
      triangles += Math.floor((index ? index.count : (positions?.count ?? 0)) / 3);
    }
  });
  return triangles;
}

/**
 * Convierte lo que eligio el vendedor en un GLB. Un .glb se sube tal cual; un
 * .gltf, .fbx u .obj se abre aqui con sus archivos acompanantes (materiales,
 * buffers, texturas) y se exporta a GLB, el unico formato que guarda el
 * catalogo. Antes de subir se revisan los triangulos con los mismos limites
 * del servidor, que de todas formas lo vuelve a validar.
 */
export async function importModel(files: readonly File[]): Promise<ImportedModel> {
  const picked = pickModelFile(files);
  if (typeof picked === 'string') {
    throw new ModelImportError(picked);
  }
  const main = files[picked.main];
  if (!main) {
    throw new ModelImportError('Elige el modelo.');
  }
  if (picked.format === 'glb' && !isGlbHeader(new Uint8Array(await main.slice(0, 4).arrayBuffer()))) {
    throw new ModelImportError('El archivo no es un GLB válido: le falta la cabecera glTF.');
  }

  // Cada archivo elegido se sirve desde memoria. Se carga por su nombre y cada
  // referencia (buffer, material, textura) se resuelve por nombre de archivo,
  // sin importar la carpeta que traiga dentro del modelo.
  const urls = new Map(files.map((file) => [companionKey(file.name), URL.createObjectURL(file)]));
  const manager = new LoadingManager();
  manager.setURLModifier((reference) => (reference.startsWith('data:') ? reference : (urls.get(companionKey(reference)) ?? reference)));
  const mainUrl = companionKey(main.name);
  const draco = new DRACOLoader(manager).setDecoderPath(DRACO_DECODER_PATH);

  try {
    const scene = await load(picked.format, mainUrl, files, manager, draco);
    const triangles = countTriangles(scene);
    const problem = checkTriangles(triangles);
    if (problem) {
      throw new ModelImportError(problem);
    }
    if (picked.format === 'glb') {
      return { file: main, triangles, source: 'glb' };
    }
    const exported = await new GLTFExporter().parseAsync(scene, { binary: true, maxTextureSize: 2048, onlyVisible: true });
    if (!(exported instanceof ArrayBuffer)) {
      throw new ModelImportError('No se pudo convertir el modelo a GLB.');
    }
    if (exported.byteLength > MODEL_LIMITS.maxBytes) {
      throw new ModelImportError('Convertido a GLB, el modelo supera los 30 MB. Redúcelo con Decimate en Blender o usa texturas más pequeñas.');
    }
    const name = `${main.name.replace(/\.[^.]+$/, '')}.glb`;
    return { file: new File([exported], name, { type: 'model/gltf-binary' }), triangles, source: picked.format };
  } catch (error) {
    if (error instanceof ModelImportError) {
      throw error;
    }
    throw new ModelImportError(`No se pudo abrir el modelo .${picked.format}. Revisa que estén todos sus archivos (materiales y texturas) o expórtalo como .glb.`);
  } finally {
    draco.dispose();
    for (const url of urls.values()) {
      URL.revokeObjectURL(url);
    }
  }
}

async function load(format: ModelFormat, url: string, files: readonly File[], manager: LoadingManager, draco: DRACOLoader): Promise<Object3D> {
  switch (format) {
    case 'glb':
    case 'gltf': {
      const loader = new GLTFLoader(manager).setDRACOLoader(draco);
      return (await loader.loadAsync(url)).scene;
    }
    case 'fbx':
      return new FBXLoader(manager).loadAsync(url);
    case 'obj': {
      const loader = new OBJLoader(manager);
      const mtl = files.find((file) => /\.mtl$/i.test(file.name));
      if (mtl) {
        const materials = await new MTLLoader(manager).loadAsync(companionKey(mtl.name));
        materials.preload();
        loader.setMaterials(materials);
      }
      return loader.loadAsync(url);
    }
  }
}
