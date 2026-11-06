import { useTranslations } from 'next-intl';
import Link from 'next/link';
import { ProfileMark } from '@/components/account/profile-mark';
import { ArtworkImage } from '@/components/artwork-image';
import type { PublicGallery } from '@/lib/api/types';
import { GallerySocial } from './gallery-social';

const PREVIEW_SLOTS = 4;

/** Tarjeta de una galeria: quien es, una muestra de sus obras y como seguirla. */
export function GalleryCard({ gallery, returnTo }: { gallery: PublicGallery; returnTo: string }) {
  const t = useTranslations('Explore');
  const slots = Array.from({ length: PREVIEW_SLOTS }, (_slot, index) => gallery.previews[index]);
  return (
    <li className="flex flex-col gap-4 rounded-panel border border-line bg-surface p-5">
      <Link href={`/galerias/${gallery.ownerId}`} aria-label={t('open', { name: gallery.displayName })} className="group flex flex-col gap-4">
        <span className="flex items-center gap-3">
          <ProfileMark name={gallery.displayName} avatarUrl={gallery.avatarUrl} />
          <span className="min-w-0 truncate font-serif text-xl leading-snug group-hover:underline">{gallery.displayName}</span>
        </span>
        <span className="grid grid-cols-4 gap-2">
          {slots.map((item, index) => (
            <span key={item?.lotId ?? `slot-${String(index)}`} className="block aspect-square overflow-hidden rounded-field bg-paper">
              <ArtworkImage src={item?.previewUrl ?? null} alt="" cover />
            </span>
          ))}
        </span>
      </Link>
      <GallerySocial ownerId={gallery.ownerId} workCount={gallery.workCount} followerCount={gallery.followerCount} returnTo={returnTo} />
    </li>
  );
}
