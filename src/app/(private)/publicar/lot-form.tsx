'use client';

import { ImageUp } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useEffect, useMemo, useState, type SubmitEvent } from 'react';
import { Button } from '@/components/ui/button';
import { Panel } from '@/components/ui/layout';
import { Notice } from '@/components/ui/notice';
import { SelectField, TextAreaField, TextField } from '@/components/ui/text-field';
import { useFormValidation } from '@/hooks/use-form-validation';
import { useImageProcessor } from '@/hooks/use-image-processor';
import { ApiError, artApi, type LotInput } from '@/lib/api/client';
import type { Category, Lot } from '@/lib/api/types';
import { browserSession } from '@/lib/session/browser-session';

type Representation = 'TWO_D' | 'THREE_D';
type Stage = 'idle' | 'saving' | 'uploading' | 'submitting';
/** Que hace el envio: guardar y mandar a auditoria, o solo guardar el borrador. */
type Intent = 'submit' | 'save';

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

/** Medida guardada ("30.00") como la escribiria la persona ("30"). */
function storedMeasure(value: string | null | undefined): string {
  const parsed = Number(value);
  return value && Number.isFinite(parsed) && parsed > 0 ? String(parsed) : '';
}

interface Draft {
  title: string;
  description: string;
  materials: string;
  artistName: string;
  year: string;
  categorySlug: string;
  representation: Representation;
  widthCm: string;
  heightCm: string;
  depthCm: string;
  provenance: string;
}

function draftFrom(lot: Lot | null): Draft {
  return {
    title: lot?.title ?? '',
    description: lot?.description ?? '',
    materials: lot?.materials ?? '',
    artistName: lot?.artistName ?? '',
    year: lot?.creationYear ? String(lot.creationYear) : '',
    categorySlug: lot?.categories?.find((link) => link.isPrimary)?.category.slug ?? '',
    representation: lot?.representationKind === 'THREE_D' ? 'THREE_D' : 'TWO_D',
    widthCm: storedMeasure(lot?.widthCm),
    heightCm: storedMeasure(lot?.heightCm),
    depthCm: storedMeasure(lot?.depthCm),
    provenance: lot?.provenance ?? '',
  };
}

function inputFrom(draft: Draft): LotInput {
  return {
    title: draft.title.trim(),
    description: draft.description.trim(),
    materials: draft.materials.trim(),
    artistName: draft.artistName.trim() || undefined,
    creationYear: draft.year ? Number(draft.year) : undefined,
    categorySlug: draft.categorySlug,
    representationKind: draft.representation,
    widthCm: Number(draft.widthCm),
    heightCm: Number(draft.heightCm),
    depthCm: draft.representation === 'THREE_D' ? Number(draft.depthCm) : undefined,
    provenance: draft.provenance.trim() || undefined,
  };
}

/**
 * Ficha de una obra. Sin `lot` crea una nueva; con `lot` (en borrador, por
 * ejemplo devuelta por un administrador) la edita, puede cambiar la imagen y
 * la reenvia a auditoria.
 */
