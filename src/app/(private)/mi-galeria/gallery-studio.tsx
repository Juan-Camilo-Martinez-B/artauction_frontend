'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { ApiError, artApi } from '@/lib/api/client';
import type { GalleryConfig, PersonalGallery } from '@/lib/api/types';
import { browserSession } from '@/lib/session/browser-session';
import { GalleryRoom } from './gallery-room';

export function GalleryStudio() {
  const [gallery, setGallery] = useState<PersonalGallery | null>(null);
  const [draft, setDraft] = useState<GalleryConfig | null>(null);
  const [message, setMessage] = useState('Abriendo tu galería…');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    void browserSession.accessToken().then((token) => {
      if (!token) {
        setMessage('Entra para ver tu galería personal.');
        return;
      }
      void artApi
        .myGallery(token)
        .then((next) => {
          setGallery(next);
          setDraft(next.appliedConfig);
          setMessage('');
        })
        .catch(() => setMessage('No se pudo abrir la galería.'));
    });
  }, []);

  async function save() {
    const token = await browserSession.accessToken();
    if (!token || !draft) {
      return;
    }
    setError(null);
    try {
      const next = await artApi.saveGalleryConfig(token, draft);
      setGallery(next);
      setDraft(next.appliedConfig);
      setMessage('Configuración guardada.');
    } catch (caught) {
      setError(caught instanceof ApiError ? caught.message : 'No se pudo guardar.');
    }
  }

  async function restore() {
    const token = await browserSession.accessToken();
    if (!token) {
      return;
    }
    const next = await artApi.restoreGallery(token);
    setGallery(next);
    setDraft(next.appliedConfig);
    setMessage('Volviste a la propuesta de la IA.');
  }

  async function remove(lotId: string) {
    const token = await browserSession.accessToken();
    if (!token) {
      return;
    }
    const next = await artApi.removeFromGallery(token, lotId);
    setGallery(next);
  }

  if (!gallery) {
    return <p>{message}</p>;
  }

  const config = draft ?? gallery.appliedConfig;
  return (
    <section>
      <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-xs uppercase tracking-[0.22em] text-oxide">Sala propia</p>
          <h1 className="font-serif text-5xl">{gallery.name}</h1>
          <p className="mt-2 max-w-xl text-muted">
            {config?.identity.summary || 'Esta galería todavía no tiene una propuesta. Personalízala para pintar paredes, suelo y luz.'}
          </p>
        </div>
        <Link href="/mi-galeria/personalizar" className="rounded-full bg-ink px-5 py-2 text-sm text-paper">
          Personaliza tu galería
        </Link>
      </div>
      {gallery.customizationStatus === 'SIN_PERSONALIZAR' ? (
        <p className="mb-4 rounded-xl border border-dashed border-line px-4 py-3 text-sm">Galería aún no personalizada.</p>
      ) : null}
      <GalleryRoom gallery={gallery} draft={draft} />
      {gallery.artworks.length === 0 ? <p className="mt-4 text-sm text-muted">Tu galería no tiene obras. Añádelas desde el catálogo.</p> : null}
      {config ? (
        <fieldset className="mt-6 grid gap-3 sm:grid-cols-3">
          <ColorField label="Pared" value={config.palette.wall} onChange={(wall) => setDraft({ ...config, source: 'manual', palette: { ...config.palette, wall } })} />
          <ColorField label="Suelo" value={config.palette.floor} onChange={(floor) => setDraft({ ...config, source: 'manual', palette: { ...config.palette, floor } })} />
          <label className="text-sm">
            Intensidad
            <input
              type="range"
              min={0.15}
              max={1.2}
              step={0.05}
              value={config.lighting.ambientIntensity}
              onChange={(event) =>
                setDraft({
                  ...config,
                  source: 'manual',
                  lighting: { ...config.lighting, ambientIntensity: Number(event.target.value) },
                })
              }
            />
          </label>
        </fieldset>
      ) : null}
      {message ? <p className="mt-3 text-sm">{message}</p> : null}
      {error ? <p role="alert" className="mt-3 text-sm">{error}</p> : null}
      <div className="mt-4 flex flex-wrap gap-3">
        <button type="button" className="rounded-full bg-ink px-5 py-2 text-sm text-paper" onClick={() => void save()} disabled={!draft}>
          Guardar cambios
        </button>
        <button type="button" className="text-sm underline" onClick={() => void restore()} disabled={!gallery.suggestedConfig}>
          Restaurar la propuesta
        </button>
      </div>
      <ul className="mt-8 space-y-2">
        {gallery.artworks.map((artwork) => (
          <li key={artwork.id} className="flex items-center justify-between rounded-lg border border-line bg-white px-4 py-3">
            <span>
              {artwork.lot.title}
              <span className="ml-2 text-sm text-muted">{artwork.support === 'WALL' ? 'en la pared' : 'sobre soporte'}</span>
            </span>
            <button type="button" className="text-sm" onClick={() => void remove(artwork.lotId)}>
              Retirar
            </button>
          </li>
        ))}
      </ul>
    </section>
  );
}

function ColorField({ label, value, onChange }: { label: string; value: string; onChange: (value: string) => void }) {
  return (
    <label className="text-sm">
      {label}
      <input type="color" value={value} onChange={(event) => onChange(event.target.value)} className="mt-1 block h-10 w-full" />
    </label>
  );
}
