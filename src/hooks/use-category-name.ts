import { useTranslations } from 'next-intl';

/** Categorias con texto en el diccionario Categories; el slug es estable, el nombre del backend esta en espanol. */
const CATEGORY_SLUGS = ['arte-digital', 'ceramica', 'escultura', 'fotografia', 'objetos-artisticos', 'otras', 'pinturas'] as const;

function isKnownSlug(slug: string): slug is (typeof CATEGORY_SLUGS)[number] {
  return (CATEGORY_SLUGS as readonly string[]).includes(slug);
}

/**
 * Nombre de una categoria en el idioma activo. Una categoria nueva que aun no
 * esta en el diccionario muestra el nombre que manda el backend. Sirve en
 * componentes de cliente y en componentes de servidor no asincronos.
 */
export function useCategoryName(): (category: { slug: string; name: string } | null | undefined) => string | null {
  const t = useTranslations('Categories');
  return (category) => {
    if (!category) {
      return null;
    }
    return isKnownSlug(category.slug) ? t(category.slug) : category.name;
  };
}
