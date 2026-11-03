'use client';

import { Search, X } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useState, type SubmitEvent } from 'react';
import { Button } from '@/components/ui/button';
import { SelectField, TextField } from '@/components/ui/text-field';
import { catalogHref } from '@/lib/catalog-href';

/**
 * Busqueda del catalogo: el texto se envia con el boton o Enter, y el formato
 * se aplica al elegirlo. Cambiar un filtro vuelve a la primera pagina.
 */
export function CatalogSearch({ query, representation, category }: { query: string; representation: string; category: string }) {
  const router = useRouter();
  const [text, setText] = useState(query);

  function go(next: { query?: string; representation?: string }) {
    router.push(catalogHref({ category, query: (next.query ?? text).trim(), representation: next.representation ?? representation }));
  }

  function onSubmit(event: SubmitEvent<HTMLFormElement>) {
    event.preventDefault();
    go({});
  }

  return (
    <form role="search" onSubmit={onSubmit} className="mb-6 grid items-end gap-3 md:grid-cols-[1fr_13rem_auto]">
      <TextField
        id="catalog-query"
        label="Buscar obra, artista o material"
        type="search"
        placeholder="Retrato, óleo, Vásquez…"
        maxLength={120}
        value={text}
        onValueChange={setText}
        trailing={
          text ? (
            <button
              type="button"
              aria-label="Borrar la búsqueda"
              className="rounded-full p-2 text-muted hover:bg-paper-deep hover:text-ink"
              onClick={() => {
                setText('');
                go({ query: '' });
              }}
            >
              <X aria-hidden="true" className="h-4 w-4" />
            </button>
          ) : null
        }
      />
      <SelectField id="catalog-representation" label="Formato" value={representation} onChange={(event) => { go({ representation: event.target.value }); }}>
        <option value="">Todos</option>
        <option value="TWO_D">Obras planas</option>
        <option value="THREE_D">Objetos</option>
      </SelectField>
      <Button type="submit" icon={<Search aria-hidden="true" className="h-4 w-4" />}>
        Buscar
      </Button>
    </form>
  );
}
