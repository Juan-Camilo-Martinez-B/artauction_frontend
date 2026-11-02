'use client';

import { useTexture } from '@react-three/drei';
import { useMemo } from 'react';
import { RepeatWrapping, SRGBColorSpace, Vector2, type Texture } from 'three';
import { textureUrls, tintColor, type SurfaceMaterial } from '@/lib/gallery/materials';

/**
 * Material PBR de una superficie de `width` x `height` metros. Las texturas se
 * cargan una vez (cache de useTexture) y cada superficie usa copias con su
 * propia repeticion, para que la veta y las baldosas queden a escala real.
 */
export function SurfaceMaterialView({
  material,
  color,
  width,
  height,
  glow = 0,
}: {
  material: SurfaceMaterial;
  color: string;
  width: number;
  height: number;
  /** Brillo propio (0 a 1) para simular luz rebotada, por ejemplo en el techo. */
  glow?: number;
}) {
  const urls = textureUrls(material);
  const loaded = useTexture(urls);
  const maps = useMemo(() => {
    const repeat = new Vector2(width / material.tileMeters, height / material.tileMeters);
    const prepare = (texture: Texture, srgb: boolean) => {
      const copy = texture.clone();
      copy.wrapS = RepeatWrapping;
      copy.wrapT = RepeatWrapping;
      copy.repeat.copy(repeat);
      copy.anisotropy = 8;
      if (srgb) {
        copy.colorSpace = SRGBColorSpace;
      }
      copy.needsUpdate = true;
      return copy;
    };
    return {
      map: prepare(loaded.map, true),
      normalMap: prepare(loaded.normalMap, false),
      roughnessMap: prepare(loaded.roughnessMap, false),
    };
  }, [loaded, width, height, material.tileMeters]);

  return (
    <meshStandardMaterial
      map={material.colorMap ? maps.map : null}
      normalMap={maps.normalMap}
      normalScale={new Vector2(material.normalScale, material.normalScale)}
      roughnessMap={maps.roughnessMap}
      roughness={material.roughness}
      metalness={material.metalness}
      color={tintColor(color, material.tint)}
      envMapIntensity={0.6}
      emissive={color}
      emissiveIntensity={glow}
    />
  );
}
