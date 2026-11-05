'use client';

import { ContactShadows, OrbitControls } from '@react-three/drei';
import { Canvas } from '@react-three/fiber';
import { useTranslations } from 'next-intl';
import { Suspense } from 'react';
import { GlbObject } from './glb-object';
import { SceneBoundary } from './scene-boundary';

/** Alto al que se ajusta el modelo dentro del visor (en unidades de la escena). */
const VIEW_HEIGHT = 1;

/**
 * Visor de un modelo GLB: gira solo y se puede orbitar con el mouse o el dedo.
 * Solo usa luces locales (nada de entornos descargados de un CDN). Si el modelo
 * no carga, muestra un aviso en lugar de romper la ficha.
 */
export function ModelViewer({ url, title, className = '' }: { url: string; title: string; className?: string }) {
  const t = useTranslations('Studio.viewer');
  return (
    <SceneBoundary
      fallback={
        <div className={`grid place-items-center px-6 text-center text-sm text-muted ${className}`}>
          {t('loadFailed')}
        </div>
      }
    >
      <div className={`relative ${className}`} role="img" aria-label={t('label', { title })}>
        <Canvas dpr={[1, 2]} camera={{ position: [1.5, 0.95, 1.5], fov: 40, near: 0.01, far: 50 }}>
          <color attach="background" args={['#efe7da']} />
          <hemisphereLight args={['#fff8ee', '#b9a58c', 0.9]} />
          <directionalLight position={[2.5, 3.5, 2]} intensity={1.6} />
          <directionalLight position={[-2, 1.5, -1.5]} intensity={0.5} />
          {/* La sombra de contacto basta: sin mapa de sombras no hay acne en la pieza. */}
          <Suspense fallback={null}>
            <GlbObject url={url} height={VIEW_HEIGHT} maxWidth={1.3} />
            <ContactShadows position={[0, 0, 0]} opacity={0.45} scale={3} blur={2.4} far={1.5} />
          </Suspense>
          <OrbitControls
            makeDefault
            target={[0, VIEW_HEIGHT / 2, 0]}
            enablePan={false}
            minDistance={0.8}
            maxDistance={4}
            autoRotate
            autoRotateSpeed={1.2}
          />
        </Canvas>
        <p className="pointer-events-none absolute bottom-2 left-0 right-0 text-center text-[11px] uppercase tracking-[0.16em] text-muted">
          {t('hint')}
        </p>
      </div>
    </SceneBoundary>
  );
}
