'use client';

import type { ThreeEvent } from '@react-three/fiber';
import { Suspense, useEffect, useMemo, useRef } from 'react';
import type { Object3D, SpotLight } from 'three';
import { pedestalHeight } from '@/lib/gallery/layout';
import { PLASTER } from '@/lib/gallery/materials';
import { CLICK_TOLERANCE_PX, type ArtworkViewProps } from './framed-artwork';
import { GlbObject } from './glb-object';
import { LABEL_ASPECT, labelTexture } from './label-texture';
import { SceneBoundary } from './scene-boundary';
import { SurfaceMaterialView } from './surface-material';

/**
 * Objeto 3D expuesto con su modelo real (GLB), al aire y a escala: el alto
 * declarado manda. Una pieza grande, como una estatua de tamano natural, va
 * sobre un zocalo bajo; una pequena, sobre un pedestal que la acerca a la
 * vista. La sala es virtual: no hay vitrinas. Sin modelo la obra no llega aqui
 * (ver `canExhibit`).
 */
export function Sculpture(props: ArtworkViewProps & { pedestalColor: string }) {
  const { id, lot, placement, size, onSelect, pedestalColor } = props;
  const modelUrl = lot.model?.url ?? null;
  const baseHeight = pedestalHeight(size.height);
  const footprint = Math.max(0.45, Math.max(size.width, size.depth) + 0.3);

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
        {modelUrl ? (
          <group position={[0, baseHeight, 0]}>
            {/* Si el modelo no carga, queda el pedestal con su cartela. */}
            <SceneBoundary fallback={null}>
              <Suspense fallback={null}>
                <GlbObject url={modelUrl} height={size.height} maxWidth={footprint - 0.12} />
              </Suspense>
            </SceneBoundary>
          </group>
        ) : null}
        {props.selected ? (
          <mesh position={[0, 0.005, 0]} rotation={[-Math.PI / 2, 0, 0]}>
            <ringGeometry args={[footprint * 0.75, footprint * 0.75 + 0.05, 48]} />
            <meshBasicMaterial color="#c0543f" toneMapped={false} />
          </mesh>
        ) : null}
      </group>
      <PedestalLabel lot={lot} unattributed={props.unattributed} footprint={footprint} baseHeight={baseHeight} />
      {props.lit ? <ObjectLight top={baseHeight + size.height} {...props} /> : null}
    </group>
  );
}

function PedestalLabel({ lot, unattributed, footprint, baseHeight }: { lot: ArtworkViewProps['lot']; unattributed: string; footprint: number; baseHeight: number }) {
  const texture = useMemo(() => labelTexture(lot, unattributed), [lot, unattributed]);
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
