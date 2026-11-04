'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { ApiError, artApi } from '@/lib/api/client';
import type { Lot } from '@/lib/api/types';
import { inputFrom, type Destination, type Draft, type Visibility } from '@/lib/forms/lot-draft';
import type { ImportedModel } from '@/lib/gallery/model-import';
import { browserSession } from '@/lib/session/browser-session';

/** Paso en curso del guardado; el boton lo muestra mientras dura. */
export type Stage = 'idle' | 'saving' | 'uploading' | 'modeling' | 'submitting';
/** Que hace el envio: guardar y mandar a auditoria, o solo guardar el borrador. */
export type Intent = 'submit' | 'save';

/** Todo lo que el formulario sabe al pulsar guardar. */
export interface SubmissionRequest {
  /** Obra que se edita; null al crear una nueva. */
  lot: Lot | null;
  draft: Draft;
  draftChanged: boolean;
  destination: Destination;
  visibility: Visibility;
  /** Imagen nueva ya procesada, si la persona eligio una. */
  image: { blob: Blob; hash: string } | null;
  /** Modelo 3D nuevo ya convertido a GLB, si la persona eligio uno. */
  model: ImportedModel | null;
  /** La obra paso a plana y tenia modelo: hay que quitarlo. */
  dropModel: boolean;
  intent: Intent;
}

async function uploadImage(token: string, lotId: string, image: { blob: Blob; hash: string }) {
  const signed = await artApi.signUpload(token, lotId, 'image/jpeg', 0);
  const uploaded = await fetch(signed.uploadUrl, { method: 'PUT', body: image.blob });
  if (!uploaded.ok) {
    throw new Error('No se pudo guardar la imagen.');
  }
  // La posicion 0 reemplaza la imagen anterior de la obra.
  await artApi.registerImage(token, lotId, { objectKey: signed.objectKey, position: 0, perceptualHash: image.hash });
}

async function uploadModel(token: string, lotId: string, model: ImportedModel) {
  const signed = await artApi.signModelUpload(token, lotId);
  const uploaded = await fetch(signed.uploadUrl, { method: 'PUT', headers: { 'content-type': 'model/gltf-binary' }, body: model.file });
  if (!uploaded.ok) {
    throw new Error('No se pudo guardar el modelo 3D.');
  }
  // Registrar reemplaza el modelo anterior de la obra; el catalogo lo valida y lo mide.
  await artApi.registerModel(token, lotId, signed.objectKey);
}

/**
 * Guardado de la ficha de una obra, en orden: alta o cambios, imagen, modelo
 * 3D y, segun el destino, visibilidad y sala (proyecto propio) o envio a
 * auditoria (catalogo). Si una subida falla, la obra ya creada se recuerda y
 * el reintento la reutiliza en vez de duplicarla.
 */
export function useLotSubmission() {
  const router = useRouter();
  const [stage, setStage] = useState<Stage>('idle');
  const [created, setCreated] = useState<Lot | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function submit(request: SubmissionRequest) {
    const token = await browserSession.accessToken();
    if (!token) {
      return;
    }
    const personal = request.destination === 'PERSONAL';
    const threeD = request.draft.representation === 'THREE_D';
    try {
      setStage('saving');
      const base = request.lot ?? created;
      const saved = base
        ? request.draftChanged
          ? await artApi.updateLot(token, base.id, inputFrom(request.draft))
          : base
        : await artApi.createLot(token, { ...inputFrom(request.draft), destination: request.destination, visibility: personal ? request.visibility : undefined });
      if (!base) {
        setCreated(saved);
      }
      if (request.image) {
        setStage('uploading');
        await uploadImage(token, saved.id, request.image);
      }
      if (request.dropModel) {
        setStage('modeling');
        await artApi.removeModel(token, saved.id);
      }
      if (threeD && request.model) {
        setStage('modeling');
        await uploadModel(token, saved.id, request.model);
      }
      if (personal) {
        // Un proyecto propio no se audita: se guarda y queda en la galeria (y en la sala) del autor.
        // Uno tridimensional nace privado y se hace publico ya con su modelo.
        if (saved.visibility !== request.visibility) {
          await artApi.setLotVisibility(token, saved.id, request.visibility);
        }
        if (!base && threeD) {
          // Al crearse aun no tenia modelo y la sala no lo colgo: se cuelga ahora.
          await artApi.addToGallery(token, saved.id).catch(() => undefined);
        }
        router.push('/mis-obras?estado=proyectos');
        return;
      }
      if (request.intent === 'submit') {
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

  return { stage, error, submit, clearError: () => { setError(null); } };
}
