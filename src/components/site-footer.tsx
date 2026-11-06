import Link from 'next/link';
import { getTranslations } from 'next-intl/server';
import { LanguageSwitch } from './i18n/language-switch';

export async function SiteFooter() {
  const t = await getTranslations('Footer');
  return (
    <footer className="mt-20 border-t border-line">
      <div className="mx-auto grid max-w-6xl gap-6 px-4 py-8 text-sm text-muted md:grid-cols-[1.4fr_1fr_1fr]">
        <div>
          <p className="font-serif text-lg text-ink">ArtAuction</p>
          <p className="mt-1 max-w-sm">{t('tagline')}</p>
        </div>
        <ul className="space-y-1.5">
          <li><Link href="/catalogo" className="hover:text-ink">{t('catalog')}</Link></li>
          <li><Link href="/explorar" className="hover:text-ink">{t('explore')}</Link></li>
          <li><Link href="/mi-galeria" className="hover:text-ink">{t('myGallery')}</Link></li>
          <li><Link href="/como-funciona" className="hover:text-ink">{t('howItWorks')}</Link></li>
        </ul>
        <ul className="space-y-1.5">
          <li><Link href="/bolsillo" className="hover:text-ink">{t('wallet')}</Link></li>
          <li><Link href="/notificaciones" className="hover:text-ink">{t('notifications')}</Link></li>
          <li>{t('privacy')}</li>
        </ul>
        <div className="md:col-span-3">
          <LanguageSwitch />
        </div>
      </div>
    </footer>
  );
}
