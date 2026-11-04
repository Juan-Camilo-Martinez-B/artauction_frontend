'use client';

import { Billboard, useTexture } from '@react-three/drei';
import type { ThreeEvent } from '@react-three/fiber';
import { Suspense, useEffect, useMemo, useRef, useState } from 'react';
import { DoubleSide, Float32BufferAttribute, LatheGeometry, SRGBColorSpace, Texture, Vector2, type Object3D, type SpotLight } from 'three';
import { textureSource } from '@/lib/gallery/image-source';
import { pedestalHeight } from '@/lib/gallery/layout';
import { PLASTER } from '@/lib/gallery/materials';
import { objectModelProvider, type ObjectModel } from '@/lib/gallery/object-models';
import { CLICK_TOLERANCE_PX, type ArtworkViewProps } from './framed-artwork';
import { GlbObject } from './glb-object';
import { LABEL_ASPECT, labelTexture } from './label-texture';
import { SceneBoundary } from './scene-boundary';
import { SurfaceMaterialView } from './surface-material';

type ModelState = { status: 'loading' } | { status: 'ready'; model: ObjectModel };

/** Acabado segun el material declarado: brillo de esmalte, bronce, piedra o madera. */
function surfaceFinish(materials: string): { roughness: number; metalness: number } {
  if (/(bronce|bronze|oro|gold|plata|silver|cobre|copper|metal|lat[oó]n|brass)/i.test(materials)) {
    return { roughness: 0.38, metalness: 0.65 };
  }
  if (/(porcelana|porcelain|cer[aá]mica|ceramic|esmalt|glaze|loza|faience|vidrio|glass)/i.test(materials)) {
    return { roughness: 0.22, metalness: 0 };
  }
  if (/(m[aá]rmol|marble|piedra|stone|alabast)/i.test(materials)) {
    return { roughness: 0.45, metalness: 0 };
  }
  return { roughness: 0.6, metalness: 0 };
}

function useObjectModel(url: string | null): ModelState {
  const [state, setState] = useState<ModelState>({ status: 'loading' });
  useEffect(() => {
    if (!url) {
      setState({ status: 'ready', model: { kind: 'photo' } });
      return;
    }
    let active = true;
    void objectModelProvider()
      .resolve(url)
      .then((model) => {
        if (active) {
          setState({ status: 'ready', model });
        }
      });
    return () => {
      active = false;
    };
  }, [url]);
  return state;
}

/**
 * Objeto 3D sobre su pedestal. Si la obra trae modelo 3D (GLB) se expone ese
 * modelo; si no, y la silueta de la foto es simetrica, se tornea un solido de
 * revolucion; si tampoco, la pieza recortada va en una vitrina.
 */