export function LotForm({ lot = null }: { lot?: Lot | null }) {
  const router = useRouter();
  const processImage = useImageProcessor();
  const editing = lot !== null;
  const initial = useMemo(() => draftFrom(lot), [lot]);
  const [draft, setDraft] = useState<Draft>(initial);
  const [categories, setCategories] = useState<Category[]>([]);
  const savedImage = lot?.images?.find((image) => image.url)?.url ?? null;
  const [preview, setPreview] = useState<string | null>(null);
  const [hash, setHash] = useState<string | null>(null);
  const [file, setFile] = useState<Blob | null>(null);
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [stage, setStage] = useState<Stage>('idle');
  const [intent, setIntent] = useState<Intent>('submit');

  const set = <Key extends keyof Draft>(key: Key) => (value: Draft[Key]) => {
    setDraft((current) => ({ ...current, [key]: value }));
  };
  const dirty = file !== null || (Object.keys(initial) as Array<keyof Draft>).some((key) => draft[key] !== initial[key]);

  const currentYear = new Date().getFullYear();
  const { touch, visibleError, attemptSubmit } = useFormValidation({
    title: draft.title.trim().length >= 3 ? undefined : 'El título necesita al menos 3 caracteres.',
    description: draft.description.trim().length >= 10 ? undefined : 'Describe la obra con al menos 10 caracteres.',
    materials: draft.materials.trim().length >= 2 ? undefined : 'Indica los materiales.',
    year: draft.year === '' || (Number(draft.year) >= 1 && Number(draft.year) <= currentYear) ? undefined : `El año debe estar entre 1 y ${String(currentYear)}.`,
    width: sizeError(draft.widthCm, 'el ancho'),
    height: sizeError(draft.heightCm, 'el alto'),
    depth: draft.representation === 'THREE_D' ? sizeError(draft.depthCm, 'la profundidad') : undefined,
    provenance: draft.provenance.trim() === '' || draft.provenance.trim().length >= 3 ? undefined : 'La procedencia necesita al menos 3 caracteres.',
    // Al editar, la imagen ya guardada sirve; cambiarla es opcional.
    image: file || savedImage ? undefined : 'Elige la imagen de la obra.',
  });

  useEffect(() => {
    void artApi
      .categories()
      .then((rows) => {
        setCategories(rows);
        setDraft((current) => (current.categorySlug ? current : { ...current, categorySlug: rows[0]?.slug ?? '' }));
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

  async function uploadImage(token: string, lotId: string) {
    if (!file || !hash) {
      return;
    }
    setStage('uploading');
    const signed = await artApi.signUpload(token, lotId, 'image/jpeg', 0);
    const uploaded = await fetch(signed.uploadUrl, { method: 'PUT', body: file });
    if (!uploaded.ok) {
      throw new Error('No se pudo guardar la imagen.');
    }
    // La posicion 0 reemplaza la imagen anterior de la obra.
    await artApi.registerImage(token, lotId, { objectKey: signed.objectKey, position: 0, perceptualHash: hash });
  }

  async function onSubmit(event: SubmitEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    // El boton que envio el formulario dice si se reenvia o solo se guarda.
    const submitter = event.nativeEvent.submitter;
    const chosen: Intent = submitter?.dataset['intent'] === 'save' ? 'save' : 'submit';
    setIntent(chosen);
    if (!attemptSubmit()) {
      return;
    }
    const token = await browserSession.accessToken();
    if (!token) {
      return;
    }
    try {
      setStage('saving');
      const saved = lot ? (dirty ? await artApi.updateLot(token, lot.id, inputFrom(draft)) : lot) : await artApi.createLot(token, inputFrom(draft));
      await uploadImage(token, saved.id);
      if (chosen === 'submit') {
        setStage('submitting');
        await artApi.submitLot(token, saved.id);
        router.push(`/obras/${saved.id}`);
        return;
      }
      router.push('/mis-obras');
    } catch (caught) {
      setError(caught instanceof ApiError ? caught.message : caught instanceof Error ? caught.message : 'No se pudo guardar la obra.');
      setStage('idle');
    }
  }

  const pending = stage !== 'idle';
  const shownImage = preview ?? savedImage;
  const submitLabel: Record<Stage, string> = {
    idle: editing ? 'Guardar y reenviar a auditoría' : 'Enviar a auditoría',
    saving: 'Guardando la ficha…',
    uploading: 'Subiendo la imagen…',
    submitting: 'Enviando a auditoría…',
  };
  const returned = lot?.lastReview?.decision === 'RETURN_TO_DRAFT' ? lot.lastReview.reason : null;

  return (
    <form noValidate onSubmit={(event) => void onSubmit(event)} className="grid gap-6 lg:grid-cols-[minmax(0,1.5fr)_minmax(0,1fr)] lg:items-start">
      <div className="space-y-6">
        {returned ? (
          <Notice tone="info">
            <span className="font-medium">Motivo de la devolución:</span> {returned}
          </Notice>
        ) : null}
        <Panel as="section">
          <h2 className="font-serif text-2xl">La obra</h2>
          <div className="mt-4 space-y-4">
            <TextField id="title" label="Título" required value={draft.title} onValueChange={set('title')} onBlur={() => { touch('title'); }} error={visibleError('title')} />
            <TextAreaField id="description" label="Descripción" required value={draft.description} onValueChange={set('description')} onBlur={() => { touch('description'); }} error={visibleError('description')} />
            <div className="grid gap-4 sm:grid-cols-[minmax(0,1fr)_9rem]">
              <TextField id="artist" label="Artista" hint="Déjalo vacío si no se conoce." value={draft.artistName} onValueChange={set('artistName')} />
              <TextField id="year" label="Año" inputMode="numeric" placeholder="1925" value={draft.year} format={digits} onValueChange={set('year')} onBlur={() => { touch('year'); }} error={visibleError('year')} />
            </div>
          </div>
        </Panel>
        <Panel as="section">
          <h2 className="font-serif text-2xl">Materiales y medidas</h2>
          <div className="mt-4 space-y-4">
            <TextField id="materials" label="Materiales" placeholder="Óleo sobre lienzo" required value={draft.materials} onValueChange={set('materials')} onBlur={() => { touch('materials'); }} error={visibleError('materials')} />
            <div className="grid gap-4 sm:grid-cols-2">
              <SelectField id="category" label="Categoría" value={draft.categorySlug} onChange={(event) => { set('categorySlug')(event.target.value); }}>
                {categories.map((category) => (
                  <option key={category.slug} value={category.slug}>
                    {category.name}
                  </option>
                ))}
              </SelectField>
              <SelectField
                id="representation"
                label="Formato"
                value={draft.representation}
                onChange={(event) => { set('representation')(event.target.value === 'THREE_D' ? 'THREE_D' : 'TWO_D'); }}
              >
                <option value="TWO_D">Obra plana (pintura, dibujo, foto)</option>
                <option value="THREE_D">Objeto (escultura, cerámica)</option>
              </SelectField>
            </div>
            <div className="grid gap-4 sm:grid-cols-3">
              <TextField id="width" label="Ancho (cm)" inputMode="decimal" required value={draft.widthCm} format={measure} onValueChange={set('widthCm')} onBlur={() => { touch('width'); }} error={visibleError('width')} />
              <TextField id="height" label="Alto (cm)" inputMode="decimal" required value={draft.heightCm} format={measure} onValueChange={set('heightCm')} onBlur={() => { touch('height'); }} error={visibleError('height')} />
              {draft.representation === 'THREE_D' ? (
                <TextField id="depth" label="Profundidad (cm)" inputMode="decimal" required value={draft.depthCm} format={measure} onValueChange={set('depthCm')} onBlur={() => { touch('depth'); }} error={visibleError('depth')} />
              ) : null}
            </div>
            <TextField id="provenance" label="Procedencia" hint="Colecciones o ventas anteriores, si las conoces." value={draft.provenance} onValueChange={set('provenance')} onBlur={() => { touch('provenance'); }} error={visibleError('provenance')} />
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
            {shownImage ? (
              <img src={shownImage} alt="Vista previa de la obra" className="max-h-72 w-auto rounded-field object-contain" />
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
          {shownImage ? <p className="mt-2 text-center text-xs text-muted">Toca la imagen para cambiarla.</p> : null}
          {visibleError('image') ? (
            <p id="image-error" role="alert" className="mt-2 text-sm text-oxide">
              {visibleError('image')}
            </p>
          ) : null}
        </Panel>
        {error ? <Notice tone="error">{error}</Notice> : null}
        <Button
          type="submit"
          variant="accent"
          loading={(pending && intent === 'submit') || processing}
          disabled={pending}
          className="w-full"
          data-intent="submit"
        >
          {intent === 'submit' ? submitLabel[stage] : submitLabel.idle}
        </Button>
        {editing ? (
          // Guardar sin reenviar solo tiene sentido si algo cambio.
          <Button
            type="submit"
            variant="secondary"
            loading={pending && intent === 'save'}
            disabled={!dirty || (pending && intent !== 'save')}
            className="w-full"
            data-intent="save"
          >
            {pending && intent === 'save' ? submitLabel[stage] : 'Guardar sin enviar'}
          </Button>
        ) : null}
      </div>
    </form>
  );
}
