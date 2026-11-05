import { LoadingManager, Mesh, MeshLambertMaterial, MeshPhongMaterial, MeshStandardMaterial, Texture, type BufferAttribute, type BufferGeometry, type Material, type Object3D } from 'three';
import { DRACOLoader } from 'three/examples/jsm/loaders/DRACOLoader.js';
import { FBXLoader } from 'three/examples/jsm/loaders/FBXLoader.js';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { MTLLoader } from 'three/examples/jsm/loaders/MTLLoader.js';
import { OBJLoader } from 'three/examples/jsm/loaders/OBJLoader.js';
import { GLTFExporter } from 'three/examples/jsm/exporters/GLTFExporter.js';
import { DRACO_DECODER_PATH } from './model-fit';
import { checkTriangles, companionKey, isGlbHeader, isUnreadableTexture, MODEL_LIMITS, pickModelFile, type ModelFormat, type ModelProblem } from './model-files';

/** Lo maximo que se espera a que terminen de cargar las texturas. */
const TEXTURE_WAIT_MS = 30_000;

export interface ImportedModel {
  /** El modelo en GLB, listo para subir. */
  file: File;
  triangles: number;
  /** Formato que eligio el vendedor (el subido siempre es GLB). */
  source: ModelFormat;
  /** Texturas elegidas que el navegador no lee y quedaron fuera del modelo. */
  skipped: string[];
}

/** Error con un mensaje para mostrar tal cual en el formulario. */
/** El modelo no sirve: `problem` dice por que y la interfaz lo pone en palabras. */
export class ModelImportError extends Error {
  constructor(readonly problem: ModelProblem) {
    super(problem.kind);
  }
}

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
  if ('kind' in picked) {
    throw new ModelImportError(picked);
  }
  const main = files[picked.main];
  if (!main) {
    throw new ModelImportError({ kind: 'choose' });
  }
  if (picked.format === 'glb' && !isGlbHeader(new Uint8Array(await main.slice(0, 4).arrayBuffer()))) {
    throw new ModelImportError({ kind: 'badGlb' });
  }

  // Cada archivo elegido se sirve desde memoria. Se carga por su nombre y cada
  // referencia (buffer, material, textura) se resuelve por nombre de archivo,
  // sin importar la carpeta que traiga dentro del modelo.
  const urls = new Map(files.map((file) => [companionKey(file.name), URL.createObjectURL(file)]));
  const manager = new LoadingManager();
  // Una textura ilegible falla al instante, sin pedirla a la red.
  manager.setURLModifier((reference) =>
    reference.startsWith('data:') ? reference : isUnreadableTexture(reference) ? 'data:,' : (urls.get(companionKey(reference)) ?? reference),
  );
  // FBX y OBJ devuelven la escena antes de cargar sus texturas: hay que esperarlas para exportarlas.
  const settled = new Promise<void>((resolve) => {
    manager.onLoad = () => { resolve(); };
    setTimeout(resolve, TEXTURE_WAIT_MS);
  });
  const skipped = files.filter((file) => isUnreadableTexture(file.name)).map((file) => file.name);
  const mainUrl = companionKey(main.name);
  const draco = new DRACOLoader(manager).setDecoderPath(DRACO_DECODER_PATH);

  try {
    const scene = await load(picked.format, mainUrl, files, manager, draco);
    await settled;
    dropBrokenTextures(scene);
    toStandardMaterials(scene);
    const triangles = countTriangles(scene);
    const problem = checkTriangles(triangles);
    if (problem) {
      throw new ModelImportError(problem);
    }
    if (picked.format === 'glb') {
      return { file: main, triangles, source: 'glb', skipped };
    }
    const exported = await new GLTFExporter().parseAsync(scene, { binary: true, maxTextureSize: 2048, onlyVisible: true });
    if (!(exported instanceof ArrayBuffer)) {
      throw new ModelImportError({ kind: 'convertFailed' });
    }
    if (exported.byteLength > MODEL_LIMITS.maxBytes) {
      throw new ModelImportError({ kind: 'convertedTooLarge' });
    }
    const name = `${main.name.replace(/\.[^.]+$/, '')}.glb`;
    return { file: new File([exported], name, { type: 'model/gltf-binary' }), triangles, source: picked.format, skipped };
  } catch (error) {
    if (error instanceof ModelImportError) {
      throw error;
    }
    throw new ModelImportError({ kind: 'openFailed', format: picked.format });
  } finally {
    draco.dispose();
    for (const url of urls.values()) {
      URL.revokeObjectURL(url);
    }
  }
}

/**
 * Quita de los materiales las texturas que no cargaron (archivo ausente o
 * ilegible): sin imagen, la pieza se veria negra y el exportador las descarta.
 */
function dropBrokenTextures(root: Object3D): void {
  root.traverse((child) => {
    if (!(child instanceof Mesh)) {
      return;
    }
    const materials = (Array.isArray(child.material) ? child.material : [child.material]) as Material[];
    for (const material of materials) {
      const slots = material as unknown as Record<string, unknown>;
      for (const [key, value] of Object.entries(slots)) {
        if (value instanceof Texture && !hasImage(value)) {
          slots[key] = null;
          material.needsUpdate = true;
        }
      }
    }
  });
}

/**
 * Rugosidad equivalente a un brillo Phong: brillo 0 es mate (1) y 100 o mas,
 * casi pulido (0,2). Es una aproximacion visual, no una conversion fisica.
 */
export function roughnessFromShininess(shininess: number): number {
  const clamped = Math.min(100, Math.max(0, shininess));
  return 1 - 0.8 * Math.sqrt(clamped / 100);
}

/**
 * FBX y OBJ traen materiales Phong o Lambert. GLTFExporter los guarda como
 * totalmente mates (rugosidad 1) y la pieza pierde su brillo: se pasan a
 * MeshStandardMaterial conservando color, texturas y transparencia, sin metal.
 */
function toStandardMaterials(root: Object3D): void {
  const convert = (material: Material): Material => {
    if (!(material instanceof MeshPhongMaterial) && !(material instanceof MeshLambertMaterial)) {
      return material;
    }
    const standard = new MeshStandardMaterial({
      name: material.name,
      color: material.color,
      map: material.map,
      emissive: material.emissive,
      emissiveMap: material.emissiveMap,
      emissiveIntensity: material.emissiveIntensity,
      normalMap: material instanceof MeshPhongMaterial ? material.normalMap : null,
      aoMap: material.aoMap,
      alphaMap: material.alphaMap,
      transparent: material.transparent,
      opacity: material.opacity,
      side: material.side,
      roughness: material instanceof MeshPhongMaterial ? roughnessFromShininess(material.shininess) : 0.9,
      metalness: 0,
    });
    material.dispose();
    return standard;
  };
  root.traverse((child) => {
    if (child instanceof Mesh) {
      const mesh = child as Mesh;
      mesh.material = Array.isArray(mesh.material) ? mesh.material.map(convert) : convert(mesh.material);
    }
  });
}

function hasImage(texture: { image: unknown }): boolean {
  const image = texture.image as { width?: number; data?: unknown } | null | undefined;
  return Boolean(image && ((image.width ?? 0) > 0 || image.data));
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
