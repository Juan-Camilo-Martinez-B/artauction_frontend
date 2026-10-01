import type { Metadata } from 'next';

export const metadata: Metadata = { title: 'Cómo funciona' };

export default function AboutPage() {
  return (
    <article className="max-w-2xl">
      <h1 className="font-serif text-4xl">Cómo funciona la sala</h1>
      <div className="mt-6 space-y-4 text-lg leading-relaxed">
        <p>El catálogo público solo muestra obras aprobadas, en subasta o ya cerradas. Un borrador o una pieza privada no aparece para nadie más que para quien la publicó.</p>
        <p>La auditoría no bloquea la página: queda en cola. Si el modelo no responde, la obra pasa a revisión manual y la sala sigue.</p>
        <p>En los últimos 30 segundos, una puja válida extiende el cierre otros 30. La cuenta regresiva usa el desfase entre tu reloj y el del servidor.</p>
      </div>
    </article>
  );
}
