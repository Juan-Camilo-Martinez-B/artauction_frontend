'use client';

import { useTexture } from '@react-three/drei';
import type { ThreeEvent } from '@react-three/fiber';
import { Suspense, useEffect, useMemo, useRef } from 'react';
import { SRGBColorSpace, type Object3D, type SpotLight, type Texture } from 'three';
import type { Lot } from '@/lib/api/types';
import { fitFrameToSize, frameStyle, type FrameStyle } from '@/lib/gallery/frames';
import { textureSource } from '@/lib/gallery/image-source';
import type { ArtworkSize, Placement } from '@/lib/gallery/layout';
import { LABEL_ASPECT, labelTexture } from './label-texture';
import { SceneBoundary } from './scene-boundary';

/** Un clic que arrastro mas de esto fue para mirar alrededor, no para elegir. */
export const CLICK_TOLERANCE_PX = 6;

const LABEL_WIDTH = 0.24;
/** Altura del centro de la cartela sobre el suelo. */
const LABEL_HEIGHT = 1.3;

export interface ArtworkViewProps {
  id: string;
  lot: Lot;
  placement: Placement;
  size: ArtworkSize;
  roomHeight: number;
  selected: boolean;
  lit: boolean;
  lightColor: string;
  lightIntensity: number;
  /** Texto de la cartela sin artista: el idioma se resuelve fuera del Canvas. */
  unattributed: string;
  onSelect: (id: string) => void;
}

/** Obra mural enmarcada, con su foco y su cartela. */
export function FramedArtwork(props: ArtworkViewProps) {
  const { id, lot, placement, size, onSelect } = props;
  const style = useMemo(() => fitFrameToSize(frameStyle(lot), size), [lot, size]);
  const source = textureSource(lot.images?.[0]?.url);

  function onClick(event: ThreeEvent<MouseEvent>) {
    event.stopPropagation();
    if (event.delta <= CLICK_TOLERANCE_PX) {
      onSelect(id);
    }
  }

  return (
    <group position={[placement.posX, placement.posY, placement.posZ]} rotation={[0, placement.rotY, 0]} scale={placement.scale}>
      <group onClick={onClick} onPointerOver={() => { document.body.style.cursor = 'pointer'; }} onPointerOut={() => { document.body.style.cursor = ''; }}>
        <Frame style={style} size={size} selected={props.selected} />
        <SceneBoundary fallback={<Canvas size={size} texture={null} />}>
          <Suspense fallback={<Canvas size={size} texture={null} />}>
            {source ? <LoadedCanvas url={source} size={size} /> : <Canvas size={size} texture={null} />}
          </Suspense>
        </SceneBoundary>
        {style.glass ? <Glass size={size} style={style} /> : null}
      </group>
      <Label lot={lot} unattributed={props.unattributed} x={(size.width + 2 * (style.width + style.mat)) / 2 + 0.22} y={LABEL_HEIGHT - placement.posY} scale={placement.scale} />
      {props.lit ? <ArtworkLight {...props} /> : null}
    </group>
  );
}

function LoadedCanvas({ url, size }: { url: string; size: ArtworkSize }) {
  const texture = useTexture(url);
  useEffect(() => {
    texture.colorSpace = SRGBColorSpace;
    texture.anisotropy = 8;
    texture.needsUpdate = true;
  }, [texture]);
  return <Canvas size={size} texture={texture} />;
}

/** La obra en si: un plano con la imagen, o un lienzo neutro si no hay imagen. */
function Canvas({ size, texture }: { size: ArtworkSize; texture: Texture | null }) {
  return (
    <mesh position={[0, 0, 0.004]}>
      <planeGeometry args={[size.width, size.height]} />
      {texture ? (
        <meshStandardMaterial map={texture} roughness={0.85} metalness={0} />
      ) : (
        <meshStandardMaterial color="#d9d0c1" roughness={0.9} />
      )}
    </mesh>
  );
}

