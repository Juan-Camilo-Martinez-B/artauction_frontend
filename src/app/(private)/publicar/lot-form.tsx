'use client';

import { Gavel, ImageUp, Palette } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useEffect, useMemo, useState, type SubmitEvent } from 'react';
import { Button } from '@/components/ui/button';
import { Panel } from '@/components/ui/layout';
import { Notice } from '@/components/ui/notice';
import { SelectField, TextAreaField, TextField } from '@/components/ui/text-field';
import { useCategoryName } from '@/hooks/use-category-name';
import { useFormValidation } from '@/hooks/use-form-validation';
import { useImageProcessor } from '@/hooks/use-image-processor';
import { artApi } from '@/lib/api/client';
import type { Category, Lot } from '@/lib/api/types';
import { digits, draftChanged, draftFrom, lotErrors, measure, type Destination, type Draft, type Visibility } from '@/lib/forms/lot-draft';
import { problemTexts } from '@/lib/forms/validators';
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
  const t = useTranslations('Publish');
  const categoryName = useCategoryName();
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
  const currentYear = new Date().getFullYear();
  const { touch, visibleError, attemptSubmit } = useFormValidation(
    problemTexts(lotErrors(draft, { currentYear, hasImage: Boolean(file || savedImage), hasModel: Boolean(modelImport.model || savedModel) }), (problem) =>
      problem === 'yearRange' ? t('problems.yearRange', { max: currentYear }) : t(`problems.${problem}`),
    ),
  );

  useEffect(() => {
    void artApi
      .categories()
      .then((rows) => {
        setCategories(rows);
        setDraft((current) => (current.categorySlug ? current : { ...current, categorySlug: rows[0]?.slug ?? '' }));
      })
      .catch(() => {
        setError(t('categoriesFailed'));
      });
  }, [t]);

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
      setError(t('imageFailed'));
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
    idle: personal ? (editing ? t('submit.saveChanges') : t('submit.saveToGallery')) : editing ? t('submit.saveAndResend') : t('submit.send'),
    saving: t('submit.saving'),
    uploading: t('submit.uploading'),
    modeling: t('submit.modeling'),
    submitting: t('submit.submitting'),
  };
  const returned = lot?.lastReview?.decision === 'RETURN_TO_DRAFT' ? lot.lastReview.reason : null;

  return (
    <form noValidate onSubmit={(event) => void onSubmit(event)} className="grid gap-6 lg:grid-cols-[minmax(0,1.5fr)_minmax(0,1fr)] lg:items-start">
      <div className="space-y-6">
        {returned ? (
          <Notice tone="info">
            <span className="font-medium">{t('returnReason')}</span> {returned}
          </Notice>
        ) : null}
        {!editing ? (
          <Panel as="section">
            <h2 className="font-serif text-2xl">{t('destination.title')}</h2>
            <div role="radiogroup" aria-label={t('destination.label')} className="mt-4 grid gap-3 sm:grid-cols-2">
              <DestinationOption
                selected={personal}
                onSelect={() => { setDestination('PERSONAL'); }}
                icon={<Palette aria-hidden="true" className="h-5 w-5" />}
                title={t('destination.personalTitle')}
                description={t('destination.personalText')}
              />
              <DestinationOption
                selected={!personal}
                disabled={!canSell}
                onSelect={() => { setDestination('CATALOG'); }}
                icon={<Gavel aria-hidden="true" className="h-5 w-5" />}
                title={t('destination.catalogTitle')}
                description={canSell ? t('destination.catalogText') : t('destination.sellerOnly')}
              />
            </div>
          </Panel>
        ) : null}
        {personal ? (
          <Panel as="section">
            <h2 className="font-serif text-2xl">{t('visibility.title')}</h2>
            <div role="radiogroup" aria-label={t('visibility.label')} className="mt-4 grid gap-3 sm:grid-cols-2">
              <DestinationOption
                selected={visibility === 'PRIVATE'}
                onSelect={() => { setVisibility('PRIVATE'); }}
                title={t('visibility.privateTitle')}
                description={t('visibility.privateText')}
              />
              <DestinationOption
                selected={visibility === 'PUBLIC'}
                onSelect={() => { setVisibility('PUBLIC'); }}
                title={t('visibility.publicTitle')}
                description={t('visibility.publicText')}
              />
            </div>
          </Panel>
        ) : null}
        <Panel as="section">
          <h2 className="font-serif text-2xl">{t('sections.work')}</h2>
          <div className="mt-4 space-y-4">
            <TextField id="title" label={t('fields.title')} required value={draft.title} onValueChange={set('title')} onBlur={() => { touch('title'); }} error={visibleError('title')} />
            <TextAreaField id="description" label={t('fields.description')} required value={draft.description} onValueChange={set('description')} onBlur={() => { touch('description'); }} error={visibleError('description')} />
            <div className="grid gap-4 sm:grid-cols-[minmax(0,1fr)_9rem]">
              <TextField id="artist" label={t('fields.artist')} hint={t('fields.artistHint')} value={draft.artistName} onValueChange={set('artistName')} />
              <TextField id="year" label={t('fields.year')} inputMode="numeric" placeholder="1925" value={draft.year} format={digits} onValueChange={set('year')} onBlur={() => { touch('year'); }} error={visibleError('year')} />
            </div>
          </div>
        </Panel>
        <Panel as="section">
          <h2 className="font-serif text-2xl">{t('sections.materials')}</h2>
          <div className="mt-4 space-y-4">
            <TextField id="materials" label={t('fields.materials')} placeholder={t('fields.materialsPlaceholder')} required value={draft.materials} onValueChange={set('materials')} onBlur={() => { touch('materials'); }} error={visibleError('materials')} />
            <div className="grid gap-4 sm:grid-cols-2">
              <SelectField id="category" label={t('fields.category')} value={draft.categorySlug} onChange={(event) => { set('categorySlug')(event.target.value); }}>
                {categories.map((category) => (
                  <option key={category.slug} value={category.slug}>
                    {categoryName(category)}
                  </option>
                ))}
              </SelectField>
              <SelectField
                id="representation"
                label={t('fields.format')}
                value={draft.representation}
                onChange={(event) => { set('representation')(event.target.value === 'THREE_D' ? 'THREE_D' : 'TWO_D'); }}
              >
                <option value="TWO_D">{t('fields.formatFlat')}</option>
                <option value="THREE_D">{t('fields.formatObject')}</option>
              </SelectField>
            </div>
            <div className="grid gap-4 sm:grid-cols-3">
              <TextField id="width" label={t('fields.width')} inputMode="decimal" required value={draft.widthCm} format={measure} onValueChange={set('widthCm')} onBlur={() => { touch('width'); }} error={visibleError('width')} />
              <TextField id="height" label={t('fields.height')} inputMode="decimal" required value={draft.heightCm} format={measure} onValueChange={set('heightCm')} onBlur={() => { touch('height'); }} error={visibleError('height')} />
              {draft.representation === 'THREE_D' ? (
                <TextField id="depth" label={t('fields.depth')} inputMode="decimal" required value={draft.depthCm} format={measure} onValueChange={set('depthCm')} onBlur={() => { touch('depth'); }} error={visibleError('depth')} />
              ) : null}
            </div>
            <TextField id="provenance" label={t('fields.provenance')} hint={t('fields.provenanceHint')} value={draft.provenance} onValueChange={set('provenance')} onBlur={() => { touch('provenance'); }} error={visibleError('provenance')} />
          </div>
        </Panel>
      </div>
      <div className="space-y-6 lg:sticky lg:top-24">
        <Panel as="section">
          <h2 className="font-serif text-2xl">{t('sections.image')}</h2>
          <label
            htmlFor="image"
            className={`mt-4 flex cursor-pointer flex-col items-center justify-center gap-2 overflow-hidden rounded-field border-2 border-dashed p-4 text-center text-sm transition-colors hover:border-ink ${visibleError('image') ? 'border-oxide' : 'border-line-strong'}`}
          >
            {shownImage ? (
              <img src={shownImage} alt={t('image.previewAlt')} className="max-h-72 w-auto rounded-field object-contain" />
            ) : (
              <>
                <ImageUp aria-hidden="true" className="h-8 w-8 text-muted" />
                <span className="font-medium">{processing ? t('image.preparing') : t('image.choose')}</span>
                <span className="text-muted">{t('image.hint')}</span>
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
          {shownImage ? <p className="mt-2 text-center text-xs text-muted">{t('image.change')}</p> : null}
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
            pendingName={modelFile ? (modelFile.source === 'glb' ? modelFile.file.name : t('model.converted', { name: modelFile.file.name, source: modelFile.source })) : null}
            skipped={modelFile?.skipped ?? []}
            busy={modelImport.busy}
            error={modelImport.error ?? visibleError('model') ?? null}
            title={draft.title || t('titleFallback')}
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
            {pending && intent === 'save' ? submitLabel[stage] : t('submit.saveOnly')}
          </Button>
        ) : null}
      </div>
    </form>
  );
}
