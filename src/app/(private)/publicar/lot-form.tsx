'use client';

import { Box, Gavel, ImageUp, Palette } from 'lucide-react';
import dynamic from 'next/dynamic';
import { useRouter } from 'next/navigation';
import { useEffect, useMemo, useState, type ReactNode, type SubmitEvent } from 'react';
import { Button } from '@/components/ui/button';
import { Panel } from '@/components/ui/layout';
import { Notice } from '@/components/ui/notice';
import { SelectField, TextAreaField, TextField } from '@/components/ui/text-field';
import { useFormValidation } from '@/hooks/use-form-validation';
import { useImageProcessor } from '@/hooks/use-image-processor';
import { ApiError, artApi, type LotInput } from '@/lib/api/client';
import type { Category, Lot } from '@/lib/api/types';
import { MODEL_ACCEPT } from '@/lib/gallery/model-files';
import { browserSession } from '@/lib/session/browser-session';

const ModelViewer = dynamic(() => import('@/components/gallery3d/model-viewer').then((module) => module.ModelViewer), {
  ssr: false,
  loading: () => <div className="grid h-full place-items-center text-sm text-muted">Preparando la vista previa…</div>,
});

type Representation = 'TWO_D' | 'THREE_D';
type Destination = 'CATALOG' | 'PERSONAL';
type Visibility = 'PUBLIC' | 'PRIVATE';
type Stage = 'idle' | 'saving' | 'uploading' | 'modeling' | 'submitting';
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
 * Ficha de una obra. Sin `lot` crea una nueva y pregunta su destino: el
 * catalogo (auditoria y subasta) o solo la galeria propia. Con `lot` edita una
 * obra en borrador (por ejemplo devuelta por un administrador), que se reenvia
 * a auditoria, o un proyecto propio, que se guarda sin auditar.
 */
export function LotForm({ lot = null, canSell }: { lot?: Lot | null; canSell: boolean }) {
  const router = useRouter();
  const processImage = useImageProcessor();
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
  const [stage, setStage] = useState<Stage>('idle');
  const [intent, setIntent] = useState<Intent>('submit');
  // Obra ya creada en un intento anterior: si fallo una subida, el reintento la reutiliza en vez de duplicarla.
  const [created, setCreated] = useState<Lot | null>(null);
  const savedModel = lot?.model ?? null;
  // Modelo elegido, ya convertido a GLB, con sus triangulos y el formato original.
  const [modelFile, setModelFile] = useState<{ file: File; triangles: number; source: string } | null>(null);
  const [modelPreview, setModelPreview] = useState<string | null>(null);
  const [modelBusy, setModelBusy] = useState(false);
  const [modelError, setModelError] = useState<string | null>(null);
  const threeD = draft.representation === 'THREE_D';
  // El modelo solo existe en obras tridimensionales: pasar a obra plana lo quita.
  const dropModel = savedModel !== null && !threeD;

  const set = <Key extends keyof Draft>(key: Key) => (value: Draft[Key]) => {
    setDraft((current) => ({ ...current, [key]: value }));
  };
  const fieldsDirty = (Object.keys(initial) as Array<keyof Draft>).some((key) => draft[key] !== initial[key]);
  const visibilityDirty = personal && editing && visibility !== initialVisibility;
  const dirty = file !== null || fieldsDirty || visibilityDirty || (threeD && modelFile !== null) || dropModel;

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
    // Una obra tridimensional solo se muestra con su modelo real, no con la foto.
    model: !threeD || modelFile || savedModel ? undefined : 'Sube el modelo 3D de la obra.',
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

  useEffect(() => () => {
    if (modelPreview) {
      URL.revokeObjectURL(modelPreview);
    }
  }, [modelPreview]);

  /** Abre el modelo elegido (y sus archivos), lo revisa y lo deja en GLB para subirlo al guardar. */
  async function onModelFiles(next: File[]) {
    setModelError(null);
    setModelBusy(true);
    try {
      // Se carga solo al elegir un modelo: three y sus cargadores no van en el paquete inicial.
      const { importModel, ModelImportError } = await import('@/lib/gallery/model-import');
      try {
        const imported = await importModel(next);
        setModelFile(imported);
        setModelPreview(URL.createObjectURL(imported.file));
        touch('model');
      } catch (caught) {
        setModelError(caught instanceof ModelImportError ? caught.message : 'No se pudo abrir el modelo 3D.');
      }
    } finally {
      setModelBusy(false);
    }
  }

  /** Quita el modelo anterior si se pidio y sube el nuevo: el catalogo lo valida y lo mide. */
  async function syncModel(token: string, lotId: string) {
    if (dropModel) {
      setStage('modeling');
      await artApi.removeModel(token, lotId);
    }
    if (!threeD || !modelFile) {
      return;
    }
    setStage('modeling');
    const signed = await artApi.signModelUpload(token, lotId);
    const uploaded = await fetch(signed.uploadUrl, { method: 'PUT', headers: { 'content-type': 'model/gltf-binary' }, body: modelFile.file });
    if (!uploaded.ok) {
      throw new Error('No se pudo guardar el modelo 3D.');
    }
    // Registrar reemplaza el modelo anterior de la obra.
    await artApi.registerModel(token, lotId, signed.objectKey);
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
      const base = lot ?? created;
      const saved = base
        ? fieldsDirty
          ? await artApi.updateLot(token, base.id, inputFrom(draft))
          : base
        : await artApi.createLot(token, { ...inputFrom(draft), destination, visibility: personal ? visibility : undefined });
      if (!base) {
        setCreated(saved);
      }
      await uploadImage(token, saved.id);
      await syncModel(token, saved.id);
      if (personal) {
        // Un proyecto propio no se audita: se guarda y queda en la galeria (y en la sala) del autor.
        // Uno tridimensional nace privado y se hace publico ya con su modelo.
        if (saved.visibility !== visibility) {
          await artApi.setLotVisibility(token, saved.id, visibility);
        }
        if (!base && threeD) {
          // Al crearse aun no tenia modelo y la sala no lo colgo: se cuelga ahora.
          await artApi.addToGallery(token, saved.id).catch(() => undefined);
        }
        router.push('/mis-obras?estado=proyectos');
        return;
      }
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
            preview={modelPreview ?? savedModel?.url ?? null}
            triangles={modelFile?.triangles ?? savedModel?.triangleCount ?? null}
            pendingName={modelFile ? `${modelFile.file.name}${modelFile.source === 'glb' ? '' : ` (convertido desde .${modelFile.source})`}` : null}
            busy={modelBusy}
            error={modelError ?? visibleError('model') ?? null}
            title={draft.title || 'la obra'}
            onFiles={(next) => void onModelFiles(next)}
          />
        ) : null}
        {error ? <Notice tone="error">{error}</Notice> : null}
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