/** Moldura de cuatro piezas, con paspartu si corresponde y un realce al seleccionar. */
function Frame({ style, size, selected }: { style: FrameStyle; size: ArtworkSize; selected: boolean }) {
  const innerW = size.width + 2 * style.mat;
  const innerH = size.height + 2 * style.mat;
  const outerW = innerW + 2 * style.width;
  const outerH = innerH + 2 * style.width;
  const z = style.depth / 2 - 0.02;
  const pieces: Array<{ position: [number, number, number]; args: [number, number, number] }> = [
    { position: [0, (innerH + style.width) / 2, z], args: [outerW, style.width, style.depth] },
    { position: [0, -(innerH + style.width) / 2, z], args: [outerW, style.width, style.depth] },
    { position: [-(innerW + style.width) / 2, 0, z], args: [style.width, innerH, style.depth] },
    { position: [(innerW + style.width) / 2, 0, z], args: [style.width, innerH, style.depth] },
  ];
  return (
    <group>
      {pieces.map((piece, index) => (
        <mesh key={index} position={piece.position} castShadow>
          <boxGeometry args={piece.args} />
          <meshStandardMaterial color={style.color} metalness={style.metalness} roughness={style.roughness} envMapIntensity={1.2} />
        </mesh>
      ))}
      {style.kind === 'gilded' ? <GildedLip innerW={innerW} innerH={innerH} /> : null}
      {/* Fondo: paspartu blanco, o la trasera oscura del bastidor. */}
      <mesh position={[0, 0, 0]}>
        <planeGeometry args={[innerW, innerH]} />
        <meshStandardMaterial color={style.mat > 0 ? '#f7f4ec' : '#2a241e'} roughness={0.95} />
      </mesh>
      {selected ? (
        <mesh position={[0, 0, -0.01]}>
          <planeGeometry args={[outerW + 0.08, outerH + 0.08]} />
          <meshBasicMaterial color="#c0543f" toneMapped={false} />
        </mesh>
      ) : null}
    </group>
  );
}

/** Filete interior de las molduras doradas: da el escalon de un marco clasico. */
function GildedLip({ innerW, innerH }: { innerW: number; innerH: number }) {
  const lip = 0.018;
  const pieces: Array<{ position: [number, number, number]; args: [number, number, number] }> = [
    { position: [0, (innerH - lip) / 2, 0.012], args: [innerW, lip, 0.02] },
    { position: [0, -(innerH - lip) / 2, 0.012], args: [innerW, lip, 0.02] },
    { position: [-(innerW - lip) / 2, 0, 0.012], args: [lip, innerH, 0.02] },
    { position: [(innerW - lip) / 2, 0, 0.012], args: [lip, innerH, 0.02] },
  ];
  return (
    <group>
      {pieces.map((piece, index) => (
        <mesh key={index} position={piece.position}>
          <boxGeometry args={piece.args} />
          <meshStandardMaterial color="#8a6a2c" metalness={0.8} roughness={0.4} />
        </mesh>
      ))}
    </group>
  );
}

/** Vidrio de las obras sobre papel: casi invisible, solo refleja la sala. */
function Glass({ size, style }: { size: ArtworkSize; style: FrameStyle }) {
  return (
    <mesh position={[0, 0, Math.max(0.012, style.depth / 2 - 0.01)]}>
      <planeGeometry args={[size.width + 2 * style.mat, size.height + 2 * style.mat]} />
      <meshPhysicalMaterial transparent opacity={0.12} roughness={0.04} metalness={0} clearcoat={1} envMapIntensity={1.5} depthWrite={false} />
    </mesh>
  );
}

function Label({ lot, unattributed, x, y, scale }: { lot: Lot; unattributed: string; x: number; y: number; scale: number }) {
  const texture = useMemo(() => labelTexture(lot, unattributed), [lot, unattributed]);
  useEffect(() => () => texture?.dispose(), [texture]);
  if (!texture) {
    return null;
  }
  // La cartela no se escala con la obra: se compensa la escala del grupo.
  return (
    <mesh position={[x, y / scale, 0.006]} scale={1 / scale}>
      <planeGeometry args={[LABEL_WIDTH, LABEL_WIDTH / LABEL_ASPECT]} />
      <meshStandardMaterial map={texture} roughness={0.8} />
    </mesh>
  );
}

/** Foco de techo dirigido a la obra, como el de un riel de galeria. */
function ArtworkLight({ size, roomHeight, placement, lightColor, lightIntensity }: ArtworkViewProps) {
  const light = useRef<SpotLight>(null);
  const target = useRef<Object3D>(null);
  useEffect(() => {
    if (light.current && target.current) {
      light.current.target = target.current;
    }
  }, []);
  const reach = Math.max(size.width, size.height) * placement.scale;
  const lightY = roomHeight - 0.15 - placement.posY;
  const distance = 1.8;
  // Abre el cono lo justo para bañar la obra y un margen de pared.
  const angle = Math.min(0.9, Math.atan((reach * 0.75 + 0.3) / Math.hypot(lightY, distance)));
  return (
    <group scale={1 / placement.scale}>
      <spotLight
        ref={light}
        position={[0, lightY, distance]}
        angle={angle}
        penumbra={0.55}
        intensity={lightIntensity}
        distance={9}
        decay={2}
        color={lightColor}
      />
      <object3D ref={target} position={[0, 0, 0]} />
    </group>
  );
}
