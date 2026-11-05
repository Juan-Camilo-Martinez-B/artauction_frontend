import type { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';
import { PersonalizaForm } from './personaliza-form';

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations('GalleryWizard');
  return { title: t('metaTitle') };
}

export default function PersonalizarPage() {
  return <PersonalizaForm />;
}
