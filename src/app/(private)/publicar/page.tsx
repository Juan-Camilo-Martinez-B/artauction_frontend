'use client';

import { useEffect, useState, type SubmitEvent } from 'react';
import { useRouter } from 'next/navigation';
import { Field, FormError, TextArea } from '@/components/field';
import { useImageProcessor } from '@/hooks/use-image-processor';
import { ApiError, artApi } from '@/lib/api/client';
import type { Category } from '@/lib/api/types';
import { browserSession } from '@/lib/session/browser-session';

type Representation = 'TWO_D' | 'THREE_D';

export default function PublishPage() {
  const router = useRouter();
  const processImage = useImageProcessor();
  const [categories, setCategories] = useState<Category[]>([]);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [materials, setMaterials] = useState('');
  const [artistName, setArtistName] = useState('');
  const [year, setYear] = useState('');
  const [categorySlug, setCategorySlug] = useState('');
  const [representation, setRepresentation] = useState<Representation>('TWO_D');
  const [widthCm, setWidthCm] = useState('');
  const [heightCm, setHeightCm] = useState('');
  const [depthCm, setDepthCm] = useState('');
  const [provenance, setProvenance] = useState('');
  const [preview, setPreview] = useState<string | null>(null);
  const [hash, setHash] = useState<string | null>(null);
  const [file, setFile] = useState<Blob | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  useEffect(() => {
    void artApi.categories().then((rows) => {
      setCategories(rows);
      setCategorySlug((current) => current || rows[0]?.slug || '');
    }).catch(() => {
      setError('No se pudieron cargar las categorías.');
    });
  }, []);

  async function onFile(next: File) {
    setError(null);
    const processed = await processImage(next);
    setFile(processed.blob);
    setHash(processed.hash);
    setPreview((current) => {
      if (current) {
        URL.revokeObjectURL(current);
      }
      return URL.createObjectURL(processed.blob);
    });
  }

  async function onSubmit(event: SubmitEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    const token = await browserSession.accessToken();
    const profile = browserSession.current().profile;
    if (!token || !profile) {
      router.push('/entrar');
      return;
    }
    if (profile.role !== 'SELLER' && profile.role !== 'ADMIN') {
      setError('Solo una cuenta de vendedor puede publicar obras.');
      return;
    }
    if (!file || !hash) {
      setError('La ficha necesita la imagen de la obra.');
      return;
    }
    const width = Number(widthCm);
    const height = Number(heightCm);
    const depth = Number(depthCm);
    if (representation === 'THREE_D' && !(depth > 0)) {
      setError('Un objeto tridimensional necesita profundidad.');
      return;
    }
    setPending(true);
    try {
      const lot = await artApi.createLot(token, {
        title,
        description,
        materials,
        artistName: artistName.trim() || undefined,
        creationYear: year ? Number(year) : undefined,
        categorySlug,
        representationKind: representation,
        widthCm: width,
        heightCm: height,
        depthCm: representation === 'THREE_D' ? depth : undefined,
        provenance: provenance.trim() || undefined,
      });
      const signed = await artApi.signUpload(token, lot.id, 'image/jpeg', 0);
      const uploaded = await fetch(signed.uploadUrl, { method: 'PUT', body: file });
      if (!uploaded.ok) {
        throw new Error('No se pudo guardar la imagen.');
      }
      await artApi.registerImage(token, lot.id, { objectKey: signed.objectKey, position: 0, perceptualHash: hash });
      await artApi.submitLot(token, lot.id);
      router.push(`/obras/${lot.id}`);
    } catch (caught) {
      setError(caught instanceof ApiError ? caught.message : caught instanceof Error ? caught.message : 'No se pudo publicar.');
      setPending(false);
    }
  }

  return (
    <section className="mx-auto max-w-2xl">
      <h1 className="font-serif text-4xl">Publicar una obra</h1>
      <p className="mt-2 text-sm text-muted">
        Estos datos son los de la ficha: título, materiales, categoría, formato, medidas y procedencia. La imagen se redimensiona en el navegador antes de enviarse.
      </p>
      <form onSubmit={(event) => void onSubmit(event)} className="mt-6 space-y-4">
        <Field id="title" label="Título" required minLength={3} value={title} onChange={(event) => { setTitle(event.target.value); }} />
        <TextArea id="description" label="Descripción" required minLength={10} value={description} onChange={setDescription} />
        <Field id="materials" label="Materiales" required minLength={2} value={materials} onChange={(event) => { setMaterials(event.target.value); }} />
        <Field id="artist" label="Artista" value={artistName} onChange={(event) => { setArtistName(event.target.value); }} />
        <Field id="year" label="Año" type="number" min={1} max={2100} value={year} onChange={(event) => { setYear(event.target.value); }} />
        <label className="block text-sm" htmlFor="category">
          <span className="mb-1 block font-medium">Categoría</span>
          <select
            id="category"
            required
            value={categorySlug}
            onChange={(event) => { setCategorySlug(event.target.value); }}
            className="w-full rounded-md border border-line bg-white px-3 py-2"
          >
            {categories.map((category) => (
              <option key={category.slug} value={category.slug}>
                {category.name}
              </option>
            ))}
          </select>
        </label>
        <label className="block text-sm" htmlFor="representation">
          <span className="mb-1 block font-medium">Formato</span>
          <select
            id="representation"
            value={representation}
            onChange={(event) => { setRepresentation(event.target.value === 'THREE_D' ? 'THREE_D' : 'TWO_D'); }}
            className="w-full rounded-md border border-line bg-white px-3 py-2"
          >
            <option value="TWO_D">Obra bidimensional</option>
            <option value="THREE_D">Objeto tridimensional</option>
          </select>
        </label>
        <div className="grid gap-4 sm:grid-cols-3">
          <Field id="width" label="Ancho (cm)" type="number" required min={0.1} max={2000} step="0.1" value={widthCm} onChange={(event) => { setWidthCm(event.target.value); }} />
          <Field id="height" label="Alto (cm)" type="number" required min={0.1} max={2000} step="0.1" value={heightCm} onChange={(event) => { setHeightCm(event.target.value); }} />
          {representation === 'THREE_D' ? (
            <Field id="depth" label="Profundidad (cm)" type="number" required min={0.1} max={2000} step="0.1" value={depthCm} onChange={(event) => { setDepthCm(event.target.value); }} />
          ) : null}
        </div>
        <Field id="provenance" label="Procedencia" minLength={3} value={provenance} onChange={(event) => { setProvenance(event.target.value); }} />
        <label className="block text-sm">
          <span className="mb-1 block font-medium">Imagen</span>
          <input
            type="file"
            accept="image/*"
            required={!file}
            onChange={(event) => {
              const next = event.target.files?.[0];
              if (next) {
                void onFile(next);
              }
            }}
          />
        </label>
        {preview ? <img src={preview} alt="Vista previa de la obra preparada" className="max-h-64 rounded-lg border border-line" /> : null}
        {error ? <FormError>{error}</FormError> : null}
        <button type="submit" disabled={pending} className="rounded-full bg-oxide px-5 py-2 text-white disabled:opacity-60">
          {pending ? 'Enviando…' : 'Enviar a auditoría'}
        </button>
      </form>
    </section>
  );
}
