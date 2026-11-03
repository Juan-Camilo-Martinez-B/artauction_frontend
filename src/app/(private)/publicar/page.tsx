'use client';

import { ImageUp } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useEffect, useState, type SubmitEvent } from 'react';
import { RequireSession } from '@/components/session/require-session';
import { Button } from '@/components/ui/button';
import { PageHeader, Panel } from '@/components/ui/layout';
import { Notice } from '@/components/ui/notice';
import { SelectField, TextAreaField, TextField } from '@/components/ui/text-field';
import { useFormValidation } from '@/hooks/use-form-validation';
import { useImageProcessor } from '@/hooks/use-image-processor';
import { ApiError, artApi } from '@/lib/api/client';
import type { Category } from '@/lib/api/types';
import { browserSession } from '@/lib/session/browser-session';

type Representation = 'TWO_D' | 'THREE_D';
type Stage = 'idle' | 'creating' | 'uploading' | 'submitting';

const STAGE_LABEL: Record<Stage, string> = {
  idle: 'Enviar a auditoría',
  creating: 'Creando la ficha…',
  uploading: 'Subiendo la imagen…',
  submitting: 'Enviando a auditoría…',
};

/** Solo digitos (año). */
const digits = (raw: string) => raw.replace(/\D+/g, '').slice(0, 4);
/** Medida en centimetros: digitos y un decimal opcional. */
const measure = (raw: string) => {
  const [whole = '', ...rest] = raw.replace(/,/g, '.').replace(/[^\d.]+/g, '').split('.');
  return rest.length > 0 ? `${whole.slice(0, 4)}.${rest.join('').slice(0, 1)}` : whole.slice(0, 4);
};

function sizeError(value: string, label: string): string | undefined {
  const parsed = Number(value);
  if (value === '') {
    return `Escribe ${label}.`;
  }
  return parsed > 0 && parsed <= 2000 ? undefined : `${label[0]?.toUpperCase() ?? ''}${label.slice(1)} debe estar entre 0,1 y 2000 cm.`;
}

export default function PublishPage() {
  return (
    <RequireSession roles={['SELLER', 'ADMIN']} title="Entra para publicar una obra">
      {() => <PublishForm />}
    </RequireSession>
  );
}

