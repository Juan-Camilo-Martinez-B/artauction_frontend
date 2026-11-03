'use client';

import type { GalleryConfig } from '@/lib/api/types';
import type { Room as RoomSize } from '@/lib/gallery/layout';
import { floorMaterial, PLASTER, shade, wallMaterial } from '@/lib/gallery/materials';
import { SurfaceMaterialView } from './surface-material';

const BASEBOARD_HEIGHT = 0.1;

/** Sala cerrada: suelo, techo, cuatro paredes con zocalo y rieles de luz en el techo. */
export function Room({ config, room }: { config: GalleryConfig; room: RoomSize }) {
  const { width, depth, height } = room;
  const wall = wallMaterial(config.materials.wall);
  const walls: Array<{ key: string; position: [number, number, number]; rotation: number; length: number }> = [
    { key: 'back', position: [0, height / 2, -depth / 2], rotation: 0, length: width },
    { key: 'front', position: [0, height / 2, depth / 2], rotation: Math.PI, length: width },
    { key: 'left', position: [-width / 2, height / 2, 0], rotation: Math.PI / 2, length: depth },
    { key: 'right', position: [width / 2, height / 2, 0], rotation: -Math.PI / 2, length: depth },
  ];

  return (
    <group>
      <mesh rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <planeGeometry args={[width, depth]} />
        <SurfaceMaterialView material={floorMaterial(config.materials.floor)} color={config.palette.floor} width={width} height={depth} />
      </mesh>
      <mesh position={[0, height, 0]} rotation={[Math.PI / 2, 0, 0]}>
        <planeGeometry args={[width, depth]} />
        <SurfaceMaterialView material={PLASTER} color={config.palette.ceiling} width={width} height={depth} glow={0.35} />
      </mesh>
      {walls.map((item) => (
        <group key={item.key} position={item.position} rotation={[0, item.rotation, 0]}>
          <mesh receiveShadow>
            <planeGeometry args={[item.length, height]} />
            <SurfaceMaterialView material={wall} color={config.palette.wall} width={item.length} height={height} />
          </mesh>
          <mesh position={[0, -height / 2 + BASEBOARD_HEIGHT / 2, 0.012]}>
            <boxGeometry args={[item.length, BASEBOARD_HEIGHT, 0.024]} />
            <meshStandardMaterial color={shade(config.palette.wall, 0.18)} roughness={0.6} />
          </mesh>
        </group>
      ))}
      <CeilingTracks room={room} color={shade(config.palette.ceiling, 0.25)} />
    </group>
  );
}

/** Rieles de luz paralelos al fondo, como los de una galeria. */
function CeilingTracks({ room, color }: { room: RoomSize; color: string }) {
  const count = Math.max(2, Math.round(room.depth / 3.2));
  const spacing = room.depth / (count + 1);
  return (
    <group>
      {Array.from({ length: count }, (_, index) => (
        <mesh key={index} position={[0, room.height - 0.03, -room.depth / 2 + spacing * (index + 1)]}>
          <boxGeometry args={[room.width - 1.2, 0.025, 0.05]} />
          <meshStandardMaterial color={color} roughness={0.5} metalness={0.3} />
        </mesh>
      ))}
    </group>
  );
}
