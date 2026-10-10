import type { Metadata } from 'next';
import { GalleryStudio } from './gallery-studio';

export const metadata: Metadata = { title: 'Mi galería' };

export default function MyGalleryPage() {
  return <GalleryStudio />;
}
