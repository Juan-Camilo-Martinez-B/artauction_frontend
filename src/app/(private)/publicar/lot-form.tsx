'use client';

import { Gavel, ImageUp, Palette } from 'lucide-react';
import { useEffect, useMemo, useState, type SubmitEvent } from 'react';
import { Button } from '@/components/ui/button';
import { Panel } from '@/components/ui/layout';
import { Notice } from '@/components/ui/notice';
import { SelectField, TextAreaField, TextField } from '@/components/ui/text-field';
import { useFormValidation } from '@/hooks/use-form-validation';
import { useImageProcessor } from '@/hooks/use-image-processor';
import { artApi } from '@/lib/api/client';
import type { Category, Lot } from '@/lib/api/types';
import { digits, draftChanged, draftFrom, lotErrors, measure, type Destination, type Draft, type Visibility } from '@/lib/forms/lot-draft';
import { DestinationOption } from './destination-option';
import { ModelPanel } from './model-panel';
import { useLotSubmission, type Intent, type Stage } from './use-lot-submission';
import { useModelImport } from './use-model-import';

/**
 * Ficha de una obra. Sin `lot` crea una nueva y pregunta su destino: el
 * catalogo (auditoria y subasta) o solo la galeria propia. Con `lot` edita una
 * obra en borrador (por ejemplo devuelta por un administrador), que se reenvia
 * a auditoria, o un proyecto propio, que se guarda sin auditar.
 *
 * Este componente solo arma la pantalla y sus campos: la ficha pura vive en
 * lib/forms/lot-draft, el modelo 3D en useModelImport y el guardado en
 * useLotSubmission.
 */