function PublishForm() {
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
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [stage, setStage] = useState<Stage>('idle');

  const currentYear = new Date().getFullYear();
  const { touch, visibleError, attemptSubmit } = useFormValidation({
    title: title.trim().length >= 3 ? undefined : 'El título necesita al menos 3 caracteres.',
    description: description.trim().length >= 10 ? undefined : 'Describe la obra con al menos 10 caracteres.',
    materials: materials.trim().length >= 2 ? undefined : 'Indica los materiales.',
    year: year === '' || (Number(year) >= 1 && Number(year) <= currentYear) ? undefined : `El año debe estar entre 1 y ${String(currentYear)}.`,
    width: sizeError(widthCm, 'el ancho'),
    height: sizeError(heightCm, 'el alto'),
    depth: representation === 'THREE_D' ? sizeError(depthCm, 'la profundidad') : undefined,
    provenance: provenance.trim() === '' || provenance.trim().length >= 3 ? undefined : 'La procedencia necesita al menos 3 caracteres.',
    image: file ? undefined : 'Elige la imagen de la obra.',
  });

  useEffect(() => {
    void artApi
      .categories()
      .then((rows) => {
        setCategories(rows);
        setCategorySlug((current) => current || rows[0]?.slug || '');
      })
      .catch(() => {
        setError('No se pudieron cargar las categorías.');
      });
  }, []);

  useEffect(() => () => {
    if (preview) {
      URL.revokeObjectURL(preview);
    }
  }, [preview]);

  async function onFile(next: File) {
    setError(null);
    setProcessing(true);
    try {
      const processed = await processImage(next);
      setFile(processed.blob);
      setHash(processed.hash);
      setPreview(URL.createObjectURL(processed.blob));
      touch('image');
    } catch {
      setError('No se pudo preparar la imagen. Prueba con un JPG o PNG.');
    } finally {
      setProcessing(false);
    }
  }

  async function onSubmit(event: SubmitEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    if (!attemptSubmit() || !file || !hash) {
      return;
    }
    const token = await browserSession.accessToken();
    if (!token) {
      return;
    }
    try {
      setStage('creating');
      const lot = await artApi.createLot(token, {
        title: title.trim(),
        description: description.trim(),
        materials: materials.trim(),
        artistName: artistName.trim() || undefined,
        creationYear: year ? Number(year) : undefined,
        categorySlug,
        representationKind: representation,
        widthCm: Number(widthCm),
        heightCm: Number(heightCm),
        depthCm: representation === 'THREE_D' ? Number(depthCm) : undefined,
        provenance: provenance.trim() || undefined,
      });
      setStage('uploading');
      const signed = await artApi.signUpload(token, lot.id, 'image/jpeg', 0);
      const uploaded = await fetch(signed.uploadUrl, { method: 'PUT', body: file });
      if (!uploaded.ok) {
        throw new Error('No se pudo guardar la imagen.');
      }
      await artApi.registerImage(token, lot.id, { objectKey: signed.objectKey, position: 0, perceptualHash: hash });
      setStage('submitting');
      await artApi.submitLot(token, lot.id);
      router.push(`/obras/${lot.id}`);
    } catch (caught) {
      setError(caught instanceof ApiError ? caught.message : caught instanceof Error ? caught.message : 'No se pudo publicar.');
      setStage('idle');
    }
  }

  const pending = stage !== 'idle';

  return (
    <>
      <PageHeader
        eyebrow="Vendedor"
        title="Publicar una obra"
        description="La auditoría revisa que materiales, fecha e imagen sean coherentes. Si todo cuadra, la obra se publica y recibe su sala de subasta."
      />
      <form noValidate onSubmit={(event) => void onSubmit(event)} className="grid gap-6 lg:grid-cols-[minmax(0,1.5fr)_minmax(0,1fr)] lg:items-start">
        <div className="space-y-6">
          <Panel as="section">
            <h2 className="font-serif text-2xl">La obra</h2>
            <div className="mt-4 space-y-4">
              <TextField id="title" label="Título" required value={title} onValueChange={setTitle} onBlur={() => { touch('title'); }} error={visibleError('title')} />
              <TextAreaField id="description" label="Descripción" required value={description} onValueChange={setDescription} onBlur={() => { touch('description'); }} error={visibleError('description')} />
              <div className="grid gap-4 sm:grid-cols-[minmax(0,1fr)_9rem]">
                <TextField id="artist" label="Artista" hint="Déjalo vacío si no se conoce." value={artistName} onValueChange={setArtistName} />
                <TextField id="year" label="Año" inputMode="numeric" placeholder="1925" value={year} format={digits} onValueChange={setYear} onBlur={() => { touch('year'); }} error={visibleError('year')} />
              </div>
            </div>
          </Panel>
          <Panel as="section">
            <h2 className="font-serif text-2xl">Materiales y medidas</h2>
            <div className="mt-4 space-y-4">
              <TextField id="materials" label="Materiales" placeholder="Óleo sobre lienzo" required value={materials} onValueChange={setMaterials} onBlur={() => { touch('materials'); }} error={visibleError('materials')} />
              <div className="grid gap-4 sm:grid-cols-2">
                <SelectField id="category" label="Categoría" value={categorySlug} onChange={(event) => { setCategorySlug(event.target.value); }}>
                  {categories.map((category) => (
                    <option key={category.slug} value={category.slug}>
                      {category.name}
                    </option>
                  ))}
                </SelectField>
                <SelectField
                  id="representation"
                  label="Formato"
                  value={representation}
                  onChange={(event) => { setRepresentation(event.target.value === 'THREE_D' ? 'THREE_D' : 'TWO_D'); }}
                >
                  <option value="TWO_D">Obra plana (pintura, dibujo, foto)</option>
                  <option value="THREE_D">Objeto (escultura, cerámica)</option>
                </SelectField>
              </div>
              <div className="grid gap-4 sm:grid-cols-3">
                <TextField id="width" label="Ancho (cm)" inputMode="decimal" required value={widthCm} format={measure} onValueChange={setWidthCm} onBlur={() => { touch('width'); }} error={visibleError('width')} />
                <TextField id="height" label="Alto (cm)" inputMode="decimal" required value={heightCm} format={measure} onValueChange={setHeightCm} onBlur={() => { touch('height'); }} error={visibleError('height')} />
                {representation === 'THREE_D' ? (
                  <TextField id="depth" label="Profundidad (cm)" inputMode="decimal" required value={depthCm} format={measure} onValueChange={setDepthCm} onBlur={() => { touch('depth'); }} error={visibleError('depth')} />
                ) : null}
              </div>
              <TextField id="provenance" label="Procedencia" hint="Colecciones o ventas anteriores, si las conoces." value={provenance} onValueChange={setProvenance} onBlur={() => { touch('provenance'); }} error={visibleError('provenance')} />
            </div>
          </Panel>
        </div>
        <div className="space-y-6 lg:sticky lg:top-24">
          <Panel as="section">
            <h2 className="font-serif text-2xl">Imagen</h2>
            <label
              htmlFor="image"
              className={`mt-4 flex cursor-pointer flex-col items-center justify-center gap-2 overflow-hidden rounded-field border-2 border-dashed p-4 text-center text-sm transition-colors hover:border-ink ${visibleError('image') ? 'border-oxide' : 'border-line-strong'}`}
            >
              {preview ? (
                <img src={preview} alt="Vista previa de la obra" className="max-h-72 w-auto rounded-field object-contain" />
              ) : (
                <>
                  <ImageUp aria-hidden="true" className="h-8 w-8 text-muted" />
                  <span className="font-medium">{processing ? 'Preparando la imagen…' : 'Elige una foto de la obra'}</span>
                  <span className="text-muted">Al menos 800 px. Se redimensiona en tu navegador antes de enviarse.</span>
                </>
              )}
              <input
                id="image"
                type="file"
                accept="image/jpeg,image/png,image/webp"
                className="sr-only"
                aria-describedby={visibleError('image') ? 'image-error' : undefined}
                onChange={(event) => {
                  const next = event.target.files?.[0];
                  if (next) {
                    void onFile(next);
                  }
                }}
              />
            </label>
            {preview ? <p className="mt-2 text-center text-xs text-muted">Toca la imagen para cambiarla.</p> : null}
            {visibleError('image') ? (
              <p id="image-error" role="alert" className="mt-2 text-sm text-oxide">
                {visibleError('image')}
              </p>
            ) : null}
          </Panel>
          {error ? <Notice tone="error">{error}</Notice> : null}
          <Button type="submit" variant="accent" loading={pending || processing} className="w-full">
            {STAGE_LABEL[stage]}
          </Button>
        </div>
      </form>
    </>
  );
}
