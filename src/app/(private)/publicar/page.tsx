'use client';

import { RequireSession } from '@/components/session/require-session';
import { PageHeader } from '@/components/ui/layout';
import { LotForm } from './lot-form';

export default function PublishPage() {
  return (
    <RequireSession roles={['SELLER', 'ADMIN']} title="Entra para publicar una obra">
      {() => (
        <>
          <PageHeader
            eyebrow="Vendedor"
            title="Publicar una obra"
            description="La auditoría revisa que materiales, fecha e imagen sean coherentes. Si todo cuadra, la obra se publica y recibe su sala de subasta."
          />
          <LotForm />
        </>
      )}
    </RequireSession>
  );
}