export function Sculpture(props: ArtworkViewProps & { pedestalColor: string; support: string }) {
  const { id, lot, placement, size, onSelect, pedestalColor } = props;
  const source = textureSource(lot.images?.[0]?.url);
  const glbUrl = lot.model?.url ?? null;
  // Con modelo 3D no hace falta analizar la foto.
  const state = useObjectModel(glbUrl ? null : source);
  const baseHeight = pedestalHeight(size.height);
  const footprint = Math.max(0.45, Math.max(size.width, size.depth) + 0.3);
  const model = glbUrl ? null : state.status === 'ready' ? state.model : null;
  const inVitrine = glbUrl ? props.support === 'vitrine' : model !== null && (model.kind !== 'lathe' || props.support === 'vitrine');
  const photoFallback = source ? (
    <SceneBoundary fallback={null}>
      <Suspense fallback={null}>
        <PhotoStand url={source} height={size.height} />
      </Suspense>
    </SceneBoundary>
  ) : null;

  function onClick(event: ThreeEvent<MouseEvent>) {
    event.stopPropagation();
    if (event.delta <= CLICK_TOLERANCE_PX) {
      onSelect(id);
    }
  }

  return (
    <group position={[placement.posX, 0, placement.posZ]} rotation={[0, placement.rotY, 0]} scale={placement.scale}>
      <group onClick={onClick} onPointerOver={() => { document.body.style.cursor = 'pointer'; }} onPointerOut={() => { document.body.style.cursor = ''; }}>
        <mesh position={[0, baseHeight / 2, 0]} castShadow receiveShadow>
          <boxGeometry args={[footprint, baseHeight, footprint]} />
          <SurfaceMaterialView material={PLASTER} color={pedestalColor} width={footprint} height={baseHeight} />
        </mesh>
        <group position={[0, baseHeight, 0]}>
          {model?.kind === 'lathe' ? <LatheObject model={model} width={size.width} height={size.height} materials={lot.materials} /> : null}
          {model?.kind === 'cutout' ? <Cutout image={model.image} aspect={model.aspect} height={size.height} /> : null}
          {glbUrl ? (
            // Si el modelo no carga, la foto ocupa su lugar.
            <SceneBoundary fallback={photoFallback}>
              <Suspense fallback={null}>
                <GlbObject url={glbUrl} height={size.height} maxWidth={footprint - 0.12} />
              </Suspense>
            </SceneBoundary>
          ) : null}
          {model?.kind === 'photo' ? photoFallback : null}
          {inVitrine ? <Vitrine width={footprint - 0.08} height={size.height + 0.18} /> : null}
        </group>
        {props.selected ? (
          <mesh position={[0, 0.005, 0]} rotation={[-Math.PI / 2, 0, 0]}>
            <ringGeometry args={[footprint * 0.75, footprint * 0.75 + 0.05, 48]} />
            <meshBasicMaterial color="#c0543f" toneMapped={false} />
          </mesh>
        ) : null}
      </group>
      <PedestalLabel lot={lot} footprint={footprint} baseHeight={baseHeight} />
      {props.lit ? <ObjectLight top={baseHeight + size.height} {...props} /> : null}
    </group>
  );
}

/** Solido de revolucion con la foto proyectada de frente (y reflejada atras). */
function LatheObject({ model, width, height, materials }: { model: Extract<ObjectModel, { kind: 'lathe' }>; width: number; height: number; materials: string }) {
  // Sin ancho declarado, la proporcion de la foto manda.
  const objectWidth = width > 0 ? width : height * model.aspect;
  const geometry = useMemo(() => {
    const radius = objectWidth / 2;
    const points = model.profile.map(([r, y]) => new Vector2(Math.max(0.0005, r * radius), y * height));
    const lathe = new LatheGeometry(points, 72);
    const positions = lathe.getAttribute('position');
    const uv = new Float32Array(positions.count * 2);
    for (let index = 0; index < positions.count; index += 1) {
      // Proyeccion frontal: u por la x de la pieza, v por la altura. Se encoge un poco para no tomar el borde transparente.
      uv[index * 2] = 0.5 + 0.47 * (positions.getX(index) / radius);
      uv[index * 2 + 1] = Math.min(0.995, Math.max(0.005, positions.getY(index) / height));
    }
    lathe.setAttribute('uv', new Float32BufferAttribute(uv, 2));
    lathe.computeVertexNormals();
    return lathe;
  }, [model.profile, objectWidth, height]);
  const texture = useBitmapTexture(model.image);
  useEffect(() => () => { geometry.dispose(); }, [geometry]);
  const finish = surfaceFinish(materials);
  return (
    <mesh geometry={geometry} castShadow>
      <meshStandardMaterial map={texture} roughness={finish.roughness} metalness={finish.metalness} envMapIntensity={1.1} />
    </mesh>
  );
}

