'use client';

import { useState } from 'react';

/**
 * Imagen de una obra con un fondo neutro si falta o no carga. Con `cover`
 * llena su contenedor y recorta, para tarjetas de proporcion fija.
 */
export function ArtworkImage({
  src,
  alt,
  featured = false,
  cover = false,
}: {
  src: string | null;
  alt: string;
  featured?: boolean;
  cover?: boolean;
}) {
  const [failed, setFailed] = useState(false);
  if (!src || failed) {
    const size = cover ? 'h-full' : featured ? 'min-h-72' : 'aspect-[4/5]';
    return <span className={`block w-full ${size}`} style={{ background: 'linear-gradient(160deg, #f7f1e6, #e4d5c3)' }} />;
  }
  return (
    <img
      src={src}
      alt={alt}
      loading="lazy"
      className={cover ? 'block h-full w-full object-cover' : 'block h-auto w-full'}
      onError={() => { setFailed(true); }}
    />
  );
}
