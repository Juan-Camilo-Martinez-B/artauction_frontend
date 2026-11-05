'use client';

import { useTranslations } from 'next-intl';
import { useId } from 'react';
import type { GalleryConfig } from '@/lib/api/types';
import { FLOOR_MATERIAL_OPTIONS, WALL_MATERIAL_OPTIONS } from '@/lib/gallery/default-config';

/** Ambiente de la sala: materiales, colores y luz. Edita el borrador de la configuracion. */
export function AmbiencePanel({ config, onChange }: { config: GalleryConfig; onChange: (next: GalleryConfig) => void }) {
  const t = useTranslations('Studio.ambience');
  const ids = { wallMaterial: useId(), floorMaterial: useId(), wall: useId(), floor: useId(), ambient: useId(), spot: useId(), warmth: useId() };
  const update = (patch: (current: GalleryConfig) => GalleryConfig) => { onChange({ ...patch(config), source: 'manual' }); };

  return (
    <div className="grid gap-5 sm:grid-cols-2">
      <fieldset className="space-y-3">
        <legend className="mb-1 text-sm font-medium">{t('walls')}</legend>
        <MaterialSelect
          id={ids.wallMaterial}
          label={t('wallMaterial')}
          value={config.materials.wall}
          options={WALL_MATERIAL_OPTIONS.map((value) => ({ value, label: t(`wallOptions.${value}`) }))}
          onChange={(wall) => { update((current) => ({ ...current, materials: { ...current.materials, wall } })); }}
        />
        <ColorInput id={ids.wall} label={t('wallColor')} value={config.palette.wall} onChange={(wall) => { update((current) => ({ ...current, palette: { ...current.palette, wall } })); }} />
      </fieldset>
      <fieldset className="space-y-3">
        <legend className="mb-1 text-sm font-medium">{t('floor')}</legend>
        <MaterialSelect
          id={ids.floorMaterial}
          label={t('floorMaterial')}
          value={config.materials.floor}
          options={FLOOR_MATERIAL_OPTIONS.map((value) => ({ value, label: t(`floorOptions.${value}`) }))}
          onChange={(floor) => { update((current) => ({ ...current, materials: { ...current.materials, floor } })); }}
        />
        <ColorInput id={ids.floor} label={t('floorColor')} value={config.palette.floor} onChange={(floor) => { update((current) => ({ ...current, palette: { ...current.palette, floor } })); }} />
      </fieldset>
      <fieldset className="space-y-3 sm:col-span-2">
        <legend className="mb-1 text-sm font-medium">{t('light')}</legend>
        <div className="grid gap-4 sm:grid-cols-3">
          <Range id={ids.ambient} label={t('ambient')} value={config.lighting.ambientIntensity} min={0.15} max={1.2} step={0.05} onChange={(ambientIntensity) => { update((current) => ({ ...current, lighting: { ...current.lighting, ambientIntensity } })); }} />
          <Range id={ids.spot} label={t('spot')} value={config.lighting.spotIntensity} min={0} max={1.2} step={0.05} onChange={(spotIntensity) => { update((current) => ({ ...current, lighting: { ...current.lighting, spotIntensity } })); }} />
          <Range id={ids.warmth} label={t('warmth')} value={config.lighting.colorTemperature} min={2700} max={6500} step={100} onChange={(colorTemperature) => { update((current) => ({ ...current, lighting: { ...current.lighting, colorTemperature } })); }} />
        </div>
      </fieldset>
    </div>
  );
}

function MaterialSelect({
  id,
  label,
  value,
  options,
  onChange,
}: {
  id: string;
  label: string;
  value: string;
  options: ReadonlyArray<{ value: string; label: string }>;
  onChange: (value: string) => void;
}) {
  return (
    <div className="text-sm">
      <label htmlFor={id} className="mb-1.5 block text-muted">
        {label}
      </label>
      <select id={id} value={value} onChange={(event) => { onChange(event.target.value); }} className="w-full rounded-field border border-line-strong bg-surface px-3 py-2">
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </div>
  );
}

function ColorInput({ id, label, value, onChange }: { id: string; label: string; value: string; onChange: (value: string) => void }) {
  return (
    <div className="flex items-center gap-3 text-sm">
      <input id={id} type="color" value={value} onChange={(event) => { onChange(event.target.value); }} className="h-9 w-12 cursor-pointer rounded-field border border-line-strong bg-surface" />
      <label htmlFor={id} className="text-muted">
        {label}
      </label>
    </div>
  );
}

function Range({ id, label, value, min, max, step, onChange }: { id: string; label: string; value: number; min: number; max: number; step: number; onChange: (value: number) => void }) {
  return (
    <div className="text-sm">
      <label htmlFor={id} className="mb-1.5 block text-muted">
        {label}
      </label>
      <input id={id} type="range" min={min} max={max} step={step} value={value} onChange={(event) => { onChange(Number(event.target.value)); }} className="w-full accent-oxide" />
    </div>
  );
}
