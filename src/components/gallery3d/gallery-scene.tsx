'use client';

import { Environment, Lightformer, OrbitControls } from '@react-three/drei';
import { Canvas, useThree } from '@react-three/fiber';
import { Suspense, useEffect, useMemo, type RefObject } from 'react';
import { ACESFilmicToneMapping } from 'three';
import type { GalleryConfig, Lot } from '@/lib/api/types';
import { artworkSize, isObjectLot, type ArtworkSize, type Placement, type Room as RoomSize } from '@/lib/gallery/layout';
import { kelvinToHex } from '@/lib/gallery/materials';
import { FramedArtwork } from './framed-artwork';
import { Room } from './room';
import { pedestalHeight, Sculpture } from './sculpture';
import { TourControls, type MoveIntent, type Obstacle, type Viewpoint } from './tour-controls';

/** Focos por tipo de pieza: cada foco encarece el render, asi que se limitan. */
const MAX_WALL_LIGHTS = 8;
const MAX_OBJECT_LIGHTS = 4;

export interface SceneArtwork {
  id: string;
  lot: Lot;
  placement: Placement;
}

export type SceneMode = 'tour' | 'edit';

export function roomOf(config: GalleryConfig): RoomSize {
  return { width: config.architecture.roomWidth, depth: config.architecture.roomDepth, height: config.architecture.roomHeight };
}

export function GalleryScene({
  config,
  artworks,
  mode,
  selectedId,
  onSelect,
  focus,
  onLeaveFocus,
  intent,
  reducedMotion,
}: {
  config: GalleryConfig;
  artworks: readonly SceneArtwork[];
  mode: SceneMode;
  selectedId: string | null;
  onSelect: (id: string | null) => void;
  focus: Viewpoint | null;
  onLeaveFocus: () => void;
  intent: RefObject<MoveIntent>;
  reducedMotion: boolean;
}) {
  const room = roomOf(config);
  const lightColor = kelvinToHex(config.lighting.colorTemperature);
  // spotIntensity va de 0 a ~1.2 en la configuracion; en candelas, un foco de galeria ronda 20-60.
  const spot = 18 + config.lighting.spotIntensity * 40;
  const sized = useMemo(
    () => artworks.map((artwork) => ({ ...artwork, size: artworkSize(artwork.lot), object: isObjectLot(artwork.lot) })),
    [artworks],
  );
  const obstacles = useMemo<Obstacle[]>(
    () =>
      sized
        .filter((item) => item.object)
        .map((item) => ({ x: item.placement.posX, z: item.placement.posZ, radius: footprintRadius(item.size, item.placement.scale) })),
    [sized],
  );

  let wallLights = 0;
  let objectLights = 0;

  return (
    <Canvas
      dpr={[1, 1.75]}
      gl={{ antialias: true, toneMapping: ACESFilmicToneMapping }}
      camera={{ fov: 60, near: 0.05, far: 80, position: [0, room.height * 0.85, room.depth * 0.6] }}
      onPointerMissed={() => { onSelect(null); }}
    >
      <color attach="background" args={[config.palette.ceiling]} />
      <ambientLight intensity={config.lighting.ambientIntensity * 2} color={lightColor} />
      {/* La luz que rebota desde abajo toma el tono de la pared: con el del suelo, el techo se veia marron. */}
      <hemisphereLight args={[lightColor, config.palette.wall, 0.8]} />
      <Environment resolution={128} frames={1} environmentIntensity={0.9}>
        {/* Paneles de luz del techo y ventanales difusos: dan reflejos creibles al marmol, al vidrio y al dorado. */}
        <Lightformer form="rect" intensity={2.2} color={lightColor} position={[0, 5, 0]} rotation-x={Math.PI / 2} scale={[10, 6, 1]} />
        <Lightformer form="rect" intensity={0.8} color="#ffffff" position={[-6, 2, 0]} rotation-y={Math.PI / 2} scale={[8, 3, 1]} />
        <Lightformer form="rect" intensity={0.8} color="#ffffff" position={[6, 2, 0]} rotation-y={-Math.PI / 2} scale={[8, 3, 1]} />
        <Lightformer form="rect" intensity={0.5} color={config.palette.wall} position={[0, 2, 6]} rotation-y={Math.PI} scale={[8, 3, 1]} />
      </Environment>
      <Suspense fallback={null}>
        <Room config={config} room={room} />
        {sized.map((item) => {
          const common = {
            id: item.id,
            lot: item.lot,
            placement: item.placement,
            size: item.size,
            roomHeight: room.height,
            selected: item.id === selectedId,
            lightColor,
            lightIntensity: spot,
            onSelect: (id: string) => { onSelect(id); },
          };
          if (item.object) {
            objectLights += 1;
            return (
              <Sculpture
                key={item.id}
                {...common}
                lit={objectLights <= MAX_OBJECT_LIGHTS}
                pedestalColor={config.palette.pedestal}
                support={config.materials.sculptureSupport}
              />
            );
          }
          wallLights += 1;
          return <FramedArtwork key={item.id} {...common} lit={wallLights <= MAX_WALL_LIGHTS} />;
        })}
      </Suspense>
      {mode === 'tour' ? (
        <TourControls room={room} obstacles={obstacles} focus={focus} onLeaveFocus={onLeaveFocus} intent={intent} reducedMotion={reducedMotion} />
      ) : (
        <>
          <EditView room={room} />
          <OrbitControls
            makeDefault
            target={[0, 1.2, 0]}
            maxPolarAngle={Math.PI / 2.1}
            minDistance={2}
            maxDistance={Math.max(room.width, room.depth) * 1.1}
            enableDamping={!reducedMotion}
          />
        </>
      )}
    </Canvas>
  );
}

/** Al entrar al modo edicion, la camara se eleva sobre la entrada para ver toda la sala. */
function EditView({ room }: { room: RoomSize }) {
  const camera = useThree((state) => state.camera);
  useEffect(() => {
    camera.position.set(0, Math.min(room.height - 0.4, 3.4), room.depth / 2 - 0.6);
  }, [camera, room.height, room.depth]);
  return null;
}

export function footprintRadius(size: ArtworkSize, scale: number): number {
  return (Math.max(0.45, Math.max(size.width, size.depth) + 0.3) * scale) / Math.SQRT2 + 0.05;
}

/** Altura total de un objeto sobre el suelo, con su pedestal. */
export function objectTop(size: ArtworkSize, scale: number): number {
  return (pedestalHeight(size.height) + size.height) * scale;
}
