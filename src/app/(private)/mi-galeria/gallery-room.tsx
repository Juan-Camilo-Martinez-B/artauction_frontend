'use client';

import { Canvas } from '@react-three/fiber';
import { OrbitControls } from '@react-three/drei';
import type { GalleryConfig, PersonalGallery } from '@/lib/api/types';

const EMPTY: GalleryConfig = {
  schemaVersion: 1,
  source: 'manual',
  identity: { styleName: 'Sin personalizar', summary: '', artStyles: [] },
  architecture: { spaceType: 'MINIMAL', roomWidth: 12, roomDepth: 10, roomHeight: 4, zones: 1 },
  palette: { wall: '#efe8dc', floor: '#cbbba6', ceiling: '#f6f1e8', accent: '#7a2e24', pedestal: '#d8c3a5' },
  materials: { wall: 'plaster', floor: 'wood', sculptureSupport: 'pedestal' },
  lighting: { ambientIntensity: 0.45, colorTemperature: 4000, spotIntensity: 0.4, mood: 'serenidad' },
  navigation: { tour: 'libre', approach: 'ficha', motion: 'default' },
};

export function GalleryRoom({
  gallery,
  draft,
}: {
  gallery: PersonalGallery;
  draft: GalleryConfig | null;
}) {
  const config = draft ?? gallery.appliedConfig ?? EMPTY;
  const reduced = config.navigation.motion === 'reduced';
  return (
    <div className="h-[70vh] overflow-hidden rounded-xl border border-line bg-black">
      <Canvas camera={{ position: [0, 1.6, config.architecture.roomDepth / 2 - 0.8], fov: 55 }}>
        <color attach="background" args={[config.palette.ceiling]} />
        <ambientLight intensity={config.lighting.ambientIntensity} color={temperatureColor(config.lighting.colorTemperature)} />
        <spotLight
          position={[0, config.architecture.roomHeight - 0.3, 0]}
          intensity={config.lighting.spotIntensity}
          angle={0.9}
          penumbra={0.5}
          color={temperatureColor(config.lighting.colorTemperature)}
        />
        <Room config={config} />
        {gallery.artworks.map((artwork) => (
          <ArtworkMesh key={artwork.id} artwork={artwork} accent={config.palette.accent} pedestal={config.palette.pedestal} />
        ))}
        <OrbitControls
          enablePan={!reduced}
          enableZoom
          autoRotate={config.navigation.motion === 'slow'}
          autoRotateSpeed={0.4}
          maxPolarAngle={Math.PI / 2.05}
          target={[0, 1.4, 0]}
        />
      </Canvas>
    </div>
  );
}

function Room({ config }: { config: GalleryConfig }) {
  const { roomWidth: width, roomDepth: depth, roomHeight: height } = config.architecture;
  return (
    <group>
      <mesh rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <planeGeometry args={[width, depth]} />
        <meshStandardMaterial color={config.palette.floor} roughness={0.9} />
      </mesh>
      <mesh position={[0, height / 2, -depth / 2]}>
        <planeGeometry args={[width, height]} />
        <meshStandardMaterial color={config.palette.wall} roughness={0.95} />
      </mesh>
      <mesh position={[-width / 2, height / 2, 0]} rotation={[0, Math.PI / 2, 0]}>
        <planeGeometry args={[depth, height]} />
        <meshStandardMaterial color={config.palette.wall} roughness={0.95} />
      </mesh>
      <mesh position={[width / 2, height / 2, 0]} rotation={[0, -Math.PI / 2, 0]}>
        <planeGeometry args={[depth, height]} />
        <meshStandardMaterial color={config.palette.wall} roughness={0.95} />
      </mesh>
      <mesh position={[0, height - 0.01, 0]} rotation={[Math.PI / 2, 0, 0]}>
        <planeGeometry args={[width, depth]} />
        <meshStandardMaterial color={config.palette.ceiling} />
      </mesh>
    </group>
  );
}

function ArtworkMesh({
  artwork,
  accent,
  pedestal,
}: {
  artwork: PersonalGallery['artworks'][number];
  accent: string;
  pedestal: string;
}) {
  const threeD = artwork.support !== 'WALL';
  const width = Number(artwork.lot.widthCm ?? 60) / 80;
  const height = Number(artwork.lot.heightCm ?? 80) / 80;
  if (threeD) {
    return (
      <group position={[artwork.posX, 0, artwork.posZ]} rotation={[0, artwork.rotY, 0]} scale={artwork.scale}>
        <mesh position={[0, 0.45, 0]}>
          <boxGeometry args={[0.7, 0.9, 0.7]} />
          <meshStandardMaterial color={pedestal} />
        </mesh>
        <mesh position={[0, 1.15, 0]}>
          <boxGeometry args={[0.35, 0.45, 0.35]} />
          <meshStandardMaterial color={accent} />
        </mesh>
      </group>
    );
  }
  return (
    <mesh position={[artwork.posX, artwork.posY, artwork.posZ]} scale={artwork.scale}>
      <planeGeometry args={[Math.max(width, 0.4), Math.max(height, 0.5)]} />
      <meshStandardMaterial color={accent} />
    </mesh>
  );
}

function temperatureColor(kelvin: number): string {
  if (kelvin < 3200) {
    return '#ffd2a8';
  }
  if (kelvin > 5200) {
    return '#f4f7ff';
  }
  return '#fff1dc';
}
