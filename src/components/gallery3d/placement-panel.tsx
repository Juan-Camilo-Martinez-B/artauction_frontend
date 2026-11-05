'use client';

import { Trash2, X } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useId, type ReactNode } from 'react';
import { Button } from '@/components/ui/button';
import { useFormat } from '@/hooks/use-format';
import type { Lot } from '@/lib/api/types';
import {
  placeOnFloor,
  placeOnWall,
  WALL_ORDER,
  wallCoordinate,
  wallLength,
  wallSideOf,
  type ArtworkSize,
  type Placement,
  type Room,
  type WallSide,
} from '@/lib/gallery/layout';

/**
 * Edicion del montaje de la obra elegida. Una obra mural se mueve sobre su
 * pared, cambia de pared, sube o baja y cambia de escala; un objeto se mueve
 * por el suelo y gira. Los cambios quedan en el borrador hasta guardar.
 */
export function PlacementPanel({
  lot,
  placement,
  size,
  room,
  isObject,
  onChange,
  onRemove,
  onClose,
}: {
  lot: Lot;
  placement: Placement;
  size: ArtworkSize;
  room: Room;
  isObject: boolean;
  onChange: (next: Placement) => void;
  onRemove: () => void;
  onClose: () => void;
}) {
  const t = useTranslations('Studio.placement');
  const scaleId = useId();
  return (
    <aside aria-label={t('label', { title: lot.title })} className="w-full max-w-xs rounded-panel border border-line bg-surface/95 p-5 shadow-lift backdrop-blur">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-xs font-medium uppercase tracking-[0.22em] text-oxide">{t('eyebrow')}</p>
          <h2 className="mt-1 font-serif text-xl italic leading-tight">{lot.title}</h2>
        </div>
        <button type="button" onClick={onClose} aria-label={t('close')} className="rounded-full p-1.5 text-muted hover:bg-paper-deep hover:text-ink">
          <X aria-hidden="true" className="h-4 w-4" />
        </button>
      </div>
      <div className="mt-4 space-y-4">
        {isObject ? <FloorControls placement={placement} room={room} onChange={onChange} /> : <WallControls placement={placement} size={size} room={room} onChange={onChange} />}
        <Slider
          id={scaleId}
          label={t('scale')}
          value={placement.scale}
          min={0.5}
          max={2}
          step={0.05}
          display={`${String(Math.round(placement.scale * 100))} %`}
          onChange={(scale) => {
            onChange(
              isObject
                ? placeOnFloor(placement.posX, placement.posZ, placement.rotY, room, scale, placement.support)
                : placeOnWall(wallSideOf(placement), wallCoordinate(placement), placement.posY, size, room, scale),
            );
          }}
        />
      </div>
      <div className="mt-5 border-t border-line pt-4">
        <Button variant="danger" size="sm" icon={<Trash2 aria-hidden="true" className="h-4 w-4" />} onClick={onRemove}>
          {t('remove')}
        </Button>
      </div>
    </aside>
  );
}

function WallControls({ placement, size, room, onChange }: { placement: Placement; size: ArtworkSize; room: Room; onChange: (next: Placement) => void }) {
  const t = useTranslations('Studio.placement');
  const format = useFormat();
  const meters = (value: number) => format.decimal(Number(value.toFixed(2)));
  const sideId = useId();
  const alongId = useId();
  const heightId = useId();
  const side = wallSideOf(placement);
  const half = Math.max(0, wallLength(side, room) / 2 - 0.45 - (size.width * placement.scale) / 2);
  const along = wallCoordinate(placement);
  return (
    <>
      <div className="text-sm">
        <label htmlFor={sideId} className="mb-1.5 block font-medium">
          {t('wall')}
        </label>
        <select
          id={sideId}
          value={side}
          onChange={(event) => { onChange(placeOnWall(event.target.value as WallSide, 0, placement.posY, size, room, placement.scale)); }}
          className="w-full rounded-field border border-line-strong bg-surface px-3 py-2"
        >
          {WALL_ORDER.map((option) => (
            <option key={option} value={option}>
              {t(`walls.${option}`)}
            </option>
          ))}
        </select>
      </div>
      <Slider
        id={alongId}
        label={t('position')}
        value={along}
        min={-half}
        max={half}
        step={0.05}
        display={along === 0 ? t('center') : along < 0 ? t('toLeft', { meters: meters(Math.abs(along)) }) : t('toRight', { meters: meters(along) })}
        onChange={(t) => { onChange(placeOnWall(side, t, placement.posY, size, room, placement.scale)); }}
      />
      <Slider
        id={heightId}
        label={t('centerHeight')}
        value={placement.posY}
        min={0.6}
        max={room.height - 0.4}
        step={0.05}
        display={`${meters(placement.posY)} m`}
        onChange={(y) => { onChange(placeOnWall(side, along, y, size, room, placement.scale)); }}
      />
    </>
  );
}

function FloorControls({ placement, room, onChange }: { placement: Placement; room: Room; onChange: (next: Placement) => void }) {
  const t = useTranslations('Studio.placement');
  const format = useFormat();
  const meters = (value: number) => format.decimal(Number(value.toFixed(2)));
  const xId = useId();
  const zId = useId();
  const rotationId = useId();
  const limitX = Math.max(0, room.width / 2 - 1.2);
  const limitZ = Math.max(0, room.depth / 2 - 1.2);
  const degrees = Math.round((((placement.rotY * 180) / Math.PI) % 360 + 360) % 360);
  const move = (x: number, z: number, rotY: number) => { onChange(placeOnFloor(x, z, rotY, room, placement.scale, placement.support)); };
  return (
    <>
      <Slider id={xId} label={t('leftRight')} value={placement.posX} min={-limitX} max={limitX} step={0.05} display={`${meters(placement.posX)} m`} onChange={(x) => { move(x, placement.posZ, placement.rotY); }} />
      <Slider id={zId} label={t('backFront')} value={placement.posZ} min={-limitZ} max={limitZ} step={0.05} display={`${meters(placement.posZ)} m`} onChange={(z) => { move(placement.posX, z, placement.rotY); }} />
      <Slider id={rotationId} label={t('rotation')} value={degrees} min={0} max={345} step={15} display={`${String(degrees)}°`} onChange={(value) => { move(placement.posX, placement.posZ, (value * Math.PI) / 180); }} />
    </>
  );
}

function Slider({
  id,
  label,
  value,
  min,
  max,
  step,
  display,
  onChange,
}: {
  id: string;
  label: string;
  value: number;
  min: number;
  max: number;
  step: number;
  display: ReactNode;
  onChange: (value: number) => void;
}) {
  return (
    <div className="text-sm">
      <div className="mb-1.5 flex items-baseline justify-between gap-2">
        <label htmlFor={id} className="font-medium">
          {label}
        </label>
        <span className="text-xs text-muted">{display}</span>
      </div>
      <input
        id={id}
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(event) => { onChange(Number(event.target.value)); }}
        className="w-full accent-oxide"
      />
    </div>
  );
}
