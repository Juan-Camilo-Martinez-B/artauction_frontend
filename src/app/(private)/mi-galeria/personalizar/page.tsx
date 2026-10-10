import type { Metadata } from 'next';
import { PersonalizaForm } from './personaliza-form';

export const metadata: Metadata = { title: 'Personaliza tu galería' };

export default function PersonalizarPage() {
  return <PersonalizaForm />;
}
