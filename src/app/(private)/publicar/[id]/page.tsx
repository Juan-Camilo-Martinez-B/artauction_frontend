'use client';

import { use, useEffect, useState } from 'react';
import { RequireSession } from '@/components/session/require-session';
import { ButtonLink } from '@/components/ui/button';
import { EmptyState, LoadingState, PageHeader } from '@/components/ui/layout';
import { artApi } from '@/lib/api/client';
import type { Lot } from '@/lib/api/types';
import { isEditable } from '@/lib/artwork/lot-review';
import { browserSession } from '@/lib/session/browser-session';
import { canSell } from '@/lib/session/roles';
import { LotForm } from '../lot-form';

export default function EditLotPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  return (
    <RequireSession title="Entra para editar tu obra">
      {(profile) => <EditLot id={id} userId={profile.userId} sells={canSell(profile.role)} />}
    </RequireSession>
  );
}

type Loaded = { kind: 'loading' } | { kind: 'ready'; lot: Lot } | { kind: 'locked'; lot: Lot } | { kind: 'missing' };

function EditLot({ id, userId, sells }: { id: string; userId: string; sells: boolean }) {
  const [state, setState] = useState<Loaded>({ kind: 'loading' });

  useEffect(() => {
    void browserSession.accessToken().then(async (token) => {
      if (!token) {
        setState({ kind: 'missing' });
        return;
      }
      try {
        const lot = await artApi.lot(id, token);
        // catalog-service vuelve a comprobarlo al guardar; aqui solo se evita
        // mostrar un formulario que no se podra enviar.
        if (lot.sellerId !== userId) {
          setState({ kind: 'missing' });
          return;
        }
        setState(isEditable(lot) ? { kind: 'ready', lot } : { kind: 'locked', lot });
      } catch {
        setState({ kind: 'missing' });
      }
    });
  }, [id, userId]);

  if (state.kind === 'loading') {
    return <LoadingState label="Abriendo la ficha…" />;
  }
  if (state.kind === 'missing') {
    return (
      <EmptyState
        title="No encontramos esta obra entre las tuyas"
        description="Solo quien publicó una obra puede editarla."
        action={<ButtonLink href="/mis-obras" variant="secondary">Ir a mis obras</ButtonLink>}
      />
    );
  }
  if (state.kind === 'locked') {
    return (
      <EmptyState
        title="Esta obra ya no se puede editar"
        description="Solo se editan los proyectos propios y las obras en borrador, por ejemplo las que un administrador devolvió. Una obra en auditoría o publicada conserva su ficha."
        action={<ButtonLink href={`/obras/${state.lot.id}`} variant="secondary">Ver la ficha</ButtonLink>}
      />
    );
  }
  return (
    <>
      <PageHeader
        eyebrow="Mis obras"
        title={`Editar «${state.lot.title}»`}
        description={
          state.lot.status === 'PERSONAL'
            ? 'Cambia la ficha, la imagen o quién la ve. Un proyecto propio no pasa por auditoría.'
            : 'Corrige la ficha o cambia la imagen. Al reenviarla, la auditoría la revisa de nuevo.'
        }
      />
      <LotForm lot={state.lot} canSell={sells} />
    </>
  );
}
