'use client';

import { useState } from 'react';

export function ArtworkImage({ src, alt, featured = false }: { src: string | null; alt: string; featured?: boolean }) {
  const [failed, setFailed] = useState(false);
  if (!src || failed) {
    return (
      <span
        className={`block w-full ${featured ? 'min-h-72' : 'aspect-[4/5]'}`}
        style={{ background: 'linear-gradient(160deg, #f7f1e6, #e4d5c3)' }}
      />
    );
  }
  return <img src={src} alt={alt} className="block h-auto w-full" onError={() => { setFailed(true); }} />;
}
