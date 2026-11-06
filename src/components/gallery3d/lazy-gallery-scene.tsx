'use client';

import { useTranslations } from 'next-intl';
import dynamic from 'next/dynamic';

function SceneLoading() {
  const t = useTranslations('Studio');
  return <div className="flex h-full items-center justify-center text-sm text-paper/80">{t('preparing')}</div>;
}

// La escena 3D solo existe en el navegador: se carga aparte para no pesar en el primer render.
export const LazyGalleryScene = dynamic(() => import('./gallery-scene').then((module) => module.GalleryScene), {
  ssr: false,
  loading: () => <SceneLoading />,
});