export function LotForm({ lot = null, canSell }: { lot?: Lot | null; canSell: boolean }) {
  const processImage = useImageProcessor();
  const submission = useLotSubmission();
  const editing = lot !== null;
  const initial = useMemo(() => draftFrom(lot), [lot]);
  const [draft, setDraft] = useState<Draft>(initial);
  // Quien no vende solo crea proyectos propios.
  const [destination, setDestination] = useState<Destination>(lot ? (lot.status === 'PERSONAL' ? 'PERSONAL' : 'CATALOG') : canSell ? 'CATALOG' : 'PERSONAL');
  const initialVisibility: Visibility = lot?.visibility === 'PUBLIC' ? 'PUBLIC' : 'PRIVATE';
  const [visibility, setVisibility] = useState<Visibility>(initialVisibility);
  const personal = destination === 'PERSONAL';
  const [categories, setCategories] = useState<Category[]>([]);
  const savedImage = lot?.images?.find((image) => image.url)?.url ?? null;
  const [preview, setPreview] = useState<string | null>(null);
  const [hash, setHash] = useState<string | null>(null);
  const [file, setFile] = useState<Blob | null>(null);
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [intent, setIntent] = useState<Intent>('submit');
  const savedModel = lot?.model ?? null;
  const threeD = draft.representation === 'THREE_D';
  // El modelo solo existe en obras tridimensionales: pasar a obra plana lo quita.
  const dropModel = savedModel !== null && !threeD;

  const set = <Key extends keyof Draft>(key: Key) => (value: Draft[Key]) => {
    setDraft((current) => ({ ...current, [key]: value }));
  };
  const fieldsDirty = draftChanged(draft, initial);
  const visibilityDirty = personal && editing && visibility !== initialVisibility;

  const modelImport = useModelImport();
  const dirty = file !== null || fieldsDirty || visibilityDirty || (threeD && modelImport.model !== null) || dropModel;
  const { touch, visibleError, attemptSubmit } = useFormValidation(
    lotErrors(draft, { currentYear: new Date().getFullYear(), hasImage: Boolean(file || savedImage), hasModel: Boolean(modelImport.model || savedModel) }),
  );

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

  async function onSubmit(event: SubmitEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    submission.clearError();
    // El boton que envio el formulario dice si se reenvia o solo se guarda.
    const submitter = event.nativeEvent.submitter;
    const chosen: Intent = submitter?.dataset['intent'] === 'save' ? 'save' : 'submit';
    setIntent(chosen);
    if (!attemptSubmit()) {
      return;
    }
    await submission.submit({
      lot,
      draft,
      draftChanged: fieldsDirty,
      destination,
      visibility,
      image: file && hash ? { blob: file, hash } : null,
      model: modelImport.model,
      dropModel,
      intent: chosen,
    });
  }

  const { stage } = submission;
  const shownError = submission.error ?? error;
  const modelFile = modelImport.model;

  const pending = stage !== 'idle';
  const shownImage = preview ?? savedImage;
  const submitLabel: Record<Stage, string> = {
    idle: personal ? (editing ? 'Guardar cambios' : 'Guardar en mi galería') : editing ? 'Guardar y reenviar a auditoría' : 'Enviar a auditoría',
    saving: 'Guardando la ficha…',
    uploading: 'Subiendo la imagen…',
    modeling: 'Revisando el modelo 3D…',
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
        {!editing ? (
          <Panel as="section">
            <h2 className="font-serif text-2xl">¿Para qué es esta obra?</h2>
            <div role="radiogroup" aria-label="Destino de la obra" className="mt-4 grid gap-3 sm:grid-cols-2">
              <DestinationOption
                selected={personal}
                onSelect={() => { setDestination('PERSONAL'); }}
                icon={<Palette aria-hidden="true" className="h-5 w-5" />}
                title="Solo para mi galería"
                description="Un proyecto propio: se cuelga en tu sala 3D sin auditoría. No se vende."
              />
              <DestinationOption
                selected={!personal}
                disabled={!canSell}
                onSelect={() => { setDestination('CATALOG'); }}
                icon={<Gavel aria-hidden="true" className="h-5 w-5" />}
                title="Publicar en el catálogo"
                description={canSell ? 'Pasa por la auditoría y, si la aprueba, recibe su sala de subasta.' : 'Solo para cuentas de vendedor.'}
              />
            </div>
          </Panel>
        ) : null}
        {personal ? (
          <Panel as="section">
            <h2 className="font-serif text-2xl">¿Quién la ve?</h2>
            <div role="radiogroup" aria-label="Visibilidad del proyecto" className="mt-4 grid gap-3 sm:grid-cols-2">
              <DestinationOption
                selected={visibility === 'PRIVATE'}
                onSelect={() => { setVisibility('PRIVATE'); }}
                title="Solo yo"
                description="En tu sala 3D y en Mis obras."
              />
              <DestinationOption
                selected={visibility === 'PUBLIC'}
                onSelect={() => { setVisibility('PUBLIC'); }}
                title="Pública en mi galería"
                description="Aparece en tu galería pública como «Proyecto propio, sin auditar». Nunca en el catálogo."
              />
            </div>
          </Panel>
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
        {threeD ? (
          <ModelPanel
            preview={modelImport.preview ?? savedModel?.url ?? null}
            triangles={modelFile?.triangles ?? savedModel?.triangleCount ?? null}
            pendingName={modelFile ? `${modelFile.file.name}${modelFile.source === 'glb' ? '' : ` (convertido desde .${modelFile.source})`}` : null}
            skipped={modelFile?.skipped ?? []}
            busy={modelImport.busy}
            error={modelImport.error ?? visibleError('model') ?? null}
            title={draft.title || 'la obra'}
            onFiles={(next) => {
              void modelImport.choose(next).then((imported) => {
                if (imported) {
                  touch('model');
                }
              });
            }}
          />
        ) : null}
        {shownError ? <Notice tone="error">{shownError}</Notice> : null}
        <Button
          type="submit"
          variant="accent"
          loading={(pending && intent === 'submit') || processing}
          // Editar un proyecto sin cambios no tiene nada que guardar.
          disabled={pending || (personal && editing && !dirty)}
          className="w-full"
          data-intent="submit"
        >
          {intent === 'submit' ? submitLabel[stage] : submitLabel.idle}
        </Button>
        {editing && !personal ? (
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
