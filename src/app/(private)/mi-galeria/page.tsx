import type { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';
import { GalleryStudio } from './gallery-studio';

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations('Studio');
  return { title: t('defaultName') };
}

export default function MyGalleryPage() {
  return <GalleryStudio />;
}
