'use client';

import { useGLTF } from '@react-three/drei';
import { useMemo } from 'react';
import { Box3, Mesh, type Object3D } from 'three';
import { DRACO_DECODER_PATH, fitModel } from '@/lib/gallery/model-fit';

/**
 * Modelo GLB de la obra, escalado sin deformarse a la altura que ocupa y
 * apoyado en y = 0, centrado. Suspende mientras carga; si falla, lanza el
 * error para que un SceneBoundary muestre la alternativa.
 */
export function GlbObject({ url, height, maxWidth }: { url: string; height: number; maxWidth?: number }) {
  const { scene } = useGLTF(url, DRACO_DECODER_PATH);
  // useGLTF guarda la escena en cache: se clona para poder colocarla en varios sitios.
  const object = useMemo<Object3D>(() => {
    const copy = scene.clone(true);
    copy.traverse((child) => {
      if (child instanceof Mesh) {
        child.castShadow = true;
        child.receiveShadow = true;
      }
    });
    return copy;
  }, [scene]);
  const fit = useMemo(() => {
    const box = new Box3().setFromObject(object);
    return fitModel({ min: box.min.toArray(), max: box.max.toArray() }, height, maxWidth);
  }, [object, height, maxWidth]);
  return (
    <group position={fit.offset} scale={fit.scale}>
      <primitive object={object} />
    </group>
  );
}
