'use client';

import { useState, type SubmitEvent } from 'react';
import { Field, FormError, TextArea } from '@/components/field';
import { useImageProcessor } from '@/hooks/use-image-processor';
import { ApiError, artApi } from '@/lib/api/client';
import { readAccessToken } from '@/lib/session';

export default function PublishPage() {
  const processImage = useImageProcessor();
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [materials, setMaterials] = useState('');
  const [artistName, setArtistName] = useState('');
  const [year, setYear] = useState('');
  const [preview, setPreview] = useState<string | null>(null);
  const [hash, setHash] = useState<string | null>(null);
  const [file, setFile] = useState<Blob | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function onFile(next: File) {
    setError(null);
    const processed = await processImage(next);
    setFile(processed.blob);
    setHash(processed.hash);
    setPreview(URL.createObjectURL(processed.blob));
  }

  async function onSubmit(event: SubmitEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    const token = readAccessToken();
    if (!token) {
      setError('Entra con una cuenta de vendedor.');
      return;
    }
    try {
      const lot = await artApi.createLot(token, {
        title,
        description,
        materials,
        artistName: artistName || undefined,
        creationYear: year ? Number(year) : undefined,
      });
      if (file && hash) {
        const signed = await artApi.signUpload(token, lot.id, 'image/jpeg', 0);
        await fetch(signed.uploadUrl, { method: 'PUT', body: file }).catch(() => undefined);
        await artApi.registerImage(token, lot.id, { objectKey: signed.objectKey, position: 0, perceptualHash: hash });
      }
      await artApi.submitLot(token, lot.id);
      setMessage('La obra quedó en auditoría. La sala sigue disponible mientras tanto.');
    } catch (caught) {
      setError(caught instanceof ApiError ? caught.message : 'No se pudo publicar.');
    }
  }

  return (
    <section className="mx-auto max-w-2xl">
      <h1 className="font-serif text-4xl">Publicar una obra</h1>
      <p className="mt-2 text-sm text-muted">La imagen se redimensiona y se resume en un hash antes de salir del navegador.</p>
      <form onSubmit={(event) => void onSubmit(event)} className="mt-6 space-y-4">
        <Field id="title" label="Título" required minLength={3} value={title} onChange={(event) => {
          setTitle(event.target.value);
        }} />
        <TextArea id="description" label="Descripción" value={description} onChange={setDescription} />
        <Field id="materials" label="Materiales" required minLength={2} value={materials} onChange={(event) => {
          setMaterials(event.target.value);
        }} />
        <Field id="artist" label="Artista" value={artistName} onChange={(event) => {
          setArtistName(event.target.value);
        }} />
        <Field id="year" label="Año" type="number" min={1} max={2100} value={year} onChange={(event) => {
          setYear(event.target.value);
        }} />
        <label className="block text-sm">
          <span className="mb-1 block font-medium">Imagen</span>
          <input
            type="file"
            accept="image/*"
            onChange={(event) => {
              const next = event.target.files?.[0];
              if (next) {
                void onFile(next);
              }
            }}
          />
        </label>
        {preview ? <img src={preview} alt="Vista previa de la obra preparada" className="max-h-64 rounded-lg border border-line" /> : null}
        {hash ? <p className="text-xs text-muted">Hash {hash}</p> : null}
        {error ? <FormError>{error}</FormError> : null}
        {message ? <p role="status">{message}</p> : null}
        <button type="submit" className="rounded-full bg-oxide px-5 py-2 text-white">
          Enviar a auditoría
        </button>
      </form>
    </section>
  );
}
