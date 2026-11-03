'use client';

import { RequireSession } from '@/components/session/require-session';
import { PageHeader } from '@/components/ui/layout';
import { canSell } from '@/lib/session/roles';
import { LotForm } from './lot-form';

export default function NewArtworkPage() {
  return (
    <RequireSession title="Entra para subir una obra">
      {(profile) => (
        <>
          <PageHeader
            eyebrow="Nueva obra"
            title={canSell(profile.role) ? 'Subir una obra' : 'Subir un proyecto propio'}
            description={
              canSell(profile.role)
                ? 'Guárdala solo para tu galería o publícala en el catálogo. En el catálogo, la auditoría revisa que materiales, fecha e imagen sean coherentes antes de darle una sala de subasta.'
                : 'Tus propias obras se cuelgan en tu sala 3D sin pasar por auditoría. Tú decides si se ven en tu galería pública.'
            }
          />
          <LotForm canSell={canSell(profile.role)} />
        </>
      )}
    </RequireSession>
  );
}
