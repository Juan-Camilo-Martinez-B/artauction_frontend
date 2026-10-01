'use client';

import { useMemo, useState } from 'react';
import { LotCard } from '@/components/lot-card';
import type { Lot } from '@/lib/api/types';
import { canShowLot } from '@/lib/visibility';
import { useCatalogFilter } from '@/hooks/use-catalog-filter';
import type { CatalogQuery } from '@/workers/catalog-logic';

export function CatalogBrowser({ lots }: { lots: Lot[] }) {
  const [text, setText] = useState('');
  const [status, setStatus] = useState('');
  const [sort, setSort] = useState<CatalogQuery['sort']>('recent');
  const query = useMemo<CatalogQuery>(() => ({ version: 1, text, status, sort }), [text, status, sort]);
  const publicLots = lots.filter((lot) => canShowLot(lot, null));
  const visible = useCatalogFilter(publicLots, query);

  return (
    <div>
      <form className="mb-6 grid gap-3 md:grid-cols-[1fr_12rem_12rem]" role="search">
        <label className="text-sm">
          <span className="mb-1 block">Buscar</span>
          <input
            value={text}
            onChange={(event) => {
              setText(event.target.value);
            }}
            className="w-full rounded-md border border-line bg-white px-3 py-2"
            placeholder="Título, artista o material"
          />
        </label>
        <label className="text-sm">
          <span className="mb-1 block">Estado</span>
          <select
            value={status}
            onChange={(event) => {
              setStatus(event.target.value);
            }}
            className="w-full rounded-md border border-line bg-white px-3 py-2"
          >
            <option value="">Todos</option>
            <option value="APROBADO">Aprobada</option>
            <option value="EN_SUBASTA">En subasta</option>
            <option value="CERRADO">Cerrada</option>
          </select>
        </label>
        <label className="text-sm">
          <span className="mb-1 block">Orden</span>
          <select
            value={sort}
            onChange={(event) => {
              const value = event.target.value;
              if (value === 'title' || value === 'score' || value === 'recent') {
                setSort(value);
              }
            }}
            className="w-full rounded-md border border-line bg-white px-3 py-2"
          >
            <option value="recent">Recientes</option>
            <option value="title">Título</option>
            <option value="score">Score</option>
          </select>
        </label>
      </form>
      {visible.length === 0 ? <p>No hay obras con ese criterio.</p> : null}
      <div className="grid gap-4 md:grid-cols-2">
        {visible.map((lot) => (
          <LotCard key={lot.id} lot={lot} />
        ))}
      </div>
    </div>
  );
}