/** La pieza recortada de su foto, siempre de frente a quien mira (gira solo en vertical). */
function Cutout({ image, aspect, height }: { image: ImageBitmap; aspect: number; height: number }) {
  const texture = useBitmapTexture(image);
  const width = height * aspect;
  return (
    <Billboard lockX lockZ position={[0, height / 2, 0]}>
      <mesh>
        <planeGeometry args={[width, height]} />
        <meshStandardMaterial map={texture} transparent alphaTest={0.4} side={DoubleSide} roughness={0.7} />
      </mesh>
    </Billboard>
  );
}

/** Si no se pudo analizar la foto, se expone tal cual dentro de la vitrina. */
function PhotoStand({ url, height }: { url: string; height: number }) {
  const texture = useTexture(url);
  useEffect(() => {
    texture.colorSpace = SRGBColorSpace;
    texture.needsUpdate = true;
  }, [texture]);
  const image = texture.image as { width?: number; height?: number } | undefined;
  const aspect = image?.width && image.height ? image.width / image.height : 0.8;
  return (
    <Billboard lockX lockZ position={[0, height / 2, 0]}>
      <mesh>
        <planeGeometry args={[height * aspect, height]} />
        <meshStandardMaterial map={texture} side={DoubleSide} roughness={0.8} />
      </mesh>
    </Billboard>
  );
}

function useBitmapTexture(image: ImageBitmap): Texture {
  const texture = useMemo(() => {
    const created = new Texture(image);
    // El worker ya invirtio la imagen: ImageBitmap ignora flipY.
    created.flipY = false;
    created.colorSpace = SRGBColorSpace;
    created.anisotropy = 8;
    created.needsUpdate = true;
    return created;
  }, [image]);
  useEffect(() => () => { texture.dispose(); }, [texture]);
  return texture;
}

/** Urna de vidrio sobre el pedestal. */
function Vitrine({ width, height }: { width: number; height: number }) {
  return (
    <group>
      <mesh position={[0, height / 2, 0]}>
        <boxGeometry args={[width, height, width]} />
        <meshPhysicalMaterial transparent opacity={0.14} roughness={0.03} metalness={0} clearcoat={1} envMapIntensity={1.6} depthWrite={false} side={DoubleSide} />
      </mesh>
      <mesh position={[0, height + 0.01, 0]}>
        <boxGeometry args={[width + 0.01, 0.02, width + 0.01]} />
        <meshStandardMaterial color="#2a2a2a" metalness={0.6} roughness={0.35} />
      </mesh>
    </group>
  );
}

function PedestalLabel({ lot, footprint, baseHeight }: { lot: ArtworkViewProps['lot']; footprint: number; baseHeight: number }) {
  const texture = useMemo(() => labelTexture(lot), [lot]);
  useEffect(() => () => texture?.dispose(), [texture]);
  if (!texture) {
    return null;
  }
  const width = Math.min(0.22, footprint * 0.7);
  // En un pedestal alto va en su cara frontal; en una tarima baja, en un atril delante.
  const y = baseHeight > 0.4 ? baseHeight - 0.16 : 0.75;
  const z = baseHeight > 0.4 ? footprint / 2 + 0.002 : footprint / 2 + 0.35;
  return (
    <mesh position={[0, y, z]} rotation={[baseHeight > 0.4 ? 0 : -0.5, 0, 0]}>
      <planeGeometry args={[width, width / LABEL_ASPECT]} />
      <meshStandardMaterial map={texture} roughness={0.8} />
    </mesh>
  );
}

function ObjectLight({ top, roomHeight, placement, lightColor, lightIntensity }: ArtworkViewProps & { top: number }) {
  const light = useRef<SpotLight>(null);
  const target = useRef<Object3D>(null);
  useEffect(() => {
    if (light.current && target.current) {
      light.current.target = target.current;
    }
  }, []);
  return (
    <group scale={1 / placement.scale}>
      <spotLight ref={light} position={[0.9, roomHeight - 0.15, 0.9]} angle={0.45} penumbra={0.6} intensity={lightIntensity} distance={10} decay={2} color={lightColor} />
      <object3D ref={target} position={[0, top * 0.75, 0]} />
    </group>
  );
}