/**
 * Modelo 3D de un objeto, obligatorio: la sala y la ficha lo muestran completo
 * y a escala. Acepta .glb, .gltf, .fbx u .obj (con sus materiales y texturas);
 * el navegador lo convierte a GLB antes de subirlo.
 */
function ModelPanel({
  preview,
  triangles,
  pendingName,
  busy,
  error,
  title,
  onFiles,
}: {
  preview: string | null;
  triangles: number | null;
  pendingName: string | null;
  busy: boolean;
  error: string | null;
  title: string;
  onFiles: (files: File[]) => void;
}) {
  return (
    <Panel as="section">
      <h2 className="font-serif text-2xl">Modelo 3D</h2>
      <p className="mt-2 text-sm text-muted">
        Obligatorio en esculturas y objetos: la sala 3D los expone con su volumen real y a la altura que declaraste. Sirve un .glb o .gltf
        (Blender: Archivo › Exportar › glTF 2.0), un .fbx o un .obj, como los de Sketchfab o la Asset Store de Unity. Si el .obj o el .gltf
        traen materiales (.mtl), buffers (.bin) o texturas aparte, elígelos todos a la vez. Un .blend no se abre en la web: expórtalo.
        Entre 1.000 y 300.000 triángulos y hasta 30 MB.
      </p>
      {preview ? (
        <div className="mt-4 overflow-hidden rounded-field border border-line bg-paper-deep">
          <ModelViewer url={preview} title={title} className="h-64 w-full" />
        </div>
      ) : null}
      {busy ? <p className="mt-2 text-xs text-muted" role="status">Abriendo y revisando el modelo…</p> : null}
      {!busy && triangles !== null ? (
        <p className="mt-2 text-xs text-moss">
          {pendingName ? `${pendingName} · ` : 'Modelo verificado · '}
          {triangles.toLocaleString('es-CO')} triángulos{pendingName ? ' · se sube al guardar' : ''}
        </p>
      ) : null}
      <div className="mt-4 flex flex-wrap gap-2">
        <label htmlFor="model" className="inline-flex cursor-pointer items-center gap-2 rounded-field border border-line-strong px-3 py-2 text-sm hover:border-ink">
          <Box aria-hidden="true" className="h-4 w-4" />
          {preview ? 'Cambiar modelo' : 'Elegir modelo 3D'}
          <input
            id="model"
            type="file"
            multiple
            accept={MODEL_ACCEPT}
            disabled={busy}
            className="sr-only"
            aria-describedby={error ? 'model-error' : undefined}
            onChange={(event) => {
              const next = Array.from(event.target.files ?? []);
              // Vaciar el campo deja elegir de nuevo los mismos archivos.
              event.target.value = '';
              if (next.length > 0) {
                onFiles(next);
              }
            }}
          />
        </label>
      </div>
      {error ? (
        <p id="model-error" role="alert" className="mt-2 text-sm text-oxide">
          {error}
        </p>
      ) : null}
    </Panel>
  );
}

/** Opcion de una eleccion excluyente, como tarjeta: titulo, explicacion e icono. */
function DestinationOption({
  selected,
  disabled = false,
  onSelect,
  icon,
  title,
  description,
}: {
  selected: boolean;
  disabled?: boolean;
  onSelect: () => void;
  icon?: ReactNode;
  title: string;
  description: string;
}) {
  return (
    <button
      type="button"
      role="radio"
      aria-checked={selected}
      disabled={disabled}
      onClick={onSelect}
      className={`flex h-full flex-col items-start gap-1 rounded-field border p-4 text-left transition-colors disabled:cursor-not-allowed disabled:opacity-60 ${
        selected ? 'border-ink bg-paper-deep' : 'border-line-strong bg-surface hover:border-ink'
      }`}
    >
      <span className="flex items-center gap-2 font-medium">
        {icon}
        {title}
      </span>
      <span className="text-sm text-muted">{description}</span>
    </button>
  );
}
